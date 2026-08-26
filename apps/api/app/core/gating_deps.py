from collections.abc import Callable, Coroutine
from typing import Any

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.services.gating_service import GatingService


def require_gate(
    *, needs_baseline: bool = True, needs_daily: bool = False
) -> Callable[..., Coroutine[Any, Any, User]]:
    """FastAPI dependency factory enforcing the app's hard-gate rules.

    - `needs_baseline`: 403 unless the user has completed intake. Never applied
      to `/baseline` itself (chicken-and-egg) or to anything safety-related.
    - `needs_daily`: 403 unless every blocking tracking category has today's
      daily entry logged (per the user's own timezone).
    """

    async def _dependency(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        gate_state = await GatingService(db).get_gate_state(current_user)

        if needs_baseline and not gate_state.has_baseline:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Complete your intake baseline before using this feature.",
            )

        if needs_daily and not gate_state.today_blocking_categories_complete:
            missing = ", ".join(gate_state.missing_blocking_categories)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Log today's entries for all blocking tracking categories first. "
                    f"Missing: {missing}."
                ),
            )

        return current_user

    return _dependency

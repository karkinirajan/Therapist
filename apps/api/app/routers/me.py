from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.gating import GateStateOut
from app.services.gating_service import GatingService

# No gate applied here deliberately: the gate-state endpoint is what the
# frontend polls to *decide* whether to enforce the gate, so it can't itself
# require the gate to already be satisfied.
router = APIRouter(prefix="/me", tags=["me"])


@router.get("/gate-state", response_model=GateStateOut)
async def get_gate_state(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GateStateOut:
    gate_state = await GatingService(db).get_gate_state(current_user)
    return GateStateOut(
        has_baseline=gate_state.has_baseline,
        today_blocking_categories_complete=gate_state.today_blocking_categories_complete,
        this_week_rollup_complete=gate_state.this_week_rollup_complete,
        missing_blocking_categories=gate_state.missing_blocking_categories,
    )

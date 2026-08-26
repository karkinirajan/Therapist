import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.baseline import Baseline


class BaselineRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_user_id(self, user_id: uuid.UUID) -> Baseline | None:
        result = await self._db.execute(select(Baseline).where(Baseline.user_id == user_id))
        return result.scalar_one_or_none()

    async def create(self, *, user_id: uuid.UUID, **fields: Any) -> Baseline:
        baseline = Baseline(user_id=user_id, **fields)
        self._db.add(baseline)
        await self._db.flush()
        await self._db.refresh(baseline)
        return baseline

    async def update(self, baseline: Baseline, **fields: Any) -> Baseline:
        for key, value in fields.items():
            setattr(baseline, key, value)
        await self._db.flush()
        await self._db.refresh(baseline)
        return baseline

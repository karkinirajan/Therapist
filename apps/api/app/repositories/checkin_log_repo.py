import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.checkin_log import CheckinLog


class CheckinLogRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(self, *, user_id: uuid.UUID, **fields: Any) -> CheckinLog:
        checkin = CheckinLog(user_id=user_id, **fields)
        self._db.add(checkin)
        await self._db.flush()
        await self._db.refresh(checkin)
        return checkin

    async def get_by_id(self, checkin_id: uuid.UUID, *, user_id: uuid.UUID) -> CheckinLog | None:
        result = await self._db.execute(
            select(CheckinLog).where(
                CheckinLog.id == checkin_id, CheckinLog.user_id == user_id
            )
        )
        return result.scalar_one_or_none()

    async def list_for_user(
        self, *, user_id: uuid.UUID, offset: int = 0, limit: int = 20
    ) -> list[CheckinLog]:
        result = await self._db.execute(
            select(CheckinLog)
            .where(CheckinLog.user_id == user_id)
            .order_by(CheckinLog.date.desc(), CheckinLog.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def count_for_user(self, *, user_id: uuid.UUID) -> int:
        result = await self._db.execute(
            select(func.count()).select_from(CheckinLog).where(CheckinLog.user_id == user_id)
        )
        return int(result.scalar_one())

    async def list_all_ordered(self, *, user_id: uuid.UUID) -> list[CheckinLog]:
        """All of a user's check-ins, oldest first - used for streak/phase-metric
        computation, which needs the full chronological sequence."""
        result = await self._db.execute(
            select(CheckinLog)
            .where(CheckinLog.user_id == user_id)
            .order_by(CheckinLog.date.asc(), CheckinLog.created_at.asc())
        )
        return list(result.scalars().all())

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.therapy_session import TherapySession


class TherapySessionRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(self, *, user_id: uuid.UUID, **fields: Any) -> TherapySession:
        session = TherapySession(user_id=user_id, **fields)
        self._db.add(session)
        await self._db.flush()
        await self._db.refresh(session)
        return session

    async def get_by_id(
        self, session_id: uuid.UUID, *, user_id: uuid.UUID
    ) -> TherapySession | None:
        result = await self._db.execute(
            select(TherapySession).where(
                TherapySession.id == session_id, TherapySession.user_id == user_id
            )
        )
        return result.scalar_one_or_none()

    async def list_for_user(
        self, *, user_id: uuid.UUID, offset: int = 0, limit: int = 20
    ) -> list[TherapySession]:
        result = await self._db.execute(
            select(TherapySession)
            .where(TherapySession.user_id == user_id)
            .order_by(TherapySession.started_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def count_started_since(self, *, user_id: uuid.UUID, since: datetime) -> int:
        result = await self._db.execute(
            select(func.count())
            .select_from(TherapySession)
            .where(TherapySession.user_id == user_id, TherapySession.started_at >= since)
        )
        return int(result.scalar_one())

    async def update(self, session: TherapySession, **fields: Any) -> TherapySession:
        for key, value in fields.items():
            setattr(session, key, value)
        await self._db.flush()
        await self._db.refresh(session)
        return session

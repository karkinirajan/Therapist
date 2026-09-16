import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_memory_profile import UserMemoryProfile


class UserMemoryProfileRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_user_id(self, user_id: uuid.UUID) -> UserMemoryProfile | None:
        result = await self._db.execute(
            select(UserMemoryProfile).where(UserMemoryProfile.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create(self, *, user_id: uuid.UUID, **fields: Any) -> UserMemoryProfile:
        profile = UserMemoryProfile(user_id=user_id, **fields)
        self._db.add(profile)
        await self._db.flush()
        await self._db.refresh(profile)
        return profile

    async def update(self, profile: UserMemoryProfile, **fields: Any) -> UserMemoryProfile:
        for key, value in fields.items():
            setattr(profile, key, value)
        await self._db.flush()
        await self._db.refresh(profile)
        return profile

    async def delete(self, profile: UserMemoryProfile) -> None:
        await self._db.delete(profile)
        await self._db.flush()

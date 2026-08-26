from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tracking_category import TrackingCategory


class TrackingCategoryRepository:
    """Global reference data - not user-scoped."""

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def list_all(self) -> list[TrackingCategory]:
        result = await self._db.execute(
            select(TrackingCategory).order_by(TrackingCategory.sort_order)
        )
        return list(result.scalars().all())

    async def get_by_key(self, key: str) -> TrackingCategory | None:
        result = await self._db.execute(
            select(TrackingCategory).where(TrackingCategory.key == key)
        )
        return result.scalar_one_or_none()

    async def list_blocking(self) -> list[TrackingCategory]:
        result = await self._db.execute(
            select(TrackingCategory)
            .where(TrackingCategory.is_blocking.is_(True))
            .order_by(TrackingCategory.sort_order)
        )
        return list(result.scalars().all())

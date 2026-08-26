import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exposure_hierarchy_item import ExposureHierarchyItem


class HierarchyRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(self, *, user_id: uuid.UUID, **fields: Any) -> ExposureHierarchyItem:
        item = ExposureHierarchyItem(user_id=user_id, **fields)
        self._db.add(item)
        await self._db.flush()
        await self._db.refresh(item)
        return item

    async def get_by_id(
        self, item_id: uuid.UUID, *, user_id: uuid.UUID
    ) -> ExposureHierarchyItem | None:
        result = await self._db.execute(
            select(ExposureHierarchyItem).where(
                ExposureHierarchyItem.id == item_id, ExposureHierarchyItem.user_id == user_id
            )
        )
        return result.scalar_one_or_none()

    async def list_for_user(self, *, user_id: uuid.UUID) -> list[ExposureHierarchyItem]:
        result = await self._db.execute(
            select(ExposureHierarchyItem)
            .where(ExposureHierarchyItem.user_id == user_id)
            .order_by(ExposureHierarchyItem.order)
        )
        return list(result.scalars().all())

    async def update(self, item: ExposureHierarchyItem, **fields: Any) -> ExposureHierarchyItem:
        for key, value in fields.items():
            setattr(item, key, value)
        await self._db.flush()
        await self._db.refresh(item)
        return item

    async def delete(self, item: ExposureHierarchyItem) -> None:
        await self._db.delete(item)
        await self._db.flush()

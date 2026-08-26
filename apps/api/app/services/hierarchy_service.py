import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exposure_hierarchy_item import ExposureHierarchyItem
from app.models.user import User
from app.repositories.hierarchy_repo import HierarchyRepository
from app.schemas.hierarchy import HierarchyItemCreate, HierarchyItemUpdate


class HierarchyItemNotFoundError(Exception):
    pass


class HierarchyService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._items = HierarchyRepository(db)

    async def create(self, user: User, data: HierarchyItemCreate) -> ExposureHierarchyItem:
        return await self._items.create(user_id=user.id, **data.model_dump())

    async def list(self, user: User) -> list[ExposureHierarchyItem]:
        return await self._items.list_for_user(user_id=user.id)

    async def get(self, user: User, item_id: uuid.UUID) -> ExposureHierarchyItem:
        item = await self._items.get_by_id(item_id, user_id=user.id)
        if item is None:
            raise HierarchyItemNotFoundError()
        return item

    async def update(
        self, user: User, item_id: uuid.UUID, data: HierarchyItemUpdate
    ) -> ExposureHierarchyItem:
        item = await self.get(user, item_id)
        changes = data.model_dump(exclude_unset=True)
        return await self._items.update(item, **changes)

    async def delete(self, user: User, item_id: uuid.UUID) -> None:
        item = await self.get(user, item_id)
        await self._items.delete(item)

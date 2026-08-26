from sqlalchemy.ext.asyncio import AsyncSession

from app.models.baseline import Baseline
from app.models.user import User
from app.repositories.baseline_repo import BaselineRepository
from app.schemas.baseline import BaselineCreate, BaselineUpdate


class BaselineAlreadyExistsError(Exception):
    """Raised on create when the user already completed intake (one-time by design)."""


class BaselineNotFoundError(Exception):
    """Raised on get/update when the user has no baseline yet."""


class BaselineService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._baselines = BaselineRepository(db)

    async def create(self, user: User, data: BaselineCreate) -> Baseline:
        existing = await self._baselines.get_by_user_id(user.id)
        if existing is not None:
            raise BaselineAlreadyExistsError()
        return await self._baselines.create(user_id=user.id, **data.model_dump())

    async def get(self, user: User) -> Baseline:
        baseline = await self._baselines.get_by_user_id(user.id)
        if baseline is None:
            raise BaselineNotFoundError()
        return baseline

    async def redo(self, user: User, data: BaselineUpdate) -> Baseline:
        """Explicit redo/update path - overwrites the existing intake snapshot."""
        baseline = await self._baselines.get_by_user_id(user.id)
        if baseline is None:
            raise BaselineNotFoundError()
        return await self._baselines.update(baseline, **data.model_dump())

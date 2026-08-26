import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.roadmap_phase_history import RoadmapPhaseHistory
from app.models.user_roadmap_state import UserRoadmapState


class RoadmapRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_state(self, *, user_id: uuid.UUID) -> UserRoadmapState | None:
        result = await self._db.execute(
            select(UserRoadmapState).where(UserRoadmapState.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create_state(
        self, *, user_id: uuid.UUID, phase_index: int = 0, intro_acknowledged: bool = False
    ) -> UserRoadmapState:
        state = UserRoadmapState(
            user_id=user_id, phase_index=phase_index, intro_acknowledged=intro_acknowledged
        )
        self._db.add(state)
        await self._db.flush()
        await self._db.refresh(state)
        return state

    async def update_state(self, state: UserRoadmapState, **fields: int | bool) -> UserRoadmapState:
        for key, value in fields.items():
            setattr(state, key, value)
        await self._db.flush()
        await self._db.refresh(state)
        return state

    async def add_history(
        self,
        *,
        user_id: uuid.UUID,
        from_phase: int,
        to_phase: int,
        transition_date: date,
        earned: bool,
    ) -> RoadmapPhaseHistory:
        entry = RoadmapPhaseHistory(
            user_id=user_id,
            from_phase=from_phase,
            to_phase=to_phase,
            date=transition_date,
            earned=earned,
        )
        self._db.add(entry)
        await self._db.flush()
        await self._db.refresh(entry)
        return entry

    async def list_history(self, *, user_id: uuid.UUID) -> list[RoadmapPhaseHistory]:
        result = await self._db.execute(
            select(RoadmapPhaseHistory)
            .where(RoadmapPhaseHistory.user_id == user_id)
            .order_by(RoadmapPhaseHistory.date.asc())
        )
        return list(result.scalars().all())

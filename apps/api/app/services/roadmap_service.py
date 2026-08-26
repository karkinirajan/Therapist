from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.checkin_log import HomeworkStatus
from app.models.roadmap_phase_history import RoadmapPhaseHistory
from app.models.user import User
from app.models.user_roadmap_state import UserRoadmapState
from app.repositories.checkin_log_repo import CheckinLogRepository
from app.repositories.roadmap_repo import RoadmapRepository

MAX_PHASE_INDEX = 3

_HOMEWORK_ENGAGED_STATUSES = {HomeworkStatus.done, HomeworkStatus.partial, HomeworkStatus.n_a}


class PhaseAdvanceNotEarnedError(Exception):
    """Raised when advancing without meeting the phase metric, and the caller
    didn't pass `confirm_early=True` to explicitly acknowledge that."""


class AlreadyAtFinalPhaseError(Exception):
    pass


@dataclass(frozen=True)
class AdvanceResult:
    state: UserRoadmapState
    history: RoadmapPhaseHistory


class RoadmapService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._roadmap = RoadmapRepository(db)
        self._checkins = CheckinLogRepository(db)

    async def get_or_init_state(self, user: User) -> UserRoadmapState:
        state = await self._roadmap.get_state(user_id=user.id)
        if state is None:
            state = await self._roadmap.create_state(user_id=user.id)
        return state

    async def phase_metric_met(self, user: User, phase_index: int) -> bool:
        """Ported from the old client-side `phaseMetricMet`:
        - phase 0: last 4 check-ins all logged with meds == True (>=90% of 4
          rounds up to requiring all 4 - there's no way to hit >=90% of a
          4-item sample without a perfect 4/4).
        - phase 1: last 3 check-ins all have homework done/partial (an
          explicit miss breaks it; n/a does NOT count as met here since the
          old app's phase-1 gate was specifically about homework follow-through).
        - phases 2-3: self-reported only, no automatic check.
        """
        if phase_index == 0:
            checkins = await self._checkins.list_all_ordered(user_id=user.id)
            last_4 = checkins[-4:]
            if len(last_4) < 4:
                return False
            meds_hits = sum(1 for c in last_4 if c.meds)
            return (meds_hits / 4) >= 0.9
        if phase_index == 1:
            checkins = await self._checkins.list_all_ordered(user_id=user.id)
            last_3 = checkins[-3:]
            if len(last_3) < 3:
                return False
            return all(
                c.last_homework_status in (HomeworkStatus.done, HomeworkStatus.partial)
                for c in last_3
            )
        return False

    async def advance_phase(self, user: User, *, confirm_early: bool = False) -> AdvanceResult:
        state = await self.get_or_init_state(user)
        if state.phase_index >= MAX_PHASE_INDEX:
            raise AlreadyAtFinalPhaseError()

        earned = await self.phase_metric_met(user, state.phase_index)
        if not earned and not confirm_early:
            raise PhaseAdvanceNotEarnedError()

        from_phase = state.phase_index
        to_phase = from_phase + 1
        updated_state = await self._roadmap.update_state(state, phase_index=to_phase)
        history = await self._roadmap.add_history(
            user_id=user.id,
            from_phase=from_phase,
            to_phase=to_phase,
            transition_date=datetime.now(UTC).date(),
            earned=earned,
        )
        return AdvanceResult(state=updated_state, history=history)

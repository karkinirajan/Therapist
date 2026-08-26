import uuid
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.checkin_log import CheckinLog, HomeworkStatus
from app.models.user import User
from app.repositories.checkin_log_repo import CheckinLogRepository
from app.schemas.checkin import CheckinCreate

# A checkin "hits streak" if meds were taken AND homework was engaged with
# (done/partial/n-a all count - only an outright miss breaks the streak).
_HOMEWORK_HIT_STATUSES = {HomeworkStatus.done, HomeworkStatus.partial, HomeworkStatus.n_a}


class CheckinNotFoundError(Exception):
    pass


@dataclass(frozen=True)
class StreakSummaryResult:
    current_streak: int
    longest_streak: int
    all_time_meds_adherence_pct: float
    last_8_meds_adherence_pct: float
    homework_attempt_rate_pct: float


def _is_hit(checkin: CheckinLog) -> bool:
    return checkin.meds is True and checkin.last_homework_status in _HOMEWORK_HIT_STATUSES


def compute_streaks(checkins: list[CheckinLog]) -> StreakSummaryResult:
    """`checkins` must be ordered oldest-first.

    Ported from the old client-side `computeStreaks`:
    - current streak: consecutive hits counting back from the most recent entry.
    - longest streak: longest run of consecutive hits anywhere in the sequence.
    - meds adherence: % of logs with meds == True (all-time, and last 8).
    - homework attempt rate: of check-ins where homework was actually assigned
      (status != n/a), the % that were attempted (done or partial) rather than
      missed. n/a entries are excluded from both sides of the ratio since no
      homework was assigned that period.
    """
    if not checkins:
        return StreakSummaryResult(
            current_streak=0,
            longest_streak=0,
            all_time_meds_adherence_pct=0.0,
            last_8_meds_adherence_pct=0.0,
            homework_attempt_rate_pct=0.0,
        )

    hits = [_is_hit(c) for c in checkins]

    current_streak = 0
    for hit in reversed(hits):
        if not hit:
            break
        current_streak += 1

    longest_streak = 0
    running = 0
    for hit in hits:
        running = running + 1 if hit else 0
        longest_streak = max(longest_streak, running)

    meds_hits = sum(1 for c in checkins if c.meds)
    all_time_meds_adherence_pct = round(100.0 * meds_hits / len(checkins), 2)

    last_8 = checkins[-8:]
    last_8_meds_hits = sum(1 for c in last_8 if c.meds)
    last_8_meds_adherence_pct = round(100.0 * last_8_meds_hits / len(last_8), 2)

    assigned = [c for c in checkins if c.last_homework_status != HomeworkStatus.n_a]
    if assigned:
        attempted = sum(
            1
            for c in assigned
            if c.last_homework_status in (HomeworkStatus.done, HomeworkStatus.partial)
        )
        homework_attempt_rate_pct = round(100.0 * attempted / len(assigned), 2)
    else:
        homework_attempt_rate_pct = 0.0

    return StreakSummaryResult(
        current_streak=current_streak,
        longest_streak=longest_streak,
        all_time_meds_adherence_pct=all_time_meds_adherence_pct,
        last_8_meds_adherence_pct=last_8_meds_adherence_pct,
        homework_attempt_rate_pct=homework_attempt_rate_pct,
    )


class CheckinService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._checkins = CheckinLogRepository(db)

    async def create(self, user: User, data: CheckinCreate) -> CheckinLog:
        # streak_at_logging reflects the current streak *after* this check-in:
        # extend the prior streak by one if this entry is itself a hit, else reset.
        prior = await self._checkins.list_all_ordered(user_id=user.id)
        prior_streak = compute_streaks(prior).current_streak
        this_is_hit = data.meds is True and data.last_homework_status in _HOMEWORK_HIT_STATUSES
        streak_at_logging = prior_streak + 1 if this_is_hit else 0

        tool_data = data.tool_data.model_dump(mode="json") if data.tool_data is not None else None

        return await self._checkins.create(
            user_id=user.id,
            date=data.date,
            mood=data.mood,
            anxiety=data.anxiety,
            meds=data.meds,
            sleep=data.sleep,
            last_homework_status=data.last_homework_status,
            last_homework_note=data.last_homework_note,
            gap_reflection=data.gap_reflection,
            what_worked=data.what_worked,
            what_didnt=data.what_didnt,
            tool_data=tool_data,
            pattern_flagged=data.pattern_flagged,
            roadmap_phase_name=data.roadmap_phase_name,
            next_homework=data.next_homework,
            next_homework_due=data.next_homework_due,
            streak_at_logging=streak_at_logging,
        )

    async def get(self, user: User, checkin_id: uuid.UUID) -> CheckinLog:
        checkin = await self._checkins.get_by_id(checkin_id, user_id=user.id)
        if checkin is None:
            raise CheckinNotFoundError()
        return checkin

    async def list(self, user: User, *, offset: int = 0, limit: int = 20) -> list[CheckinLog]:
        return await self._checkins.list_for_user(user_id=user.id, offset=offset, limit=limit)

    async def streaks(self, user: User) -> StreakSummaryResult:
        checkins = await self._checkins.list_all_ordered(user_id=user.id)
        return compute_streaks(checkins)

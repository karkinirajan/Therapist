from datetime import date

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.checkin_log import HomeworkStatus
from app.repositories.checkin_log_repo import CheckinLogRepository
from app.services.roadmap_service import RoadmapService
from tests._helpers import make_user

pytestmark = pytest.mark.asyncio


async def _log_checkin(
    db_session: AsyncSession, user, day: int, *, meds: bool, homework: HomeworkStatus
) -> None:
    await CheckinLogRepository(db_session).create(
        user_id=user.id,
        date=date(2026, 1, day),
        mood=5,
        anxiety=5,
        meds=meds,
        sleep="fair",
        last_homework_status=homework,
        last_homework_note="",
        gap_reflection="",
        what_worked="",
        what_didnt="",
        tool_data=None,
        pattern_flagged="",
        roadmap_phase_name="phase-0",
        next_homework="",
        next_homework_due=None,
        streak_at_logging=0,
    )


async def test_phase_0_not_met_with_fewer_than_4_checkins(db_session: AsyncSession) -> None:
    user = await make_user(db_session)
    for day in range(1, 3):
        await _log_checkin(db_session, user, day, meds=True, homework=HomeworkStatus.done)

    service = RoadmapService(db_session)
    assert await service.phase_metric_met(user, 0) is False


async def test_phase_0_met_with_4_consecutive_meds_hits(db_session: AsyncSession) -> None:
    user = await make_user(db_session)
    for day in range(1, 5):
        await _log_checkin(db_session, user, day, meds=True, homework=HomeworkStatus.missed)

    service = RoadmapService(db_session)
    assert await service.phase_metric_met(user, 0) is True


async def test_phase_0_not_met_if_any_of_last_4_missed_meds(db_session: AsyncSession) -> None:
    user = await make_user(db_session)
    for day in range(1, 4):
        await _log_checkin(db_session, user, day, meds=True, homework=HomeworkStatus.missed)
    await _log_checkin(db_session, user, 4, meds=False, homework=HomeworkStatus.missed)

    service = RoadmapService(db_session)
    assert await service.phase_metric_met(user, 0) is False


async def test_phase_1_met_with_last_3_done_or_partial(db_session: AsyncSession) -> None:
    user = await make_user(db_session)
    await _log_checkin(db_session, user, 1, meds=False, homework=HomeworkStatus.missed)
    await _log_checkin(db_session, user, 2, meds=True, homework=HomeworkStatus.done)
    await _log_checkin(db_session, user, 3, meds=True, homework=HomeworkStatus.partial)
    await _log_checkin(db_session, user, 4, meds=True, homework=HomeworkStatus.done)

    service = RoadmapService(db_session)
    assert await service.phase_metric_met(user, 1) is True


async def test_phase_1_not_met_if_any_of_last_3_missed(db_session: AsyncSession) -> None:
    user = await make_user(db_session)
    await _log_checkin(db_session, user, 1, meds=True, homework=HomeworkStatus.done)
    await _log_checkin(db_session, user, 2, meds=True, homework=HomeworkStatus.missed)
    await _log_checkin(db_session, user, 3, meds=True, homework=HomeworkStatus.done)

    service = RoadmapService(db_session)
    assert await service.phase_metric_met(user, 1) is False


async def test_phases_2_and_3_are_always_self_reported_only(db_session: AsyncSession) -> None:
    user = await make_user(db_session)
    for day in range(1, 5):
        await _log_checkin(db_session, user, day, meds=True, homework=HomeworkStatus.done)

    service = RoadmapService(db_session)
    assert await service.phase_metric_met(user, 2) is False
    assert await service.phase_metric_met(user, 3) is False


async def test_advance_phase_records_earned_true_when_metric_met(db_session: AsyncSession) -> None:
    user = await make_user(db_session)
    for day in range(1, 5):
        await _log_checkin(db_session, user, day, meds=True, homework=HomeworkStatus.done)

    service = RoadmapService(db_session)
    result = await service.advance_phase(user)

    assert result.state.phase_index == 1
    assert result.history.earned is True


async def test_advance_phase_requires_confirmation_when_metric_not_met(
    db_session: AsyncSession,
) -> None:
    from app.services.roadmap_service import PhaseAdvanceNotEarnedError

    user = await make_user(db_session)

    service = RoadmapService(db_session)
    with pytest.raises(PhaseAdvanceNotEarnedError):
        await service.advance_phase(user)


async def test_advance_phase_allows_early_confirm_and_records_earned_false(
    db_session: AsyncSession,
) -> None:
    user = await make_user(db_session)

    service = RoadmapService(db_session)
    result = await service.advance_phase(user, confirm_early=True)

    assert result.state.phase_index == 1
    assert result.history.earned is False

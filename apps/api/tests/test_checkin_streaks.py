import uuid
from datetime import date

from app.models.checkin_log import CheckinLog, HomeworkStatus
from app.services.checkin_service import compute_streaks


def _checkin(day: int, *, meds: bool, homework: HomeworkStatus) -> CheckinLog:
    return CheckinLog(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
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


def test_compute_streaks_empty_list() -> None:
    result = compute_streaks([])

    assert result.current_streak == 0
    assert result.longest_streak == 0
    assert result.all_time_meds_adherence_pct == 0.0
    assert result.homework_attempt_rate_pct == 0.0


def test_compute_streaks_all_hits() -> None:
    checkins = [
        _checkin(1, meds=True, homework=HomeworkStatus.done),
        _checkin(2, meds=True, homework=HomeworkStatus.partial),
        _checkin(3, meds=True, homework=HomeworkStatus.n_a),
    ]

    result = compute_streaks(checkins)

    assert result.current_streak == 3
    assert result.longest_streak == 3
    assert result.all_time_meds_adherence_pct == 100.0


def test_compute_streaks_breaks_on_missed_meds() -> None:
    checkins = [
        _checkin(1, meds=True, homework=HomeworkStatus.done),
        _checkin(2, meds=True, homework=HomeworkStatus.done),
        _checkin(3, meds=False, homework=HomeworkStatus.done),
        _checkin(4, meds=True, homework=HomeworkStatus.done),
    ]

    result = compute_streaks(checkins)

    # Current streak only counts back from the most recent miss.
    assert result.current_streak == 1
    # Longest streak is the best run anywhere in the sequence (days 1-2).
    assert result.longest_streak == 2


def test_compute_streaks_breaks_on_missed_homework() -> None:
    checkins = [
        _checkin(1, meds=True, homework=HomeworkStatus.done),
        _checkin(2, meds=True, homework=HomeworkStatus.missed),
        _checkin(3, meds=True, homework=HomeworkStatus.done),
    ]

    result = compute_streaks(checkins)

    assert result.current_streak == 1
    assert result.longest_streak == 1


def test_compute_streaks_last_8_meds_adherence_uses_only_last_8() -> None:
    # 10 entries: first 2 miss meds, last 8 all take meds -> last-8 adherence
    # should be 100% even though all-time adherence is lower.
    checkins = [_checkin(i, meds=False, homework=HomeworkStatus.done) for i in range(1, 3)]
    checkins += [_checkin(i, meds=True, homework=HomeworkStatus.done) for i in range(3, 11)]

    result = compute_streaks(checkins)

    assert result.last_8_meds_adherence_pct == 100.0
    assert result.all_time_meds_adherence_pct == 80.0


def test_compute_streaks_homework_attempt_rate_excludes_not_assigned() -> None:
    checkins = [
        _checkin(1, meds=True, homework=HomeworkStatus.done),
        _checkin(2, meds=True, homework=HomeworkStatus.missed),
        _checkin(3, meds=True, homework=HomeworkStatus.n_a),
    ]

    result = compute_streaks(checkins)

    # n/a (day 3) is excluded from the denominator: 1 attempted of 2 assigned.
    assert result.homework_attempt_rate_pct == 50.0

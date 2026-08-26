from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tracking_entry import TrackingCadence
from app.services.baseline_service import BaselineService
from app.services.gating_service import GatingService
from app.services.tracking_service import TrackingService
from tests._helpers import make_user
from tests.test_baseline_api import _VALID_BASELINE

pytestmark = pytest.mark.asyncio

_BLOCKING_KEYS = {
    "executive_function",
    "compulsion_erp",
    "mood_anxiety",
    "sleep_meds",
}

_DAILY_PAYLOADS: dict[str, dict] = {
    "executive_function": {
        "task_initiated": True,
        "planned_count": 3,
        "completed_count": 2,
        "took_longer_than_planned": False,
    },
    "compulsion_erp": {
        "compulsions_resisted": 2,
        "compulsions_performed": 1,
        "suds_before": 50,
        "suds_after": 30,
        "intrusive_thought_band": "moderate",
    },
    "mood_anxiety": {
        "mood": 6,
        "anxiety": 4,
        "sleep_quality": "good",
        "panic_or_shutdown": False,
    },
    "sleep_meds": {
        "sleep_quality": "good",
        "sleep_hours": 7.5,
        "meds_taken": True,
        "meds_time": "08:00",
    },
}


async def _create_baseline(db_session: AsyncSession, user) -> None:
    from app.schemas.baseline import BaselineCreate

    await BaselineService(db_session).create(user, BaselineCreate(**_VALID_BASELINE))


async def test_gate_state_false_when_no_baseline(db_session: AsyncSession) -> None:
    user = await make_user(db_session)

    state = await GatingService(db_session).get_gate_state(user)

    assert state.has_baseline is False
    assert state.today_blocking_categories_complete is False


async def test_gate_state_missing_categories_when_baseline_but_no_tracking(
    db_session: AsyncSession,
) -> None:
    user = await make_user(db_session)
    await _create_baseline(db_session, user)

    state = await GatingService(db_session).get_gate_state(user)

    assert state.has_baseline is True
    assert state.today_blocking_categories_complete is False
    assert set(state.missing_blocking_categories) == _BLOCKING_KEYS


async def test_gate_state_true_when_all_blocking_categories_logged_today(
    db_session: AsyncSession,
) -> None:
    user = await make_user(db_session, timezone="UTC")
    await _create_baseline(db_session, user)

    today = datetime.now(UTC).date()
    tracking = TrackingService(db_session)
    for key, payload in _DAILY_PAYLOADS.items():
        await tracking.record_entry(
            user,
            category_key=key,
            cadence=TrackingCadence.daily,
            period_start=today,
            payload=payload,
        )

    state = await GatingService(db_session).get_gate_state(user)

    assert state.today_blocking_categories_complete is True
    assert state.missing_blocking_categories == []


async def test_gate_state_ignores_non_blocking_categories(db_session: AsyncSession) -> None:
    """`behavioral_activation` and `distortion_awareness` are non-blocking -
    leaving them unlogged must not affect the gate."""
    user = await make_user(db_session)
    await _create_baseline(db_session, user)

    today = datetime.now(UTC).date()
    tracking = TrackingService(db_session)
    for key, payload in _DAILY_PAYLOADS.items():
        await tracking.record_entry(
            user,
            category_key=key,
            cadence=TrackingCadence.daily,
            period_start=today,
            payload=payload,
        )

    state = await GatingService(db_session).get_gate_state(user)

    assert state.today_blocking_categories_complete is True

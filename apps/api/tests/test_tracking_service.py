from datetime import date

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tracking_entry import TrackingCadence
from app.services.tracking_service import (
    InvalidTrackingPayloadError,
    TrackingService,
    UnknownTrackingCategoryError,
)
from tests._helpers import make_user

pytestmark = pytest.mark.asyncio


async def test_record_entry_unknown_category_raises(db_session: AsyncSession) -> None:
    user = await make_user(db_session)
    service = TrackingService(db_session)

    with pytest.raises(UnknownTrackingCategoryError):
        await service.record_entry(
            user,
            category_key="not_a_real_category",
            cadence=TrackingCadence.daily,
            period_start=date(2026, 1, 1),
            payload={},
        )


async def test_record_entry_rejects_wrong_shaped_payload(db_session: AsyncSession) -> None:
    user = await make_user(db_session)
    service = TrackingService(db_session)

    with pytest.raises(InvalidTrackingPayloadError):
        await service.record_entry(
            user,
            category_key="mood_anxiety",
            cadence=TrackingCadence.daily,
            # This is the `sleep_meds` daily shape, not `mood_anxiety`'s.
            payload={"sleep_quality": "good", "sleep_hours": 7.5, "meds_taken": True},
            period_start=date(2026, 1, 1),
        )


async def test_record_entry_accepts_valid_payload(db_session: AsyncSession) -> None:
    user = await make_user(db_session)
    service = TrackingService(db_session)

    entry = await service.record_entry(
        user,
        category_key="mood_anxiety",
        cadence=TrackingCadence.daily,
        period_start=date(2026, 1, 1),
        payload={
            "mood": 6,
            "anxiety": 4,
            "sleep_quality": "good",
            "panic_or_shutdown": False,
        },
    )

    assert entry.payload["mood"] == 6


async def test_record_entry_upserts_on_natural_key_conflict(db_session: AsyncSession) -> None:
    """Posting again for the same (user, category, cadence, period_start)
    updates the existing row rather than creating a duplicate - the natural
    key's unique constraint is the dedup mechanism."""
    user = await make_user(db_session)
    service = TrackingService(db_session)
    period_start = date(2026, 1, 1)

    first = await service.record_entry(
        user,
        category_key="mood_anxiety",
        cadence=TrackingCadence.daily,
        period_start=period_start,
        payload={"mood": 3, "anxiety": 7, "sleep_quality": "poor", "panic_or_shutdown": True},
    )
    second = await service.record_entry(
        user,
        category_key="mood_anxiety",
        cadence=TrackingCadence.daily,
        period_start=period_start,
        payload={"mood": 8, "anxiety": 2, "sleep_quality": "great", "panic_or_shutdown": False},
    )

    assert first.id == second.id
    assert second.payload["mood"] == 8

    all_entries = await service.list_entries(
        user, category_key="mood_anxiety", cadence=TrackingCadence.daily
    )
    assert len(all_entries) == 1

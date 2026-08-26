import uuid
from datetime import UTC, date, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tracking_entry import TrackingCadence, TrackingEntry


class TrackingEntryRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_natural_key(
        self,
        *,
        user_id: uuid.UUID,
        category_id: uuid.UUID,
        cadence: TrackingCadence,
        period_start: date,
    ) -> TrackingEntry | None:
        result = await self._db.execute(
            select(TrackingEntry).where(
                TrackingEntry.user_id == user_id,
                TrackingEntry.category_id == category_id,
                TrackingEntry.cadence == cadence,
                TrackingEntry.period_start == period_start,
            )
        )
        return result.scalar_one_or_none()

    async def upsert(
        self,
        *,
        user_id: uuid.UUID,
        category_id: uuid.UUID,
        cadence: TrackingCadence,
        period_start: date,
        payload: dict,
    ) -> TrackingEntry:
        """Get-or-create-or-update on the natural key
        (user_id, category_id, cadence, period_start)."""
        existing = await self.get_by_natural_key(
            user_id=user_id, category_id=category_id, cadence=cadence, period_start=period_start
        )
        if existing is not None:
            existing.payload = payload
            existing.updated_at = datetime.now(UTC)
            await self._db.flush()
            await self._db.refresh(existing)
            return existing

        entry = TrackingEntry(
            user_id=user_id,
            category_id=category_id,
            cadence=cadence,
            period_start=period_start,
            payload=payload,
        )
        self._db.add(entry)
        await self._db.flush()
        await self._db.refresh(entry)
        return entry

    async def list_for_user(
        self,
        *,
        user_id: uuid.UUID,
        category_id: uuid.UUID | None = None,
        cadence: TrackingCadence | None = None,
        period_start_from: date | None = None,
        period_start_to: date | None = None,
    ) -> list[TrackingEntry]:
        stmt = select(TrackingEntry).where(TrackingEntry.user_id == user_id)
        if category_id is not None:
            stmt = stmt.where(TrackingEntry.category_id == category_id)
        if cadence is not None:
            stmt = stmt.where(TrackingEntry.cadence == cadence)
        if period_start_from is not None:
            stmt = stmt.where(TrackingEntry.period_start >= period_start_from)
        if period_start_to is not None:
            stmt = stmt.where(TrackingEntry.period_start <= period_start_to)
        stmt = stmt.order_by(TrackingEntry.period_start.desc())
        result = await self._db.execute(stmt)
        return list(result.scalars().all())

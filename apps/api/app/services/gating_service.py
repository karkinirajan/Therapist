from dataclasses import dataclass
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tracking_entry import TrackingCadence
from app.models.user import User
from app.repositories.baseline_repo import BaselineRepository
from app.repositories.tracking_category_repo import TrackingCategoryRepository
from app.repositories.tracking_entry_repo import TrackingEntryRepository


@dataclass(frozen=True)
class GateState:
    has_baseline: bool
    today_blocking_categories_complete: bool
    this_week_rollup_complete: bool
    missing_blocking_categories: list[str]


def _user_today(user: User) -> date:
    """"Today" in the user's own timezone, not server UTC - falls back to UTC
    if the stored timezone string isn't a recognized IANA zone."""
    try:
        tz = ZoneInfo(user.timezone)
    except ZoneInfoNotFoundError:
        tz = ZoneInfo("UTC")
    return datetime.now(tz).date()


def _week_start(today: date) -> date:
    return today - timedelta(days=today.weekday())


class GatingService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._baselines = BaselineRepository(db)
        self._categories = TrackingCategoryRepository(db)
        self._entries = TrackingEntryRepository(db)

    async def get_gate_state(self, user: User) -> GateState:
        baseline = await self._baselines.get_by_user_id(user.id)
        has_baseline = baseline is not None

        blocking_categories = await self._categories.list_blocking()
        blocking_ids_by_key = {c.key: c.id for c in blocking_categories}

        today = _user_today(user)
        week_start = _week_start(today)

        daily_entries = await self._entries.list_for_user(
            user_id=user.id,
            cadence=TrackingCadence.daily,
            period_start_from=today,
            period_start_to=today,
        )
        daily_category_ids_logged = {e.category_id for e in daily_entries}
        missing_blocking_categories = [
            key
            for key, category_id in blocking_ids_by_key.items()
            if category_id not in daily_category_ids_logged
        ]
        today_blocking_categories_complete = not missing_blocking_categories

        weekly_entries = await self._entries.list_for_user(
            user_id=user.id,
            cadence=TrackingCadence.weekly,
            period_start_from=week_start,
            period_start_to=week_start,
        )
        weekly_category_ids_logged = {e.category_id for e in weekly_entries}
        this_week_rollup_complete = all(
            category_id in weekly_category_ids_logged
            for category_id in blocking_ids_by_key.values()
        )

        return GateState(
            has_baseline=has_baseline,
            today_blocking_categories_complete=today_blocking_categories_complete,
            this_week_rollup_complete=this_week_rollup_complete,
            missing_blocking_categories=missing_blocking_categories,
        )

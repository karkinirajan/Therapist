from datetime import date

from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tracking_entry import TrackingCadence, TrackingEntry
from app.models.user import User
from app.repositories.tracking_category_repo import TrackingCategoryRepository
from app.repositories.tracking_entry_repo import TrackingEntryRepository
from app.schemas.tracking import get_payload_schema


class UnknownTrackingCategoryError(Exception):
    """Raised when `category_key` doesn't match any seeded tracking category."""


class InvalidTrackingPayloadError(Exception):
    """Raised when `payload` doesn't match the discriminated shape for the
    category/cadence pair."""

    def __init__(self, errors: str) -> None:
        self.errors = errors
        super().__init__(errors)


class TrackingService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._categories = TrackingCategoryRepository(db)
        self._entries = TrackingEntryRepository(db)

    async def list_categories(self):
        return await self._categories.list_all()

    async def record_entry(
        self,
        user: User,
        *,
        category_key: str,
        cadence: TrackingCadence,
        period_start: date,
        payload: dict,
    ) -> TrackingEntry:
        category = await self._categories.get_by_key(category_key)
        if category is None:
            raise UnknownTrackingCategoryError(category_key)

        schema = get_payload_schema(category_key, cadence)
        if schema is None:
            raise InvalidTrackingPayloadError(
                f"No payload shape defined for category '{category_key}' at cadence "
                f"'{cadence.value}'"
            )
        try:
            validated = schema.model_validate(payload)
        except ValidationError as exc:
            raise InvalidTrackingPayloadError(str(exc)) from exc

        return await self._entries.upsert(
            user_id=user.id,
            category_id=category.id,
            cadence=cadence,
            period_start=period_start,
            payload=validated.model_dump(mode="json"),
        )

    async def list_entries(
        self,
        user: User,
        *,
        category_key: str | None = None,
        cadence: TrackingCadence | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[TrackingEntry]:
        category_id = None
        if category_key is not None:
            category = await self._categories.get_by_key(category_key)
            if category is None:
                raise UnknownTrackingCategoryError(category_key)
            category_id = category.id

        return await self._entries.list_for_user(
            user_id=user.id,
            category_id=category_id,
            cadence=cadence,
            period_start_from=date_from,
            period_start_to=date_to,
        )

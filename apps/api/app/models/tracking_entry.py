import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TrackingCadence(str, enum.Enum):
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"


class TrackingEntry(Base):
    """A single user's tracking-category entry for a given period.

    The unique constraint on (user_id, category_id, cadence, period_start) is
    the load-bearing constraint here: it backs both dedup (one entry per
    user/category/period) and the hard-gate lookup used to check whether a
    blocking category has been logged for a given period.
    """

    __tablename__ = "tracking_entries"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "category_id", "cadence", "period_start", name="uq_tracking_entry_period"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tracking_categories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    cadence: Mapped[TrackingCadence] = mapped_column(
        SAEnum(TrackingCadence, name="tracking_cadence"), nullable=False
    )
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, Text, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class HomeworkStatus(str, enum.Enum):
    done = "done"
    partial = "partial"
    missed = "missed"
    n_a = "n/a"


class CheckinLog(Base):
    """A single check-in session: numbers, one CBT tool, homework state."""

    __tablename__ = "checkin_logs"
    __table_args__ = (Index("ix_checkin_logs_user_id_date", "user_id", "date"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    mood: Mapped[int] = mapped_column(Integer, nullable=False)
    anxiety: Mapped[int] = mapped_column(Integer, nullable=False)
    meds: Mapped[bool] = mapped_column(Boolean, nullable=False)
    sleep: Mapped[str] = mapped_column(Text, nullable=False)
    last_homework_status: Mapped[HomeworkStatus] = mapped_column(
        SAEnum(HomeworkStatus, name="homework_status"), nullable=False
    )
    last_homework_note: Mapped[str] = mapped_column(Text, nullable=False)
    gap_reflection: Mapped[str] = mapped_column(Text, nullable=False)
    what_worked: Mapped[str] = mapped_column(Text, nullable=False)
    what_didnt: Mapped[str] = mapped_column(Text, nullable=False)
    # One of 4 discriminated shapes (thought-record / behavioral-activation /
    # exposure-hierarchy / behavioral-experiment); validated at the Pydantic
    # schema layer, stored as opaque JSONB here.
    tool_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    pattern_flagged: Mapped[str] = mapped_column(Text, nullable=False)
    roadmap_phase_name: Mapped[str] = mapped_column(Text, nullable=False)
    next_homework: Mapped[str] = mapped_column(Text, nullable=False)
    next_homework_due: Mapped[date | None] = mapped_column(Date, nullable=True)
    streak_at_logging: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

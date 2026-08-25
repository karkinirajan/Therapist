import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, SmallInteger, Text, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SleepQuality(str, enum.Enum):
    poor = "poor"
    fair = "fair"
    good = "good"
    great = "great"


class MedsAdherence(str, enum.Enum):
    consistent = "consistent"
    missed_1_2 = "missed-1-2"
    missed_several = "missed-several"
    inconsistent = "inconsistent"


class Cadence(str, enum.Enum):
    daily = "daily"
    every_other_day = "every-other-day"
    weekly = "weekly"


class Baseline(Base):
    """One-time intake snapshot, one row per user."""

    __tablename__ = "baselines"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    mood: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    anxiety: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    energy: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    sleep_quality: Mapped[SleepQuality] = mapped_column(
        SAEnum(SleepQuality, name="sleep_quality"), nullable=False
    )
    meds_adherence_2wk: Mapped[MedsAdherence] = mapped_column(
        SAEnum(MedsAdherence, name="meds_adherence"), nullable=False
    )
    career_example: Mapped[str] = mapped_column(Text, nullable=False)
    structure_example: Mapped[str] = mapped_column(Text, nullable=False)
    life_example: Mapped[str] = mapped_column(Text, nullable=False)
    what_works: Mapped[str] = mapped_column(Text, nullable=False)
    non_negotiables: Mapped[str | None] = mapped_column(Text, nullable=True)
    cadence: Mapped[Cadence] = mapped_column(SAEnum(Cadence, name="baseline_cadence"), nullable=False)

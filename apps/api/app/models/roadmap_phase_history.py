import uuid
from datetime import date as date_

from sqlalchemy import Boolean, Date, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class RoadmapPhaseHistory(Base):
    """Audit trail of roadmap phase transitions.

    `earned=False` means the user advanced without meeting the phase's gate
    metric -- allowed, but always recorded explicitly rather than silently
    letting someone skip ahead.
    """

    __tablename__ = "roadmap_phase_history"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    from_phase: Mapped[int] = mapped_column(Integer, nullable=False)
    to_phase: Mapped[int] = mapped_column(Integer, nullable=False)
    date: Mapped[date_] = mapped_column(Date, nullable=False)
    earned: Mapped[bool] = mapped_column(Boolean, nullable=False)

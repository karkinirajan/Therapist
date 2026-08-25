import uuid

from sqlalchemy import Boolean, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserRoadmapState(Base):
    """One row per user: current roadmap position and intro-acknowledgement flag."""

    __tablename__ = "user_roadmap_state"

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
    phase_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    intro_acknowledged: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

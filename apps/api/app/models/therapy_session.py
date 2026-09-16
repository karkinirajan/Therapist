import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TherapySessionStatus(str, enum.Enum):
    active = "active"
    ended = "ended"


class TherapySession(Base):
    """A single voice-conversation session. `transcript` is a JSONB list of
    {role: "user" | "assistant", text: str, at: iso8601, crisis_flagged: bool}."""

    __tablename__ = "therapy_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[TherapySessionStatus] = mapped_column(
        SAEnum(TherapySessionStatus, name="therapy_session_status"),
        nullable=False,
        default=TherapySessionStatus.active,
    )
    transcript: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    crisis_flagged: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    llm_input_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    llm_output_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

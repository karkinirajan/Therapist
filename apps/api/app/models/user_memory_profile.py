import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserMemoryProfile(Base):
    """Persisted, summarized long-term memory for the voice therapy feature —
    one row per user, updated in place after every session (never a second
    row inserted). `rolling_summary`/`key_facts` are LLM-authored, not
    user-submitted, so no rigid schema is enforced on `key_facts`."""

    __tablename__ = "user_memory_profiles"

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
    rolling_summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    key_facts: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    session_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

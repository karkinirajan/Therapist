import uuid

from sqlalchemy import Boolean, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TrackingCategory(Base):
    """Reference/seed data: the fixed set of trackable categories. Not user-owned."""

    __tablename__ = "tracking_categories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    key: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)
    label: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)
    is_blocking: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

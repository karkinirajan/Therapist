"""add one-time voice socket tickets

Revision ID: 9c4d2e1f7a6b
Revises: 8a1c4f2e9b3d
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "9c4d2e1f7a6b"
down_revision: str | Sequence[str] | None = "8a1c4f2e9b3d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

def upgrade() -> None:
    op.create_table("voice_socket_tickets", sa.Column("id", sa.UUID(), nullable=False), sa.Column("session_id", sa.UUID(), nullable=False), sa.Column("user_id", sa.UUID(), nullable=False), sa.Column("token_hash", sa.String(length=64), nullable=False), sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False), sa.Column("used_at", sa.DateTime(timezone=True)), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False), sa.ForeignKeyConstraint(["session_id"], ["therapy_sessions.id"], ondelete="CASCADE"), sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("token_hash"))
    op.create_index(op.f("ix_voice_socket_tickets_session_id"), "voice_socket_tickets", ["session_id"])
    op.create_index(op.f("ix_voice_socket_tickets_user_id"), "voice_socket_tickets", ["user_id"])
    op.create_index(op.f("ix_voice_socket_tickets_expires_at"), "voice_socket_tickets", ["expires_at"])

def downgrade() -> None:
    op.drop_index(op.f("ix_voice_socket_tickets_expires_at"), table_name="voice_socket_tickets")
    op.drop_index(op.f("ix_voice_socket_tickets_user_id"), table_name="voice_socket_tickets")
    op.drop_index(op.f("ix_voice_socket_tickets_session_id"), table_name="voice_socket_tickets")
    op.drop_table("voice_socket_tickets")

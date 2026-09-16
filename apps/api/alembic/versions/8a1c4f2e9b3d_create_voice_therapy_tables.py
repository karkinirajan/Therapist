"""create voice therapy tables

Revision ID: 8a1c4f2e9b3d
Revises: 6f32345b654e
Create Date: 2026-09-16 15:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '8a1c4f2e9b3d'
down_revision: str | Sequence[str] | None = '6f32345b654e'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('therapy_sessions',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('status', sa.Enum('active', 'ended', name='therapy_session_status'), nullable=False),
    sa.Column('transcript', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('crisis_flagged', sa.Boolean(), nullable=False),
    sa.Column('llm_input_tokens', sa.Integer(), nullable=False),
    sa.Column('llm_output_tokens', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_therapy_sessions_user_id'), 'therapy_sessions', ['user_id'], unique=False)
    op.create_table('user_memory_profiles',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('rolling_summary', sa.Text(), nullable=False),
    sa.Column('key_facts', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('session_count', sa.Integer(), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_memory_profiles_user_id'), 'user_memory_profiles', ['user_id'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_user_memory_profiles_user_id'), table_name='user_memory_profiles')
    op.drop_table('user_memory_profiles')
    op.drop_index(op.f('ix_therapy_sessions_user_id'), table_name='therapy_sessions')
    op.drop_table('therapy_sessions')
    # Autogenerate doesn't drop the Postgres ENUM type on its own (only DROP
    # TABLE); do it explicitly so downgrade -> upgrade is actually
    # idempotent (same gotcha as 215c39d7dba5 / 60bb5a7d5861).
    sa.Enum(name='therapy_session_status').drop(op.get_bind(), checkfirst=True)

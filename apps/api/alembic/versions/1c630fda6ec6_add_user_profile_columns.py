"""add user profile columns

Revision ID: 1c630fda6ec6
Revises: 9c4d2e1f7a6b
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "1c630fda6ec6"
down_revision: str | Sequence[str] | None = "9c4d2e1f7a6b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("full_name", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("phone", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("username", postgresql.CITEXT(), nullable=True))
    op.create_unique_constraint("uq_users_username", "users", ["username"])


def downgrade() -> None:
    op.drop_constraint("uq_users_username", "users", type_="unique")
    op.drop_column("users", "username")
    op.drop_column("users", "phone")
    op.drop_column("users", "full_name")

"""seed tracking categories

Revision ID: 6f32345b654e
Revises: 60bb5a7d5861
Create Date: 2026-08-26 01:54:35.347099

"""
import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '6f32345b654e'
down_revision: str | Sequence[str] | None = '60bb5a7d5861'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Fixed set of reference/seed rows for tracking_categories. Deliberately not
# app logic -- this is schema-adjacent data the domain can't function
# without (the hard-gate check reads `is_blocking` directly).
_CATEGORIES = [
    {
        "key": "executive_function",
        "label": "Executive Function & Task Follow-Through",
        "description": (
            "Tracks whether you started today's planned tasks and whether they "
            "actually got done -- the two everyday ADHD symptoms that cause the "
            "most day-to-day disruption."
        ),
        "sort_order": 0,
        "is_blocking": True,
    },
    {
        "key": "compulsion_erp",
        "label": "Compulsion & Exposure-Response Tracking",
        "description": (
            "Tracks compulsions resisted vs. performed, plus exposure practice "
            "with SUDS ratings before and after -- the core ERP mechanism, which "
            "only works if it's logged daily."
        ),
        "sort_order": 1,
        "is_blocking": True,
    },
    {
        "key": "mood_anxiety",
        "label": "Mood & Anxiety Regulation",
        "description": (
            "Daily mood, anxiety, and sleep numbers. What matters is the trend "
            "over time, not any single day's reading."
        ),
        "sort_order": 2,
        "is_blocking": True,
    },
    {
        "key": "behavioral_activation",
        "label": "Behavioral Activation & Values-Based Action",
        "description": (
            "One values-linked activity a day -- this measures engagement with "
            "life, not just how symptoms are doing."
        ),
        "sort_order": 3,
        "is_blocking": False,
    },
    {
        "key": "sleep_meds",
        "label": "Sleep, Routine & Medication Adherence",
        "description": (
            "Sleep quality and timing, plus medication adherence -- the most "
            "common silent point of relapse for both ADHD and OCD."
        ),
        "sort_order": 4,
        "is_blocking": True,
    },
    {
        "key": "distortion_awareness",
        "label": "Distortion & Uncertainty-Intolerance Awareness",
        "description": (
            "Which cognitive distortions showed up today, including OCD-specific "
            "ones like thought-action fusion -- keeps the CBT thought-record "
            "framework alive as its own trackable category."
        ),
        "sort_order": 5,
        "is_blocking": False,
    },
]

_tracking_categories = sa.table(
    "tracking_categories",
    sa.column("id", postgresql.UUID(as_uuid=True)),
    sa.column("key", sa.Text),
    sa.column("label", sa.Text),
    sa.column("description", sa.Text),
    sa.column("sort_order", sa.Integer),
    sa.column("is_blocking", sa.Boolean),
)


def upgrade() -> None:
    """Seed the fixed tracking_categories reference rows."""
    op.bulk_insert(
        _tracking_categories,
        [{"id": uuid.uuid4(), **row} for row in _CATEGORIES],
    )


def downgrade() -> None:
    """Remove the seeded tracking_categories rows by key."""
    keys = tuple(row["key"] for row in _CATEGORIES)
    op.execute(
        _tracking_categories.delete().where(_tracking_categories.c.key.in_(keys))
    )

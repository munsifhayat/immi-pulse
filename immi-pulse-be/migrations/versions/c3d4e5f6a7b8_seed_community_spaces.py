"""seed community spaces

Populates the 6 visa-category community spaces that the frontend
mock-up already references. Idempotent — uses INSERT ... ON CONFLICT
so reruns and dev database rebuilds are safe.

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-04-12 09:00:00.000000
"""
import uuid
from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op


revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


SPACES = [
    {
        "slug": "skilled-migration",
        "name": "Skilled Migration",
        "description": (
            "Discuss 189, 190, and 491 visa pathways, points tests, EOI "
            "strategies, and state nominations."
        ),
        "icon": "briefcase",
    },
    {
        "slug": "partner-visas",
        "name": "Partner Visas",
        "description": (
            "Share experiences with 820/801 applications, evidence "
            "requirements, and processing timelines."
        ),
        "icon": "heart",
    },
    {
        "slug": "student-visas",
        "name": "Student Visas",
        "description": (
            "Student visa 500 discussions — work hours, course changes, "
            "CoE requirements, and graduate pathways."
        ),
        "icon": "graduation-cap",
    },
    {
        "slug": "employer-sponsored",
        "name": "Employer Sponsored",
        "description": (
            "482 and 186 visa discussions — employer nominations, labour "
            "market testing, and transition pathways."
        ),
        "icon": "building",
    },
    {
        "slug": "family-parent",
        "name": "Family & Parent Visas",
        "description": (
            "Parent visa 143/103/173 and family stream discussions — "
            "costs, wait times, and documentation."
        ),
        "icon": "users",
    },
    {
        "slug": "general",
        "name": "General Discussion",
        "description": (
            "Open discussions on Australian immigration, settling in, "
            "life after visa grant, and general Q&A."
        ),
        "icon": "message-circle",
    },
]


def upgrade() -> None:
    now = datetime.now(timezone.utc).isoformat()
    for s in SPACES:
        op.execute(
            f"""
            INSERT INTO community_spaces
              (id, slug, name, description, icon, member_count, thread_count, created_at)
            VALUES
              ('{uuid.uuid4()}', '{s["slug"]}', $${s["name"]}$$,
               $${s["description"]}$$, '{s["icon"]}', 0, 0, '{now}')
            ON CONFLICT (slug) DO NOTHING
            """
        )


def downgrade() -> None:
    slugs = ", ".join(f"'{s['slug']}'" for s in SPACES)
    op.execute(f"DELETE FROM community_spaces WHERE slug IN ({slugs})")

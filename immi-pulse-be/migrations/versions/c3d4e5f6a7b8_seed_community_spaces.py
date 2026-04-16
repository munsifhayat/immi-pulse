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
            "Subclass 189, 190, 491 and 191 visa pathways — points test, "
            "EOI strategies, skills assessments, and state nominations."
        ),
        "icon": "briefcase",
    },
    {
        "slug": "partner-visas",
        "name": "Partner & Spouse Visas",
        "description": (
            "Subclass 820/801, 309/100 and 300 applications — relationship "
            "evidence, processing timelines, and bridging visa rights."
        ),
        "icon": "heart",
    },
    {
        "slug": "student-visas",
        "name": "Student Visas",
        "description": (
            "Subclass 500 and 590 discussions — Genuine Student requirement, "
            "work hours, CoE transfers, and course changes."
        ),
        "icon": "graduation-cap",
    },
    {
        "slug": "employer-sponsored",
        "name": "Employer Sponsored",
        "description": (
            "Subclass 482, 186 and 494 visas — employer nominations, TSMIT "
            "thresholds, labour market testing, and transition pathways."
        ),
        "icon": "building",
    },
    {
        "slug": "graduate-post-study",
        "name": "Graduate & Post-Study",
        "description": (
            "Subclass 485 and 476 visas — post-study work rights, duration "
            "changes, skills assessments, and PR pathway planning."
        ),
        "icon": "award",
    },
    {
        "slug": "visitor-tourist",
        "name": "Visitor & Tourist",
        "description": (
            "Subclass 600, 601 and 651 visas — tourist applications, family "
            "visits, refusals, and genuine intent documentation."
        ),
        "icon": "plane",
    },
    {
        "slug": "working-holiday",
        "name": "Working Holiday",
        "description": (
            "Subclass 417 and 462 visas — regional work requirements, "
            "second/third year extensions, and employer issues."
        ),
        "icon": "backpack",
    },
    {
        "slug": "family-parent",
        "name": "Parent & Family Visas",
        "description": (
            "Subclass 143, 173, 103 and 804 parent visas plus child and "
            "carer streams — costs, wait times, and balance of family test."
        ),
        "icon": "users",
    },
    {
        "slug": "citizenship-pr",
        "name": "Citizenship & PR Pathways",
        "description": (
            "Australian citizenship applications, residence requirements, "
            "citizenship test, and permanent residency pathway planning."
        ),
        "icon": "flag",
    },
    {
        "slug": "general",
        "name": "General Discussion",
        "description": (
            "Bridging visas, visa refusals, AAT appeals, settling in "
            "Australia, and anything that doesn't fit another space."
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

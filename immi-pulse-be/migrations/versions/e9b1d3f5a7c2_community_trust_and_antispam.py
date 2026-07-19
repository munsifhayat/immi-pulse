"""trust ladder signals + anti-spam screening columns

Phase 6. Four small additions, no data rewritten, every column nullable or
defaulted so an existing row keeps behaving exactly as it did.

1. ``anon_identities.last_upheld_report_at`` — the recency clock.
   ``upheld_reports`` (from p2) is a lifetime count, which cannot answer "zero
   upheld reports in the last 90 days" without also knowing *when*. Storing the
   timestamp of the most recent one is enough for the policy as written and
   avoids a per-report audit table that nothing else would read. The
   consequence worth naming: an upheld report costs a member 90 days of link
   privileges rather than their permanent record, which is the proportionate
   answer for a room where a moderation call is sometimes wrong.

2. ``content_fingerprint`` on ``community_journeys`` and
   ``community_journey_comments`` — a normalised hash of the body, so the same
   text broadcast across several threads is recognisable in one indexed query
   instead of a scan-and-compare. NULL for bodies too short to fingerprint;
   backfilling existing rows is deliberately NOT done, because the duplicate
   check only needs to see a member's *ongoing* pattern and a backfill would
   retroactively hold content that has been sitting in the feed for months.

3. ``community_reports.reporter_identity_id`` / ``weight`` / ``source``.
   Weighted reports need to know who reported (to weight by their tier) and
   what that report was worth *at the time* — snapshotted rather than derived,
   so a later promotion or demotion cannot silently re-price old reports.
   ``source`` separates member reports from the anti-spam screen's automatic
   holds, so the moderation queue can label them; existing rows default to
   'member', which is what they all are.

4. No enum to alter for the new ``held`` content status: ``status`` is a plain
   String column on every affected table, so the value is added in code alone.
   That is stated here explicitly because its absence from this file would
   otherwise look like an oversight.

Revision ID: e9b1d3f5a7c2
Revises: d7f9b3c5e1a8
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "e9b1d3f5a7c2"
down_revision = "d7f9b3c5e1a8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "anon_identities",
        sa.Column("last_upheld_report_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.add_column(
        "community_journeys",
        sa.Column("content_fingerprint", sa.String(), nullable=True),
    )
    op.create_index(
        "ix_community_journeys_content_fingerprint",
        "community_journeys",
        ["content_fingerprint"],
    )

    op.add_column(
        "community_journey_comments",
        sa.Column("content_fingerprint", sa.String(), nullable=True),
    )
    op.create_index(
        "ix_community_journey_comments_content_fingerprint",
        "community_journey_comments",
        ["content_fingerprint"],
    )

    op.add_column(
        "community_reports",
        sa.Column(
            "reporter_identity_id", postgresql.UUID(as_uuid=True), nullable=True
        ),
    )
    op.create_foreign_key(
        "fk_community_reports_reporter_identity",
        "community_reports",
        "anon_identities",
        ["reporter_identity_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_community_reports_reporter_identity_id",
        "community_reports",
        ["reporter_identity_id"],
    )
    op.add_column(
        "community_reports",
        sa.Column(
            "source",
            sa.String(),
            nullable=False,
            server_default="member",
        ),
    )
    op.create_index(
        "ix_community_reports_source", "community_reports", ["source"]
    )
    op.add_column(
        "community_reports",
        sa.Column("weight", sa.Integer(), nullable=False, server_default="1"),
    )


def downgrade() -> None:
    op.drop_column("community_reports", "weight")
    op.drop_index("ix_community_reports_source", table_name="community_reports")
    op.drop_column("community_reports", "source")
    op.drop_index(
        "ix_community_reports_reporter_identity_id", table_name="community_reports"
    )
    op.drop_constraint(
        "fk_community_reports_reporter_identity",
        "community_reports",
        type_="foreignkey",
    )
    op.drop_column("community_reports", "reporter_identity_id")

    op.drop_index(
        "ix_community_journey_comments_content_fingerprint",
        table_name="community_journey_comments",
    )
    op.drop_column("community_journey_comments", "content_fingerprint")

    op.drop_index(
        "ix_community_journeys_content_fingerprint", table_name="community_journeys"
    )
    op.drop_column("community_journeys", "content_fingerprint")

    op.drop_column("anon_identities", "last_upheld_report_at")

    # Content parked in the new 'held' status would be invisible to a codebase
    # that no longer knows the value, so it is returned to the feed rather than
    # stranded. The reports that held it stay open for a human to work.
    op.execute("UPDATE community_journeys SET status = 'active' WHERE status = 'held'")
    op.execute(
        "UPDATE community_journey_comments SET status = 'active' WHERE status = 'held'"
    )

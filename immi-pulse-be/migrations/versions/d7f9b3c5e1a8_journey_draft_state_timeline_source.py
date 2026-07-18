"""journey draft/published state + timeline provenance

Two changes that together let Phase 4 tell the truth about numbers.

1. ``community_journeys.is_published`` / ``published_at``.
   Saving a wait check now creates a real, owned timeline that nobody else can
   see. Publishing it to the feed is a separate, explicit act. ``status`` could
   not carry this: that column is moderation's axis (active/hidden/removed), and
   a draft is a perfectly healthy row its author simply has not shared. Two
   independent states need two columns, or "hidden" would come to mean both
   "we took this down" and "you haven't posted it yet" — which the moderation
   queue and the member's own profile would then have to disambiguate by
   guessing.

   Backfilled to TRUE for every existing row, so nothing that is public today
   becomes invisible tomorrow.

2. ``community_timelines.source`` — 'member' | 'forum'.
   Timelines collected from public immigration forums (anonymised, normalised;
   see scripts/seed_community_scraped.py) now count toward the published
   community figures, where before they were excluded entirely. That was
   decided on one condition: every figure they feed must state its composition
   in the open — "N reported by members, M collected from public forums". This
   column is what makes that sentence derivable from the data rather than
   asserted in copy. Reversible at runtime via
   ``settings.community_stats_include_forum``; this migration only supplies the
   label.

   The data step is the important half: sample journeys previously had **no**
   ``community_timelines`` row at all (that absence was how they were kept out
   of the stats), so flagging existing rows achieves nothing on its own. The
   INSERT…SELECT below materialises the missing mirror rows from the sample
   journeys' own derived spans. It is guarded by NOT EXISTS so re-running is
   safe, and the down-revision deletes exactly the rows it created.

Revision ID: d7f9b3c5e1a8
Revises: c5e7a9b1d3f6
"""

from alembic import op
import sqlalchemy as sa


revision = "d7f9b3c5e1a8"
down_revision = "c5e7a9b1d3f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- 1. Draft vs published -------------------------------------------
    op.add_column(
        "community_journeys",
        sa.Column(
            "is_published",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )
    op.add_column(
        "community_journeys",
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_community_journeys_is_published",
        "community_journeys",
        ["is_published"],
    )
    # Everything that already exists was published the moment it was created.
    op.execute(
        "UPDATE community_journeys SET published_at = created_at "
        "WHERE published_at IS NULL"
    )

    # --- 2. Timeline provenance ------------------------------------------
    op.add_column(
        "community_timelines",
        sa.Column(
            "source",
            sa.String(),
            nullable=False,
            server_default="member",
        ),
    )
    op.create_index(
        "ix_community_timelines_source", "community_timelines", ["source"]
    )

    # Existing mirror rows that belong to a sample journey are forum-collected;
    # everything else is first-party. (Before this migration a sample journey
    # normally had no mirror row at all, so this mostly catches hand-seeded
    # edge cases — it is here so the label is right regardless of how a row
    # came to exist.)
    op.execute(
        """
        UPDATE community_timelines t
           SET source = 'forum'
          FROM community_journeys j
         WHERE t.journey_id = j.id
           AND j.is_sample = true
        """
    )

    # Materialise the mirror rows the sample journeys never had. Only rows that
    # can actually carry a statistic: a subclass, a lodgement date, and — when
    # the outcome is decided — a decision date.
    op.execute(
        """
        INSERT INTO community_timelines
            (id, subclass_slug, journey_id, lodged_on, decided_on, outcome,
             source, note, author_ip_hash, status, created_at)
        SELECT gen_random_uuid(), j.subclass_slug, j.id, j.lodged_on,
               j.decided_on, j.outcome, 'forum', left(j.note, 280), NULL,
               'active', j.created_at
          FROM community_journeys j
         WHERE j.is_sample = true
           AND j.post_type = 'timeline'
           AND j.status = 'active'
           AND j.subclass_slug IS NOT NULL
           AND j.lodged_on IS NOT NULL
           AND (j.outcome <> 'granted' OR j.decided_on IS NOT NULL)
           AND NOT EXISTS (
                 SELECT 1 FROM community_timelines t WHERE t.journey_id = j.id
               )
        """
    )


def downgrade() -> None:
    # Remove only what the upgrade created: mirror rows for sample journeys.
    # Member-reported rows are untouched.
    op.execute(
        """
        DELETE FROM community_timelines t
         USING community_journeys j
         WHERE t.journey_id = j.id
           AND j.is_sample = true
           AND t.source = 'forum'
        """
    )
    op.drop_index("ix_community_timelines_source", table_name="community_timelines")
    op.drop_column("community_timelines", "source")

    op.drop_index(
        "ix_community_journeys_is_published", table_name="community_journeys"
    )
    op.drop_column("community_journeys", "published_at")
    op.drop_column("community_journeys", "is_published")

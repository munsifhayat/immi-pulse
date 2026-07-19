"""adaptive form flags and journey context fields

Revision ID: d6f0b4c8e2a9
Revises: c4e8a2b6d0f7
Create Date: 2026-07-19

Two halves.

**Reference data.** ``visa_subclasses`` gains the rest of the "what does this
visa need?" flags, alongside ``requires_occupation`` from the previous phase.
Field visibility becomes a property of the visa rather than a branch in the
form, so a 600 Tourist applicant stops being asked whether their employer is an
accredited sponsor.

**Journey context.** Three fields the public trackers prove members want and
currently cram into free text (onshore/offshore, nationality, agent vs
self-lodged), plus ``direct_grant`` — the explicit "no CO contact" assertion.
About one timeline post in five states an absence like that, and today an empty
milestone list is indistinguishable from a confirmed-clean run.

The load-bearing data change is the ``Offshore`` split. ``state`` has been
carrying two different facts: which state nominated the applicant, and whether
they were in Australia at all. Rows holding ``'Offshore'`` are rewritten to the
new ``lodgement_location`` and their ``state`` cleared, because "Offshore" was
never a state and no cohort should pool on it as one.
"""

from alembic import op
import sqlalchemy as sa


revision = "d6f0b4c8e2a9"
down_revision = "c4e8a2b6d0f7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for col in ("requires_state_nomination", "requires_region", "requires_sponsor_type"):
        op.add_column(
            "visa_subclasses",
            sa.Column(
                col, sa.Boolean(), nullable=False, server_default=sa.text("false")
            ),
        )

    op.add_column(
        "community_journeys", sa.Column("lodgement_location", sa.String(), nullable=True)
    )
    op.add_column("community_journeys", sa.Column("nationality", sa.String(), nullable=True))
    op.add_column("community_journeys", sa.Column("lodged_via", sa.String(), nullable=True))
    op.add_column("community_journeys", sa.Column("direct_grant", sa.Boolean(), nullable=True))

    # Move the smuggled signal into its own field. Done as one statement rather
    # than a backfill loop: it touches only the rows that carry the sentinel,
    # and it must be atomic with the column add or a concurrent read sees a
    # journey with neither a state nor a location.
    op.execute(
        "UPDATE community_journeys "
        "SET lodgement_location = 'offshore', state = NULL "
        "WHERE state = 'Offshore'"
    )
    # Everything else was lodged from somewhere in Australia by definition —
    # it named a state. Left NULL rather than assumed: a row that never
    # answered the question should read as unanswered, not as onshore. The
    # form asks every new author.


def downgrade() -> None:
    # Put the sentinel back exactly where it came from, so a re-upgrade is a
    # no-op rather than a double move.
    op.execute(
        "UPDATE community_journeys "
        "SET state = 'Offshore' "
        "WHERE lodgement_location = 'offshore' AND state IS NULL"
    )

    op.drop_column("community_journeys", "direct_grant")
    op.drop_column("community_journeys", "lodged_via")
    op.drop_column("community_journeys", "nationality")
    op.drop_column("community_journeys", "lodgement_location")

    for col in ("requires_sponsor_type", "requires_region", "requires_state_nomination"):
        op.drop_column("visa_subclasses", col)

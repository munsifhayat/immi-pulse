"""split submitter_name into first/last on questionnaire_responses

Revision ID: e2f4a8b1c3d5
Revises: db6ad7c7470d
Create Date: 2026-05-09 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e2f4a8b1c3d5"
down_revision: Union[str, None] = "db6ad7c7470d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "questionnaire_responses",
        sa.Column("submitter_first_name", sa.String(), nullable=True),
    )
    op.add_column(
        "questionnaire_responses",
        sa.Column("submitter_last_name", sa.String(), nullable=True),
    )

    # Backfill: split on the first space. Single-word names go into first_name.
    op.execute(
        """
        UPDATE questionnaire_responses
        SET
            submitter_first_name = CASE
                WHEN submitter_name IS NULL OR btrim(submitter_name) = '' THEN NULL
                WHEN position(' ' IN btrim(submitter_name)) = 0 THEN btrim(submitter_name)
                ELSE split_part(btrim(submitter_name), ' ', 1)
            END,
            submitter_last_name = CASE
                WHEN submitter_name IS NULL OR btrim(submitter_name) = '' THEN NULL
                WHEN position(' ' IN btrim(submitter_name)) = 0 THEN NULL
                ELSE btrim(substring(btrim(submitter_name) FROM position(' ' IN btrim(submitter_name)) + 1))
            END
        """
    )

    op.drop_column("questionnaire_responses", "submitter_name")


def downgrade() -> None:
    op.add_column(
        "questionnaire_responses",
        sa.Column("submitter_name", sa.String(), nullable=True),
    )
    op.execute(
        """
        UPDATE questionnaire_responses
        SET submitter_name = btrim(
            coalesce(submitter_first_name, '') || ' ' || coalesce(submitter_last_name, '')
        )
        WHERE submitter_first_name IS NOT NULL OR submitter_last_name IS NOT NULL
        """
    )
    op.drop_column("questionnaire_responses", "submitter_last_name")
    op.drop_column("questionnaire_responses", "submitter_first_name")

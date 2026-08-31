"""Persist chosen column accent colors.

Revision ID: 007
Revises: 006
Create Date: 2026-08-31
"""

from collections import defaultdict

from alembic import op
import sqlalchemy as sa


revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None

PALETTE = (
    "sky",
    "amber",
    "orange",
    "fuchsia",
    "violet",
    "teal",
    "emerald",
    "rose",
    "cyan",
    "indigo",
)
COLOR_CHECK = (
    "color IN ('sky', 'amber', 'orange', 'fuchsia', 'violet', 'teal', "
    "'emerald', 'rose', 'cyan', 'indigo')"
)


def upgrade() -> None:
    op.add_column("columns", sa.Column("color", sa.String(length=16), nullable=True))

    connection = op.get_bind()
    rows = connection.execute(
        sa.text(
            'SELECT id, project_id, "order" FROM columns ORDER BY project_id, "order", id'
        )
    ).fetchall()
    by_project: dict[str, list[str]] = defaultdict(list)
    for column_id, project_id, _order in rows:
        by_project[project_id].append(column_id)

    for column_ids in by_project.values():
        last_index = len(column_ids) - 1
        for index, column_id in enumerate(column_ids):
            color = "emerald" if index == last_index else PALETTE[index % len(PALETTE)]
            connection.execute(
                sa.text("UPDATE columns SET color = :color WHERE id = :id"),
                {"color": color, "id": column_id},
            )

    op.alter_column("columns", "color", existing_type=sa.String(length=16), nullable=False)
    op.create_check_constraint("ck_columns_color", "columns", COLOR_CHECK)


def downgrade() -> None:
    op.drop_constraint("ck_columns_color", "columns", type_="check")
    op.drop_column("columns", "color")

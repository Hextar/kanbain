"""Task order for within-column sorting.

Revision ID: 005
Revises: 004
Create Date: 2026-08-29
"""

from collections import defaultdict

from alembic import op
import sqlalchemy as sa


revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "tasks",
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_tasks_order", "tasks", ["order"])
    op.create_index("ix_tasks_column_id_order", "tasks", ["column_id", "order"])

    connection = op.get_bind()
    rows = connection.execute(
        sa.text("SELECT id, column_id FROM tasks ORDER BY column_id, created_at, id")
    ).fetchall()
    counts: dict[str, int] = defaultdict(int)
    for task_id, column_id in rows:
        order = counts[column_id]
        counts[column_id] += 1
        connection.execute(
            sa.text('UPDATE tasks SET "order" = :order WHERE id = :id'),
            {"order": order, "id": task_id},
        )

    op.alter_column("tasks", "order", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_tasks_column_id_order", table_name="tasks")
    op.drop_index("ix_tasks_order", table_name="tasks")
    op.drop_column("tasks", "order")

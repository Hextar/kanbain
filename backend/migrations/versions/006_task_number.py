"""Per-project sequential task numbers.

Revision ID: 006
Revises: 005
Create Date: 2026-08-29
"""

from collections import defaultdict

from alembic import op
import sqlalchemy as sa


revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "tasks",
        sa.Column("number", sa.Integer(), nullable=False, server_default="0"),
    )

    connection = op.get_bind()
    rows = connection.execute(
        sa.text(
            "SELECT id, project_id FROM tasks ORDER BY project_id, created_at, id"
        )
    ).fetchall()
    counts: dict[str, int] = defaultdict(int)
    for task_id, project_id in rows:
        counts[project_id] += 1
        connection.execute(
            sa.text("UPDATE tasks SET number = :number WHERE id = :id"),
            {"number": counts[project_id], "id": task_id},
        )

    op.alter_column("tasks", "number", server_default=None)
    op.create_unique_constraint(
        "uq_tasks_project_id_number", "tasks", ["project_id", "number"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_tasks_project_id_number", "tasks", type_="unique")
    op.drop_column("tasks", "number")

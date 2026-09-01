"""Delete nested cards when their parent is deleted.

Revision ID: 009
Revises: 008
Create Date: 2026-09-01
"""

from alembic import op


revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("fk_tasks_parent_id", "tasks", type_="foreignkey")
    op.create_foreign_key(
        "fk_tasks_parent_id",
        "tasks",
        "tasks",
        ["parent_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("fk_tasks_parent_id", "tasks", type_="foreignkey")
    op.create_foreign_key(
        "fk_tasks_parent_id",
        "tasks",
        "tasks",
        ["parent_id"],
        ["id"],
        ondelete="SET NULL",
    )

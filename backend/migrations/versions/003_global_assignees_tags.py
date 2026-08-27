"""Global assignees and tags catalogs.

Revision ID: 003
Revises: 002
Create Date: 2026-08-25
"""

from alembic import op
import sqlalchemy as sa


revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "assignees",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "tags",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    # Existing assignee_ids pointed at project_members; clear before retargeting FK.
    op.execute(sa.text("UPDATE tasks SET assignee_id = NULL"))
    op.drop_constraint("fk_tasks_assignee_id", "tasks", type_="foreignkey")
    op.create_foreign_key(
        "fk_tasks_assignee_id",
        "tasks",
        "assignees",
        ["assignee_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_tasks_assignee_id", "tasks", type_="foreignkey")
    op.execute(sa.text("UPDATE tasks SET assignee_id = NULL"))
    op.create_foreign_key(
        "fk_tasks_assignee_id",
        "tasks",
        "project_members",
        ["assignee_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.drop_table("tags")
    op.drop_table("assignees")

"""Project planner status fields.

Revision ID: 004
Revises: 003
Create Date: 2026-08-27
"""

from alembic import op
import sqlalchemy as sa


revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column("plan_status", sa.String(length=16), nullable=False, server_default="ready"),
    )
    op.add_column("projects", sa.Column("plan_error", sa.Text(), nullable=True))
    op.add_column("projects", sa.Column("plan_markdown", sa.Text(), nullable=True))
    op.create_check_constraint(
        "ck_projects_plan_status",
        "projects",
        "plan_status IN ('planning', 'ready', 'failed')",
    )
    op.alter_column("projects", "plan_status", server_default=None)


def downgrade() -> None:
    op.drop_constraint("ck_projects_plan_status", "projects", type_="check")
    op.drop_column("projects", "plan_markdown")
    op.drop_column("projects", "plan_error")
    op.drop_column("projects", "plan_status")

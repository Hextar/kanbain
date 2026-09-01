"""Persist planner thought effort and live plan phase.

Revision ID: 008
Revises: 007
Create Date: 2026-09-01
"""

from alembic import op
import sqlalchemy as sa


revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column("thought_effort", sa.String(length=16), nullable=False, server_default="medium"),
    )
    op.add_column("projects", sa.Column("plan_phase", sa.String(length=16), nullable=True))
    op.create_check_constraint(
        "ck_projects_thought_effort",
        "projects",
        "thought_effort IN ('low', 'medium', 'high', 'max')",
    )
    op.create_check_constraint(
        "ck_projects_plan_phase",
        "projects",
        "plan_phase IS NULL OR plan_phase IN ('exploring', 'decomposing', 'generating', 'reviewing', 'revising')",
    )
    op.alter_column("projects", "thought_effort", server_default=None)


def downgrade() -> None:
    op.drop_constraint("ck_projects_plan_phase", "projects", type_="check")
    op.drop_constraint("ck_projects_thought_effort", "projects", type_="check")
    op.drop_column("projects", "plan_phase")
    op.drop_column("projects", "thought_effort")

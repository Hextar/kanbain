"""Project-centric board: projects, members, milestones, task planning fields.

Revision ID: 002
Revises: 001
Create Date: 2026-08-24

"""

from datetime import datetime, timezone
from uuid import uuid4

from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "projects",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("goal", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("prd_url", sa.String(length=2048), nullable=True),
        sa.Column("design_urls", sa.JSON(), nullable=True),
        sa.Column("repo_url", sa.String(length=2048), nullable=True),
        sa.Column("deadline_kind", sa.String(length=32), nullable=False),
        sa.Column("deadline_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("methodology", sa.String(length=32), nullable=False),
        sa.Column("quality_bar", sa.String(length=32), nullable=False),
        sa.Column("risk_tolerance", sa.String(length=16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "deadline_kind IN ('hard', 'nice_to_have', 'ongoing')",
            name="ck_projects_deadline_kind",
        ),
        sa.CheckConstraint("methodology IN ('kanban', 'scrum')", name="ck_projects_methodology"),
        sa.CheckConstraint(
            "quality_bar IN ('mvp', 'production_grade')",
            name="ck_projects_quality_bar",
        ),
        sa.CheckConstraint(
            "risk_tolerance IN ('low', 'medium', 'high')",
            name="ck_projects_risk_tolerance",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "project_members",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("project_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=255), nullable=True),
        sa.Column("seniority", sa.String(length=32), nullable=True),
        sa.Column("capacity", sa.Numeric(precision=6, scale=2), nullable=True),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_project_members_project_id"), "project_members", ["project_id"])
    op.create_table(
        "milestones",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("project_id", sa.String(length=36), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_milestones_project_id"), "milestones", ["project_id"])

    op.add_column("columns", sa.Column("project_id", sa.String(length=36), nullable=True))
    op.add_column("tasks", sa.Column("project_id", sa.String(length=36), nullable=True))
    op.add_column("tasks", sa.Column("parent_id", sa.String(length=36), nullable=True))
    op.add_column(
        "tasks",
        sa.Column("work_kind", sa.String(length=16), nullable=False, server_default="task"),
    )
    op.add_column("tasks", sa.Column("acceptance_criteria", sa.JSON(), nullable=True))
    op.add_column("tasks", sa.Column("estimate_tshirt", sa.String(length=8), nullable=True))
    op.add_column("tasks", sa.Column("estimate_points", sa.Integer(), nullable=True))
    op.add_column("tasks", sa.Column("estimate_hours", sa.Numeric(precision=8, scale=2), nullable=True))
    op.add_column("tasks", sa.Column("assignee_id", sa.String(length=36), nullable=True))
    op.add_column("tasks", sa.Column("milestone_id", sa.String(length=36), nullable=True))

    op.create_table(
        "task_dependencies",
        sa.Column("task_id", sa.String(length=36), nullable=False),
        sa.Column("depends_on_id", sa.String(length=36), nullable=False),
        sa.ForeignKeyConstraint(["depends_on_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("task_id", "depends_on_id"),
    )

    conn = op.get_bind()
    column_count = conn.execute(sa.text("SELECT COUNT(*) FROM columns")).scalar()
    project_count = conn.execute(sa.text("SELECT COUNT(*) FROM projects")).scalar()
    if column_count and not project_count:
        conn.execute(
            sa.text(
                """
                INSERT INTO projects (
                    id, name, deadline_kind, methodology, quality_bar, risk_tolerance, created_at
                )
                VALUES (
                    :id, :name, 'ongoing', 'kanban', 'mvp', 'medium', :created_at
                )
                """
            ),
            {
                "id": str(uuid4()),
                "name": "Untitled project",
                "created_at": datetime.now(timezone.utc),
            },
        )

    conn.execute(
        sa.text(
            """
            UPDATE columns
            SET project_id = (SELECT id FROM projects ORDER BY created_at LIMIT 1)
            WHERE project_id IS NULL
            """
        )
    )
    conn.execute(
        sa.text(
            """
            UPDATE tasks
            SET project_id = (
                SELECT columns.project_id FROM columns WHERE columns.id = tasks.column_id
            )
            WHERE project_id IS NULL
            """
        )
    )

    op.alter_column("columns", "project_id", existing_type=sa.String(length=36), nullable=False)
    op.alter_column("tasks", "project_id", existing_type=sa.String(length=36), nullable=False)

    op.create_foreign_key(
        "fk_columns_project_id",
        "columns",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index(op.f("ix_columns_project_id"), "columns", ["project_id"])
    op.create_foreign_key(
        "fk_tasks_project_id",
        "tasks",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_tasks_parent_id",
        "tasks",
        "tasks",
        ["parent_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_tasks_assignee_id",
        "tasks",
        "project_members",
        ["assignee_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_tasks_milestone_id",
        "tasks",
        "milestones",
        ["milestone_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(op.f("ix_tasks_project_id"), "tasks", ["project_id"])
    op.create_index(op.f("ix_tasks_parent_id"), "tasks", ["parent_id"])
    op.create_index(op.f("ix_tasks_assignee_id"), "tasks", ["assignee_id"])
    op.create_index(op.f("ix_tasks_milestone_id"), "tasks", ["milestone_id"])
    op.create_check_constraint(
        "ck_tasks_work_kind",
        "tasks",
        "work_kind IN ('epic', 'story', 'task')",
    )
    op.create_check_constraint(
        "ck_tasks_estimate_tshirt",
        "tasks",
        "estimate_tshirt IS NULL OR estimate_tshirt IN ('xs', 's', 'm', 'l', 'xl')",
    )


def downgrade():
    op.drop_constraint("ck_tasks_estimate_tshirt", "tasks", type_="check")
    op.drop_constraint("ck_tasks_work_kind", "tasks", type_="check")
    op.drop_index(op.f("ix_tasks_milestone_id"), table_name="tasks")
    op.drop_index(op.f("ix_tasks_assignee_id"), table_name="tasks")
    op.drop_index(op.f("ix_tasks_parent_id"), table_name="tasks")
    op.drop_index(op.f("ix_tasks_project_id"), table_name="tasks")
    op.drop_constraint("fk_tasks_milestone_id", "tasks", type_="foreignkey")
    op.drop_constraint("fk_tasks_assignee_id", "tasks", type_="foreignkey")
    op.drop_constraint("fk_tasks_parent_id", "tasks", type_="foreignkey")
    op.drop_constraint("fk_tasks_project_id", "tasks", type_="foreignkey")
    op.drop_constraint("fk_columns_project_id", "columns", type_="foreignkey")
    op.drop_index(op.f("ix_columns_project_id"), table_name="columns")
    op.drop_table("task_dependencies")
    op.drop_column("tasks", "milestone_id")
    op.drop_column("tasks", "assignee_id")
    op.drop_column("tasks", "estimate_hours")
    op.drop_column("tasks", "estimate_points")
    op.drop_column("tasks", "estimate_tshirt")
    op.drop_column("tasks", "acceptance_criteria")
    op.drop_column("tasks", "work_kind")
    op.drop_column("tasks", "parent_id")
    op.drop_column("tasks", "project_id")
    op.drop_column("columns", "project_id")
    op.drop_index(op.f("ix_milestones_project_id"), table_name="milestones")
    op.drop_table("milestones")
    op.drop_index(op.f("ix_project_members_project_id"), table_name="project_members")
    op.drop_table("project_members")
    op.drop_table("projects")

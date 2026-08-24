"""Initial columns and tasks tables.

Revision ID: 001
Revises:
Create Date: 2026-08-24

"""

from alembic import op
import sqlalchemy as sa

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "columns",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_columns_order"), "columns", ["order"], unique=False)
    op.create_table(
        "tasks",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("column_id", sa.String(length=36), nullable=False),
        sa.Column("description", sa.String(length=4000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("priority", sa.String(length=16), nullable=True),
        sa.Column("category", sa.String(length=255), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column("attachments", sa.JSON(), nullable=True),
        sa.Column("comments", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(["column_id"], ["columns.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_tasks_column_id"), "tasks", ["column_id"], unique=False)


def downgrade():
    op.drop_index(op.f("ix_tasks_column_id"), table_name="tasks")
    op.drop_table("tasks")
    op.drop_index(op.f("ix_columns_order"), table_name="columns")
    op.drop_table("columns")

"""Users, organizations, memberships, and org-scoped catalogs.

Revision ID: 011
Revises: 010
Create Date: 2026-09-04
"""

from alembic import op
import sqlalchemy as sa


revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None

MIGRATED_ORG_ID = "00000000-0000-4000-8000-000000000001"


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("google_sub", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("google_sub"),
    )
    op.create_table(
        "organizations",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "memberships",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.CheckConstraint("role IN ('owner')", name="ck_memberships_role"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "organization_id", name="uq_memberships_user_org"),
    )
    op.create_index("ix_memberships_user_id", "memberships", ["user_id"])
    op.create_index("ix_memberships_organization_id", "memberships", ["organization_id"])

    op.add_column("projects", sa.Column("organization_id", sa.String(length=36), nullable=True))
    op.add_column("assignees", sa.Column("organization_id", sa.String(length=36), nullable=True))
    op.add_column("tags", sa.Column("organization_id", sa.String(length=36), nullable=True))

    bind = op.get_bind()
    needs_backfill = bind.execute(sa.text("SELECT 1 FROM projects LIMIT 1")).first()
    needs_catalog = bind.execute(
        sa.text("SELECT 1 FROM assignees LIMIT 1")
    ).first() or bind.execute(sa.text("SELECT 1 FROM tags LIMIT 1")).first()
    if needs_backfill or needs_catalog:
        bind.execute(
            sa.text(
                "INSERT INTO organizations (id, name, created_at) "
                "VALUES (:id, :name, CURRENT_TIMESTAMP)"
            ),
            {"id": MIGRATED_ORG_ID, "name": "Migrated"},
        )
        bind.execute(
            sa.text("UPDATE projects SET organization_id = :id WHERE organization_id IS NULL"),
            {"id": MIGRATED_ORG_ID},
        )
        bind.execute(
            sa.text("UPDATE assignees SET organization_id = :id WHERE organization_id IS NULL"),
            {"id": MIGRATED_ORG_ID},
        )
        bind.execute(
            sa.text("UPDATE tags SET organization_id = :id WHERE organization_id IS NULL"),
            {"id": MIGRATED_ORG_ID},
        )

    op.alter_column("projects", "organization_id", existing_type=sa.String(length=36), nullable=False)
    op.alter_column("assignees", "organization_id", existing_type=sa.String(length=36), nullable=False)
    op.alter_column("tags", "organization_id", existing_type=sa.String(length=36), nullable=False)

    op.create_foreign_key(
        "fk_projects_organization_id",
        "projects",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_projects_organization_id", "projects", ["organization_id"])
    op.create_foreign_key(
        "fk_assignees_organization_id",
        "assignees",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_assignees_organization_id", "assignees", ["organization_id"])
    op.create_foreign_key(
        "fk_tags_organization_id",
        "tags",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_tags_organization_id", "tags", ["organization_id"])

    op.drop_constraint("assignees_name_key", "assignees", type_="unique")
    op.drop_constraint("tags_name_key", "tags", type_="unique")
    op.create_unique_constraint("uq_assignees_org_name", "assignees", ["organization_id", "name"])
    op.create_unique_constraint("uq_tags_org_name", "tags", ["organization_id", "name"])


def downgrade() -> None:
    op.drop_constraint("uq_tags_org_name", "tags", type_="unique")
    op.drop_constraint("uq_assignees_org_name", "assignees", type_="unique")
    op.create_unique_constraint("tags_name_key", "tags", ["name"])
    op.create_unique_constraint("assignees_name_key", "assignees", ["name"])

    op.drop_constraint("fk_tags_organization_id", "tags", type_="foreignkey")
    op.drop_index("ix_tags_organization_id", table_name="tags")
    op.drop_column("tags", "organization_id")
    op.drop_constraint("fk_assignees_organization_id", "assignees", type_="foreignkey")
    op.drop_index("ix_assignees_organization_id", table_name="assignees")
    op.drop_column("assignees", "organization_id")
    op.drop_constraint("fk_projects_organization_id", "projects", type_="foreignkey")
    op.drop_index("ix_projects_organization_id", table_name="projects")
    op.drop_column("projects", "organization_id")

    op.drop_index("ix_memberships_organization_id", table_name="memberships")
    op.drop_index("ix_memberships_user_id", table_name="memberships")
    op.drop_table("memberships")
    op.drop_table("organizations")
    op.drop_table("users")

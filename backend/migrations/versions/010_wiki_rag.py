"""Wiki RAG tables, plan warning, and extra plan phases.

Revision ID: 010
Revises: 009
Create Date: 2026-09-03
"""

from alembic import op
import sqlalchemy as sa


revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.drop_constraint("ck_projects_plan_phase", "projects", type_="check")
    op.create_check_constraint(
        "ck_projects_plan_phase",
        "projects",
        "plan_phase IS NULL OR plan_phase IN "
        "('classifying', 'retrieving', 'ingesting', 'exploring', "
        "'decomposing', 'generating', 'reviewing', 'revising')",
    )
    op.add_column("projects", sa.Column("plan_warning", sa.Text(), nullable=True))
    op.create_table(
        "wiki_sources",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("domain_slug", sa.String(length=64), nullable=False),
        sa.Column("origin", sa.String(length=16), nullable=False),
        sa.Column("locator", sa.String(length=2048), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("license", sa.String(length=255), nullable=True),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("promoted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("origin", "locator", name="uq_wiki_sources_origin_locator"),
    )
    op.create_index("ix_wiki_sources_domain_slug", "wiki_sources", ["domain_slug"])
    op.create_table(
        "wiki_chunks",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("source_id", sa.String(length=36), nullable=False),
        sa.Column("domain_slug", sa.String(length=64), nullable=False),
        sa.Column("heading", sa.String(length=512), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("parent_text", sa.Text(), nullable=False),
        sa.Column("token_count", sa.Integer(), nullable=False),
        sa.Column("embedding", sa.JSON(), nullable=True),
        sa.Column("tsv", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["source_id"], ["wiki_sources.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_wiki_chunks_source_id", "wiki_chunks", ["source_id"])
    op.create_index("ix_wiki_chunks_domain_slug", "wiki_chunks", ["domain_slug"])
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TABLE wiki_chunks ADD COLUMN IF NOT EXISTS embedding_vec vector(1536)")


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TABLE wiki_chunks DROP COLUMN IF EXISTS embedding_vec")
    op.drop_index("ix_wiki_chunks_domain_slug", table_name="wiki_chunks")
    op.drop_index("ix_wiki_chunks_source_id", table_name="wiki_chunks")
    op.drop_table("wiki_chunks")
    op.drop_index("ix_wiki_sources_domain_slug", table_name="wiki_sources")
    op.drop_table("wiki_sources")
    op.drop_column("projects", "plan_warning")
    op.drop_constraint("ck_projects_plan_phase", "projects", type_="check")
    op.create_check_constraint(
        "ck_projects_plan_phase",
        "projects",
        "plan_phase IS NULL OR plan_phase IN "
        "('exploring', 'decomposing', 'generating', 'reviewing', 'revising')",
    )

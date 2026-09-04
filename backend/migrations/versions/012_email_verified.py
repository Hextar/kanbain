"""Add users.email_verified_at for activation.

Revision ID: 012
Revises: 011
Create Date: 2026-09-04
"""

from alembic import op
import sqlalchemy as sa


revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute(
        sa.text(
            "UPDATE users SET email_verified_at = COALESCE(created_at, CURRENT_TIMESTAMP) "
            "WHERE email_verified_at IS NULL"
        )
    )


def downgrade() -> None:
    op.drop_column("users", "email_verified_at")

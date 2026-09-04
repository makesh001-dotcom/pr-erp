"""add user permissions and RBAC admin flags

Revision ID: 31b1ee2a5235
Revises: f1b01d542034
Create Date: 2026-08-31 15:28:58.474538

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "31b1ee2a5235"
down_revision: Union[str, Sequence[str], None] = "f1b01d542034"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---------------------------------------------------------
    # 1. Add system-admin flag to roles
    # ---------------------------------------------------------

    op.add_column(
        "roles",
        sa.Column(
            "is_system_admin",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    # Make the existing Admin role the system administrator role.
    #
    # We intentionally use LOWER() so this works whether the
    # existing role is "Admin", "admin", "ADMIN", etc.
    op.execute(
        """
        UPDATE roles
        SET is_system_admin = TRUE
        WHERE LOWER(name) = 'admin';
        """
    )

    # ---------------------------------------------------------
    # 2. Add forced-password-change flag to users
    # ---------------------------------------------------------

    op.add_column(
        "users",
        sa.Column(
            "must_change_password",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    # ---------------------------------------------------------
    # 3. Create individual user-permission overrides
    # ---------------------------------------------------------

    op.create_table(
        "user_permissions",
        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "permission_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "granted",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["permission_id"],
            ["permissions.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "permission_id",
            name="uq_user_permission",
        ),
    )

    op.create_index(
        op.f("ix_user_permissions_id"),
        "user_permissions",
        ["id"],
        unique=False,
    )


def downgrade() -> None:
    # Remove user permissions table
    op.drop_index(
        op.f("ix_user_permissions_id"),
        table_name="user_permissions",
    )

    op.drop_table("user_permissions")

    # Remove forced-password-change flag
    op.drop_column(
        "users",
        "must_change_password",
    )

    # Remove system-admin flag
    op.drop_column(
        "roles",
        "is_system_admin",
    )

"""add_is_active_to_clients

Revision ID: 859e3daaae54
Revises: 33a3fa12007d
Create Date: 2026-07-02 11:05:31.240152

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '859e3daaae54'
down_revision: Union[str, Sequence[str], None] = '33a3fa12007d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add is_active with default True for existing rows
    op.add_column('clients', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'))
    op.alter_column('clients', 'is_active', server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('clients', 'is_active')
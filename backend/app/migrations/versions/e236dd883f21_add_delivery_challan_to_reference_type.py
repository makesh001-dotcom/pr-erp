"""add_delivery_challan_to_reference_type

Revision ID: e236dd883f21
Revises: 86142d76481e
Create Date: 2026-07-20 12:04:55.969673

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'e236dd883f21'
down_revision: Union[str, Sequence[str], None] = '86142d76481e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add DELIVERY_CHALLAN to referencetype enum"""
    # PostgreSQL 9.1+ supports ALTER TYPE ADD VALUE
    op.execute("ALTER TYPE referencetype ADD VALUE IF NOT EXISTS 'DELIVERY_CHALLAN'")


def downgrade() -> None:
    """Remove DELIVERY_CHALLAN from referencetype enum"""
    # Note: PostgreSQL doesn't support removing enum values directly.
    # This is a safe downgrade that won't break if DELIVERY_CHALLAN was used.
    # For a full removal, you'd need to:
    # 1. Create new enum without the value
    # 2. Update all tables to use new enum
    # 3. Drop old enum
    # This is rarely needed in practice.
    pass
"""add_display_type_to_delivery_challan

Revision ID: f1b01d542034
Revises: 4ffd49def0f5
Create Date: 2026-07-25 11:46:38.254191

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f1b01d542034'
down_revision: Union[str, Sequence[str], None] = '4ffd49def0f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

dc_display_type = postgresql.ENUM(
    'RETURN', 'NON_RETURN', 'DEMO', 'FREE_OF_COST', 
    name='dcdisplaytype'
)

def upgrade() -> None:
    # 1. Create the Enum type in PostgreSQL
    dc_display_type.create(op.get_bind(), checkfirst=True)
    
    # 2. Add the column using the created enum type
    op.add_column(
        'delivery_challans',
        sa.Column('display_type', dc_display_type, nullable=True)
    )

def downgrade() -> None:
    # 1. Drop the column first
    op.drop_column('delivery_challans', 'display_type')
    
    # 2. Drop the Enum type from PostgreSQL
    dc_display_type.drop(op.get_bind(), checkfirst=True)

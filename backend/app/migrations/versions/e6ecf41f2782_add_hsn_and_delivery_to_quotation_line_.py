"""add hsn and delivery to quotation line item

Revision ID: e6ecf41f2782
Revises: 85fe97398a63
Create Date: 2026-06-24 11:18:25.478799

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e6ecf41f2782'
down_revision: Union[str, Sequence[str], None] = '85fe97398a63'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column(
        'quotation_line_item',
        sa.Column('hsn_code', sa.String(length=50), nullable=True)
    )
    op.add_column(
        'quotation_line_item',
        sa.Column('delivery_type', sa.String(length=100), nullable=True)
    )

def downgrade():
    op.drop_column('quotation_line_item', 'delivery_type')
    op.drop_column('quotation_line_item', 'hsn_code')

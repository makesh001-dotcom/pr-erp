"""add_sales_to_database

Revision ID: 33a3fa12007d
Revises: c6746820a0d9
Create Date: 2026-07-01 10:09:33.782973

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '33a3fa12007d'
down_revision: Union[str, Sequence[str], None] = 'c6746820a0d9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
        
     # Create tables (enums auto-create)
    op.create_table('sales_counter',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('current_count', sa.Integer(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('sales_outward',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('sales_no', sa.String(length=30), nullable=False),
    sa.Column('client_id', sa.Integer(), nullable=False),
    sa.Column('client_name', sa.String(length=200), nullable=False),
    sa.Column('client_gstin', sa.String(length=20), nullable=True),
    sa.Column('invoice_no', sa.String(length=100), nullable=True),
    sa.Column('invoice_date', sa.DateTime(), nullable=True),
    sa.Column('sales_type', sa.Enum('NORMAL_SALE', 'DEMO_TO_CUSTOMER', 'DEMO_RETURN_TO_SUPPLIER', 'FREE_OF_COST', 'WARRANTY_REPLACEMENT', 'INTERNAL_USE', name='salestype'), nullable=False),
    sa.Column('status', sa.Enum('DRAFT', 'POSTED', 'CANCELLED', name='salesstatus'), nullable=False),
    sa.Column('total_amount', sa.Numeric(precision=14, scale=2), nullable=False),
    sa.Column('tax_amount', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('grand_total', sa.Numeric(precision=14, scale=2), nullable=False),
    sa.Column('courier_name', sa.String(length=100), nullable=True),
    sa.Column('delivered_by', sa.String(length=100), nullable=True),
    sa.Column('remarks', sa.String(length=500), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sales_outward_client_id'), 'sales_outward', ['client_id'], unique=False)
    op.create_index(op.f('ix_sales_outward_created_at'), 'sales_outward', ['created_at'], unique=False)
    op.create_index(op.f('ix_sales_outward_id'), 'sales_outward', ['id'], unique=False)
    op.create_index(op.f('ix_sales_outward_sales_no'), 'sales_outward', ['sales_no'], unique=True)
    
    op.create_table('sales_item',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('sales_id', sa.Integer(), nullable=False),
    sa.Column('model_id', sa.Integer(), nullable=False),
    sa.Column('model_no', sa.String(length=100), nullable=False),
    sa.Column('description', sa.String(length=255), nullable=True),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('unit_price', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('total_price', sa.Numeric(precision=14, scale=2), nullable=False),
    sa.Column('remarks', sa.String(length=500), nullable=True),
    sa.ForeignKeyConstraint(['model_id'], ['model.id'], ),
    sa.ForeignKeyConstraint(['sales_id'], ['sales_outward.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sales_item_id'), 'sales_item', ['id'], unique=False)
    op.create_index(op.f('ix_sales_item_model_id'), 'sales_item', ['model_id'], unique=False)
    op.create_index(op.f('ix_sales_item_sales_id'), 'sales_item', ['sales_id'], unique=False)
    
    op.create_table('sales_item_serials',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('sales_item_id', sa.Integer(), nullable=False),
    sa.Column('serial_number', sa.String(length=100), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['sales_item_id'], ['sales_item.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sales_item_serials_id'), 'sales_item_serials', ['id'], unique=False)
    op.create_index(op.f('ix_sales_item_serials_sales_item_id'), 'sales_item_serials', ['sales_item_id'], unique=False)
    op.create_index(op.f('ix_sales_item_serials_serial_number'), 'sales_item_serials', ['serial_number'], unique=True)  # ⭐ UNIQUE
    
    # ⭐ Add sales_item_id to stock_ledger (NOT sales_id)
    op.add_column('stock_ledger', sa.Column('sales_item_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_stock_ledger_sales_item_id'), 'stock_ledger', ['sales_item_id'], unique=False)
    op.create_foreign_key(None, 'stock_ledger', 'sales_item', ['sales_item_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(None, 'stock_ledger', type_='foreignkey')
    op.drop_index(op.f('ix_stock_ledger_sales_item_id'), table_name='stock_ledger')
    op.drop_column('stock_ledger', 'sales_item_id')
    
    op.drop_index(op.f('ix_sales_item_serials_serial_number'), table_name='sales_item_serials')
    op.drop_index(op.f('ix_sales_item_serials_sales_item_id'), table_name='sales_item_serials')
    op.drop_index(op.f('ix_sales_item_serials_id'), table_name='sales_item_serials')
    op.drop_table('sales_item_serials')
    op.drop_index(op.f('ix_sales_item_sales_id'), table_name='sales_item')
    op.drop_index(op.f('ix_sales_item_model_id'), table_name='sales_item')
    op.drop_index(op.f('ix_sales_item_id'), table_name='sales_item')
    op.drop_table('sales_item')
    op.drop_index(op.f('ix_sales_outward_sales_no'), table_name='sales_outward')
    op.drop_index(op.f('ix_sales_outward_id'), table_name='sales_outward')
    op.drop_index(op.f('ix_sales_outward_created_at'), table_name='sales_outward')
    op.drop_index(op.f('ix_sales_outward_client_id'), table_name='sales_outward')
    op.drop_table('sales_outward')
    op.drop_table('sales_counter')
    
    sa.Enum(name='salesstatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='salestype').drop(op.get_bind(), checkfirst=True)
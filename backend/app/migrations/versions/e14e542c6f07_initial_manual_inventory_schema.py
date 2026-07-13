"""initial_manual_inventory_schema

Revision ID: e14e542c6f07
Revises: 
Create Date: 2026-06-10 10:59:24.676702

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e14e542c6f07'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema safely preserving data and quotation_counters."""
    # 1. Create the stock ledger system
    op.create_table('stock_ledger',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('model_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('movement_type', sa.Enum('INWARD', 'OUTWARD', 'ADJUSTMENT', name='movementtype'), nullable=False),
        sa.Column('status', sa.Enum('STANDARD', 'PRE_ORDER', name='orderstatus'), nullable=False),
        sa.Column('reference_id', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['model_id'], ['model.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_stock_ledger_id'), 'stock_ledger', ['id'], unique=False)
    
    # Preserving quotation counters
    # op.drop_table('quotation_counters')
    
    op.create_index(op.f('ix_manufacturer_name'), 'manufacturer', ['name'], unique=True)
    
    # 2. THE WORKAROUND: Add 'sku' and 'price' as NULLABLE columns initially so PostgreSQL doesn't choke
    op.add_column('model', sa.Column('sku', sa.String(length=100), nullable=True))
    op.add_column('model', sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=True))
    
    # 3. Backfill existing testing data with safe default placeholders
    # It will dynamically append the item ID to make the temporary SKU unique!
    op.execute("UPDATE model SET sku = 'TEMP-SKU-' || id WHERE sku IS NULL")
    op.execute("UPDATE model SET price = 0.00 WHERE price IS NULL")
    
    # 4. Now that no rows contain null values, it is completely safe to enforce NOT NULL
    op.alter_column('model', 'sku', nullable=False)
    op.alter_column('model', 'price', nullable=False)
    
    # 5. Clean up other constraints and indexes normally
    op.alter_column('model', 'description',
               existing_type=sa.VARCHAR(),
               nullable=True)
    op.create_index(op.f('ix_model_id'), 'model', ['id'], unique=False)
    op.create_index(op.f('ix_model_model_no'), 'model', ['model_no'], unique=False)
    op.create_index(op.f('ix_model_sku'), 'model', ['sku'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_model_sku'), table_name='model')
    op.drop_index(op.f('ix_model_model_no'), table_name='model')
    op.drop_index(op.f('ix_model_id'), table_name='model')
    op.alter_column('model', 'description',
               existing_type=sa.VARCHAR(),
               nullable=False)
    op.drop_column('model', 'price')
    op.drop_column('model', 'sku')
    op.drop_index(op.f('ix_manufacturer_name'), table_name='manufacturer')
    
    # SAFETY FIX: Removed the duplicate create_table block for quotation_counters here
    
    op.drop_index(op.f('ix_stock_ledger_id'), table_name='stock_ledger')
    op.drop_table('stock_ledger')
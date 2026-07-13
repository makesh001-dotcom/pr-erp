"""create purchase inward tables

Revision ID: c6746820a0d9
Revises: 892b73f888d8
Create Date: 2026-06-29 17:46:31.266993

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c6746820a0d9'
down_revision: Union[str, Sequence[str], None] = '892b73f888d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    
    # Create enum objects
    purchasetype_enum = sa.Enum('NORMAL_PURCHASE', 'DEMO_FROM_SUPPLIER', 'DEMO_RETURN_FROM_CUSTOMER', name='purchasetype')
    purchasestatus_enum = sa.Enum('DRAFT', 'POSTED', 'CANCELLED', name='purchasestatus')
    paymentstatus_enum = sa.Enum('UNPAID', 'PARTIAL', 'PAID', name='paymentstatus')
    referencetype_enum = sa.Enum('PURCHASE', 'SALES', 'RETURN', 'ADJUSTMENT', 'WARRANTY', 'FOC', 'DEMO', name='referencetype')
    
    # Create tables (purchasetype, purchasestatus, paymentstatus auto-create here)
    op.create_table('purchase_counter',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('current_count', sa.Integer(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('purchase_inward',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('purchase_no', sa.String(length=30), nullable=False),
    sa.Column('supplier_id', sa.Integer(), nullable=False),
    sa.Column('supplier_name', sa.String(length=200), nullable=False),
    sa.Column('supplier_gstin', sa.String(length=20), nullable=True),
    sa.Column('supplier_invoice_no', sa.String(length=100), nullable=True),
    sa.Column('supplier_invoice_date', sa.DateTime(), nullable=True),
    sa.Column('purchase_type', purchasetype_enum, nullable=False),
    sa.Column('status', purchasestatus_enum, nullable=False),
    sa.Column('payment_status', paymentstatus_enum, nullable=False),
    sa.Column('total_amount', sa.Numeric(precision=14, scale=2), nullable=False),
    sa.Column('tax_amount', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('grand_total', sa.Numeric(precision=14, scale=2), nullable=False),
    sa.Column('paid_amount', sa.Numeric(precision=14, scale=2), nullable=False),
    sa.Column('payment_due_date', sa.DateTime(), nullable=True),
    sa.Column('expected_return_date', sa.DateTime(), nullable=True),
    sa.Column('courier_name', sa.String(length=100), nullable=True),
    sa.Column('delivered_by', sa.String(length=100), nullable=True),
    sa.Column('remarks', sa.String(length=500), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_purchase_inward_created_at'), 'purchase_inward', ['created_at'], unique=False)
    op.create_index(op.f('ix_purchase_inward_id'), 'purchase_inward', ['id'], unique=False)
    op.create_index(op.f('ix_purchase_inward_purchase_no'), 'purchase_inward', ['purchase_no'], unique=True)
    op.create_index(op.f('ix_purchase_inward_supplier_id'), 'purchase_inward', ['supplier_id'], unique=False)
    
    op.create_table('purchase_item',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('purchase_id', sa.Integer(), nullable=False),
    sa.Column('model_id', sa.Integer(), nullable=False),
    sa.Column('model_no', sa.String(length=100), nullable=False),
    sa.Column('description', sa.String(length=255), nullable=True),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('unit_cost', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('total_cost', sa.Numeric(precision=14, scale=2), nullable=False),
    sa.Column('return_due_date', sa.DateTime(), nullable=True),
    sa.Column('is_returned', sa.Boolean(), nullable=False),
    sa.Column('remarks', sa.String(length=500), nullable=True),
    sa.ForeignKeyConstraint(['model_id'], ['model.id'], ),
    sa.ForeignKeyConstraint(['purchase_id'], ['purchase_inward.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_purchase_item_id'), 'purchase_item', ['id'], unique=False)
    op.create_index(op.f('ix_purchase_item_model_id'), 'purchase_item', ['model_id'], unique=False)
    op.create_index(op.f('ix_purchase_item_purchase_id'), 'purchase_item', ['purchase_id'], unique=False)
    
    op.create_table('purchase_item_serials',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('purchase_item_id', sa.Integer(), nullable=False),
    sa.Column('serial_number', sa.String(length=100), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['purchase_item_id'], ['purchase_item.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_purchase_item_serials_id'), 'purchase_item_serials', ['id'], unique=False)
    op.create_index(op.f('ix_purchase_item_serials_purchase_item_id'), 'purchase_item_serials', ['purchase_item_id'], unique=False)
    op.create_index(op.f('ix_purchase_item_serials_serial_number'), 'purchase_item_serials', ['serial_number'], unique=True)
    
    # ⭐ Explicitly create referencetype (not auto-created by any CREATE TABLE)
    referencetype_enum.create(op.get_bind(), checkfirst=True)
    
    # Modify stock_ledger
    op.add_column('stock_ledger', sa.Column('reference_type', referencetype_enum, nullable=False, server_default='ADJUSTMENT'))
    op.add_column('stock_ledger', sa.Column('reference_record_id', sa.Integer(), nullable=True))
    op.add_column('stock_ledger', sa.Column('purchase_item_id', sa.Integer(), nullable=True))
    op.add_column('stock_ledger', sa.Column('reference_doc_no', sa.String(length=100), nullable=True))
    op.create_index(op.f('ix_stock_ledger_created_at'), 'stock_ledger', ['created_at'], unique=False)
    op.create_index(op.f('ix_stock_ledger_model_id'), 'stock_ledger', ['model_id'], unique=False)
    op.create_index(op.f('ix_stock_ledger_purchase_item_id'), 'stock_ledger', ['purchase_item_id'], unique=False)
    op.create_foreign_key(None, 'stock_ledger', 'purchase_item', ['purchase_item_id'], ['id'], ondelete='SET NULL')
    
    # Remove server default
    op.alter_column('stock_ledger', 'reference_type', server_default=None)

def downgrade() -> None:
    """Downgrade schema."""
    # Remove stock_ledger changes
    op.drop_constraint(None, 'stock_ledger', type_='foreignkey')
    op.drop_index(op.f('ix_stock_ledger_purchase_item_id'), table_name='stock_ledger')
    op.drop_index(op.f('ix_stock_ledger_model_id'), table_name='stock_ledger')
    op.drop_index(op.f('ix_stock_ledger_created_at'), table_name='stock_ledger')
    op.drop_column('stock_ledger', 'reference_doc_no')
    op.drop_column('stock_ledger', 'purchase_item_id')
    op.drop_column('stock_ledger', 'reference_record_id')
    op.drop_column('stock_ledger', 'reference_type')
    
    # Drop purchase tables
    op.drop_index(op.f('ix_purchase_item_serials_serial_number'), table_name='purchase_item_serials')
    op.drop_index(op.f('ix_purchase_item_serials_purchase_item_id'), table_name='purchase_item_serials')
    op.drop_index(op.f('ix_purchase_item_serials_id'), table_name='purchase_item_serials')
    op.drop_table('purchase_item_serials')
    op.drop_index(op.f('ix_purchase_item_purchase_id'), table_name='purchase_item')
    op.drop_index(op.f('ix_purchase_item_model_id'), table_name='purchase_item')
    op.drop_index(op.f('ix_purchase_item_id'), table_name='purchase_item')
    op.drop_table('purchase_item')
    op.drop_index(op.f('ix_purchase_inward_supplier_id'), table_name='purchase_inward')
    op.drop_index(op.f('ix_purchase_inward_purchase_no'), table_name='purchase_inward')
    op.drop_index(op.f('ix_purchase_inward_id'), table_name='purchase_inward')
    op.drop_index(op.f('ix_purchase_inward_created_at'), table_name='purchase_inward')
    op.drop_table('purchase_inward')
    op.drop_table('purchase_counter')
    
    # Drop enum types
    sa.Enum(name='referencetype').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='paymentstatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='purchasestatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='purchasetype').drop(op.get_bind(), checkfirst=True)

"""add_delivery_challan_tables

Revision ID: c0a1143d34c7
Revises: 4d8958ac1dbb
Create Date: 2026-07-20 10:49:00.875319

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c0a1143d34c7'
down_revision: Union[str, Sequence[str], None] = '4d8958ac1dbb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    
    # Create delivery_challan_counter table
    op.create_table('delivery_challan_counter',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('financial_year', sa.String(length=10), nullable=False),
    sa.Column('prefix', sa.String(length=20), nullable=False),
    sa.Column('current_number', sa.Integer(), nullable=False, server_default='0'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_delivery_challan_counter_financial_year'), 'delivery_challan_counter', ['financial_year'], unique=True)
    op.create_index(op.f('ix_delivery_challan_counter_id'), 'delivery_challan_counter', ['id'], unique=False)
    
    # Create delivery_challans table
    op.create_table('delivery_challans',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('challan_no', sa.String(length=50), nullable=False),
    sa.Column('revision_no', sa.Integer(), nullable=False, server_default='0'),
    sa.Column('client_id', sa.Integer(), nullable=False),
    sa.Column('status', sa.Enum('DRAFT', 'PRINTED', 'CONFIRMED', 'CANCELLED', name='deliverystatus'), nullable=False, server_default='DRAFT'),
    sa.Column('delivery_date', sa.DateTime(), nullable=True),
    sa.Column('remarks', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('confirmed_by', sa.Integer(), nullable=True),
    sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('cancelled_by', sa.Integer(), nullable=True),
    sa.Column('printed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('printed_by', sa.Integer(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
    sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_delivery_challans_challan_no'), 'delivery_challans', ['challan_no'], unique=True)
    op.create_index(op.f('ix_delivery_challans_client_id'), 'delivery_challans', ['client_id'], unique=False)
    op.create_index(op.f('ix_delivery_challans_id'), 'delivery_challans', ['id'], unique=False)
    
    # Create delivery_challan_items table
    op.create_table('delivery_challan_items',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('challan_id', sa.Integer(), nullable=False),
    sa.Column('model_id', sa.Integer(), nullable=False),
    sa.Column('description', sa.String(length=500), nullable=False),
    sa.Column('hsn_code', sa.String(length=20), nullable=True),
    sa.Column('quantity_requested', sa.Float(), nullable=False, server_default='0'),
    sa.Column('quantity_delivered', sa.Float(), nullable=False, server_default='0'),
    sa.Column('unit_price', sa.Float(), nullable=True, server_default='0.0'),
    sa.Column('remarks', sa.Text(), nullable=True),
    sa.ForeignKeyConstraint(['challan_id'], ['delivery_challans.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['model_id'], ['model.id'], ),  # ✅ FIXED: 'models' not 'model'
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_delivery_challan_items_challan_id'), 'delivery_challan_items', ['challan_id'], unique=False)
    op.create_index(op.f('ix_delivery_challan_items_id'), 'delivery_challan_items', ['id'], unique=False)
    op.create_index(op.f('ix_delivery_challan_items_model_id'), 'delivery_challan_items', ['model_id'], unique=False)
    
    # ❌ REMOVED: op.drop_column('role_permissions', 'created_at')
    # This was incorrectly auto-generated


def downgrade() -> None:
    """Downgrade schema."""
    
    # ❌ REMOVED: op.add_column('role_permissions', ...)
    # Since we removed the drop, we must remove the add too
    
    op.drop_index(op.f('ix_delivery_challan_items_model_id'), table_name='delivery_challan_items')
    op.drop_index(op.f('ix_delivery_challan_items_id'), table_name='delivery_challan_items')
    op.drop_index(op.f('ix_delivery_challan_items_challan_id'), table_name='delivery_challan_items')
    op.drop_table('delivery_challan_items')
    
    op.drop_index(op.f('ix_delivery_challans_id'), table_name='delivery_challans')
    op.drop_index(op.f('ix_delivery_challans_client_id'), table_name='delivery_challans')
    op.drop_index(op.f('ix_delivery_challans_challan_no'), table_name='delivery_challans')
    op.drop_table('delivery_challans')
    
    op.drop_index(op.f('ix_delivery_challan_counter_id'), table_name='delivery_challan_counter')
    op.drop_index(op.f('ix_delivery_challan_counter_financial_year'), table_name='delivery_challan_counter')
    op.drop_table('delivery_challan_counter')
    
    # Drop the enum type
    op.execute('DROP TYPE IF EXISTS deliverystatus')
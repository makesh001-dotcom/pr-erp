"""upgrade_audit_log_model

Revision ID: bb7c1957709a
Revises: 5c6351fd27b5
Create Date: 2026-09-01 11:48:09.817571

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'bb7c1957709a'
down_revision: Union[str, Sequence[str], None] = '5c6351fd27b5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add new AuditLog columns
    op.add_column('audit_logs', sa.Column('target_user_id', sa.Integer(), nullable=True))
    op.add_column('audit_logs', sa.Column('changes', sa.JSON(), nullable=True))
    op.add_column('audit_logs', sa.Column('user_agent', sa.String(length=255), nullable=True))
    
    # Update field types and lengths
    op.alter_column('audit_logs', 'action',
               existing_type=sa.VARCHAR(length=20),
               type_=sa.String(length=50),
               existing_nullable=False)
    op.alter_column('audit_logs', 'ip_address',
               existing_type=sa.VARCHAR(length=50),
               type_=sa.String(length=45),
               existing_nullable=True)
    op.alter_column('audit_logs', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.DateTime(timezone=True),
               existing_nullable=False,
               existing_server_default=sa.text("(now() AT TIME ZONE 'utc'::text)"))
    
    # Indexes and Foreign Keys
    op.create_index(op.f('ix_audit_logs_record_id'), 'audit_logs', ['record_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_target_user_id'), 'audit_logs', ['target_user_id'], unique=False)
    op.create_foreign_key(None, 'audit_logs', 'users', ['user_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(None, 'audit_logs', type_='foreignkey')
    op.drop_index(op.f('ix_audit_logs_target_user_id'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_record_id'), table_name='audit_logs')
    op.alter_column('audit_logs', 'created_at',
               existing_type=sa.DateTime(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=False,
               existing_server_default=sa.text("(now() AT TIME ZONE 'utc'::text)"))
    op.alter_column('audit_logs', 'ip_address',
               existing_type=sa.String(length=45),
               type_=sa.VARCHAR(length=50),
               existing_nullable=True)
    op.alter_column('audit_logs', 'action',
               existing_type=sa.String(length=50),
               type_=sa.VARCHAR(length=20),
               existing_nullable=False)
    op.drop_column('audit_logs', 'user_agent')
    op.drop_column('audit_logs', 'changes')
    op.drop_column('audit_logs', 'target_user_id')
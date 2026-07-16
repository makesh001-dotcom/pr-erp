"""add RBAC tables

Revision ID: 4d8958ac1dbb
Revises: fb7ca5846edd
Create Date: 2026-07-15 14:49:38.367858

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4d8958ac1dbb'
down_revision: Union[str, Sequence[str], None] = 'fb7ca5846edd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema safely with data migration."""
    
    # 1. Create permissions table
    op.create_table('permissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('module', sa.String(length=50), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_permissions_id'), 'permissions', ['id'], unique=False)
    
    # 2. Create roles table
    op.create_table('roles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_roles_id'), 'roles', ['id'], unique=False)

    # 3. Insert default system roles immediately
    op.execute("""
        INSERT INTO roles (name, description)
        VALUES
        ('Admin', 'System Administrator'),
        ('Staff', 'Office Staff')
        ON CONFLICT (name) DO NOTHING;
    """)

    # 4. Create role_permissions table (including audit timestamp)
    op.create_table('role_permissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('permission_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('role_id', 'permission_id', name='uq_role_permission')
    )
    op.create_index(op.f('ix_role_permissions_id'), 'role_permissions', ['id'], unique=False)
    
    # 5. Add is_active flag to users
    op.add_column('users', sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False))
    
    # 6. Add role_id as TEMPORARILY nullable
    op.add_column('users', sa.Column('role_id', sa.Integer(), nullable=True))
    
    # 7. Map existing text roles to their new ID keys (case-insensitive)
    op.execute("""
        UPDATE users
        SET role_id = (
            SELECT id
            FROM roles
            WHERE LOWER(name) = LOWER(users.role)
        );
    """)

    # --- Safety Check: Ensure no users were left without a role ---
    # In case there are old roles that did not match 'Admin' or 'Staff',
    # we assign them to 'Staff' as a fallback before making it NOT NULL.
    op.execute("""
        UPDATE users
        SET role_id = (SELECT id FROM roles WHERE name = 'Staff')
        WHERE role_id IS NULL;
    """)
    
    # 8. Now that all users have a role_id, enforce NOT NULL
    op.alter_column('users', 'role_id', nullable=False)
    
    # 9. Create explicit named foreign key constraint
    op.create_foreign_key(
        'fk_users_role_id', 
        'users', 
        'roles', 
        ['role_id'], 
        ['id']
    )
    
    # 10. Safely drop the legacy role column
    op.drop_column('users', 'role')


def downgrade() -> None:
    """Downgrade schema safely, restoring old text role states."""
    
    # 1. Restore the original text role column
    op.add_column('users', sa.Column('role', sa.VARCHAR(), nullable=True))
    
    # 2. Reverse map role IDs back to lowcase text values ("Admin" -> "admin")
    op.execute("""
        UPDATE users
        SET role = (
            SELECT LOWER(name)
            FROM roles
            WHERE roles.id = users.role_id
        );
    """)
    
    # 3. Drop constraints and new columns
    op.drop_constraint('fk_users_role_id', 'users', type_='foreignkey')
    op.drop_column('users', 'role_id')
    op.drop_column('users', 'is_active')
    
    # 4. Tear down RBAC structural tables
    op.drop_index(op.f('ix_role_permissions_id'), table_name='role_permissions')
    op.drop_table('role_permissions')
    op.drop_index(op.f('ix_roles_id'), table_name='roles')
    op.drop_table('roles')
    op.drop_index(op.f('ix_permissions_id'), table_name='permissions')
    op.drop_table('permissions')
"""add_delivery_fields_to_model

Revision ID: 87789f3f3abb
Revises: e14e542c6f07
Create Date: 2026-06-11 10:06:57.108968

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '87789f3f3abb'
down_revision: Union[str, Sequence[str], None] = 'e14e542c6f07'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Add the new columns as nullable initially
    op.add_column('model', sa.Column('date', sa.DateTime(), nullable=True))
    op.add_column('model', sa.Column('delivery_by', sa.String(length=100), nullable=True))
    op.add_column('model', sa.Column('courier', sa.String(length=100), nullable=True))
    
    # 2. Backfill existing test entries with clean default fallback parameters
    op.execute("UPDATE model SET date = NOW() WHERE date IS NULL")
    op.execute("UPDATE model SET delivery_by = 'Not Specified' WHERE delivery_by IS NULL")
    op.execute("UPDATE model SET courier = 'Not Specified' WHERE courier IS NULL")
    
    # 3. Now make them safe for constraints if you choose, or leave them nullable for flexibility.
    # We will leave delivery_by and courier as nullable=True so employees don't HAVE to type them if they don't want to!
    op.alter_column('model', 'date', nullable=False)


def downgrade() -> None:
    # Drop the columns cleanly if we ever need to roll back
    op.drop_column('model', 'courier')
    op.drop_column('model', 'delivery_by')
    op.drop_column('model', 'date')

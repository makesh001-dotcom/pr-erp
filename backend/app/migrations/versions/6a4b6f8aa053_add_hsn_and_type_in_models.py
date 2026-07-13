"""add_hsn_and_type_in_models

Revision ID: 6a4b6f8aa053
Revises: 48cf3551eab3
Create Date: 2026-06-26 16:54:39.405890

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6a4b6f8aa053'
down_revision: Union[str, Sequence[str], None] = '48cf3551eab3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column(
        "model",
        sa.Column("hsn_code", sa.String(100), nullable=True),
    )
    op.add_column(
        "model",
        sa.Column("type", sa.String(100), nullable=True),
    )

    op.create_index("ix_model_hsn_code", "model", ["hsn_code"])
    op.create_index("ix_model_type", "model", ["type"])


def downgrade():
    op.drop_index("ix_model_type", table_name="model")
    op.drop_index("ix_model_hsn_code", table_name="model")

    op.drop_column("model", "type")
    op.drop_column("model", "hsn_code")

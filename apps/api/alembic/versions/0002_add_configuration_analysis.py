"""Add configuration analysis and universal normalization fields

Revision ID: 0002_add_configuration_analysis
Revises: 0001_initial_schema
Create Date: 2026-08-22 20:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0002_add_configuration_analysis'
down_revision: Union[str, None] = '0001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('configurations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('parser_name', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('parser_version', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('facts_extracted_count', sa.Integer(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('unknown_items_count', sa.Integer(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('normalized_profile', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('unknown_items', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('configurations', schema=None) as batch_op:
        batch_op.drop_column('processed_at')
        batch_op.drop_column('unknown_items')
        batch_op.drop_column('normalized_profile')
        batch_op.drop_column('unknown_items_count')
        batch_op.drop_column('facts_extracted_count')
        batch_op.drop_column('parser_version')
        batch_op.drop_column('parser_name')

"""Enhance finding model with framework and category columns

Revision ID: 0003_enhance_finding_model
Revises: 0002_add_configuration_analysis
Create Date: 2026-08-22 20:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0003_enhance_finding_model'
down_revision: Union[str, None] = '0002_add_configuration_analysis'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('findings', schema=None) as batch_op:
        batch_op.add_column(sa.Column('framework', sa.String(length=50), nullable=False, server_default='CIS'))
        batch_op.add_column(sa.Column('category', sa.String(length=100), nullable=True))
        batch_op.create_index(batch_op.f('ix_findings_framework'), ['framework'], unique=False)
        batch_op.create_index(batch_op.f('ix_findings_category'), ['category'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('findings', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_findings_category'))
        batch_op.drop_index(batch_op.f('ix_findings_framework'))
        batch_op.drop_column('category')
        batch_op.drop_column('framework')

"""Enhance training mappings and add audit trails

Revision ID: 0004_enhance_training_system
Revises: 0003_enhance_finding_model
Create Date: 2026-08-22 20:47:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0004_enhance_training_system'
down_revision: Union[str, None] = '0003_enhance_finding_model'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('training_mappings', schema=None) as batch_op:
        batch_op.add_column(sa.Column('os_version_range', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('normalized_pattern', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('candidate_property', sa.String(length=255), nullable=False, server_default='remote_access.ssh_enabled'))
        batch_op.add_column(sa.Column('candidate_value', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('category', sa.String(length=100), nullable=False, server_default='remote_access'))
        batch_op.add_column(sa.Column('status', sa.String(length=50), nullable=False, server_default='APPROVED'))
        batch_op.add_column(sa.Column('source', sa.String(length=50), nullable=False, server_default='human_created'))
        batch_op.add_column(sa.Column('rejection_reason', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('created_by_id', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('created_by_email', sa.String(length=255), nullable=True, server_default='admin@ntro.gov.in'))
        batch_op.add_column(sa.Column('version', sa.Integer(), nullable=False, server_default='1'))
        batch_op.add_column(sa.Column('usage_count', sa.Integer(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('mapping_metadata', sa.JSON(), nullable=True))
        batch_op.create_index(batch_op.f('ix_training_mappings_candidate_property'), ['candidate_property'], unique=False)
        batch_op.create_index(batch_op.f('ix_training_mappings_category'), ['category'], unique=False)
        batch_op.create_index(batch_op.f('ix_training_mappings_raw_pattern'), ['raw_pattern'], unique=False)
        batch_op.create_index(batch_op.f('ix_training_mappings_status'), ['status'], unique=False)

    # Create training_audit_trails table
    op.create_table(
        'training_audit_trails',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('mapping_id', sa.String(length=36), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('user_email', sa.String(length=255), nullable=True),
        sa.Column('old_value', sa.JSON(), nullable=True),
        sa.Column('new_value', sa.JSON(), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['mapping_id'], ['training_mappings.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_training_audit_trails_action'), 'training_audit_trails', ['action'], unique=False)
    op.create_index(op.f('ix_training_audit_trails_mapping_id'), 'training_audit_trails', ['mapping_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_training_audit_trails_mapping_id'), table_name='training_audit_trails')
    op.drop_index(op.f('ix_training_audit_trails_action'), table_name='training_audit_trails')
    op.drop_table('training_audit_trails')

    with op.batch_alter_table('training_mappings', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_training_mappings_status'))
        batch_op.drop_index(batch_op.f('ix_training_mappings_raw_pattern'))
        batch_op.drop_index(batch_op.f('ix_training_mappings_category'))
        batch_op.drop_index(batch_op.f('ix_training_mappings_candidate_property'))
        batch_op.drop_column('mapping_metadata')
        batch_op.drop_column('last_used_at')
        batch_op.drop_column('usage_count')
        batch_op.drop_column('version')
        batch_op.drop_column('created_by_email')
        batch_op.drop_column('created_by_id')
        batch_op.drop_column('rejection_reason')
        batch_op.drop_column('source')
        batch_op.drop_column('status')
        batch_op.drop_column('category')
        batch_op.drop_column('candidate_value')
        batch_op.drop_column('candidate_property')
        batch_op.drop_column('normalized_pattern')
        batch_op.drop_column('os_version_range')

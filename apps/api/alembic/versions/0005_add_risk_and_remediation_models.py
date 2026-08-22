"""Add risk items and remediation proposals tables

Revision ID: 0005_add_risk_and_remediation
Revises: 0004_enhance_training_system
Create Date: 2026-08-22 21:02:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0005_add_risk_and_remediation'
down_revision: Union[str, None] = '0004_enhance_training_system'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create risk_items table
    op.create_table(
        'risk_items',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('audit_id', sa.String(length=36), nullable=False),
        sa.Column('device_id', sa.String(length=36), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False, server_default='Remote Administration'),
        sa.Column('severity', sa.String(length=50), nullable=False, server_default='HIGH'),
        sa.Column('risk_score', sa.Float(), nullable=False, server_default='75.0'),
        sa.Column('priority', sa.String(length=10), nullable=False, server_default='P1'),
        sa.Column('likelihood', sa.String(length=50), nullable=False, server_default='HIGH'),
        sa.Column('impact', sa.String(length=50), nullable=False, server_default='HIGH'),
        sa.Column('exposure', sa.String(length=50), nullable=False, server_default='MANAGEMENT_PLANE'),
        sa.Column('confidence', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('finding_ids', sa.JSON(), nullable=False),
        sa.Column('affected_assets', sa.JSON(), nullable=False),
        sa.Column('evidence_summary', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='OPEN'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['audit_id'], ['audits.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_risk_items_audit_id'), 'risk_items', ['audit_id'], unique=False)
    op.create_index(op.f('ix_risk_items_category'), 'risk_items', ['category'], unique=False)
    op.create_index(op.f('ix_risk_items_device_id'), 'risk_items', ['device_id'], unique=False)
    op.create_index(op.f('ix_risk_items_priority'), 'risk_items', ['priority'], unique=False)
    op.create_index(op.f('ix_risk_items_risk_score'), 'risk_items', ['risk_score'], unique=False)
    op.create_index(op.f('ix_risk_items_severity'), 'risk_items', ['severity'], unique=False)
    op.create_index(op.f('ix_risk_items_status'), 'risk_items', ['status'], unique=False)

    # 2. Create remediation_proposals table
    op.create_table(
        'remediation_proposals',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('audit_id', sa.String(length=36), nullable=False),
        sa.Column('finding_id', sa.String(length=36), nullable=True),
        sa.Column('risk_id', sa.String(length=36), nullable=True),
        sa.Column('vendor', sa.String(length=100), nullable=False),
        sa.Column('platform', sa.String(length=100), nullable=True),
        sa.Column('normalized_control', sa.String(length=255), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='AVAILABLE'),
        sa.Column('remediation_commands', sa.Text(), nullable=False),
        sa.Column('rollback_commands', sa.Text(), nullable=True),
        sa.Column('diff_preview', sa.JSON(), nullable=True),
        sa.Column('why_recommended', sa.Text(), nullable=False),
        sa.Column('potential_impact', sa.Text(), nullable=False),
        sa.Column('verification_steps', sa.Text(), nullable=False),
        sa.Column('template_id', sa.String(length=100), nullable=False),
        sa.Column('template_version', sa.String(length=50), nullable=False, server_default='1.0.0'),
        sa.Column('confidence', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('is_reviewed', sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column('reviewed_by', sa.String(length=255), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['audit_id'], ['audits.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['finding_id'], ['findings.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['risk_id'], ['risk_items.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_remediation_proposals_audit_id'), 'remediation_proposals', ['audit_id'], unique=False)
    op.create_index(op.f('ix_remediation_proposals_finding_id'), 'remediation_proposals', ['finding_id'], unique=False)
    op.create_index(op.f('ix_remediation_proposals_normalized_control'), 'remediation_proposals', ['normalized_control'], unique=False)
    op.create_index(op.f('ix_remediation_proposals_risk_id'), 'remediation_proposals', ['risk_id'], unique=False)
    op.create_index(op.f('ix_remediation_proposals_status'), 'remediation_proposals', ['status'], unique=False)
    op.create_index(op.f('ix_remediation_proposals_vendor'), 'remediation_proposals', ['vendor'], unique=False)


def downgrade() -> None:
    op.drop_table('remediation_proposals')
    op.drop_table('risk_items')

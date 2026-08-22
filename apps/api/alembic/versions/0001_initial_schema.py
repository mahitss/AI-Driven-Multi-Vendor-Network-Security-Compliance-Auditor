"""Initial NetVigil Domain Schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-08-22 19:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # Devices table
    op.create_table(
        'devices',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('hostname', sa.String(length=255), nullable=False),
        sa.Column('vendor', sa.String(length=100), nullable=False),
        sa.Column('platform', sa.String(length=100), nullable=True),
        sa.Column('model', sa.String(length=100), nullable=True),
        sa.Column('serial_number', sa.String(length=100), nullable=True),
        sa.Column('firmware_version', sa.String(length=100), nullable=True),
        sa.Column('device_metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('serial_number')
    )
    op.create_index(op.f('ix_devices_hostname'), 'devices', ['hostname'], unique=False)
    op.create_index(op.f('ix_devices_vendor'), 'devices', ['vendor'], unique=False)

    # Configurations table
    op.create_table(
        'configurations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('device_id', sa.String(length=36), nullable=True),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('original_filename', sa.String(length=255), nullable=False),
        sa.Column('storage_path', sa.String(length=512), nullable=False),
        sa.Column('file_size_bytes', sa.Integer(), nullable=False),
        sa.Column('hash', sa.String(length=64), nullable=False),
        sa.Column('raw_content', sa.Text(), nullable=False),
        sa.Column('detected_vendor', sa.String(length=100), nullable=False),
        sa.Column('detected_platform', sa.String(length=100), nullable=True),
        sa.Column('detection_confidence', sa.Float(), nullable=False),
        sa.Column('detection_method', sa.String(length=50), nullable=False),
        sa.Column('detection_details', sa.JSON(), nullable=True),
        sa.Column('parser_status', sa.String(length=50), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['device_id'], ['devices.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_configurations_hash'), 'configurations', ['hash'], unique=False)
    op.create_index(op.f('ix_configurations_detected_vendor'), 'configurations', ['detected_vendor'], unique=False)
    op.create_index(op.f('ix_configurations_parser_status'), 'configurations', ['parser_status'], unique=False)

    # Frameworks table
    op.create_table(
        'frameworks',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('version', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_frameworks_name'), 'frameworks', ['name'], unique=False)

    # Controls table
    op.create_table(
        'controls',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('framework_id', sa.String(length=36), nullable=False),
        sa.Column('control_id', sa.String(length=100), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('severity', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['framework_id'], ['frameworks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_controls_control_id'), 'controls', ['control_id'], unique=False)
    op.create_index(op.f('ix_controls_category'), 'controls', ['category'], unique=False)

    # Audits table
    op.create_table(
        'audits',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('device_id', sa.String(length=36), nullable=True),
        sa.Column('configuration_id', sa.String(length=36), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('score', sa.Float(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('summary_stats', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['configuration_id'], ['configurations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['device_id'], ['devices.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audits_status'), 'audits', ['status'], unique=False)

    # Findings table
    op.create_table(
        'findings',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('audit_id', sa.String(length=36), nullable=False),
        sa.Column('control_id', sa.String(length=36), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('severity', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('evidence', sa.Text(), nullable=True),
        sa.Column('expected_value', sa.Text(), nullable=True),
        sa.Column('actual_value', sa.Text(), nullable=True),
        sa.Column('remediation', sa.Text(), nullable=True),
        sa.Column('finding_metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['audit_id'], ['audits.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['control_id'], ['controls.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_findings_status'), 'findings', ['status'], unique=False)
    op.create_index(op.f('ix_findings_severity'), 'findings', ['severity'], unique=False)

    # Training Mappings table
    op.create_table(
        'training_mappings',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('vendor', sa.String(length=100), nullable=False),
        sa.Column('platform', sa.String(length=100), nullable=True),
        sa.Column('raw_pattern', sa.Text(), nullable=False),
        sa.Column('normalized_control', sa.String(length=255), nullable=False),
        sa.Column('semantic_meaning', sa.Text(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('human_verified', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_training_mappings_vendor'), 'training_mappings', ['vendor'], unique=False)
    op.create_index(op.f('ix_training_mappings_normalized_control'), 'training_mappings', ['normalized_control'], unique=False)


def downgrade() -> None:
    op.drop_table('training_mappings')
    op.drop_table('findings')
    op.drop_table('audits')
    op.drop_table('controls')
    op.drop_table('frameworks')
    op.drop_table('configurations')
    op.drop_table('devices')
    op.drop_table('users')

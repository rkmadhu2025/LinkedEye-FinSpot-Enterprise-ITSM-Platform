"""Add voice call tables for IVR system

Revision ID: voice_calls_20260204
Revises: a1b2c3d4e5f6
Create Date: 2026-02-04 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'voice_calls_20260204'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create voice_calls table
    op.create_table('voice_calls',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),

        # Twilio identifiers
        sa.Column('call_sid', sa.String(100), nullable=True, unique=True),
        sa.Column('parent_call_sid', sa.String(100), nullable=True),

        # Call details
        sa.Column('direction', sa.String(20), nullable=False, default='outbound'),
        sa.Column('status', sa.String(30), nullable=False, default='queued'),

        # Phone numbers
        sa.Column('from_phone', sa.String(20), nullable=False),
        sa.Column('to_phone', sa.String(20), nullable=False),

        # Incident association
        sa.Column('incident_id', postgresql.UUID(as_uuid=True), nullable=True),

        # User association
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),

        # Call timing
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('answered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration', sa.Integer(), nullable=False, default=0),

        # Recording and transcription
        sa.Column('recording_url', sa.String(500), nullable=True),
        sa.Column('recording_sid', sa.String(100), nullable=True),
        sa.Column('recording_duration', sa.Integer(), nullable=True),
        sa.Column('transcription', sa.Text(), nullable=True),
        sa.Column('transcription_sid', sa.String(100), nullable=True),

        # IVR interaction tracking
        sa.Column('dtmf_digits', sa.String(50), nullable=True),
        sa.Column('speech_result', sa.Text(), nullable=True),
        sa.Column('last_action', sa.String(100), nullable=True),

        # AI command processing
        sa.Column('ai_intent', sa.String(100), nullable=True),
        sa.Column('ai_confidence', sa.Integer(), nullable=True),
        sa.Column('ai_response', sa.Text(), nullable=True),

        # Retry and escalation tracking
        sa.Column('retry_count', sa.Integer(), nullable=False, default=0),
        sa.Column('max_retries', sa.Integer(), nullable=False, default=3),
        sa.Column('escalation_level', sa.Integer(), nullable=False, default=1),
        sa.Column('escalated_from_id', postgresql.UUID(as_uuid=True), nullable=True),

        # Call context
        sa.Column('context', postgresql.JSONB(astext_type=sa.Text()), nullable=False, default={}),

        # Error tracking
        sa.Column('error_code', sa.String(50), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),

        # Primary key
        sa.PrimaryKeyConstraint('id'),

        # Foreign keys
        sa.ForeignKeyConstraint(['incident_id'], ['incidents.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['escalated_from_id'], ['voice_calls.id'], ondelete='SET NULL'),
    )

    # Create indexes
    op.create_index('ix_voice_calls_call_sid', 'voice_calls', ['call_sid'], unique=True)
    op.create_index('ix_voice_calls_incident_id', 'voice_calls', ['incident_id'])
    op.create_index('ix_voice_calls_status', 'voice_calls', ['status'])
    op.create_index('ix_voice_calls_created_at', 'voice_calls', ['created_at'])

    # Create voice_call_logs table
    op.create_table('voice_call_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),

        # Parent call
        sa.Column('voice_call_id', postgresql.UUID(as_uuid=True), nullable=False),

        # Event details
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),

        # Event data
        sa.Column('event_data', postgresql.JSONB(astext_type=sa.Text()), nullable=False, default={}),

        # Optional user association
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),

        # Description
        sa.Column('description', sa.Text(), nullable=True),

        # Primary key
        sa.PrimaryKeyConstraint('id'),

        # Foreign keys
        sa.ForeignKeyConstraint(['voice_call_id'], ['voice_calls.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
    )

    # Create indexes
    op.create_index('ix_voice_call_logs_voice_call_id', 'voice_call_logs', ['voice_call_id'])
    op.create_index('ix_voice_call_logs_event_type', 'voice_call_logs', ['event_type'])
    op.create_index('ix_voice_call_logs_timestamp', 'voice_call_logs', ['timestamp'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_voice_call_logs_timestamp', table_name='voice_call_logs')
    op.drop_index('ix_voice_call_logs_event_type', table_name='voice_call_logs')
    op.drop_index('ix_voice_call_logs_voice_call_id', table_name='voice_call_logs')

    # Drop voice_call_logs table
    op.drop_table('voice_call_logs')

    # Drop indexes
    op.drop_index('ix_voice_calls_created_at', table_name='voice_calls')
    op.drop_index('ix_voice_calls_status', table_name='voice_calls')
    op.drop_index('ix_voice_calls_incident_id', table_name='voice_calls')
    op.drop_index('ix_voice_calls_call_sid', table_name='voice_calls')

    # Drop voice_calls table
    op.drop_table('voice_calls')

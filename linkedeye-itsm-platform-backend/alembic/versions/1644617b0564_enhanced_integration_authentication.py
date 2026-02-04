"""enhanced_integration_authentication

Revision ID: 1644617b0564
Revises: e7e4622aba78
Create Date: 2026-01-07 11:30:18.222029

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '1644617b0564'
down_revision = 'e7e4622aba78'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add enhanced authentication fields to integrations table."""
    
    # Add new columns to integrations table for enhanced authentication
    op.add_column('integrations', sa.Column('auth_type', sa.String(50), nullable=False, server_default='api_key'))
    op.add_column('integrations', sa.Column('auth_config', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'))
    op.add_column('integrations', sa.Column('sync_interval_minutes', sa.Integer(), nullable=False, server_default='60'))
    op.add_column('integrations', sa.Column('retry_policy', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{"max_retries": 3, "backoff_factor": 2}'))
    op.add_column('integrations', sa.Column('health_check_url', sa.String(500), nullable=True))
    op.add_column('integrations', sa.Column('last_health_check', sa.DateTime(timezone=True), nullable=True))

    # Add check constraint for auth_type
    op.create_check_constraint(
        'check_auth_type',
        'integrations',
        "auth_type IN ('username_password', 'api_key', 'oauth2', 'bearer_token', 'basic_auth', 'custom')"
    )

    # Add check constraint for sync_interval_minutes (must be positive)
    op.create_check_constraint(
        'check_sync_interval_positive',
        'integrations',
        'sync_interval_minutes > 0'
    )

    # Create indexes for new columns
    op.create_index('idx_integrations_auth_type', 'integrations', ['auth_type'])
    op.create_index('idx_integrations_sync_interval', 'integrations', ['sync_interval_minutes'])
    op.create_index('idx_integrations_last_health_check', 'integrations', ['last_health_check'], postgresql_ops={'last_health_check': 'DESC'})

    # Update existing integrations to have default values
    op.execute("UPDATE integrations SET auth_type = 'api_key' WHERE auth_type IS NULL")
    op.execute("UPDATE integrations SET auth_config = '{}'::jsonb WHERE auth_config IS NULL OR auth_config = 'null'::jsonb")
    op.execute("UPDATE integrations SET retry_policy = '{\"max_retries\": 3, \"backoff_factor\": 2}'::jsonb WHERE retry_policy IS NULL OR retry_policy = 'null'::jsonb")
    op.execute("UPDATE integrations SET sync_interval_minutes = 60 WHERE sync_interval_minutes IS NULL")


def downgrade() -> None:
    """Remove enhanced authentication fields from integrations table."""
    
    # Drop indexes
    op.drop_index('idx_integrations_last_health_check', 'integrations')
    op.drop_index('idx_integrations_sync_interval', 'integrations')
    op.drop_index('idx_integrations_auth_type', 'integrations')
    
    # Drop check constraints
    op.drop_constraint('check_sync_interval_positive', 'integrations', type_='check')
    op.drop_constraint('check_auth_type', 'integrations', type_='check')
    
    # Drop columns
    op.drop_column('integrations', 'last_health_check')
    op.drop_column('integrations', 'health_check_url')
    op.drop_column('integrations', 'retry_policy')
    op.drop_column('integrations', 'sync_interval_minutes')
    op.drop_column('integrations', 'auth_config')
    op.drop_column('integrations', 'auth_type')
"""Demo features schema - ownership, attachments, approval_chain, TAT

Revision ID: a1b2c3d4e5f6
Revises: 1644617b0564
Create Date: 2026-02-02 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '1644617b0564'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Asset: ownership_type
    op.add_column('assets', sa.Column('ownership_type', sa.String(20), nullable=True, server_default='client_hosted'))
    op.execute("UPDATE assets SET ownership_type = 'client_hosted' WHERE ownership_type IS NULL")
    op.alter_column('assets', 'ownership_type', nullable=False)

    # Problem: attachments JSONB
    op.add_column('problems', sa.Column('attachments', postgresql.JSONB(), nullable=True, server_default='[]'))

    # Change: approval_chain JSONB
    op.add_column('changes', sa.Column('approval_chain', postgresql.JSONB(), nullable=True, server_default='[]'))

    # Incident: TAT fields
    op.add_column('incidents', sa.Column('tat_target_minutes', sa.Integer(), nullable=True))
    op.add_column('incidents', sa.Column('tat_breach_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('incidents', 'tat_breach_at')
    op.drop_column('incidents', 'tat_target_minutes')
    op.drop_column('changes', 'approval_chain')
    op.drop_column('problems', 'attachments')
    op.drop_column('assets', 'ownership_type')

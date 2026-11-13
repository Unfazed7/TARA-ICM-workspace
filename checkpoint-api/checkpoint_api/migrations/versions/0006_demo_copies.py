"""Working copies of the demo TARA, one per tester and login session (D-67)

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-13
"""
from alembic import op
import sqlalchemy as sa


revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('demo_copies',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('assessment_id', sa.String(), nullable=False),
    sa.Column('owner_id', sa.String(), nullable=False),
    sa.Column('session_key', sa.String(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('owner_id', 'session_key')
    )
    with op.batch_alter_table('demo_copies', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_demo_copies_assessment_id'), ['assessment_id'], unique=True)
        batch_op.create_index(batch_op.f('ix_demo_copies_owner_id'), ['owner_id'], unique=False)


def downgrade():
    op.drop_table('demo_copies')

"""Edits, comments and assumption reviews for screens 04 Impacts, 05 Threats and 06 TARA (specs 29 to 31)

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-30
"""
from alembic import op
import sqlalchemy as sa


revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('stage_edits',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('assessment_id', sa.String(), nullable=False),
    sa.Column('ui_stage', sa.String(length=2), nullable=False),
    sa.Column('folder', sa.Integer(), nullable=False),
    sa.Column('record_id', sa.String(), nullable=False),
    sa.Column('field', sa.String(), nullable=False),
    sa.Column('old', sa.JSON(none_as_null=True), nullable=True),
    sa.Column('new', sa.JSON(none_as_null=True), nullable=True),
    sa.Column('reason', sa.Text(), nullable=False),
    sa.Column('stale_folders', sa.JSON(none_as_null=True), nullable=False),
    sa.Column('by', sa.String(), nullable=False),
    sa.Column('at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('stage_edits', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_stage_edits_assessment_id'), ['assessment_id'], unique=False)

    op.create_table('stage_comments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('assessment_id', sa.String(), nullable=False),
    sa.Column('ui_stage', sa.String(length=2), nullable=False),
    sa.Column('record_id', sa.String(), nullable=False),
    sa.Column('field', sa.String(), nullable=True),
    sa.Column('author', sa.String(), nullable=False),
    sa.Column('author_id', sa.String(), nullable=True),
    sa.Column('text', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('resolved', sa.Boolean(), nullable=False),
    sa.Column('proposed_change', sa.JSON(none_as_null=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('stage_comments', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_stage_comments_assessment_id'), ['assessment_id'], unique=False)

    op.create_table('stage_assumption_reviews',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('assessment_id', sa.String(), nullable=False),
    sa.Column('ui_stage', sa.String(length=2), nullable=False),
    sa.Column('key', sa.String(), nullable=False),
    sa.Column('assumption_id', sa.String(), nullable=False),
    sa.Column('status', sa.String(), nullable=False),
    sa.Column('note', sa.Text(), nullable=True),
    sa.Column('reviewed_by', sa.String(), nullable=False),
    sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('assessment_id', 'ui_stage', 'key')
    )
    with op.batch_alter_table('stage_assumption_reviews', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_stage_assumption_reviews_assessment_id'), ['assessment_id'], unique=False)


def downgrade():
    op.drop_table('stage_assumption_reviews')
    op.drop_table('stage_comments')
    op.drop_table('stage_edits')

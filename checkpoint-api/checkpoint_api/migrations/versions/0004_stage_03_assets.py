"""Stage 03 assets, properties, comments, stage reviews and the register bridge (spec 27)

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-29
"""
from alembic import op
import sqlalchemy as sa


revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('assets',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('run_id', sa.Integer(), nullable=False),
    sa.Column('position', sa.Integer(), nullable=False),
    sa.Column('asset_id', sa.String(), nullable=False),
    sa.Column('family', sa.String(length=4), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('type_label', sa.String(), nullable=False),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column('source_kind', sa.String(), nullable=False),
    sa.Column('source_ids', sa.JSON(none_as_null=True), nullable=False),
    sa.Column('source_label', sa.String(), nullable=False),
    sa.Column('scope_status', sa.String(), nullable=False),
    sa.Column('interface', sa.Boolean(), nullable=False),
    sa.Column('reason', sa.Text(), nullable=False),
    sa.Column('would_change', sa.Text(), nullable=False),
    sa.Column('fact_ids', sa.JSON(none_as_null=True), nullable=False),
    sa.Column('asset_type_row', sa.Boolean(), nullable=False),
    sa.Column('status', sa.String(), nullable=False),
    sa.Column('status_note', sa.Text(), nullable=True),
    sa.Column('status_by', sa.String(), nullable=True),
    sa.Column('status_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['run_id'], ['stage_runs.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('run_id', 'asset_id')
    )
    with op.batch_alter_table('assets', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_assets_run_id'), ['run_id'], unique=False)

    op.create_table('asset_properties',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('asset_pk', sa.Integer(), nullable=False),
    sa.Column('position', sa.Integer(), nullable=False),
    sa.Column('property', sa.String(length=2), nullable=False),
    sa.Column('applies', sa.Boolean(), nullable=False),
    sa.Column('reason', sa.Text(), nullable=False),
    sa.Column('origin', sa.String(), nullable=False),
    sa.Column('reviewed', sa.Boolean(), nullable=False),
    sa.Column('reviewed_by', sa.String(), nullable=True),
    sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['asset_pk'], ['assets.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('asset_pk', 'property')
    )
    with op.batch_alter_table('asset_properties', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_asset_properties_asset_pk'), ['asset_pk'], unique=False)

    op.create_table('asset_comments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('assessment_id', sa.String(), nullable=False),
    sa.Column('run_number', sa.Integer(), nullable=False),
    sa.Column('asset_id', sa.String(), nullable=False),
    sa.Column('property', sa.String(length=2), nullable=True),
    sa.Column('author', sa.String(), nullable=False),
    sa.Column('author_id', sa.String(), nullable=True),
    sa.Column('text', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('resolved', sa.Boolean(), nullable=False),
    sa.Column('proposed_change', sa.JSON(none_as_null=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('asset_comments', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_asset_comments_assessment_id'), ['assessment_id'], unique=False)

    op.create_table('stage_reviews',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('assessment_id', sa.String(), nullable=False),
    sa.Column('stage', sa.String(length=2), nullable=False),
    sa.Column('finished_by', sa.String(), nullable=False),
    sa.Column('finished_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('assessment_id', 'stage')
    )
    with op.batch_alter_table('stage_reviews', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_stage_reviews_assessment_id'), ['assessment_id'], unique=False)

    op.create_table('asset_register_ids',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('assessment_id', sa.String(), nullable=False),
    sa.Column('asset_id', sa.String(), nullable=False),
    sa.Column('source_key', sa.String(), nullable=False),
    sa.Column('number', sa.Integer(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('assessment_id', 'asset_id', 'source_key'),
    sa.UniqueConstraint('assessment_id', 'number')
    )
    with op.batch_alter_table('asset_register_ids', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_asset_register_ids_assessment_id'), ['assessment_id'], unique=False)

    op.create_table('asset_register_state',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('assessment_id', sa.String(), nullable=False),
    sa.Column('source', sa.String(), nullable=False),
    sa.Column('pending', sa.Boolean(), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('asset_register_state', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_asset_register_state_assessment_id'), ['assessment_id'], unique=True)


def downgrade():
    op.drop_table('asset_register_state')
    op.drop_table('asset_register_ids')
    op.drop_table('stage_reviews')
    op.drop_table('asset_comments')
    op.drop_table('asset_properties')
    op.drop_table('assets')

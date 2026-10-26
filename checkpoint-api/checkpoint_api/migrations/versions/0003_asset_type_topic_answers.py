"""asset type, rationale topic, question answers (spec 23)

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-04
"""
from alembic import op
import sqlalchemy as sa


revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('elements', schema=None) as batch_op:
        batch_op.alter_column('kind', new_column_name='asset_type', existing_type=sa.String(), existing_nullable=False)
        batch_op.alter_column('kind_label', new_column_name='asset_type_label', existing_type=sa.String(), existing_nullable=True)
    with op.batch_alter_table('rationale_items', schema=None) as batch_op:
        batch_op.add_column(sa.Column('topic', sa.String(), nullable=False, server_default='scope'))
    op.create_table('question_answers',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('assessment_id', sa.String(), nullable=False),
    sa.Column('question_id', sa.String(), nullable=False),
    sa.Column('answer', sa.Text(), nullable=False),
    sa.Column('answered_by', sa.String(), nullable=False),
    sa.Column('answered_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('assessment_id', 'question_id')
    )
    with op.batch_alter_table('question_answers', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_question_answers_assessment_id'), ['assessment_id'], unique=False)


def downgrade():
    with op.batch_alter_table('question_answers', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_question_answers_assessment_id'))
    op.drop_table('question_answers')
    with op.batch_alter_table('rationale_items', schema=None) as batch_op:
        batch_op.drop_column('topic')
    with op.batch_alter_table('elements', schema=None) as batch_op:
        batch_op.alter_column('asset_type', new_column_name='kind', existing_type=sa.String(), existing_nullable=False)
        batch_op.alter_column('asset_type_label', new_column_name='kind_label', existing_type=sa.String(), existing_nullable=True)

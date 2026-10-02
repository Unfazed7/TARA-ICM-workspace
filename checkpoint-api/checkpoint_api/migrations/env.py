from alembic import context

from checkpoint_api.database import engine
from checkpoint_api.stage_models import StageBase


target_metadata = StageBase.metadata


def include_name(name, type_, parent_names):
    # The older tables belong to Base.metadata.create_all, not to these migrations.
    if type_ == "table":
        return name in target_metadata.tables
    return True


def run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_name=include_name,
        render_as_batch=True,
        version_table="alembic_version_stages",
    )
    with context.begin_transaction():
        context.run_migrations()


connection = context.config.attributes.get("connection")
if connection is not None:
    run_migrations(connection)
else:
    with engine.begin() as new_connection:
        run_migrations(new_connection)

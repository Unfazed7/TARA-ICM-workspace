"""Brings the stage tables up to date at startup (Alembic, D-42)."""

from pathlib import Path

from alembic import command
from alembic.config import Config


MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"


def alembic_config(connection=None) -> Config:
    config = Config()
    config.set_main_option("script_location", str(MIGRATIONS_DIR))
    if connection is not None:
        config.attributes["connection"] = connection
    return config


def upgrade_stage_tables(engine) -> None:
    with engine.begin() as connection:
        command.upgrade(alembic_config(connection), "head")

"""Run log: one plain text file that shows what ran, what finished and what stopped it.

Default file is `logs/aegis.log` at the repo root (git-ignored). Change it with LOG_FILE and the
level with LOG_LEVEL. Never log document contents, prompts, keys, tokens or passwords.
"""

import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path


REPO = Path(__file__).resolve().parents[2]
FORMAT = "%(asctime)s %(levelname)s %(name)s | %(message)s"
_HANDLER_FLAG = "_aegis_run_log"


def log_file() -> Path:
    return Path(os.getenv("LOG_FILE", str(REPO / "logs" / "aegis.log")))


def setup() -> Path:
    """Sends the `aegis` loggers to the log file and the console. Safe to call more than once."""
    path = log_file()
    root = logging.getLogger("aegis")
    root.setLevel(os.getenv("LOG_LEVEL", "INFO").upper())
    root.propagate = False
    for handler in list(root.handlers):
        if getattr(handler, _HANDLER_FLAG, False):
            root.removeHandler(handler)
            handler.close()
    path.parent.mkdir(parents=True, exist_ok=True)
    formatter = logging.Formatter(FORMAT, datefmt="%Y-%m-%d %H:%M:%S")
    to_file = RotatingFileHandler(path, maxBytes=5 * 1024 * 1024, backupCount=5, encoding="utf-8")
    to_console = logging.StreamHandler()
    for handler in (to_file, to_console):
        handler.setFormatter(formatter)
        setattr(handler, _HANDLER_FLAG, True)
        root.addHandler(handler)
    return path


def get(name: str) -> logging.Logger:
    return logging.getLogger(f"aegis.{name}")

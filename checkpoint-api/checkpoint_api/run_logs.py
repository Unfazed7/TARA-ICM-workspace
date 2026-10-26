"""Human-readable, redacted, per-attempt pipeline execution logs."""

from __future__ import annotations

import os
import re
import threading
from collections import deque
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable, TextIO

from sqlalchemy.orm import Session

from .models import PipelineRunAttempt


SUCCESS_RETENTION_DAYS = int(os.getenv("RUN_LOG_SUCCESS_DAYS", "30"))
FAILURE_RETENTION_DAYS = int(os.getenv("RUN_LOG_FAILURE_DAYS", "90"))
KEEP_PER_STAGE = int(os.getenv("RUN_LOG_KEEP_PER_STAGE", "10"))
MAX_BYTES_PER_ASSESSMENT = int(os.getenv("RUN_LOG_MAX_BYTES", str(250 * 1024 * 1024)))

_SENSITIVE_ASSIGNMENT = re.compile(
    r"(?i)\b(authorization|api[_-]?key|access[_-]?token|token|password|secret)"
    r"(\s*[:=]\s*)([\"']?)([^\s\"',}]+)"
)
_BEARER_TOKEN = re.compile(r"(?i)\bBearer\s+[A-Za-z0-9._~+\-/=]+")
_JWT = re.compile(r"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def redact_log_text(value: object, extra_secrets: Iterable[str] = ()) -> str:
    """Remove credentials while keeping the surrounding diagnostic context."""

    text = str(value)
    secrets = {
        os.getenv(name, "")
        for name in (
            "ANTHROPIC_API_KEY",
            "LLM_API_KEY",
            "OPENROUTER_API_KEY",
            "CHECKPOINT_API_TOKEN",
            "JWT_SECRET",
        )
    }
    secrets.update(extra_secrets)
    for secret in sorted((secret for secret in secrets if len(secret) >= 4), key=len, reverse=True):
        text = text.replace(secret, "[REDACTED]")
    text = _BEARER_TOKEN.sub("Bearer [REDACTED]", text)
    text = _JWT.sub("[REDACTED_JWT]", text)
    return _SENSITIVE_ASSIGNMENT.sub(
        lambda match: f"{match.group(1)}{match.group(2)}[REDACTED]",
        text,
    )


def build_log_relative_path(assessment_id: str, stage_num: int, attempt_id: str) -> Path:
    timestamp = utc_now().strftime("%Y%m%dT%H%M%S.%fZ")
    filename = f"{timestamp}_stage-{stage_num:02d}_{attempt_id}.log"
    return Path("artifacts") / assessment_id / "logs" / filename


def resolve_attempt_log_path(workspace_root: str | Path, attempt: PipelineRunAttempt) -> Path | None:
    """Resolve only paths inside this assessment's log directory."""

    if not attempt.log_path:
        return None
    root = (Path(workspace_root) / "artifacts" / attempt.assessment_id / "logs").resolve()
    candidate = (Path(workspace_root) / attempt.log_path).resolve()
    try:
        candidate.relative_to(root)
    except ValueError:
        return None
    return candidate


class RunLogWriter:
    """Thread-safe line writer used by the stdout and stderr reader threads."""

    def __init__(self, path: Path, secrets: Iterable[str] = ()) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        self.path = path
        self._secrets = tuple(secrets)
        self._handle: TextIO = path.open("a", encoding="utf-8", buffering=1)
        self._lock = threading.Lock()

    def write(self, level: str, event: str, message: object = "") -> str:
        sanitized = redact_log_text(message, self._secrets)
        lines = sanitized.splitlines() or [""]
        with self._lock:
            for line in lines:
                self._handle.write(
                    f"{utc_now().isoformat(timespec='milliseconds')} | "
                    f"{level.upper():7} | {event:<18} | {line}\n"
                )
            self._handle.flush()
        return sanitized

    def close(self) -> None:
        with self._lock:
            if not self._handle.closed:
                self._handle.flush()
                self._handle.close()

    def __enter__(self) -> RunLogWriter:
        return self

    def __exit__(self, *_args: object) -> None:
        self.close()


def append_attempt_event(
    workspace_root: str | Path,
    attempt: PipelineRunAttempt,
    level: str,
    event: str,
    message: object,
) -> None:
    """Append a lifecycle event emitted by an API control endpoint."""

    path = resolve_attempt_log_path(workspace_root, attempt)
    if not path or not path.is_file():
        return
    try:
        with RunLogWriter(path) as writer:
            writer.write(level, event, message)
    except OSError:
        # Observability must never prevent pause/resume/cancel from succeeding.
        return


def capture_process_output(process, writer: RunLogWriter) -> tuple[int, str, str]:
    """Capture both streams as they arrive and retain only a small error tail."""

    stdout_tail: deque[str] = deque(maxlen=200)
    stderr_tail: deque[str] = deque(maxlen=200)

    def consume(stream, name: str, tail: deque[str]) -> None:
        if stream is None:
            return
        for raw_line in iter(stream.readline, b""):
            line = raw_line.decode("utf-8", errors="replace").rstrip("\r\n")
            # stderr also carries recoverable warnings (for example a model
            # response-shape fallback). The exit-code event determines whether
            # the process actually failed.
            sanitized = writer.write("INFO" if name == "stdout" else "WARNING", name, line)
            tail.append(sanitized)
        stream.close()

    threads = [
        threading.Thread(target=consume, args=(process.stdout, "stdout", stdout_tail), daemon=True),
        threading.Thread(target=consume, args=(process.stderr, "stderr", stderr_tail), daemon=True),
    ]
    for thread in threads:
        thread.start()
    returncode = process.wait()
    for thread in threads:
        thread.join()
    return returncode, "\n".join(stdout_tail), "\n".join(stderr_tail)


def enforce_log_retention(db: Session, workspace_root: str | Path, assessment_id: str) -> None:
    """Apply age and size limits while preserving active and newest attempts."""

    attempts = (
        db.query(PipelineRunAttempt)
        .filter_by(assessment_id=assessment_id)
        .order_by(PipelineRunAttempt.created_at.desc())
        .all()
    )
    if not attempts:
        return

    now = utc_now()
    protected: set[str] = set()
    by_stage: dict[int, list[PipelineRunAttempt]] = {}
    for attempt in attempts:
        by_stage.setdefault(attempt.stage_num, []).append(attempt)
        if attempt.status in {"pending", "running", "paused"}:
            protected.add(attempt.attempt_id)
    for stage_attempts in by_stage.values():
        protected.update(attempt.attempt_id for attempt in stage_attempts[:max(1, KEEP_PER_STAGE)])

    def aware(value: datetime | None) -> datetime:
        if value is None:
            return now
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)

    to_remove: set[str] = set()
    for attempt in attempts:
        if attempt.attempt_id in protected:
            continue
        retention_days = SUCCESS_RETENTION_DAYS if attempt.status == "complete" else FAILURE_RETENTION_DAYS
        if aware(attempt.completed_at or attempt.created_at) < now - timedelta(days=retention_days):
            to_remove.add(attempt.attempt_id)

    existing: list[tuple[PipelineRunAttempt, Path, int]] = []
    for attempt in attempts:
        path = resolve_attempt_log_path(workspace_root, attempt)
        if path and path.is_file():
            existing.append((attempt, path, path.stat().st_size))

    total_bytes = sum(
        size for attempt, _path, size in existing if attempt.attempt_id not in to_remove
    )
    if total_bytes > MAX_BYTES_PER_ASSESSMENT:
        # The cap may reduce the keep-per-stage reserve, but always preserves
        # the newest attempt for each stage and every active attempt.
        newest_per_stage = {stage_attempts[0].attempt_id for stage_attempts in by_stage.values()}
        hard_protected = newest_per_stage | {
            attempt.attempt_id
            for attempt in attempts
            if attempt.status in {"pending", "running", "paused"}
        }
        for attempt, _path, size in sorted(existing, key=lambda item: aware(item[0].created_at)):
            if total_bytes <= MAX_BYTES_PER_ASSESSMENT:
                break
            if attempt.attempt_id in hard_protected or attempt.attempt_id in to_remove:
                continue
            to_remove.add(attempt.attempt_id)
            total_bytes -= size

    for attempt in attempts:
        if attempt.attempt_id not in to_remove:
            continue
        path = resolve_attempt_log_path(workspace_root, attempt)
        if path and path.is_file():
            path.unlink()
        db.delete(attempt)
    db.commit()

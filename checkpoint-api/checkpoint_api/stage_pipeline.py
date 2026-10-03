"""Automatic run of Stage 01 then Stage 02 for one assessment (spec 22, D-36).

The stage programs only write files. This runner stores their output through the
stage store directly, then gives Stage 02 the *stored* Stage 01 result, never the
client documents. Each run gets its own folder under the assessment's upload folder.
"""

import asyncio
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from . import stage_models as m
from . import stage_store
from .database import SessionLocal


REPO = Path(__file__).resolve().parents[2]
STAGES = REPO / "tara-workspace" / "web-based-tara" / "stages"
RESERVED = {"manifest.json", "boundary.txt"}


def utc_now():
    return datetime.now(timezone.utc)


def upload_dir() -> Path:
    workspace = os.getenv("WORKSPACE_ROOT", ".")
    return Path(os.getenv("UPLOAD_DIR", os.path.join(workspace, "uploads")))


def documents_dir(assessment_id: str) -> Path:
    return upload_dir() / assessment_id / "documents"


def agent(stage: str) -> str:
    defaults = {"01": STAGES / "01-input-normalization" / "agent.js", "02": STAGES / "02-item-definition" / "agent.js"}
    return os.getenv(f"STAGE{stage}_AGENT", str(defaults[stage]))


def timeout() -> float:
    return float(os.getenv("STAGE_TIMEOUT_SECONDS", "1800"))


def job(db, assessment_id: str, stage: str) -> m.StageJob:
    row = db.query(m.StageJob).filter_by(assessment_id=assessment_id, stage=stage).first()
    if row is None:
        row = m.StageJob(assessment_id=assessment_id, stage=stage, status="not_started")
        db.add(row)
        db.flush()
    return row


def mark(db, row: m.StageJob, status: str, error: str | None = None, **fields) -> None:
    row.status = status
    row.error_message = error[:2000] if error else None
    for key, value in fields.items():
        setattr(row, key, value)
    if status == "running":
        row.started_at = utc_now()
        row.completed_at = None
    if status in {"complete", "failed"}:
        row.completed_at = utc_now()
    db.commit()


async def run_node(args: list[str]) -> tuple[int, str, str]:
    proc = await asyncio.create_subprocess_exec(
        "node", *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=os.environ.copy(),
        cwd=str(REPO),
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout())
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        return -1, "", f"The stage did not finish within {int(timeout())} seconds and was stopped."
    return proc.returncode, stdout.decode(errors="replace"), stderr.decode(errors="replace")


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def store(db, assessment_id: str, stage: str, payload: dict) -> dict:
    try:
        return stage_store.store_run(db, assessment_id, stage, payload, created_by="pipeline")
    except stage_store.NothingAccepted as exc:
        first = exc.refused[0]["message"] if exc.refused else "no items"
        raise RuntimeError(f"Nothing from this stage could be stored. First reason: {first}") from exc
    except stage_store.NoStage01 as exc:
        raise RuntimeError("Stage 01 has no stored output yet.") from exc


def failure_text(stage: str, code: int, stdout: str, stderr: str) -> str:
    text = (stderr or stdout).strip()
    if stage == "02" and code == 3:
        return "The Item Definition did not pass its checks. Details are in stage02-log.json in the run folder."
    return text or f"Stage {stage} stopped with exit code {code}."


async def run_pipeline(assessment_id: str) -> None:
    """Runs Stage 01, stores it, runs Stage 02 on the stored result, stores it."""
    db = SessionLocal()
    try:
        docs = documents_dir(assessment_id)
        run_dir = upload_dir() / assessment_id / "runs" / utc_now().strftime("%Y%m%dT%H%M%S%fZ")
        out01, stored01, out02 = run_dir / "stage-01", run_dir / "stage01-stored", run_dir / "stage-02"
        for folder in (out01, stored01, out02):
            folder.mkdir(parents=True, exist_ok=True)
        j1, j2 = job(db, assessment_id, "01"), job(db, assessment_id, "02")

        # Stage 01
        mark(db, j1, "running", output_dir=str(out01))
        code, stdout, stderr = await run_node([agent("01"), "--input", str(docs), "--out", str(out01)])
        if code != 0:
            mark(db, j1, "failed", failure_text("01", code, stdout, stderr))
            return
        try:
            facts = read_json(out01 / "facts.json")
            result = store(db, assessment_id, "01", {
                "document_register": read_json(out01 / "document-register.json"),
                "facts": facts.get("facts", []),
                "conflicts": facts.get("conflicts", []),
                "rationale": read_json(out01 / "rationale.json"),
            })
        except (OSError, ValueError, RuntimeError) as exc:
            db.rollback()
            mark(db, j1, "failed", f"Stage 01 output could not be stored: {exc}")
            return
        mark(db, j1, "complete", run_number=result["run_number"], refused_count=len(result["refused"]))

        # Stage 02 reads the stored Stage 01 result, never the documents.
        stored = stage_store.read_output(db, stage_store.current_run(db, assessment_id, "01"))
        (stored01 / "document-register.json").write_text(json.dumps(stored["document_register"]), encoding="utf-8")
        (stored01 / "facts.json").write_text(json.dumps({"facts": stored["facts"], "conflicts": stored["conflicts"]}), encoding="utf-8")
        mark(db, j2, "running", output_dir=str(out02))
        args = [agent("02"), "--stage01", str(stored01), "--out", str(out02)]
        boundary = docs / "boundary.txt"
        if boundary.exists():
            args += ["--boundary", str(boundary)]
        code, stdout, stderr = await run_node(args)
        if code != 0:
            mark(db, j2, "failed", failure_text("02", code, stdout, stderr))
            return
        try:
            result = store(db, assessment_id, "02", {
                "item_definition": read_json(out02 / "item-definition.json"),
                "questions": read_json(out02 / "questions.json"),
                "rationale": read_json(out02 / "rationale.json"),
            })
        except (OSError, ValueError, RuntimeError) as exc:
            db.rollback()
            mark(db, j2, "failed", f"Stage 02 output could not be stored: {exc}")
            return
        mark(db, j2, "complete", run_number=result["run_number"], refused_count=len(result["refused"]))
    except Exception as exc:  # never leave a job stuck in "running"
        db.rollback()
        for row in db.query(m.StageJob).filter_by(assessment_id=assessment_id).all():
            if row.status in {"pending", "running"}:
                mark(db, row, "failed", f"The run stopped unexpectedly: {exc}")
    finally:
        db.close()

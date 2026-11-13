"""The demo TARA (D-67): one shipped example, and a private working copy of it for each tester's login session.

The example is in `demo_seed/` (`folders/` holds folders 04 to 10), built once by `scripts/build_demo_seed.py` and never edited by the server. A copy is an
ordinary assessment owned by the tester, filled through the same stores the pipeline uses, so every screen and every
edit works on it. The copy is removed at logout, or when it is older than a login can last.
"""

import json
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from . import pipeline_runner
from . import run_log
from . import stage03
from . import stage_models as m
from . import stage_store
from . import ui_stage_edits
from .models import Assessment, PipelineRun, PipelineRunAttempt
from .stage_catalog import STAGES_BY_NUMBER
from .stage_pipeline import documents_dir, job

log = run_log.get("pipeline")

SEED = Path(__file__).resolve().parent / "demo_seed"
NAME = "Demo: Key and certificate portal"
FOLDERS = (4, 5, 6, 7, 8, 9, 10)
BY = "demo"


def available() -> bool:
    return (SEED / "stage03.json").is_file()


def now() -> datetime:
    return datetime.now(timezone.utc)


def lifetime() -> timedelta:
    from .routers.auth import ACCESS_TOKEN_EXPIRE_MINUTES

    return timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)


def _load(name: str):
    return json.loads((SEED / name).read_text(encoding="utf-8"))


def store_stages(db: Session, assessment_id: str) -> None:
    """Documents, boundary and Stages 01 to 03, through the stores the pipeline uses. Stage 03 also writes the register."""
    folder = documents_dir(assessment_id)
    if folder.exists():
        shutil.rmtree(folder)
    shutil.copytree(SEED / "documents", folder)
    for stage in ("01", "02", "03"):
        result = stage_store.store_run(db, assessment_id, stage, _load(f"stage{stage}.json"), created_by=BY)
        row = job(db, assessment_id, stage)
        row.status, row.run_number, row.refused_count = "complete", result["run_number"], len(result["refused"])
        row.started_at = row.completed_at = now()
    db.commit()


def copy_folders(db: Session, assessment_id: str) -> None:
    """Folders 04 to 10 with the files beside their output, and the run rows the screens and the run history read."""
    stamp = now()
    for number in FOLDERS:
        target = Path(pipeline_runner.get_output_path(number, assessment_id)).parent
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(SEED / "folders" / STAGES_BY_NUMBER[number].key, target)
        name = STAGES_BY_NUMBER[number].key
        db.add(PipelineRun(assessment_id=assessment_id, stage_num=number, stage_name=name, status="complete", started_at=stamp, completed_at=stamp))
        db.add(PipelineRunAttempt(assessment_id=assessment_id, stage_num=number, stage_name=name, status="complete", provider="demo", started_at=stamp, completed_at=stamp, duration_ms=0, size_bytes=0))
    db.flush()
    pipeline_runner.update_assessment_completion(db, assessment_id)
    db.commit()


def apply_notes(db: Session, assessment_id: str) -> None:
    """The sample comments, the assistant's proposal on 03 and the assumptions that are already confirmed."""
    notes = _load("notes.json")
    for c in notes["comments_03"]:
        stage03.add_comment(db, assessment_id, BY, c, author=c.get("author", "analyst"), proposed_change=c.get("proposed_change"))
    for rationale_id in notes["confirmed_03"]:
        db.add(m.RationaleReview(assessment_id=assessment_id, stage="03", rationale_id=rationale_id, status="confirmed", reviewed_by=BY, reviewed_at=now()))
    db.commit()
    for ui_stage, part in notes["screens"].items():
        for c in part["comments"]:
            ui_stage_edits.add_comment(db, assessment_id, ui_stage, BY, c, author=c.get("author", "analyst"), proposed_change=c.get("proposed_change"))
        for assumption_id in part["confirmed"]:
            ui_stage_edits.review_assumption(db, assessment_id, ui_stage, assumption_id, BY, {"status": "confirmed"})


def open_copy(db: Session, owner_id: str, session_key: str) -> str:
    """The tester's copy for this login session: made on the first call, returned on every later one."""
    cleanup_expired(db)
    existing = db.query(m.DemoCopy).filter_by(owner_id=owner_id, session_key=session_key).first()
    if existing is not None and db.query(Assessment).filter_by(assessment_id=existing.assessment_id).first() is not None:
        return existing.assessment_id
    if existing is not None:
        db.delete(existing)
    # One copy per tester: a copy left by an earlier session of the same tester is not needed any more.
    for old in db.query(m.DemoCopy).filter_by(owner_id=owner_id).all():
        delete_copy(db, old.assessment_id)
    assessment = Assessment(name=NAME, description="A ready-made example to explore. Changes last until you log out.", vehicle_type="backend", domains=["backend"], owner_id=owner_id)
    db.add(assessment)
    db.flush()
    assessment_id = assessment.assessment_id
    db.add(m.DemoCopy(assessment_id=assessment_id, owner_id=owner_id, session_key=session_key))
    db.commit()
    try:
        store_stages(db, assessment_id)
        copy_folders(db, assessment_id)
        apply_notes(db, assessment_id)
    except Exception:
        db.rollback()
        log.exception("%s | The demo copy could not be made", assessment_id)
        delete_copy(db, assessment_id)
        raise
    log.info("%s | Demo copy made for %s", assessment_id, owner_id)
    return assessment_id


def delete_copy(db: Session, assessment_id: str) -> None:
    from .routers.assessments import purge_assessment

    assessment = db.query(Assessment).filter_by(assessment_id=assessment_id).first()
    if assessment is not None:
        purge_assessment(db, assessment)  # removes the demo_copies row too: it carries the assessment id
    else:
        db.query(m.DemoCopy).filter_by(assessment_id=assessment_id).delete(synchronize_session=False)
        db.commit()


def cleanup_expired(db: Session) -> int:
    """Removes copies older than a login can last (tab closed without logout, token expired)."""
    limit = now() - lifetime()
    old = []
    for row in db.query(m.DemoCopy).all():
        made = row.created_at if row.created_at.tzinfo else row.created_at.replace(tzinfo=timezone.utc)
        if made < limit:
            old.append(row.assessment_id)
    for assessment_id in old:
        delete_copy(db, assessment_id)
    if old:
        log.info("Removed %d demo cop%s left from earlier sessions", len(old), "y" if len(old) == 1 else "ies")
    return len(old)

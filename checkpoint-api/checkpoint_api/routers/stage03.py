"""Stage 03 Assets: output with the analyst's review, edits, comments, finish and rebuild (spec 27, D-56)."""

import json

from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import run_log
from .. import stage03
from .. import stage03_bridge
from .. import stage_models as m
from .. import stage_store
from .. import ui_stage_edits
from ..database import get_db
from ..models import PipelineRun
from ..settings import require_ai
from ..stage_pipeline import job, run_stage_03_only
from .assessments import current_user_id
from .auth import get_current_claims
from .stages import REVIEW_ROLES, assessment_for, current_or_404


router = APIRouter()
log = run_log.get("pipeline")


def analyst(claims: dict) -> str:
    if claims.get("role") not in REVIEW_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the analyst can review the assets.")
    return current_user_id(claims)


def refused(exc: stage03.Refused):
    return HTTPException(status_code=exc.status, detail=exc.message)


LATER_FOLDERS = [4, 5, 6, 7, 8, 9, 10]


def _register(assessment_id: str):
    """The register the later stages read, without the time it was written."""
    path, _ = stage03_bridge._paths(assessment_id)
    try:
        return [{k: v for k, v in entry.items() if k != "created_timestamp"} for entry in json.loads(path.read_text(encoding="utf-8"))]
    except (OSError, ValueError):
        return None


def after_edit(db: Session, assessment_id: str, by: str, what: str = "") -> None:
    """The later stages read the register, so it follows every edit (or waits for a running stage).

    When the edit changed the register and folders 04 to 10 are built, they are marked out of date in the way an edit on
    screens 04 to 06 marks them (D-69). Their Rebuild button builds them again from the new register.
    """
    before = _register(assessment_id)
    if not stage03_bridge.write_register(db, assessment_id):
        return
    after = _register(assessment_id)
    if before is None or after == before:
        return
    built = db.query(PipelineRun).filter(PipelineRun.assessment_id == assessment_id, PipelineRun.stage_num >= 4).first()
    if built is not None:
        ui_stage_edits.log_edit(db, assessment_id, "03", 3, what or "register", "the asset list", len(before), len(after), "Changed on the Assets screen", LATER_FOLDERS, by)


@router.get("/{assessment_id}/stages/03/runs/current/output")
def current_output(assessment_id: str, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    assessment_for(db, assessment_id, claims)
    return stage03.read_output(db, current_or_404(db, assessment_id, "03"))


@router.patch("/{assessment_id}/stages/03/assets/{asset_id}")
def review_asset(assessment_id: str, asset_id: str, body: dict = Body(...), claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    by = analyst(claims)
    assessment_for(db, assessment_id, claims)
    try:
        row = stage03.set_status(db, assessment_id, asset_id, body.get("status"), body.get("note"), by)
    except stage03.Refused as exc:
        raise refused(exc) from exc
    after_edit(db, assessment_id, by, asset_id)
    return {"asset_id": row.asset_id, "status": row.status, "status_note": row.status_note}


@router.get("/{assessment_id}/stages/03/asset-options")
def asset_options(assessment_id: str, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    """The families and the sources the "Add asset" form offers."""
    assessment_for(db, assessment_id, claims)
    return stage03.asset_options(db, current_or_404(db, assessment_id, "03"))


@router.post("/{assessment_id}/stages/03/assets", status_code=status.HTTP_201_CREATED)
def add_asset(assessment_id: str, body: dict = Body(...), claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    """Adds an asset by hand. No model is used."""
    by = analyst(claims)
    assessment_for(db, assessment_id, claims)
    try:
        row = stage03.add_asset(db, assessment_id, by, body)
    except stage03.Refused as exc:
        raise refused(exc) from exc
    after_edit(db, assessment_id, by, row.asset_id)
    run = current_or_404(db, assessment_id, "03")
    stage02 = db.get(m.StageRun, run.based_on_run_id)
    return stage03.read_asset(db, row, stage02.based_on_run_id if stage02 else None)


@router.patch("/{assessment_id}/stages/03/assets/{asset_id}/properties/{prop}")
def review_property(assessment_id: str, asset_id: str, prop: str, body: dict = Body(...), claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    by = analyst(claims)
    assessment_for(db, assessment_id, claims)
    try:
        row = stage03.change_property(db, assessment_id, asset_id, prop, by, body)
    except stage03.Refused as exc:
        raise refused(exc) from exc
    after_edit(db, assessment_id, by, asset_id)
    cell = next(p for p in row.properties if p.property == prop)
    return {"asset_id": row.asset_id, "property": prop, "applies": cell.applies, "reason": cell.reason, "origin": cell.origin, "reviewed": cell.reviewed}


@router.get("/{assessment_id}/stages/03/comments")
def list_comments(assessment_id: str, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    assessment_for(db, assessment_id, claims)
    return stage03.list_comments(db, assessment_id)


@router.post("/{assessment_id}/stages/03/comments", status_code=status.HTTP_201_CREATED)
def add_comment(assessment_id: str, body: dict = Body(...), claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    by = analyst(claims)
    assessment_for(db, assessment_id, claims)
    try:
        return stage03.read_comment(stage03.add_comment(db, assessment_id, by, body))
    except stage03.Refused as exc:
        raise refused(exc) from exc


@router.patch("/{assessment_id}/stages/03/comments/{comment_id}")
def update_comment(assessment_id: str, comment_id: int, body: dict = Body(...), claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    by = analyst(claims)
    assessment_for(db, assessment_id, claims)
    try:
        comment = stage03.update_comment(db, assessment_id, comment_id, by, body)
    except stage03.Refused as exc:
        raise refused(exc) from exc
    if (body.get("proposed_change") or {}).get("state") == "applied":
        after_edit(db, assessment_id, by, comment.asset_id)
    return stage03.read_comment(comment)


@router.post("/{assessment_id}/stages/03/finish")
def finish(assessment_id: str, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    """Records that the asset review is finished. It does not gate Stage 04 (D-58)."""
    by = analyst(claims)
    assessment_for(db, assessment_id, claims)
    try:
        return {"finished": stage03.finish(db, assessment_id, by)}
    except stage03.Refused as exc:
        raise refused(exc) from exc


@router.post("/{assessment_id}/stages/03/rebuild", status_code=status.HTTP_202_ACCEPTED)
def rebuild(assessment_id: str, background_tasks: BackgroundTasks, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    """Builds Stage 03 again on the current Stage 02 run, for the "built on an older item definition" banner."""
    analyst(claims)
    assessment_for(db, assessment_id, claims)
    require_ai(claims)
    if stage_store.current_run(db, assessment_id, "02") is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Stage 02 has no stored result yet.")
    busy = db.query(m.StageJob).filter(m.StageJob.assessment_id == assessment_id, m.StageJob.status.in_(["pending", "running"])).first()
    if busy:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Stage {busy.stage} is still running. Wait for it to finish.")
    row = job(db, assessment_id, "03")
    row.status, row.error_message, row.run_number, row.refused_count, row.started_at, row.completed_at = "pending", None, None, None, None, None
    db.commit()
    log.info("%s | Stage 03 rebuild queued", assessment_id)
    background_tasks.add_task(run_stage_03_only, assessment_id)
    return {"stage": "03", "status": "pending"}

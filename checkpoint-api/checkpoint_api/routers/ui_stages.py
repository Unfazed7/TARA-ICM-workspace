"""Screens 04 Impacts, 05 Threats and 06 TARA: rows, edits, comments, assumptions, finish and rebuild (specs 29 to 31, D-62)."""

from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import run_log
from .. import ui_stage_edits as edits
from .. import ui_stages as u
from ..database import get_db
from ..stage_pipeline import prepare_folders, run_from_folder
from .assessments import current_user_id
from .auth import get_current_claims
from .stages import REVIEW_ROLES, assessment_for


router = APIRouter()
log = run_log.get("pipeline")

# What a rebuild from a screen's first folder needs to find already built.
NEEDS = {"04": (3,), "05": (4,), "06": (6, 7)}
NEEDS_TEXT = {"04": "the asset register", "05": "the damage scenarios", "06": "the attack paths and impact ratings"}


def check_ui(ui_stage: str) -> str:
    if ui_stage not in u.UI_STAGES:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown screen. Use 04, 05 or 06.")
    return ui_stage


def analyst(claims: dict) -> str:
    if claims.get("role") not in REVIEW_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the analyst can review this screen.")
    return current_user_id(claims)


def refused(exc: edits.Refused) -> HTTPException:
    return HTTPException(status_code=exc.status, detail=exc.message)


@router.get("/{assessment_id}/ui-stages/{ui_stage}")
def screen(assessment_id: str, ui_stage: str, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    check_ui(ui_stage)
    assessment_for(db, assessment_id, claims)
    return u.read_screen(db, assessment_id, ui_stage)


@router.patch("/{assessment_id}/ui-stages/{ui_stage}/records/{record_id}/fields/{field}")
def edit_field(assessment_id: str, ui_stage: str, record_id: str, field: str, body: dict = Body(...), claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    check_ui(ui_stage)
    by = analyst(claims)
    assessment_for(db, assessment_id, claims)
    try:
        return edits.apply_edit(db, assessment_id, ui_stage, record_id, field, body, by)
    except edits.Refused as exc:
        raise refused(exc) from exc


@router.get("/{assessment_id}/ui-stages/{ui_stage}/comments")
def list_comments(assessment_id: str, ui_stage: str, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    check_ui(ui_stage)
    assessment_for(db, assessment_id, claims)
    return edits.list_comments(db, assessment_id, ui_stage)


@router.post("/{assessment_id}/ui-stages/{ui_stage}/comments", status_code=status.HTTP_201_CREATED)
def add_comment(assessment_id: str, ui_stage: str, body: dict = Body(...), claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    check_ui(ui_stage)
    by = analyst(claims)
    assessment_for(db, assessment_id, claims)
    try:
        return edits.read_comment(edits.add_comment(db, assessment_id, ui_stage, by, body))
    except edits.Refused as exc:
        raise refused(exc) from exc


@router.patch("/{assessment_id}/ui-stages/{ui_stage}/comments/{comment_id}")
def update_comment(assessment_id: str, ui_stage: str, comment_id: int, body: dict = Body(...), claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    check_ui(ui_stage)
    by = analyst(claims)
    assessment_for(db, assessment_id, claims)
    try:
        return edits.read_comment(edits.update_comment(db, assessment_id, ui_stage, comment_id, by, body))
    except edits.Refused as exc:
        raise refused(exc) from exc


@router.patch("/{assessment_id}/ui-stages/{ui_stage}/assumptions/{assumption_id}")
def review_assumption(assessment_id: str, ui_stage: str, assumption_id: str, body: dict = Body(...), claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    check_ui(ui_stage)
    by = analyst(claims)
    assessment_for(db, assessment_id, claims)
    try:
        return edits.review_assumption(db, assessment_id, ui_stage, assumption_id, by, body)
    except edits.Refused as exc:
        raise refused(exc) from exc


@router.post("/{assessment_id}/ui-stages/{ui_stage}/finish")
def finish(assessment_id: str, ui_stage: str, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    """Records that the review is finished. It is never refused, even with open items, and gates nothing."""
    check_ui(ui_stage)
    by = analyst(claims)
    assessment_for(db, assessment_id, claims)
    return {"finished": edits.finish(db, assessment_id, ui_stage, by)}


@router.post("/{assessment_id}/ui-stages/{ui_stage}/rebuild", status_code=status.HTTP_202_ACCEPTED)
def rebuild(assessment_id: str, ui_stage: str, background_tasks: BackgroundTasks, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    """Runs this screen's first folder and every folder after it again. The edits made in those folders are replaced."""
    check_ui(ui_stage)
    analyst(claims)
    assessment_for(db, assessment_id, claims)
    if u.anything_running(db, assessment_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A build is already running. Wait for it to finish.")
    missing = [n for n in NEEDS[ui_stage] if u.read_folder(n, assessment_id) is None]
    if missing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"There is no {NEEDS_TEXT[ui_stage]} to build from yet. Run Execute first.")
    log.info("%s | Rebuild queued from folder %02d (screen %s)", assessment_id, u.FIRST_FOLDER[ui_stage], ui_stage)
    prepare_folders(db, assessment_id, [n for n in u.CHAIN if n >= u.FIRST_FOLDER[ui_stage]])  # the screens show the build at once
    background_tasks.add_task(run_from_folder, assessment_id, u.FIRST_FOLDER[ui_stage])
    return {"ui_stage": ui_stage, "status": "pending"}

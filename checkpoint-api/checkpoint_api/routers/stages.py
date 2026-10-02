"""Stage 01 and Stage 02 output and Rationale review (specs 18, 12d, 13b)."""

from datetime import datetime, timezone

from fastapi import APIRouter, Body, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from .. import stage_models as m
from .. import stage_store
from ..database import get_db
from .assessments import current_user_id, get_assessment_or_404, require_assessment_access
from .auth import get_current_claims


router = APIRouter()

WRITE_ROLES = {"analyst", "user", "admin", "service"}
# "user" is the role of accounts registered before D-42; everyone who registers is an analyst.
REVIEW_ROLES = {"analyst", "user", "admin"}
REVIEW_STATUSES = {"unreviewed", "confirmed", "disputed"}
ATTENTION_ORDER = {"needs_attention": 0, "information": 1}


def check_stage(stage: str) -> str:
    if stage not in stage_store.STAGES:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown stage. Use 01 or 02.")
    return stage


def assessment_for(db: Session, assessment_id: str, claims: dict):
    assessment = get_assessment_or_404(db, assessment_id)
    if claims.get("role") != "service":
        require_assessment_access(assessment, claims)
    return assessment


def current_or_404(db: Session, assessment_id: str, stage: str) -> m.StageRun:
    run = stage_store.current_run(db, assessment_id, stage)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Stage {stage} has no stored output yet.")
    return run


@router.post("/{assessment_id}/stages/{stage}/runs", status_code=status.HTTP_201_CREATED)
def create_run(
    assessment_id: str,
    stage: str,
    payload: dict = Body(...),
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    check_stage(stage)
    if claims.get("role") not in WRITE_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This login cannot store stage output.")
    assessment_for(db, assessment_id, claims)
    try:
        return stage_store.store_run(db, assessment_id, stage, payload, created_by=current_user_id(claims))
    except stage_store.NoStage01:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Stage 01 has no stored output yet.")
    except stage_store.NothingAccepted as exc:
        return JSONResponse(status_code=422, content={"accepted_total": 0, "refused": exc.refused})


@router.get("/{assessment_id}/stages/{stage}/runs")
def list_runs(assessment_id: str, stage: str, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    check_stage(stage)
    assessment_for(db, assessment_id, claims)
    runs = db.query(m.StageRun).filter_by(assessment_id=assessment_id, stage=stage).order_by(m.StageRun.run_number).all()
    return [
        {
            "run_number": run.run_number,
            "created_at": stage_store._iso(run.created_at),
            "created_by": run.created_by,
            "accepted_count": run.accepted_count,
            "refused_count": run.refused_count,
        }
        for run in runs
    ]


# The plain /stages/{n}/output path belongs to the legacy pipeline router (old frontend).
@router.get("/{assessment_id}/stages/{stage}/runs/current/output")
def current_output(assessment_id: str, stage: str, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    check_stage(stage)
    assessment_for(db, assessment_id, claims)
    return stage_store.read_output(db, current_or_404(db, assessment_id, stage))


@router.get("/{assessment_id}/stages/{stage}/runs/{run_number}/output")
def run_output(assessment_id: str, stage: str, run_number: int, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    check_stage(stage)
    assessment_for(db, assessment_id, claims)
    run = stage_store.run_by_number(db, assessment_id, stage, run_number)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Stage {stage} has no run {run_number}.")
    return stage_store.read_output(db, run)


@router.get("/{assessment_id}/stages/{stage}/rationale")
def list_rationale(assessment_id: str, stage: str, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    check_stage(stage)
    assessment_for(db, assessment_id, claims)
    run = current_or_404(db, assessment_id, stage)
    items = stage_store.read_rationale(db, run)
    items.sort(key=lambda item: ATTENTION_ORDER[item["attention"]])  # stable: keeps stage order within a level
    counts = {key: 0 for key in ["needs_attention", "information", *sorted(REVIEW_STATUSES)]}
    for item in items:
        counts[item["attention"]] += 1
        counts[item["review"]["status"]] += 1
    return {"stage": stage, "run_number": run.run_number, "counts": counts, "items": items}


@router.patch("/{assessment_id}/stages/{stage}/rationale/{rationale_id}")
def review_rationale(
    assessment_id: str,
    stage: str,
    rationale_id: str,
    body: dict = Body(...),
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    check_stage(stage)
    if claims.get("role") not in REVIEW_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the analyst can review Rationale items.")
    assessment_for(db, assessment_id, claims)
    run = current_or_404(db, assessment_id, stage)
    row = db.query(m.RationaleItem).filter_by(run_id=run.id, rationale_id=rationale_id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Rationale item {rationale_id} not found.")

    review_status = body.get("status")
    note = (body.get("note") or "").strip() or None
    if review_status not in REVIEW_STATUSES:
        raise HTTPException(status_code=422, detail="Status must be unreviewed, confirmed or disputed.")
    if review_status == "disputed" and (note is None or len(note) < 3):
        raise HTTPException(status_code=422, detail="A dispute needs a note saying what is wrong.")

    review = db.query(m.RationaleReview).filter_by(assessment_id=assessment_id, stage=stage, rationale_id=rationale_id).first()
    if review_status == "unreviewed":
        if review is not None:
            db.delete(review)
    else:
        if review is None:
            review = m.RationaleReview(assessment_id=assessment_id, stage=stage, rationale_id=rationale_id)
            db.add(review)
        review.status = review_status
        review.note = note
        review.reviewed_by = current_user_id(claims)
        review.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    return stage_store.read_rationale_item(db, assessment_id, row)

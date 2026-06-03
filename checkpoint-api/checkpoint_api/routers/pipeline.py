import json
import os

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Assessment, PipelineRun
from ..pipeline_runner import (
    STAGE_DIRS,
    get_output_path,
    get_upload_path,
    run_stage_subprocess,
    utc_now,
)
from ..schemas import PipelineRunResponse
from .auth import get_current_claims


router = APIRouter()
STAGE_DEPS = {1: [], 2: [1], 3: [2], 4: [3], 5: [3], 6: [4, 5], 7: [6]}


def is_admin(claims: dict) -> bool:
    return claims.get("role") == "admin"


def current_user_id(claims: dict) -> str:
    return str(claims.get("sub") or claims.get("user_id") or "service")


def validate_stage_num(stage_num: int) -> None:
    if stage_num not in STAGE_DIRS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stage not found")


def get_assessment_for_user(db: Session, assessment_id: str, claims: dict) -> Assessment:
    assessment = db.query(Assessment).filter_by(assessment_id=assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")
    if not is_admin(claims) and assessment.owner_id != current_user_id(claims):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")
    return assessment


def get_run(db: Session, assessment_id: str, stage_num: int) -> PipelineRun | None:
    return db.query(PipelineRun).filter_by(assessment_id=assessment_id, stage_num=stage_num).first()


def run_response(assessment_id: str, stage_num: int, run: PipelineRun | None) -> PipelineRunResponse:
    if not run:
        return PipelineRunResponse(
            run_id=None,
            assessment_id=assessment_id,
            stage_num=stage_num,
            stage_name=STAGE_DIRS[stage_num],
            status="not_started",
        )
    return PipelineRunResponse.model_validate(run)


def require_dependencies(db: Session, assessment_id: str, stage_num: int) -> None:
    for dep in STAGE_DEPS[stage_num]:
        dep_run = get_run(db, assessment_id, dep)
        if not dep_run or dep_run.status != "complete":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Stage {stage_num} requires stage {dep} to be complete first",
            )


@router.post("/{assessment_id}/stages/{stage_num}/run", response_model=PipelineRunResponse, status_code=status.HTTP_202_ACCEPTED)
def run_stage(
    assessment_id: str,
    stage_num: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_claims),
):
    validate_stage_num(stage_num)
    get_assessment_for_user(db, assessment_id, claims)
    if stage_num == 1 and not os.path.exists(get_upload_path(assessment_id)):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Upload assets.csv before running stage 01")
    require_dependencies(db, assessment_id, stage_num)

    run = get_run(db, assessment_id, stage_num)
    if run and run.status in {"pending", "running"}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Stage {stage_num} is already running")
    if not run:
        run = PipelineRun(assessment_id=assessment_id, stage_num=stage_num, stage_name=STAGE_DIRS[stage_num])
        db.add(run)

    run.status = "pending"
    run.error_message = None
    run.started_at = utc_now()
    run.completed_at = None
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Stage {stage_num} is already running")
    db.refresh(run)

    background_tasks.add_task(run_stage_subprocess, assessment_id, stage_num, None)
    return run


@router.get("/{assessment_id}/stages/{stage_num}/status", response_model=PipelineRunResponse)
def stage_status(
    assessment_id: str,
    stage_num: int,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_claims),
):
    validate_stage_num(stage_num)
    get_assessment_for_user(db, assessment_id, claims)
    return run_response(assessment_id, stage_num, get_run(db, assessment_id, stage_num))


@router.get("/{assessment_id}/outputs/{stage_num}")
@router.get("/{assessment_id}/stages/{stage_num}/output")
def stage_output(
    assessment_id: str,
    stage_num: int,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_claims),
):
    validate_stage_num(stage_num)
    get_assessment_for_user(db, assessment_id, claims)
    output_path = get_output_path(stage_num)
    if not os.path.exists(output_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Stage {stage_num} output not yet available")
    with open(output_path, "r", encoding="utf-8") as output_file:
        return json.load(output_file)


@router.delete("/{assessment_id}/stages/{stage_num}/reset", response_model=PipelineRunResponse)
def reset_stage(
    assessment_id: str,
    stage_num: int,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_claims),
):
    validate_stage_num(stage_num)
    get_assessment_for_user(db, assessment_id, claims)
    output_path = get_output_path(stage_num)
    if os.path.exists(output_path):
        os.unlink(output_path)
    run = get_run(db, assessment_id, stage_num)
    if run:
        db.delete(run)
        db.commit()
    return run_response(assessment_id, stage_num, None)

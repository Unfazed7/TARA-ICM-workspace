import json
import os
from collections import deque
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse, PlainTextResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import pipeline_runner, stage_store
from ..database import get_db
from ..models import Assessment, PipelineRun, PipelineRunAttempt
from ..pipeline_runner import (
    LLM_PROVIDER,
    effective_llm_model,
    cancel_stage_process,
    get_output_path,
    pause_stage_process,
    resume_stage_process,
    run_stage_subprocess,
    utc_now,
)
from ..run_logs import append_attempt_event, resolve_attempt_log_path
from ..schemas import PipelineRunAttemptResponse, PipelineRunResponse, StageDefinitionResponse
from ..stage_catalog import STAGES, get_stage
from .auth import get_current_claims


router = APIRouter()


def is_admin(claims: dict) -> bool:
    return claims.get("role") == "admin"


def current_user_id(claims: dict) -> str:
    return str(claims.get("sub") or claims.get("user_id") or "service")


def validate_stage_num(stage_num: int) -> None:
    if get_stage(stage_num) is None:
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


def get_attempt(db: Session, assessment_id: str, attempt_id: str) -> PipelineRunAttempt:
    attempt = db.query(PipelineRunAttempt).filter_by(
        assessment_id=assessment_id,
        attempt_id=attempt_id,
    ).first()
    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run attempt not found")
    return attempt


def latest_active_attempt(db: Session, assessment_id: str, stage_num: int) -> PipelineRunAttempt | None:
    return (
        db.query(PipelineRunAttempt)
        .filter(
            PipelineRunAttempt.assessment_id == assessment_id,
            PipelineRunAttempt.stage_num == stage_num,
            PipelineRunAttempt.status.in_(["pending", "running", "paused"]),
        )
        .order_by(PipelineRunAttempt.created_at.desc())
        .first()
    )


def attempt_response(attempt: PipelineRunAttempt) -> PipelineRunAttemptResponse:
    path = resolve_attempt_log_path(pipeline_runner.WORKSPACE_ROOT, attempt)
    size_bytes = path.stat().st_size if path and path.is_file() else (attempt.size_bytes or 0)
    return PipelineRunAttemptResponse(
        attempt_id=attempt.attempt_id,
        assessment_id=attempt.assessment_id,
        stage_num=attempt.stage_num,
        stage_name=attempt.stage_name,
        status=attempt.status,
        provider=attempt.provider,
        model=attempt.model,
        error_message=attempt.error_message,
        started_at=attempt.started_at,
        completed_at=attempt.completed_at,
        duration_ms=attempt.duration_ms,
        size_bytes=size_bytes,
        filename=path.name if path else None,
        log_available=bool(path and path.is_file()),
    )


def run_response(assessment_id: str, stage_num: int, run: PipelineRun | None) -> PipelineRunResponse:
    stage = get_stage(stage_num)
    if stage is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stage not found")
    if not run:
        return PipelineRunResponse(
            run_id=None,
            assessment_id=assessment_id,
            stage_num=stage_num,
            stage_name=stage.key,
            status="not_started",
        )
    return PipelineRunResponse.model_validate(run)


def require_dependencies(db: Session, assessment_id: str, stage_num: int) -> None:
    stage = get_stage(stage_num)
    if stage is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stage not found")
    for dep in stage.dependencies:
        if dep == 2:
            # Stage 02 lives in the stage store (stage_runs), not in PipelineRun.
            # No review gate: a stored current run is enough (D-54).
            if stage_store.current_run(db, assessment_id, "02") is None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Stage {stage_num} requires stage 02 (Item Definition) to have a stored result first",
                )
            continue
        dep_run = get_run(db, assessment_id, dep)
        if not dep_run or dep_run.status != "complete":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Stage {stage_num} requires stage {dep} to be complete first",
            )


@router.get("/{assessment_id}/stages", response_model=list[StageDefinitionResponse])
def stage_catalog(
    assessment_id: str,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_claims),
):
    get_assessment_for_user(db, assessment_id, claims)
    return [
        StageDefinitionResponse(
            stage_num=stage.number,
            key=stage.key,
            name=stage.name,
            description=stage.description,
            dependencies=list(stage.dependencies),
            outputs=list(stage.outputs),
            checkpoint=stage.checkpoint,
            available=stage.available,
        )
        for stage in STAGES
    ]


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
    stage = get_stage(stage_num)
    if stage is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stage not found")
    if not stage.available:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=f"Stage {stage_num:02d} — {stage.name} is not implemented yet",
        )
    require_dependencies(db, assessment_id, stage_num)

    run = get_run(db, assessment_id, stage_num)
    if run and run.status in {"pending", "running", "paused"}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Stage {stage_num} is already running")
    if not run:
        run = PipelineRun(assessment_id=assessment_id, stage_num=stage_num, stage_name=stage.key)
        db.add(run)

    attempt = PipelineRunAttempt(
        assessment_id=assessment_id,
        stage_num=stage_num,
        stage_name=stage.key,
        status="pending",
        provider=LLM_PROVIDER,
        model=effective_llm_model() or None,
        started_at=utc_now(),
    )
    db.add(attempt)

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

    background_tasks.add_task(run_stage_subprocess, assessment_id, stage_num, None, attempt.attempt_id)
    return run


@router.post("/{assessment_id}/stages/{stage_num}/pause", response_model=PipelineRunResponse)
def pause_stage(
    assessment_id: str,
    stage_num: int,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_claims),
):
    validate_stage_num(stage_num)
    get_assessment_for_user(db, assessment_id, claims)
    run = get_run(db, assessment_id, stage_num)
    if not run or run.status != "running":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only a running stage can be paused")
    if not pause_stage_process(assessment_id, stage_num):
        detail = "Stage pausing is not supported on this operating system" if os.name != "posix" else "Stage process is not active"
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)
    run.status = "paused"
    attempt = latest_active_attempt(db, assessment_id, stage_num)
    if attempt:
        attempt.status = "paused"
        append_attempt_event(pipeline_runner.WORKSPACE_ROOT, attempt, "WARNING", "run.paused", "Paused by user")
    db.commit()
    db.refresh(run)
    return run


@router.post("/{assessment_id}/stages/{stage_num}/resume", response_model=PipelineRunResponse)
def resume_stage(
    assessment_id: str,
    stage_num: int,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_claims),
):
    validate_stage_num(stage_num)
    get_assessment_for_user(db, assessment_id, claims)
    run = get_run(db, assessment_id, stage_num)
    if not run or run.status != "paused":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only a paused stage can be resumed")
    if not resume_stage_process(assessment_id, stage_num):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Stage process is not active")
    run.status = "running"
    attempt = latest_active_attempt(db, assessment_id, stage_num)
    if attempt:
        attempt.status = "running"
        append_attempt_event(pipeline_runner.WORKSPACE_ROOT, attempt, "INFO", "run.resumed", "Resumed by user")
    db.commit()
    db.refresh(run)
    return run


@router.post("/{assessment_id}/stages/{stage_num}/cancel", response_model=PipelineRunResponse)
def cancel_stage(
    assessment_id: str,
    stage_num: int,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_claims),
):
    validate_stage_num(stage_num)
    get_assessment_for_user(db, assessment_id, claims)
    run = get_run(db, assessment_id, stage_num)
    if not run or run.status not in {"pending", "running", "paused", "cancelled"}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Stage is not active")
    if run.status == "cancelled":
        return run
    run.status = "cancelled"
    run.completed_at = utc_now()
    run.error_message = None
    attempt = latest_active_attempt(db, assessment_id, stage_num)
    if attempt:
        attempt.status = "cancelled"
        attempt.completed_at = run.completed_at
        if attempt.started_at:
            started_at = attempt.started_at
            if started_at.tzinfo is None:
                started_at = started_at.replace(tzinfo=run.completed_at.tzinfo)
            attempt.duration_ms = max(0, int((run.completed_at - started_at).total_seconds() * 1000))
        append_attempt_event(pipeline_runner.WORKSPACE_ROOT, attempt, "WARNING", "run.cancel.requested", "Cancellation requested by user")
    db.commit()
    cancel_stage_process(assessment_id, stage_num)
    db.refresh(run)
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


@router.get("/{assessment_id}/runs", response_model=list[PipelineRunAttemptResponse])
def list_run_attempts(
    assessment_id: str,
    stage_num: int | None = Query(default=None, ge=1, le=10),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_claims),
):
    get_assessment_for_user(db, assessment_id, claims)
    query = db.query(PipelineRunAttempt).filter_by(assessment_id=assessment_id)
    if stage_num is not None:
        query = query.filter_by(stage_num=stage_num)
    attempts = query.order_by(PipelineRunAttempt.created_at.desc()).limit(limit).all()
    return [attempt_response(attempt) for attempt in attempts]


@router.get("/{assessment_id}/runs/{attempt_id}", response_model=PipelineRunAttemptResponse)
def run_attempt_detail(
    assessment_id: str,
    attempt_id: str,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_claims),
):
    get_assessment_for_user(db, assessment_id, claims)
    return attempt_response(get_attempt(db, assessment_id, attempt_id))


@router.get("/{assessment_id}/runs/{attempt_id}/log", response_class=PlainTextResponse)
def view_run_log(
    assessment_id: str,
    attempt_id: str,
    tail_lines: int = Query(default=2000, ge=1, le=10000),
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_claims),
):
    get_assessment_for_user(db, assessment_id, claims)
    attempt = get_attempt(db, assessment_id, attempt_id)
    path = resolve_attempt_log_path(pipeline_runner.WORKSPACE_ROOT, attempt)
    if not path or not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run log not available")
    with path.open("r", encoding="utf-8", errors="replace") as handle:
        content = "".join(deque(handle, maxlen=tail_lines))
    return PlainTextResponse(content, headers={"Cache-Control": "no-store"})


@router.get("/{assessment_id}/runs/{attempt_id}/log/download")
def download_run_log(
    assessment_id: str,
    attempt_id: str,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_claims),
):
    get_assessment_for_user(db, assessment_id, claims)
    attempt = get_attempt(db, assessment_id, attempt_id)
    path = resolve_attempt_log_path(pipeline_runner.WORKSPACE_ROOT, attempt)
    if not path or not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run log not available")
    return FileResponse(
        Path(path),
        media_type="text/plain; charset=utf-8",
        filename=path.name,
        headers={"Cache-Control": "no-store"},
    )


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
    output_path = get_output_path(stage_num, assessment_id)
    if not os.path.exists(output_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Stage {stage_num} output not yet available")
    with open(output_path, "r", encoding="utf-8") as output_file:
        return json.load(output_file)


@router.get("/{assessment_id}/stages/{stage_num}/rationale-file")
def stage_rationale_file(
    assessment_id: str,
    stage_num: int,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_claims),
):
    """Assumptions a pipeline stage (03, 10) wrote next to its output, read-only (D-54).
    Same shape as GET .../stages/{stage}/rationale so the same list shows them."""
    validate_stage_num(stage_num)
    get_assessment_for_user(db, assessment_id, claims)
    rationale_path = Path(get_output_path(stage_num, assessment_id)).with_name("rationale.json")
    if not rationale_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Stage {stage_num} has no Assumptions yet")
    with open(rationale_path, "r", encoding="utf-8") as rationale_file:
        items = json.load(rationale_file)
    items.sort(key=lambda item: 0 if item.get("attention") == "needs_attention" else 1)
    counts = {"needs_attention": 0, "information": 0, "unreviewed": 0, "confirmed": 0, "disputed": 0}
    for item in items:
        counts[item.get("attention", "information")] += 1
        counts[(item.get("review") or {}).get("status", "unreviewed")] += 1
    return {"stage": f"{stage_num:02d}", "run_number": 1, "counts": counts, "items": items}


@router.delete("/{assessment_id}/stages/{stage_num}/reset", response_model=PipelineRunResponse)
def reset_stage(
    assessment_id: str,
    stage_num: int,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_claims),
):
    validate_stage_num(stage_num)
    get_assessment_for_user(db, assessment_id, claims)
    output_path = get_output_path(stage_num, assessment_id)
    if os.path.exists(output_path):
        os.unlink(output_path)
    run = get_run(db, assessment_id, stage_num)
    if run:
        if run.status in {"pending", "running", "paused"}:
            completed_at = utc_now()
            run.status = "cancelled"
            run.completed_at = completed_at
            attempt = latest_active_attempt(db, assessment_id, stage_num)
            if attempt:
                attempt.status = "cancelled"
                attempt.completed_at = completed_at
                append_attempt_event(
                    pipeline_runner.WORKSPACE_ROOT,
                    attempt,
                    "WARNING",
                    "run.reset",
                    "Stage reset by user",
                )
            db.commit()
            cancel_stage_process(assessment_id, stage_num)
        db.delete(run)
        db.commit()
    return run_response(assessment_id, stage_num, None)

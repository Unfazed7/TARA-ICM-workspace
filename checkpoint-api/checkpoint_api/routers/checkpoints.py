from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Checkpoint, utc_now
from ..schemas import (
    CheckpointCreate,
    CheckpointCreated,
    CheckpointListItem,
    CheckpointReview,
    CheckpointReviewResponse,
    CheckpointStatus,
)
from .auth import get_current_user


router = APIRouter(dependencies=[Depends(get_current_user)])


@router.post(
    "/api/v1/assessments/{assessment_id}/checkpoints",
    response_model=CheckpointCreated,
    status_code=status.HTTP_201_CREATED,
)
def create_checkpoint(
    assessment_id: str,
    request: CheckpointCreate,
    db: Session = Depends(get_db),
):
    existing = db.query(Checkpoint).filter_by(
        assessment_id=assessment_id,
        stage_num=request.stage_num,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Checkpoint for this assessment and stage already exists",
        )

    checkpoint = Checkpoint(
        assessment_id=assessment_id,
        stage_num=request.stage_num,
        stage_name=request.stage_name,
        output_summary=request.output_summary,
    )
    db.add(checkpoint)
    db.commit()
    db.refresh(checkpoint)
    return checkpoint


@router.get(
    "/api/v1/assessments/{assessment_id}/checkpoints/{stage_num}",
    response_model=CheckpointStatus,
)
def get_checkpoint_status(
    assessment_id: str,
    stage_num: int,
    db: Session = Depends(get_db),
):
    checkpoint = db.query(Checkpoint).filter_by(
        assessment_id=assessment_id,
        stage_num=stage_num,
    ).first()
    if not checkpoint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checkpoint not found")
    return checkpoint


@router.post(
    "/api/v1/checkpoints/{checkpoint_id}/review",
    response_model=CheckpointReviewResponse,
)
def review_checkpoint(
    checkpoint_id: str,
    request: CheckpointReview,
    db: Session = Depends(get_db),
):
    checkpoint = db.query(Checkpoint).filter_by(checkpoint_id=checkpoint_id).first()
    if not checkpoint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checkpoint not found")
    if checkpoint.status != "pending_review":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Checkpoint already reviewed",
        )

    checkpoint.status = request.decision
    checkpoint.reviewer_id = request.reviewer_id
    checkpoint.notes = request.notes
    checkpoint.reviewed_at = utc_now()
    db.commit()
    db.refresh(checkpoint)

    return CheckpointReviewResponse(
        checkpoint_id=checkpoint.checkpoint_id,
        status=checkpoint.status,
        reviewer_id=checkpoint.reviewer_id,
        reviewed_at=checkpoint.reviewed_at,
    )


@router.get(
    "/api/v1/assessments/{assessment_id}/checkpoints",
    response_model=list[CheckpointListItem],
)
def list_checkpoints(
    assessment_id: str,
    db: Session = Depends(get_db),
):
    return db.query(Checkpoint).filter_by(assessment_id=assessment_id).order_by(
        Checkpoint.stage_num.asc()
    ).all()

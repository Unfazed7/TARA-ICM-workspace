import os

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Assessment, PipelineRun
from ..pipeline_runner import STAGE_OUTPUT_FILES, get_output_path
from ..schemas import AssessmentCreate, AssessmentResponse, AssessmentUpdate
from .auth import get_current_claims


router = APIRouter()


def is_admin(claims: dict) -> bool:
    return claims.get("role") == "admin"


def current_user_id(claims: dict) -> str:
    return str(claims.get("sub") or claims.get("user_id") or "service")


def get_assessment_or_404(db: Session, assessment_id: str) -> Assessment:
    assessment = db.query(Assessment).filter_by(assessment_id=assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")
    return assessment


def require_assessment_access(assessment: Assessment, claims: dict) -> None:
    if not is_admin(claims) and assessment.owner_id != current_user_id(claims):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")


def stage_statuses(db: Session, assessment_id: str) -> dict[str, str]:
    runs = db.query(PipelineRun).filter_by(assessment_id=assessment_id).all()
    by_stage = {run.stage_num: run.status for run in runs}
    return {f"{stage_num:02d}": by_stage.get(stage_num, "not_started") for stage_num in range(1, 8)}


def stage_outputs_available() -> list[int]:
    return [
        stage_num
        for stage_num in STAGE_OUTPUT_FILES
        if os.path.exists(get_output_path(stage_num))
    ]


def to_response(db: Session, assessment: Assessment) -> AssessmentResponse:
    return AssessmentResponse(
        assessment_id=assessment.assessment_id,
        name=assessment.name,
        description=assessment.description,
        vehicle_type=assessment.vehicle_type,
        domains=assessment.domains,
        status=assessment.status,
        owner_id=assessment.owner_id,
        completion_percentage=assessment.completion_percentage,
        stages=stage_statuses(db, assessment.assessment_id),
        stage_outputs_available=stage_outputs_available(),
        created_at=assessment.created_at,
        updated_at=assessment.updated_at,
    )


@router.post("", response_model=AssessmentResponse, status_code=status.HTTP_201_CREATED)
def create_assessment(
    request: AssessmentCreate,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_claims),
):
    assessment = Assessment(
        name=request.name,
        description=request.description,
        vehicle_type=request.vehicle_type,
        domains=request.domains,
        owner_id=current_user_id(claims),
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return to_response(db, assessment)


@router.get("", response_model=list[AssessmentResponse])
def list_assessments(
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_claims),
):
    query = db.query(Assessment)
    if not is_admin(claims):
        query = query.filter_by(owner_id=current_user_id(claims))
    return [to_response(db, assessment) for assessment in query.order_by(Assessment.created_at.desc()).all()]


@router.get("/{assessment_id}", response_model=AssessmentResponse)
def get_assessment(
    assessment_id: str,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_claims),
):
    assessment = get_assessment_or_404(db, assessment_id)
    require_assessment_access(assessment, claims)
    return to_response(db, assessment)


@router.patch("/{assessment_id}", response_model=AssessmentResponse)
def update_assessment(
    assessment_id: str,
    request: AssessmentUpdate,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_claims),
):
    assessment = get_assessment_or_404(db, assessment_id)
    require_assessment_access(assessment, claims)
    update = request.model_dump(exclude_unset=True)
    for field, value in update.items():
        setattr(assessment, field, value)
    db.commit()
    db.refresh(assessment)
    return to_response(db, assessment)


@router.delete("/{assessment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assessment(
    assessment_id: str,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_claims),
):
    assessment = get_assessment_or_404(db, assessment_id)
    require_assessment_access(assessment, claims)
    db.query(PipelineRun).filter_by(assessment_id=assessment_id).delete()
    db.delete(assessment)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

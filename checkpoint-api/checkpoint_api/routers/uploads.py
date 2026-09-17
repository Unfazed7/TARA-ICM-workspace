import os
import shutil

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Assessment
from ..pipeline_runner import UPLOAD_DIR
from ..schemas import UploadResponse
from .auth import get_current_claims


router = APIRouter()
MAX_CSV_BYTES = 5 * 1024 * 1024


def is_admin(claims: dict) -> bool:
    return claims.get("role") == "admin"


def current_user_id(claims: dict) -> str:
    return str(claims.get("sub") or claims.get("user_id") or "service")


def require_assessment_access(db: Session, assessment_id: str, claims: dict) -> None:
    assessment = db.query(Assessment).filter_by(assessment_id=assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")
    if not is_admin(claims) and assessment.owner_id != current_user_id(claims):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")


def upload_path(assessment_id: str) -> str:
    return os.path.join(UPLOAD_DIR, assessment_id, "assets.csv")


@router.post("/{assessment_id}/upload/csv", response_model=UploadResponse)
async def upload_csv(
    assessment_id: str,
    assets_csv: UploadFile = File(...),
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_claims),
):
    require_assessment_access(db, assessment_id, claims)
    if not assets_csv.filename or not assets_csv.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="File must be a .csv")

    destination_dir = os.path.join(UPLOAD_DIR, assessment_id)
    os.makedirs(destination_dir, exist_ok=True)
    destination = upload_path(assessment_id)
    with open(destination, "wb") as output_file:
        shutil.copyfileobj(assets_csv.file, output_file)

    size = os.path.getsize(destination)
    if size > MAX_CSV_BYTES:
        os.unlink(destination)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="File too large - max 5MB")
    return UploadResponse(uploaded=True, filename="assets.csv", size_bytes=size)


@router.get("/{assessment_id}/upload/csv", response_model=UploadResponse)
def csv_status(
    assessment_id: str,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_claims),
):
    require_assessment_access(db, assessment_id, claims)
    path = upload_path(assessment_id)
    if not os.path.exists(path):
        return UploadResponse(uploaded=False, filename=None, size_bytes=0)
    return UploadResponse(uploaded=True, filename="assets.csv", size_bytes=os.path.getsize(path))

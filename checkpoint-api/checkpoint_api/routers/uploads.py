import json
import os
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from ..asset_register_import import AssetImportError, import_asset_register
from ..database import get_db
from ..models import Assessment, PipelineRun
from ..pipeline_runner import UPLOAD_DIR, get_output_path, update_assessment_completion, utc_now
from ..schemas import AssetRegisterImportResponse, UploadResponse
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


@router.post(
    "/{assessment_id}/stages/3/asset-register",
    response_model=AssetRegisterImportResponse,
)
async def import_manual_asset_register(
    assessment_id: str,
    asset_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_claims),
):
    """Temporary production testing seam. Remove after Stage 03 is connected."""
    require_assessment_access(db, assessment_id, claims)
    filename = asset_file.filename or ""
    content = await asset_file.read()
    try:
        assets = import_asset_register(filename, content)
    except AssetImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    downstream_run = (
        db.query(PipelineRun)
        .filter(PipelineRun.assessment_id == assessment_id, PipelineRun.stage_num >= 4)
        .first()
    )
    if downstream_run:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Reset Stages 04-10 before replacing the manual Asset register",
        )

    output_path = Path(get_output_path(3, assessment_id))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = output_path.with_suffix(f"{output_path.suffix}.tmp")
    temporary_path.write_text(f"{json.dumps(assets, indent=2)}\n", encoding="utf-8")
    os.replace(temporary_path, output_path)

    run = db.query(PipelineRun).filter_by(
        assessment_id=assessment_id,
        stage_num=3,
    ).first()
    now = utc_now()
    if run is None:
        run = PipelineRun(
            assessment_id=assessment_id,
            stage_num=3,
            stage_name="03-asset-identification",
        )
        db.add(run)
    run.status = "complete"
    run.error_message = None
    run.started_at = now
    run.completed_at = now
    db.flush()
    update_assessment_completion(db, assessment_id)
    db.commit()

    return AssetRegisterImportResponse(
        filename=filename,
        asset_count=len(assets),
    )

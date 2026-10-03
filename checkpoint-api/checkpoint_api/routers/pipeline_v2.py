"""Document upload with type, and the automatic Stage 01 then Stage 02 run (spec 22, D-43)."""

import json
import re

from fastapi import APIRouter, BackgroundTasks, Body, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from .. import stage_models as m
from ..database import get_db
from ..stage_pipeline import RESERVED, documents_dir, job, run_pipeline
from .assessments import get_assessment_or_404, require_assessment_access
from .auth import get_current_claims


router = APIRouter()

ALLOWED_EXTENSIONS = {".drawio", ".md", ".txt", ".html", ".htm", ".docx", ".xlsx", ".pdf", ".png", ".jpg", ".jpeg"}
DOC_TYPES = {
    "diagram", "qa", "functional", "api_spec", "infra", "manual", "config_export",
    "srs", "existing_item_definition", "asset_list", "other",
}
MAX_BYTES = 25 * 1024 * 1024
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def owned(db: Session, assessment_id: str, claims: dict):
    assessment = get_assessment_or_404(db, assessment_id)
    require_assessment_access(assessment, claims)
    return assessment


def clean_name(name: str) -> str:
    base = re.split(r"[\\/]", name or "")[-1]
    base = re.sub(r"[^A-Za-z0-9._ -]", "_", base).strip().lstrip(".")
    if not base or base in {".", ".."}:
        raise HTTPException(status_code=422, detail="The file needs a name.")
    if len(base) > 120:
        stem, dot, ext = base.rpartition(".")
        base = f"{stem[:110]}.{ext}" if dot else base[:120]
    return base


def extension(name: str) -> str:
    return "." + name.rsplit(".", 1)[-1].lower() if "." in name else ""


def read_manifest(folder) -> list:
    path = folder / "manifest.json"
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else []


def write_manifest(folder, entries: list) -> None:
    (folder / "manifest.json").write_text(json.dumps(entries, indent=2), encoding="utf-8")


def document_list(folder) -> list:
    entries = {e["file"]: e for e in read_manifest(folder)}
    out = []
    for e in entries.values():
        path = folder / e["file"]
        if path.exists():
            out.append({**e, "size_bytes": path.stat().st_size})
    return out


@router.post("/{assessment_id}/documents", status_code=status.HTTP_201_CREATED)
async def upload_document(
    assessment_id: str,
    file: UploadFile = File(...),
    doc_type: str = Form(...),
    date_received: str | None = Form(None),
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    owned(db, assessment_id, claims)
    name = clean_name(file.filename)
    if name.lower() in RESERVED or extension(name) not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=422, detail=f"This file type cannot be read. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}.")
    if doc_type not in DOC_TYPES:
        raise HTTPException(status_code=422, detail=f"Unknown document type. Choose one of: {', '.join(sorted(DOC_TYPES))}.")
    if date_received and not DATE.match(date_received):
        raise HTTPException(status_code=422, detail="date_received must look like 2026-10-03.")

    folder = documents_dir(assessment_id)
    folder.mkdir(parents=True, exist_ok=True)
    destination = folder / name
    size = 0
    partial = destination.with_name(destination.name + ".part")
    with open(partial, "wb") as out:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_BYTES:
                out.close()
                partial.unlink(missing_ok=True)
                raise HTTPException(status_code=422, detail="The file is larger than 25 MB.")
            out.write(chunk)
    partial.replace(destination)

    entries = [e for e in read_manifest(folder) if e["file"] != name]
    entry = {"file": name, "doc_type": doc_type}
    if date_received:
        entry["date_received"] = date_received
    entries.append(entry)
    write_manifest(folder, entries)
    return {**entry, "size_bytes": size}


@router.get("/{assessment_id}/documents")
def list_documents(assessment_id: str, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    owned(db, assessment_id, claims)
    return document_list(documents_dir(assessment_id))


@router.delete("/{assessment_id}/documents/{name}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(assessment_id: str, name: str, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    owned(db, assessment_id, claims)
    folder = documents_dir(assessment_id)
    entries = read_manifest(folder)
    if name not in {e["file"] for e in entries}:
        raise HTTPException(status_code=404, detail="Document not found.")
    (folder / name).unlink(missing_ok=True)
    write_manifest(folder, [e for e in entries if e["file"] != name])


@router.put("/{assessment_id}/boundary-statement")
def set_boundary(assessment_id: str, body: dict = Body(...), claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    owned(db, assessment_id, claims)
    text = str(body.get("text") or "").strip()
    if len(text.split()) < 6:
        raise HTTPException(status_code=422, detail="Give at least the item name and one sentence on what it covers.")
    folder = documents_dir(assessment_id)
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "boundary.txt").write_text(text, encoding="utf-8")
    return {"text": text}


@router.get("/{assessment_id}/boundary-statement")
def get_boundary(assessment_id: str, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    owned(db, assessment_id, claims)
    path = documents_dir(assessment_id) / "boundary.txt"
    return {"text": path.read_text(encoding="utf-8") if path.exists() else None}


def status_body(db: Session, assessment_id: str) -> dict:
    folder = documents_dir(assessment_id)
    stages = []
    for stage in ("01", "02"):
        row = db.query(m.StageJob).filter_by(assessment_id=assessment_id, stage=stage).first()
        stages.append({
            "stage": stage,
            "status": row.status if row else "not_started",
            "error": row.error_message if row else None,
            "run_number": row.run_number if row else None,
            "refused_count": row.refused_count if row else None,
            "started_at": row.started_at.isoformat() if row and row.started_at else None,
            "completed_at": row.completed_at.isoformat() if row and row.completed_at else None,
        })
    return {"stages": stages, "documents": len(document_list(folder)), "boundary_set": (folder / "boundary.txt").exists()}


@router.post("/{assessment_id}/run", status_code=status.HTTP_202_ACCEPTED)
def start_run(assessment_id: str, background_tasks: BackgroundTasks, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    owned(db, assessment_id, claims)
    busy = db.query(m.StageJob).filter(m.StageJob.assessment_id == assessment_id, m.StageJob.status.in_(["pending", "running"])).first()
    if busy:
        raise HTTPException(status_code=409, detail=f"Stage {busy.stage} is still running. Wait for it to finish.")
    if not document_list(documents_dir(assessment_id)):
        raise HTTPException(status_code=422, detail="Upload at least one document first.")
    j1, j2 = job(db, assessment_id, "01"), job(db, assessment_id, "02")
    for row, state in ((j1, "pending"), (j2, "not_started")):
        row.status, row.error_message, row.run_number, row.refused_count = state, None, None, None
        row.started_at = row.completed_at = None
    db.commit()
    background_tasks.add_task(run_pipeline, assessment_id)
    return status_body(db, assessment_id)


@router.get("/{assessment_id}/pipeline")
def pipeline_status(assessment_id: str, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    owned(db, assessment_id, claims)
    return status_body(db, assessment_id)

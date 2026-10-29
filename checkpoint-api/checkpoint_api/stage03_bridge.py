"""Hands Stage 03's assets to Stages 04 to 10 (spec 27, D-56).

Those stages read `artifacts/<id>/03-asset-identification/asset-register.json` in the older shape and look at
`PipelineRun(stage 3)`. This module writes that file from the current Stage 03 run after every store and every
analyst edit, and marks Stage 03 complete. Stages 04 to 10 are not changed.
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from jsonschema import Draft7Validator, FormatChecker
from sqlalchemy.orm import Session

from . import asset_rules
from . import run_log
from . import stage_models as m
from . import stage_store
from .models import PipelineRun

log = run_log.get("pipeline")

REGISTER_SCHEMA = "stage-03-asset-register.schema.json"
RUNNING = {"pending", "running", "paused"}


def now() -> datetime:
    return datetime.now(timezone.utc)


def _paths(assessment_id: str) -> tuple[Path, Path]:
    from . import pipeline_runner

    out = Path(pipeline_runner.get_output_path(3, assessment_id))
    return out, out.with_name("asset-register-upload.json")


def set_source(db: Session, assessment_id: str, source: str, pending: bool = False) -> m.AssetRegisterState:
    row = db.query(m.AssetRegisterState).filter_by(assessment_id=assessment_id).first()
    if row is None:
        row = m.AssetRegisterState(assessment_id=assessment_id, source=source)
        db.add(row)
    row.source, row.pending, row.updated_at = source, pending, now()
    return row


def _number(db: Session, assessment_id: str, asset_id: str, key: str) -> int:
    row = db.query(m.AssetRegisterId).filter_by(assessment_id=assessment_id, asset_id=asset_id, source_key=key).first()
    if row is None:
        last = max((r.number for r in db.query(m.AssetRegisterId).filter_by(assessment_id=assessment_id)), default=0)
        row = m.AssetRegisterId(assessment_id=assessment_id, asset_id=asset_id, source_key=key, number=last + 1)
        db.add(row)
        db.flush()
    return row.number


def build_register(db: Session, assessment_id: str, run: m.StageRun) -> list[dict]:
    types = asset_rules.register_types()
    stamp = now().strftime("%Y-%m-%dT%H:%M:%SZ")
    register = []
    rows = db.query(m.Asset).filter_by(run_id=run.id).order_by(m.Asset.position).all()
    for row in rows:
        props = {p.property: p for p in row.properties}
        if row.status == "removed" or not any(p.applies for p in props.values()):
            continue
        number = _number(db, assessment_id, row.asset_id, ",".join(sorted(row.source_ids)))
        entry = {
            "asset_id": f"AS_{number:02d}",
            "asset_title": row.name,
            "asset_type": types.get(row.family, "cloud_service"),
            "asset_description": row.description,
            "ciaaan": {asset_rules.FULL_NAMES[code]: props[code].applies for code in asset_rules.PROPERTIES},
            "input_mode": "manual",
            "created_timestamp": stamp,
            "asset_ref": row.asset_id,
            "reason": f"{row.name} is an asset of this item.",
            "ciaaan_reasons": {asset_rules.FULL_NAMES[code]: props[code].reason for code in asset_rules.PROPERTIES},
        }
        if len(row.source_ids) == 1:
            entry["source_element_id"] = row.source_ids[0]
        register.append(entry)
    return register


def write_register(db: Session, assessment_id: str) -> bool:
    """Writes the register for the current Stage 03 run. Returns False when nothing was written."""
    run = stage_store.current_run(db, assessment_id, "03")
    if run is None:
        return False
    downstream = db.query(PipelineRun).filter(
        PipelineRun.assessment_id == assessment_id, PipelineRun.stage_num >= 4, PipelineRun.status.in_(RUNNING)
    ).first()
    if downstream is not None:
        # A later stage is reading the register right now: write it when that stage ends.
        state = db.query(m.AssetRegisterState).filter_by(assessment_id=assessment_id).first()
        set_source(db, assessment_id, state.source if state else "stage03", pending=True)
        db.commit()
        log.info("%s | Stage %02d is running; the asset register will be written when it ends", assessment_id, downstream.stage_num)
        return False

    register = build_register(db, assessment_id, run)
    schema = stage_store._load(REGISTER_SCHEMA)
    problems = sorted(e.message for e in Draft7Validator(schema, format_checker=FormatChecker()).iter_errors(register))
    if problems:
        db.rollback()
        log.error("%s | The asset register for Stages 04 to 10 did not pass its checks and was not written: %s", assessment_id, "; ".join(problems[:3]))
        return False

    output, upload_note = _paths(assessment_id)
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix(f"{output.suffix}.tmp")
    temporary.write_text(f"{json.dumps(register, indent=2)}\n", encoding="utf-8")
    os.replace(temporary, output)
    upload_note.unlink(missing_ok=True)

    stage = db.query(PipelineRun).filter_by(assessment_id=assessment_id, stage_num=3).first()
    if stage is None:
        stage = PipelineRun(assessment_id=assessment_id, stage_num=3, stage_name="03-asset-identification")
        db.add(stage)
    stamp = now()
    stage.status, stage.error_message, stage.started_at, stage.completed_at = "complete", None, stage.started_at or stamp, stamp
    set_source(db, assessment_id, "stage03", pending=False)
    db.flush()
    from .pipeline_runner import update_assessment_completion

    update_assessment_completion(db, assessment_id)
    db.commit()
    log.info("%s | Asset register written for Stages 04 to 10: %d asset(s)", assessment_id, len(register))
    return True


def flush_pending(db: Session, assessment_id: str) -> None:
    """Called when a later stage ends: writes a register that waited for it."""
    state = db.query(m.AssetRegisterState).filter_by(assessment_id=assessment_id).first()
    if state is not None and state.pending:
        write_register(db, assessment_id)


def note_upload(db: Session, assessment_id: str, filename: str) -> None:
    set_source(db, assessment_id, f"upload:{filename}", pending=False)

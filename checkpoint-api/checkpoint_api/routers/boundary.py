"""Stage 1 CP1 -- element-level boundary review.

Deliberately separate from the checkpoints router. Checkpoints remain a
whole-stage approve/reject gate; this resource handles the element-by-element
editing an analyst performs *before* approving the Stage 1 checkpoint.

Invariants enforced here (mirroring tara-workspace/stages/01-item-definition):
  - A boundary cannot be finalized while any decision is still 'ambiguous'.
  - Every mutation appends an immutable BoundaryEdit row. No edit is silent.
  - Once phase='final', the boundary is frozen; further edits are rejected.
"""

from copy import deepcopy

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import BoundaryEdit, BoundaryState, utc_now
from ..schemas import (
    BoundaryEditOut,
    BoundaryFinalize,
    BoundaryFinalizeResponse,
    BoundaryOut,
    BoundarySeed,
    ConflictResolve,
    ElementAdd,
    ElementDelete,
    ElementScopeUpdate,
)
from .auth import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])

TERMINAL_STATUSES = {"in_scope", "out_of_scope", "interface"}


def _get_boundary(db: Session, assessment_id: str) -> BoundaryState:
    boundary = db.query(BoundaryState).filter_by(assessment_id=assessment_id).first()
    if not boundary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No boundary found. Run Stage 1 to generate a boundary proposal.",
        )
    return boundary


def _reject_if_final(boundary: BoundaryState) -> None:
    if boundary.phase == "final":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Boundary is finalized and immutable. Create a new assessment "
                "version to make further changes."
            ),
        )


def _unresolved(decisions: list[dict]) -> list[str]:
    return [d["element_id"] for d in decisions if d.get("status") == "ambiguous"]


def _log(
    db: Session,
    boundary: BoundaryState,
    *,
    action: str,
    element_id: str,
    actor: str,
    before=None,
    after=None,
    rationale: str | None = None,
) -> None:
    db.add(
        BoundaryEdit(
            boundary_id=boundary.boundary_id,
            assessment_id=boundary.assessment_id,
            action=action,
            element_id=element_id,
            before=before,
            after=after,
            rationale=rationale,
            actor=actor,
        )
    )


def _serialize(boundary: BoundaryState) -> dict:
    return {
        "boundary_id": boundary.boundary_id,
        "assessment_id": boundary.assessment_id,
        "model_ref": boundary.model_ref,
        "phase": boundary.phase,
        "boundary_statement": boundary.boundary_statement,
        "decisions": boundary.decisions,
        "merged_model": boundary.merged_model,
        "conflicts": boundary.conflicts,
        "coverage": boundary.coverage,
        "unresolved_count": len(_unresolved(boundary.decisions)),
        "created_at": boundary.created_at,
        "updated_at": boundary.updated_at,
        "finalized_at": boundary.finalized_at,
    }


@router.post(
    "/api/v1/assessments/{assessment_id}/boundary/seed",
    response_model=BoundaryOut,
    status_code=status.HTTP_201_CREATED,
)
def seed_boundary(
    assessment_id: str,
    request: BoundarySeed,
    db: Session = Depends(get_db),
):
    """Ingest Stage 1 pipeline output (Call 1A2/1B) into a live BoundaryState.

    This is the bridge between agent.js::runToCheckpoint1() writing JSON to
    disk and the analyst's CP1 review session. Called once per pipeline run,
    by the pipeline runner -- not by the browser.

    Refuses to overwrite an existing boundary for the assessment; a re-run
    (new source documents) should create a new assessment version rather than
    clobber an in-progress review.
    """
    existing = db.query(BoundaryState).filter_by(assessment_id=assessment_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"A boundary already exists for {assessment_id} "
                f"(phase={existing.phase}). Refusing to overwrite."
            ),
        )

    boundary = BoundaryState(
        assessment_id=assessment_id,
        model_ref=request.merged_model.get("model_id", "MM-UNKNOWN"),
        phase="proposal",
        boundary_statement=request.boundary_statement,
        decisions=[d.model_dump(exclude_none=True) for d in request.decisions],
        merged_model=request.merged_model,
        conflicts=request.conflicts,
        coverage=request.coverage,
    )
    db.add(boundary)
    db.commit()
    db.refresh(boundary)

    _log(
        db,
        boundary,
        action="add_element",
        element_id="__seed__",
        actor="pipeline",
        after={"decisions_count": len(boundary.decisions)},
        rationale="Initial seed from Stage 1 pipeline (Call 1A2/1B)",
    )
    db.commit()
    db.refresh(boundary)
    return _serialize(boundary)


@router.get(
    "/api/v1/assessments/{assessment_id}/boundary",
    response_model=BoundaryOut,
)
def get_boundary(assessment_id: str, db: Session = Depends(get_db)):
    return _serialize(_get_boundary(db, assessment_id))


@router.patch(
    "/api/v1/assessments/{assessment_id}/boundary/elements/{element_id}",
    response_model=BoundaryOut,
)
def update_element_scope(
    assessment_id: str,
    element_id: str,
    request: ElementScopeUpdate,
    db: Session = Depends(get_db),
):
    """The core CP1 mutation: reassign one element's scope."""
    boundary = _get_boundary(db, assessment_id)
    _reject_if_final(boundary)

    decisions = deepcopy(boundary.decisions)
    target = next((d for d in decisions if d["element_id"] == element_id), None)
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Element {element_id} is not part of this boundary",
        )

    before = dict(target)
    target["status"] = request.status
    target["rationale"] = request.rationale
    target["decided_by"] = "analyst"
    if request.status in TERMINAL_STATUSES:
        target.pop("escalation_reason", None)

    boundary.decisions = decisions
    boundary.updated_at = utc_now()
    _log(
        db,
        boundary,
        action="status_change",
        element_id=element_id,
        actor=request.actor,
        before=before,
        after=dict(target),
        rationale=request.rationale,
    )
    db.commit()
    db.refresh(boundary)
    return _serialize(boundary)


@router.post(
    "/api/v1/assessments/{assessment_id}/boundary/elements",
    response_model=BoundaryOut,
    status_code=status.HTTP_201_CREATED,
)
def add_element(
    assessment_id: str,
    request: ElementAdd,
    db: Session = Depends(get_db),
):
    """Analyst adds an element extraction missed."""
    boundary = _get_boundary(db, assessment_id)
    _reject_if_final(boundary)

    decisions = deepcopy(boundary.decisions)
    existing_ids = {d["element_id"] for d in decisions}
    element_id = request.element_id or f"COMP-A{len(existing_ids) + 1:03d}"
    if element_id in existing_ids:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Element {element_id} already exists in this boundary",
        )

    model = deepcopy(boundary.merged_model) or {"elements": [], "links": []}
    elements = model.get("elements", [])
    elements.append(
        {
            "element_id": element_id,
            "type": request.type,
            "name": request.name,
            "origin": "stated",
            "confidence": "high",
            "source_refs": [],
            "component_type": request.component_type,
            "domain": request.domain,
            "added_by_analyst": True,
        }
    )
    model["elements"] = elements
    boundary.merged_model = model

    decision = {
        "element_id": element_id,
        "status": request.status,
        "rationale": request.rationale,
        "decided_by": "analyst",
    }
    decisions.append(decision)
    boundary.decisions = decisions
    boundary.updated_at = utc_now()

    _log(
        db,
        boundary,
        action="add_element",
        element_id=element_id,
        actor=request.actor,
        after=decision,
        rationale=request.rationale,
    )
    db.commit()
    db.refresh(boundary)
    return _serialize(boundary)


@router.delete(
    "/api/v1/assessments/{assessment_id}/boundary/elements/{element_id}",
    response_model=BoundaryOut,
)
def delete_element(
    assessment_id: str,
    element_id: str,
    request: ElementDelete,
    db: Session = Depends(get_db),
):
    """Analyst removes a hallucinated element. Rationale is mandatory."""
    boundary = _get_boundary(db, assessment_id)
    _reject_if_final(boundary)

    decisions = deepcopy(boundary.decisions)
    target = next((d for d in decisions if d["element_id"] == element_id), None)
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Element {element_id} is not part of this boundary",
        )

    decisions = [d for d in decisions if d["element_id"] != element_id]
    boundary.decisions = decisions

    model = deepcopy(boundary.merged_model) or {"elements": [], "links": []}
    model["elements"] = [
        e for e in model.get("elements", []) if e.get("element_id") != element_id
    ]
    model["links"] = [
        link
        for link in model.get("links", [])
        if link.get("from") != element_id and link.get("to") != element_id
    ]
    boundary.merged_model = model
    boundary.updated_at = utc_now()

    _log(
        db,
        boundary,
        action="delete_element",
        element_id=element_id,
        actor=request.actor,
        before=target,
        rationale=request.rationale,
    )
    db.commit()
    db.refresh(boundary)
    return _serialize(boundary)


@router.post(
    "/api/v1/assessments/{assessment_id}/boundary/conflicts/resolve",
    response_model=BoundaryOut,
)
def resolve_conflict(
    assessment_id: str,
    request: ConflictResolve,
    db: Session = Depends(get_db),
):
    boundary = _get_boundary(db, assessment_id)
    _reject_if_final(boundary)

    payload = deepcopy(boundary.conflicts) or {"conflicts": []}
    conflicts = payload.get("conflicts", [])
    target = next(
        (c for c in conflicts if c.get("conflict_id") == request.conflict_id), None
    )
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conflict {request.conflict_id} not found",
        )

    before = dict(target)
    target["resolution_status"] = "resolved_by_analyst"
    resolution = dict(target.get("resolution") or {})
    resolution["analyst_note"] = request.analyst_note
    resolution["timestamp"] = utc_now().isoformat()
    target["resolution"] = resolution

    payload["conflicts"] = conflicts
    boundary.conflicts = payload
    boundary.updated_at = utc_now()

    _log(
        db,
        boundary,
        action="resolve_conflict",
        element_id=request.conflict_id,
        actor=request.actor,
        before=before,
        after=dict(target),
        rationale=request.analyst_note,
    )
    db.commit()
    db.refresh(boundary)
    return _serialize(boundary)


@router.get(
    "/api/v1/assessments/{assessment_id}/boundary/edits",
    response_model=list[BoundaryEditOut],
)
def list_edits(assessment_id: str, db: Session = Depends(get_db)):
    """Session edit history -- powers the CP1 edit-history drawer."""
    boundary = _get_boundary(db, assessment_id)
    edits = (
        db.query(BoundaryEdit)
        .filter_by(boundary_id=boundary.boundary_id)
        .order_by(BoundaryEdit.timestamp.desc())
        .all()
    )
    return edits


@router.post(
    "/api/v1/assessments/{assessment_id}/boundary/finalize",
    response_model=BoundaryFinalizeResponse,
)
def finalize_boundary(
    assessment_id: str,
    request: BoundaryFinalize,
    db: Session = Depends(get_db),
):
    """Lock the boundary. Refuses while any element is still ambiguous.

    This is the gate the Stage 1 spec requires: the analyst cannot proceed to
    item definition generation with unresolved scope decisions.
    """
    boundary = _get_boundary(db, assessment_id)
    _reject_if_final(boundary)

    unresolved = _unresolved(boundary.decisions)
    if unresolved:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": (
                    f"{len(unresolved)} element(s) still ambiguous. "
                    "Every element must be assigned before the boundary can be finalized."
                ),
                "unresolved_element_ids": unresolved,
            },
        )

    open_conflicts = [
        c.get("conflict_id")
        for c in (boundary.conflicts or {}).get("conflicts", [])
        if c.get("resolution_status") == "escalated_cp1"
    ]
    if open_conflicts:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": f"{len(open_conflicts)} escalated conflict(s) still open.",
                "open_conflict_ids": open_conflicts,
            },
        )

    boundary.phase = "final"
    boundary.finalized_at = utc_now()
    boundary.updated_at = utc_now()

    edit_count = (
        db.query(BoundaryEdit).filter_by(boundary_id=boundary.boundary_id).count()
    )
    db.commit()
    db.refresh(boundary)

    return {
        "boundary_id": boundary.boundary_id,
        "phase": boundary.phase,
        "finalized_at": boundary.finalized_at,
        "decisions_count": len(boundary.decisions),
        "edit_count": edit_count,
    }

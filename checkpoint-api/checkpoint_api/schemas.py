from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class CheckpointCreate(BaseModel):
    stage_num: int = Field(ge=1, le=8)
    stage_name: str = Field(min_length=1)
    output_summary: dict[str, Any] | None = None


class CheckpointCreated(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    checkpoint_id: str
    assessment_id: str
    stage_num: int
    stage_name: str
    status: str
    created_at: datetime


class CheckpointStatus(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    checkpoint_id: str
    assessment_id: str
    stage_num: int
    stage_name: str
    status: str
    reviewer_id: str | None
    notes: str | None
    created_at: datetime
    reviewed_at: datetime | None


class CheckpointListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    checkpoint_id: str
    stage_num: int
    stage_name: str
    status: str
    created_at: datetime
    reviewed_at: datetime | None


class CheckpointReview(BaseModel):
    decision: Literal["approved", "rejected"]
    reviewer_id: str | None = Field(default=None, min_length=1)
    notes: str | None = None


class CheckpointReviewResponse(BaseModel):
    checkpoint_id: str
    status: str
    reviewer_id: str
    reviewed_at: datetime


VehicleType = Literal["sedan", "suv", "truck", "van", "bus", "motorcycle", "commercial"]
AssessmentStatus = Literal["active", "archived"]
RunStatus = Literal["not_started", "pending", "running", "complete", "failed"]


class RegisterRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=8)
    name: str = Field(min_length=1)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    email: str
    name: str
    role: str


class AssessmentCreate(BaseModel):
    name: str = Field(min_length=1)
    description: str | None = None
    vehicle_type: VehicleType
    domains: list[str] = Field(min_length=1)


class AssessmentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    description: str | None = None
    status: AssessmentStatus | None = None


class AssessmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    assessment_id: str
    name: str
    description: str | None
    vehicle_type: str
    domains: list[str]
    status: str
    owner_id: str
    completion_percentage: int
    stages: dict[str, RunStatus]
    stage_outputs_available: list[int] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class PipelineRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    run_id: str | None = None
    assessment_id: str
    stage_num: int
    stage_name: str
    status: RunStatus
    error_message: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None


class UploadResponse(BaseModel):
    uploaded: bool
    filename: str | None = None
    size_bytes: int = 0


# --- Stage 1 CP1: element-level boundary review ------------------------------

BoundaryStatus = Literal["in_scope", "out_of_scope", "interface", "ambiguous"]
BoundaryPhase = Literal["proposal", "final"]
EscalationReason = Literal[
    "low_extraction_confidence",
    "unresolved_conflict",
    "derived_element",
    "boundary_genuinely_unclear",
]
BoundaryEditAction = Literal[
    "status_change",
    "rename",
    "add_element",
    "delete_element",
    "add_link",
    "delete_link",
    "resolve_conflict",
    "edit_rationale",
]


class BoundaryDecision(BaseModel):
    element_id: str
    status: BoundaryStatus
    rationale: str = Field(min_length=5)
    escalation_reason: EscalationReason | None = None
    decided_by: Literal["agent", "analyst"] = "agent"


class BoundaryOut(BaseModel):
    boundary_id: str
    assessment_id: str
    model_ref: str
    phase: BoundaryPhase
    boundary_statement: str
    decisions: list[BoundaryDecision]
    merged_model: dict | None = None
    conflicts: dict | None = None
    coverage: dict | None = None
    unresolved_count: int
    created_at: datetime
    updated_at: datetime
    finalized_at: datetime | None = None


class ElementScopeUpdate(BaseModel):
    """Element-level scope reassignment. The core CP1 mutation."""

    status: BoundaryStatus
    rationale: str = Field(min_length=5)
    actor: str = Field(min_length=1)


class ElementAdd(BaseModel):
    """Analyst adds an element the extraction missed."""

    element_id: str | None = None
    name: str = Field(min_length=1)
    type: Literal["component", "function", "feature_group", "network_segment", "node"]
    component_type: str | None = None
    domain: str | None = None
    status: BoundaryStatus = "in_scope"
    rationale: str = Field(min_length=5)
    actor: str = Field(min_length=1)


class ElementDelete(BaseModel):
    """Analyst removes an element the agent hallucinated."""

    rationale: str = Field(min_length=5)
    actor: str = Field(min_length=1)


class ConflictResolve(BaseModel):
    conflict_id: str
    analyst_note: str = Field(min_length=5)
    actor: str = Field(min_length=1)


class BoundarySeed(BaseModel):
    """Payload the pipeline runner posts after Call 1B produces a proposal."""

    boundary_statement: str = Field(min_length=10)
    decisions: list[BoundaryDecision]
    merged_model: dict
    conflicts: dict | None = None
    coverage: dict | None = None


class BoundaryEditOut(BaseModel):
    edit_id: str
    action: BoundaryEditAction
    element_id: str
    before: dict | None = None
    after: dict | None = None
    rationale: str | None = None
    actor: str
    timestamp: datetime


class BoundaryFinalize(BaseModel):
    actor: str = Field(min_length=1)


class BoundaryFinalizeResponse(BaseModel):
    boundary_id: str
    phase: BoundaryPhase
    finalized_at: datetime
    decisions_count: int
    edit_count: int

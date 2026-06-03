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

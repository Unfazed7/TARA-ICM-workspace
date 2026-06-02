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
    reviewer_id: str = Field(min_length=1)
    notes: str | None = None


class CheckpointReviewResponse(BaseModel):
    checkpoint_id: str
    status: str
    reviewer_id: str
    reviewed_at: datetime

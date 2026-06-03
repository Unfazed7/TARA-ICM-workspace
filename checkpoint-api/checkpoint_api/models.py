from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import JSON, Column, DateTime, Enum, Integer, String, UniqueConstraint

from .database import Base


def utc_now():
    return datetime.now(timezone.utc)


def new_checkpoint_id():
    return f"CHK_{uuid4().hex[:8].upper()}"


def new_assessment_id():
    return f"ASS_{uuid4().hex[:6].upper()}"


class User(Base):
    __tablename__ = "users"

    email = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="user")
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class Assessment(Base):
    __tablename__ = "assessments"

    assessment_id = Column(String, primary_key=True, default=new_assessment_id)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    vehicle_type = Column(String, nullable=False)
    domains = Column(JSON, nullable=False)
    status = Column(
        Enum("active", "archived", name="assessment_status"),
        nullable=False,
        default="active",
    )
    owner_id = Column(String, nullable=False)
    completion_percentage = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    run_id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    assessment_id = Column(String, nullable=False, index=True)
    stage_num = Column(Integer, nullable=False)
    stage_name = Column(String, nullable=False)
    status = Column(
        Enum("pending", "running", "complete", "failed", name="run_status"),
        nullable=False,
        default="pending",
    )
    error_message = Column(String, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("assessment_id", "stage_num", name="uq_run_assessment_stage"),
    )


class Checkpoint(Base):
    __tablename__ = "checkpoints"

    checkpoint_id = Column(String, primary_key=True, default=new_checkpoint_id)
    assessment_id = Column(String, nullable=False, index=True)
    stage_num = Column(Integer, nullable=False)
    stage_name = Column(String, nullable=False)
    status = Column(
        Enum("pending_review", "approved", "rejected", name="checkpoint_status"),
        nullable=False,
        default="pending_review",
    )
    output_summary = Column(JSON, nullable=True)
    reviewer_id = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("assessment_id", "stage_num", name="uq_assessment_stage"),
    )

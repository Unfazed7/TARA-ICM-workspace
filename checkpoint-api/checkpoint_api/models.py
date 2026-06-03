from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import JSON, Column, DateTime, Enum, Integer, String, UniqueConstraint

from .database import Base


def utc_now():
    return datetime.now(timezone.utc)


def new_checkpoint_id():
    return f"CHK_{uuid4().hex[:8].upper()}"


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

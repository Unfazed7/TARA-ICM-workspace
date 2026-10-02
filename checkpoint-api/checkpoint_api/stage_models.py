"""Tables for Stage 01 and Stage 02 output (spec .meta/specs/18-stage-data-store.md, D-42).

One table per kind of record, a column per field. Anything that points to another
record is a real foreign key; descriptive lists that point to nothing are JSON columns.
Every record belongs to one stage run, so a re-run never overwrites an earlier one.
These tables have their own metadata and are created by the Alembic migrations in
`migrations/`, not by `Base.metadata.create_all`.
"""

from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import declarative_base, relationship


StageBase = declarative_base()

Json = JSON(none_as_null=True)


def utcnow():
    return datetime.now(timezone.utc)


def run_fk():
    return Column(Integer, ForeignKey("stage_runs.id", ondelete="CASCADE"), nullable=False, index=True)


class StageRun(StageBase):
    __tablename__ = "stage_runs"
    __table_args__ = (UniqueConstraint("assessment_id", "stage", "run_number"),)

    id = Column(Integer, primary_key=True)
    assessment_id = Column(String, nullable=False, index=True)
    stage = Column(String(2), nullable=False)
    run_number = Column(Integer, nullable=False)
    based_on_run_id = Column(Integer, ForeignKey("stage_runs.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    created_by = Column(String, nullable=False)
    accepted_count = Column(Integer, nullable=False, default=0)
    refused_count = Column(Integer, nullable=False, default=0)


# ── Stage 01 ──────────────────────────────────────────────────────────────────


class Document(StageBase):
    __tablename__ = "documents"
    __table_args__ = (UniqueConstraint("run_id", "doc_id"),)

    id = Column(Integer, primary_key=True)
    run_id = run_fk()
    position = Column(Integer, nullable=False)
    doc_id = Column(String, nullable=False)
    title = Column(String, nullable=False)
    client_doc_ref = Column(String, nullable=True)
    date_on_document = Column(String(10), nullable=True)
    date_received = Column(String(10), nullable=False)
    owner = Column(String, nullable=False)
    environment = Column(String, nullable=False)
    doc_type = Column(String, nullable=False)
    sha256 = Column(String(64), nullable=False)
    read_status = Column(String, nullable=False)
    read_status_reason = Column(Text, nullable=True)
    reading_method = Column(String, nullable=False)
    page_methods = Column(Json, nullable=True)
    unread_parts = Column(Json, nullable=True)
    reader_version = Column(String, nullable=True)
    precedence_rank = Column(Integer, nullable=False)
    used_for = Column(Text, nullable=False)
    ignored_and_why = Column(Text, nullable=False)
    doc_type_label = Column(String, nullable=True)
    rank_override_decision_id = Column(String, nullable=True)


class Fact(StageBase):
    __tablename__ = "facts"
    __table_args__ = (UniqueConstraint("run_id", "fact_id"),)

    id = Column(Integer, primary_key=True)
    run_id = run_fk()
    position = Column(Integer, nullable=False)
    fact_id = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    fact_type = Column(String, nullable=False)
    value = Column(Text, nullable=False)
    confidence = Column(String, nullable=False)
    fact_group = Column(String, nullable=True)
    status = Column(String, nullable=False)

    sources = relationship("FactSource", order_by="FactSource.position")


class FactSource(StageBase):
    __tablename__ = "fact_sources"

    id = Column(Integer, primary_key=True)
    fact_pk = Column(Integer, ForeignKey("facts.id", ondelete="CASCADE"), nullable=False, index=True)
    document_pk = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    position = Column(Integer, nullable=False)
    location = Column(String, nullable=False)
    quote = Column(String(300), nullable=False)

    document = relationship("Document")


class Conflict(StageBase):
    __tablename__ = "conflicts"
    __table_args__ = (UniqueConstraint("run_id", "conflict_id"),)

    id = Column(Integer, primary_key=True)
    run_id = run_fk()
    position = Column(Integer, nullable=False)
    conflict_id = Column(String, nullable=False)
    kind = Column(String, nullable=False)
    proposed_resolution = Column(Text, nullable=False)
    auto_resolved = Column(Boolean, nullable=False)
    description = Column(Text, nullable=True)

    members = relationship("ConflictFact", order_by="ConflictFact.position")


class ConflictFact(StageBase):
    """role is `involved` (fact_ids) or `loser` (loser_fact_ids)."""

    __tablename__ = "conflict_facts"

    id = Column(Integer, primary_key=True)
    conflict_pk = Column(Integer, ForeignKey("conflicts.id", ondelete="CASCADE"), nullable=False, index=True)
    fact_pk = Column(Integer, ForeignKey("facts.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)
    position = Column(Integer, nullable=False)

    fact = relationship("Fact")


# ── Stage 02 ──────────────────────────────────────────────────────────────────


class ItemDefinition(StageBase):
    __tablename__ = "item_definitions"

    id = Column(Integer, primary_key=True)
    run_id = Column(Integer, ForeignKey("stage_runs.id", ondelete="CASCADE"), nullable=False, unique=True)
    item_name = Column(String, nullable=False)
    boundary_text = Column(Text, nullable=False)
    boundary_proposed = Column(Boolean, nullable=False)
    stakeholders = Column(Json, nullable=True)


class Zone(StageBase):
    __tablename__ = "zones"
    __table_args__ = (UniqueConstraint("run_id", "zone_id"),)

    id = Column(Integer, primary_key=True)
    run_id = run_fk()
    position = Column(Integer, nullable=False)
    zone_id = Column(String, nullable=False)
    kind = Column(String, nullable=False)
    name = Column(String, nullable=False)


class Container(StageBase):
    __tablename__ = "containers"
    __table_args__ = (UniqueConstraint("run_id", "container_id"),)

    id = Column(Integer, primary_key=True)
    run_id = run_fk()
    position = Column(Integer, nullable=False)
    container_id = Column(String, nullable=False)
    kind = Column(String, nullable=False)
    name = Column(String, nullable=False)
    parent_pk = Column(Integer, ForeignKey("containers.id", ondelete="CASCADE"), nullable=True)
    zone_pk = Column(Integer, ForeignKey("zones.id", ondelete="CASCADE"), nullable=True)

    parent = relationship("Container", remote_side=[id])
    zone = relationship("Zone")


class Element(StageBase):
    __tablename__ = "elements"
    __table_args__ = (UniqueConstraint("run_id", "element_id"),)

    id = Column(Integer, primary_key=True)
    run_id = run_fk()
    position = Column(Integer, nullable=False)
    element_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    kind = Column(String, nullable=False)
    kind_label = Column(String, nullable=True)
    parent_container_pk = Column(Integer, ForeignKey("containers.id", ondelete="CASCADE"), nullable=True)
    zone_pk = Column(Integer, ForeignKey("zones.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String, nullable=True)
    hosting_type = Column(String, nullable=True)
    # NULL means the element has no exposure field (actors, D-34); evidence is in fact_refs.
    internet_exposed = Column(String, nullable=True)
    is_entry_point = Column(Boolean, nullable=False)
    auth_method = Column(String, nullable=True)
    owner_operator = Column(String, nullable=False)
    data_handled = Column(Json, nullable=True)
    stated_security_config = Column(Json, nullable=True)
    confidence = Column(String, nullable=False)

    parent_container = relationship("Container")
    zone = relationship("Zone")


class Link(StageBase):
    __tablename__ = "links"
    __table_args__ = (UniqueConstraint("run_id", "link_id"),)

    id = Column(Integer, primary_key=True)
    run_id = run_fk()
    position = Column(Integer, nullable=False)
    link_id = Column(String, nullable=False)
    link_type = Column(String, nullable=False)
    source_pk = Column(Integer, ForeignKey("elements.id", ondelete="CASCADE"), nullable=False)
    destination_pk = Column(Integer, ForeignKey("elements.id", ondelete="CASCADE"), nullable=False)
    direction = Column(String, nullable=False)
    protocol = Column(String, nullable=False)
    port = Column(String, nullable=True)
    usage_at_destination = Column(Text, nullable=False)
    authentication = Column(Text, nullable=False)
    encryption = Column(Text, nullable=False)
    data_carried = Column(Json, nullable=False)
    crosses_trust_boundary = Column(Boolean, nullable=False)
    remark = Column(Text, nullable=False)
    sync_async = Column(String, nullable=True)
    rate_limiting = Column(String, nullable=True)
    volume = Column(String, nullable=True)
    inferred_from_text = Column(Boolean, nullable=False)
    confidence = Column(String, nullable=False)

    source = relationship("Element", foreign_keys=[source_pk])
    destination = relationship("Element", foreign_keys=[destination_pk])


class Function(StageBase):
    __tablename__ = "functions"
    __table_args__ = (UniqueConstraint("run_id", "function_id"),)

    id = Column(Integer, primary_key=True)
    run_id = run_fk()
    position = Column(Integer, nullable=False)
    function_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    endpoints = Column(Json, nullable=True)
    data_read = Column(Json, nullable=True)
    data_written = Column(Json, nullable=True)
    privileged = Column(Boolean, nullable=False)

    members = relationship("FunctionMember", order_by="FunctionMember.position")


class FunctionMember(StageBase):
    """role is `actor` (actor_ids) or `element` (element_ids)."""

    __tablename__ = "function_members"

    id = Column(Integer, primary_key=True)
    function_pk = Column(Integer, ForeignKey("functions.id", ondelete="CASCADE"), nullable=False, index=True)
    element_pk = Column(Integer, ForeignKey("elements.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)
    position = Column(Integer, nullable=False)

    element = relationship("Element")


class Question(StageBase):
    """Exactly one of the three target columns is set (element, link or container, D-31)."""

    __tablename__ = "questions"
    __table_args__ = (UniqueConstraint("run_id", "question_id"),)

    id = Column(Integer, primary_key=True)
    run_id = run_fk()
    position = Column(Integer, nullable=False)
    question_id = Column(String, nullable=False)
    target_element_pk = Column(Integer, ForeignKey("elements.id", ondelete="CASCADE"), nullable=True)
    target_link_pk = Column(Integer, ForeignKey("links.id", ondelete="CASCADE"), nullable=True)
    target_container_pk = Column(Integer, ForeignKey("containers.id", ondelete="CASCADE"), nullable=True)
    fact_type = Column(String, nullable=False)
    topic = Column(String(80), nullable=True)
    text = Column(Text, nullable=False)
    why_it_matters = Column(Text, nullable=False)
    default_if_unanswered = Column(Text, nullable=False)
    origin = Column(String, nullable=False)
    answer = Column(Text, nullable=True)
    answered_by = Column(String, nullable=True)
    status = Column(String, nullable=False)

    target_element = relationship("Element")
    target_link = relationship("Link")
    target_container = relationship("Container")


class ScopeDecision(StageBase):
    __tablename__ = "scope_decisions"
    __table_args__ = (UniqueConstraint("run_id", "decision_id"), UniqueConstraint("run_id", "element_pk"))

    id = Column(Integer, primary_key=True)
    run_id = run_fk()
    position = Column(Integer, nullable=False)
    decision_id = Column(String, nullable=False)
    element_pk = Column(Integer, ForeignKey("elements.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, nullable=False)
    reason = Column(Text, nullable=False)
    assumed = Column(Boolean, nullable=False)

    element = relationship("Element")
    questions = relationship("ScopeDecisionQuestion", order_by="ScopeDecisionQuestion.position")


class ScopeDecisionQuestion(StageBase):
    __tablename__ = "scope_decision_questions"

    id = Column(Integer, primary_key=True)
    decision_pk = Column(Integer, ForeignKey("scope_decisions.id", ondelete="CASCADE"), nullable=False, index=True)
    question_pk = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    position = Column(Integer, nullable=False)

    question = relationship("Question")


class Assumption(StageBase):
    __tablename__ = "assumptions"
    __table_args__ = (UniqueConstraint("run_id", "assumption_id"),)

    id = Column(Integer, primary_key=True)
    run_id = run_fk()
    position = Column(Integer, nullable=False)
    assumption_id = Column(String, nullable=False)
    text = Column(Text, nullable=False)

    basis = relationship("AssumptionBasis", order_by="AssumptionBasis.position")


class AssumptionBasis(StageBase):
    """One of fact_pk or question_pk is set."""

    __tablename__ = "assumption_basis"

    id = Column(Integer, primary_key=True)
    assumption_pk = Column(Integer, ForeignKey("assumptions.id", ondelete="CASCADE"), nullable=False, index=True)
    fact_pk = Column(Integer, ForeignKey("facts.id", ondelete="CASCADE"), nullable=True)
    question_pk = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=True)
    position = Column(Integer, nullable=False)

    fact = relationship("Fact")
    question = relationship("Question")


class ResponsibilitySplit(StageBase):
    __tablename__ = "responsibility_splits"

    id = Column(Integer, primary_key=True)
    run_id = run_fk()
    position = Column(Integer, nullable=False)
    element_pk = Column(Integer, ForeignKey("elements.id", ondelete="CASCADE"), nullable=False)
    provider_side = Column(Text, nullable=False)
    customer_side = Column(Text, nullable=False)

    element = relationship("Element")


class FactRef(StageBase):
    """Every "based on these facts" list in Stage 02, in one table.

    owner_kind: zone, container, element, link, function, scope_decision, item_definition.
    role: support (fact_ids, based_on_fact_ids), exposure_evidence, stated_control, stated_absence.
    """

    __tablename__ = "fact_refs"

    id = Column(Integer, primary_key=True)
    run_id = run_fk()
    owner_kind = Column(String, nullable=False)
    owner_pk = Column(Integer, nullable=False)
    role = Column(String, nullable=False)
    fact_pk = Column(Integer, ForeignKey("facts.id", ondelete="CASCADE"), nullable=False)
    position = Column(Integer, nullable=False)

    fact = relationship("Fact")


# ── Rationale (both stages) ───────────────────────────────────────────────────


class RationaleItem(StageBase):
    __tablename__ = "rationale_items"
    __table_args__ = (UniqueConstraint("run_id", "rationale_id"),)

    id = Column(Integer, primary_key=True)
    run_id = run_fk()
    position = Column(Integer, nullable=False)
    rationale_id = Column(String, nullable=False)
    stage = Column(String(2), nullable=False)
    kind = Column(String, nullable=False)
    attention = Column(String, nullable=False)
    title = Column(String(160), nullable=False)
    concluded = Column(Text, nullable=False)
    why_note = Column(Text, nullable=True)
    assumed = Column(Text, nullable=False)
    would_change = Column(Text, nullable=False)
    question_pk = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=True)
    conflict_pk = Column(Integer, ForeignKey("conflicts.id", ondelete="CASCADE"), nullable=True)
    auto_resolved = Column(Boolean, nullable=True)

    question = relationship("Question")
    conflict = relationship("Conflict")
    sources = relationship("RationaleSource", order_by="RationaleSource.position")
    based_on = relationship("RationaleBasedOn", foreign_keys="RationaleBasedOn.rationale_pk", order_by="RationaleBasedOn.position")
    affects = relationship("RationaleAffects", order_by="RationaleAffects.position")


class RationaleSource(StageBase):
    __tablename__ = "rationale_sources"

    id = Column(Integer, primary_key=True)
    rationale_pk = Column(Integer, ForeignKey("rationale_items.id", ondelete="CASCADE"), nullable=False, index=True)
    document_pk = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    position = Column(Integer, nullable=False)
    location = Column(String, nullable=False)
    quote = Column(String(300), nullable=False)

    document = relationship("Document")


class RationaleBasedOn(StageBase):
    """Another Rationale item this one builds on, in this run or the Stage 01 run."""

    __tablename__ = "rationale_based_on"

    id = Column(Integer, primary_key=True)
    rationale_pk = Column(Integer, ForeignKey("rationale_items.id", ondelete="CASCADE"), nullable=False, index=True)
    based_on_pk = Column(Integer, ForeignKey("rationale_items.id", ondelete="CASCADE"), nullable=False)
    position = Column(Integer, nullable=False)

    based_on_item = relationship("RationaleItem", foreign_keys=[based_on_pk])


class RationaleAffects(StageBase):
    """Ids of any kind (facts, elements, links ...); checked in code before storing."""

    __tablename__ = "rationale_affects"

    id = Column(Integer, primary_key=True)
    rationale_pk = Column(Integer, ForeignKey("rationale_items.id", ondelete="CASCADE"), nullable=False, index=True)
    target_id = Column(String, nullable=False)
    position = Column(Integer, nullable=False)


class RationaleReview(StageBase):
    """The analyst's review, kept outside runs so it carries over to a re-run with the same id."""

    __tablename__ = "rationale_reviews"
    __table_args__ = (UniqueConstraint("assessment_id", "stage", "rationale_id"),)

    id = Column(Integer, primary_key=True)
    assessment_id = Column(String, nullable=False, index=True)
    stage = Column(String(2), nullable=False)
    rationale_id = Column(String, nullable=False)
    status = Column(String, nullable=False)
    note = Column(Text, nullable=True)
    reviewed_by = Column(String, nullable=False)
    reviewed_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

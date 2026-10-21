"""Checks and stores Stage 01 and Stage 02 output (spec .meta/specs/18-stage-data-store.md).

Each item is checked against the shared JSON schemas in `src/schemas/`, then against the
cross-reference rules of spec 12d. Good items are stored, refused items come back as
`{rule, message, details, item}`. Items that depend on a refused item are refused too.
"""

import json
import os
import re
from pathlib import Path

from jsonschema import Draft7Validator
from sqlalchemy import func
from sqlalchemy.orm import Session

from . import stage_models as m


SCHEMAS_DIR = Path(os.getenv("TARA_SCHEMAS_DIR", Path(__file__).resolve().parents[2] / "src" / "schemas"))
STAGES = ("01", "02")
EXTERNAL_ZONES = {"internet_external", "corporate_it", "third_party_saas", "vehicle_field_device"}

MESSAGES = {
    "R-01": "This fact has no source. Add at least one document reference with a location and a short quote.",
    "R-02": "This source points to a document that is not in the document register.",
    "R-03": "This element has no supporting fact. Every element must come from at least one fact.",
    "R-04": "This link connects to an element that does not exist.",
    "R-05": "This question must name one element, link or container and one fact type.",
    "R-06": "This question is already asked for this element, link or container.",
    "R-07": "This item already has {cap} questions. Merge this into one of them or drop it.",
    "R-08": "This scope decision needs a reason the analyst can read.",
    "R-12": "This refers to a fact that was rejected.",
    "R-13": (
        "This element's container does not match its zone. Elements outside the item's accounts "
        "have no container; elements inside have exactly one."
    ),
    "R-15": "This assumed scope decision must name the question that would settle it.",
    "R-18": "This refers to an item that does not exist or was refused.",
    "R-19": "This item repeats one already given in this run.",
    "R-20": "This item does not match the expected format.",
}

# Fields each rule already explains, so the format check does not report them twice.
RULE_FIELDS = {
    "R-01": {"source_refs"},
    "R-03": {"fact_ids"},
    "R-05": {"target_id", "fact_type", "topic"},
    "R-08": {"reason"},
    "R-15": {"based_on_question_ids"},
}


def question_cap() -> int:
    return int(os.getenv("QUESTION_CAP", "3"))


def question_cap_unknown_kind() -> int:
    return int(os.getenv("QUESTION_CAP_UNKNOWN_KIND", "7"))


# ── Field storage map ─────────────────────────────────────────────────────────
# COLUMNS: schema field -> model attribute, stored and read back as is.
# RELATIONS: schema fields stored in linked tables, handled by hand below.
# tests/test_stage_store.py checks that together they cover every schema field.

COLUMNS = {
    "document": {
        "doc_id": "doc_id", "title": "title", "client_doc_ref": "client_doc_ref",
        "date_on_document": "date_on_document", "date_received": "date_received", "owner": "owner",
        "environment": "environment", "doc_type": "doc_type", "sha256": "sha256",
        "read_status": "read_status", "read_status_reason": "read_status_reason",
        "reading_method": "reading_method", "page_methods": "page_methods", "unread_parts": "unread_parts",
        "reader_version": "reader_version", "precedence_rank": "precedence_rank", "used_for": "used_for",
        "ignored_and_why": "ignored_and_why", "doc_type_label": "doc_type_label",
        "rank_override_decision_id": "rank_override_decision_id",
    },
    "fact": {
        "fact_id": "fact_id", "subject": "subject", "fact_type": "fact_type", "value": "value",
        "confidence": "confidence", "group": "fact_group", "status": "status",
    },
    "conflict": {
        "conflict_id": "conflict_id", "kind": "kind", "proposed_resolution": "proposed_resolution",
        "auto_resolved": "auto_resolved", "description": "description",
    },
    "zone": {"zone_id": "zone_id", "kind": "kind", "name": "name"},
    "container": {"container_id": "container_id", "kind": "kind", "name": "name"},
    "element": {
        "element_id": "element_id", "name": "name", "asset_type": "asset_type", "asset_type_label": "asset_type_label",
        "provider": "provider", "hosting_type": "hosting_type", "is_entry_point": "is_entry_point",
        "auth_method": "auth_method", "owner_operator": "owner_operator", "data_handled": "data_handled",
        "stated_security_config": "stated_security_config", "confidence": "confidence",
    },
    "link": {
        "link_id": "link_id", "type": "link_type", "direction": "direction", "protocol": "protocol",
        "port": "port", "usage_at_destination": "usage_at_destination", "authentication": "authentication",
        "encryption": "encryption", "data_carried": "data_carried",
        "crosses_trust_boundary": "crosses_trust_boundary", "remark": "remark", "sync_async": "sync_async",
        "rate_limiting": "rate_limiting", "volume": "volume", "inferred_from_text": "inferred_from_text",
        "confidence": "confidence",
    },
    "function": {
        "function_id": "function_id", "name": "name", "description": "description", "endpoints": "endpoints",
        "data_read": "data_read", "data_written": "data_written", "privileged": "privileged",
    },
    "scope_decision": {"decision_id": "decision_id", "status": "status", "reason": "reason", "assumed": "assumed"},
    "assumption": {"assumption_id": "assumption_id", "text": "text"},
    "responsibility_split": {"provider_side": "provider_side", "customer_side": "customer_side"},
    "question": {
        "question_id": "question_id", "fact_type": "fact_type", "topic": "topic", "text": "text",
        "why_it_matters": "why_it_matters", "default_if_unanswered": "default_if_unanswered",
        "origin": "origin", "answer": "answer", "answered_by": "answered_by", "status": "status",
    },
    "rationale": {
        "rationale_id": "rationale_id", "stage": "stage", "kind": "kind", "topic": "topic", "attention": "attention",
        "title": "title", "concluded": "concluded", "assumed": "assumed", "would_change": "would_change",
        "auto_resolved": "auto_resolved",
    },
    "item_header": {"item_name": "item_name", "stakeholders": "stakeholders"},
}

RELATIONS = {
    "document": set(),
    "fact": {"source_refs"},
    "conflict": {"fact_ids", "loser_fact_ids"},
    "zone": {"fact_ids"},
    "container": {"parent_id", "zone_id", "fact_ids"},
    "element": {"parent_container_id", "zone_id", "internet_exposed", "fact_ids"},
    "link": {"source_id", "destination_id", "fact_ids"},
    "function": {"actor_ids", "element_ids", "fact_ids"},
    "scope_decision": {"element_id", "based_on_fact_ids", "based_on_question_ids"},
    "assumption": {"based_on"},
    "responsibility_split": {"element_id"},
    "question": {"target_id"},
    "rationale": {"why", "question_id", "conflict_id", "affects", "review"},
    "item_header": {"boundary_statement", "stated_control_fact_ids", "stated_absence_fact_ids"},
}

ID_FIELDS = {
    "document": "doc_id", "fact": "fact_id", "conflict": "conflict_id", "zone": "zone_id",
    "container": "container_id", "element": "element_id", "link": "link_id", "function": "function_id",
    "scope_decision": "decision_id", "assumption": "assumption_id", "question": "question_id",
    "rationale": "rationale_id",
}

MODELS = {
    "document": m.Document, "fact": m.Fact, "conflict": m.Conflict, "zone": m.Zone,
    "container": m.Container, "element": m.Element, "link": m.Link, "function": m.Function,
    "scope_decision": m.ScopeDecision, "assumption": m.Assumption, "question": m.Question,
    "rationale": m.RationaleItem, "responsibility_split": m.ResponsibilitySplit,
    "item_header": m.ItemDefinition,
}


# ── Schemas ───────────────────────────────────────────────────────────────────


def _load(name: str) -> dict:
    return json.loads((SCHEMAS_DIR / name).read_text(encoding="utf-8"))


def _sub(root: dict, schema: dict) -> dict:
    sub = dict(schema)
    if "definitions" in root:
        sub["definitions"] = root["definitions"]
    return sub


def item_schemas() -> dict:
    register = _load("stage-01-document-register.schema.json")
    facts = _load("stage-01-facts.schema.json")
    item_def = _load("stage-02-item-definition.schema.json")
    questions = _load("stage-02-questions.schema.json")
    rationale = _load("rationale.schema.json")
    props = item_def["properties"]
    header_fields = ["item_name", "boundary_statement", "stakeholders", "stated_control_fact_ids", "stated_absence_fact_ids"]
    schemas = {
        "document": register["items"],
        "fact": _sub(facts, facts["properties"]["facts"]["items"]),
        "conflict": _sub(facts, facts["properties"]["conflicts"]["items"]),
        "question": questions["items"],
        "rationale": _sub(rationale, rationale["items"]),
        "item_header": _sub(item_def, {
            "type": "object",
            "required": ["item_name", "boundary_statement"],
            "properties": {name: props[name] for name in header_fields},
        }),
    }
    for kind, prop in [
        ("zone", "zones"), ("container", "containers"), ("element", "elements"), ("link", "links"),
        ("function", "functions"), ("scope_decision", "scope_decisions"), ("assumption", "assumptions"),
        ("responsibility_split", "responsibility_split"),
    ]:
        schemas[kind] = _sub(item_def, props[prop]["items"])
    return schemas


_VALIDATORS = None


def validators() -> dict:
    global _VALIDATORS
    if _VALIDATORS is None:
        _VALIDATORS = {
            kind: Draft7Validator(schema, format_checker=Draft7Validator.FORMAT_CHECKER)
            for kind, schema in item_schemas().items()
        }
    return _VALIDATORS


_REQUIRED = re.compile(r"^'([^']+)' is a required property")


def _error_field(error) -> str | None:
    if error.path:
        return str(error.path[0])
    match = _REQUIRED.match(error.message)
    return match.group(1) if match else None


def _error_text(error) -> str:
    where = "/".join(str(p) for p in error.path) or "item"
    return f"{where}: {error.message}"


# ── Refusals ──────────────────────────────────────────────────────────────────


class Refusals:
    def __init__(self):
        self.items = []

    def add(self, rule: str, item, **details):
        message = MESSAGES[rule]
        if rule == "R-07":
            message = message.format(cap=details.pop("cap"))
        self.items.append({"rule": rule, "message": message, "details": details, "item": item})


def format_problems(kind: str, item) -> list[tuple[str, dict]]:
    """The rule-based and format problems of one item, before cross-references."""
    if not isinstance(item, dict):
        return [("R-20", {"problems": ["item: not an object"]})]
    problems = []
    if kind == "fact" and not item.get("source_refs"):
        problems.append(("R-01", {"fact_id": item.get("fact_id")}))
    if kind == "element" and not item.get("fact_ids"):
        problems.append(("R-03", {"element_id": item.get("element_id")}))
    if kind == "question":
        fact_type = item.get("fact_type")
        if not item.get("target_id") or not fact_type or (fact_type == "generic" and not item.get("topic")):
            problems.append(("R-05", {"question_id": item.get("question_id")}))
    if kind == "scope_decision":
        if len(str(item.get("reason") or "").strip()) < 10:
            problems.append(("R-08", {"element_id": item.get("element_id")}))
        if item.get("assumed") is True and not item.get("based_on_question_ids"):
            problems.append(("R-15", {"element_id": item.get("element_id")}))
    covered = set().union(*(RULE_FIELDS.get(rule, set()) for rule, _ in problems))
    errors = [
        _error_text(e) for e in validators()[kind].iter_errors(item)
        if _error_field(e) not in covered
    ]
    if errors:
        problems.append(("R-20", {"problems": sorted(errors)}))
    return problems


# ── Run helpers ───────────────────────────────────────────────────────────────


def current_run(db: Session, assessment_id: str, stage: str) -> m.StageRun | None:
    return (
        db.query(m.StageRun)
        .filter_by(assessment_id=assessment_id, stage=stage)
        .order_by(m.StageRun.run_number.desc())
        .first()
    )


def run_by_number(db: Session, assessment_id: str, stage: str, run_number: int) -> m.StageRun | None:
    return db.query(m.StageRun).filter_by(assessment_id=assessment_id, stage=stage, run_number=run_number).first()


def _index(db: Session, model, run_id: int, id_field: str) -> dict:
    return {getattr(row, id_field): row for row in db.query(model).filter_by(run_id=run_id).all()}


def _columns(kind: str, item: dict) -> dict:
    return {attr: item.get(field) for field, attr in COLUMNS[kind].items()}


class RunWriter:
    """Writes one stage run, item by item, keeping track of what was accepted."""

    def __init__(self, db: Session, run: m.StageRun):
        self.db = db
        self.run = run
        self.refusals = Refusals()
        self.accepted = {}
        self.seen = {}

    def _add(self, obj):
        self.db.add(obj)
        self.db.flush()
        return obj

    def accept(self, kind: str, obj):
        self.accepted[kind] = self.accepted.get(kind, 0) + 1
        return self._add(obj)

    def check(self, kind: str, item, extra=None) -> list[tuple[str, dict]]:
        """Format, duplicate and cross-reference problems; `extra(item)` returns more."""
        problems = format_problems(kind, item)
        if not isinstance(item, dict):
            return problems
        well_formed = not problems
        id_field = ID_FIELDS.get(kind)
        if id_field:
            seen = self.seen.setdefault(kind, set())
            if item.get(id_field) in seen:
                problems.append(("R-19", {id_field: item.get(id_field)}))
            seen.add(item.get(id_field))
        if extra and well_formed:
            problems.extend(extra(item))
        return problems

    def refuse_all(self, problems, item):
        for rule, details in problems:
            self.refusals.add(rule, item, **details)

    def fact_ref(self, owner_kind: str, owner_pk: int, role: str, facts: list, start: int = 0):
        for pos, fact in enumerate(facts, start=start):
            self._add(m.FactRef(run_id=self.run.id, owner_kind=owner_kind, owner_pk=owner_pk, role=role, fact_pk=fact.id, position=pos))

    def result(self) -> dict:
        return {
            "run_number": self.run.run_number,
            "accepted": self.accepted,
            "accepted_total": sum(self.accepted.values()),
            "refused": self.refusals.items,
        }


# ── Stage 01 ──────────────────────────────────────────────────────────────────


def write_stage_01(db: Session, run: m.StageRun, payload: dict) -> RunWriter:
    w = RunWriter(db, run)
    docs, facts, conflicts = {}, {}, {}

    for pos, item in enumerate(payload.get("document_register") or []):
        problems = w.check("document", item)
        if problems:
            w.refuse_all(problems, item)
            continue
        docs[item["doc_id"]] = w.accept("document", m.Document(run_id=run.id, position=pos, **_columns("document", item)))

    def fact_extra(item):
        return [("R-02", {"doc_id": ref["doc_id"]}) for ref in item["source_refs"] if ref["doc_id"] not in docs]

    for pos, item in enumerate(payload.get("facts") or []):
        problems = w.check("fact", item, fact_extra)
        if problems:
            w.refuse_all(problems, item)
            continue
        fact = w.accept("fact", m.Fact(run_id=run.id, position=pos, **_columns("fact", item)))
        for spos, ref in enumerate(item["source_refs"]):
            w._add(m.FactSource(fact_pk=fact.id, document_pk=docs[ref["doc_id"]].id, position=spos, location=ref["location"], quote=ref["quote"]))
        facts[item["fact_id"]] = fact

    def conflict_extra(item):
        ids = list(item["fact_ids"]) + list(item["loser_fact_ids"])
        return [("R-18", {"fact_id": fid}) for fid in dict.fromkeys(ids) if fid not in facts]

    for pos, item in enumerate(payload.get("conflicts") or []):
        problems = w.check("conflict", item, conflict_extra)
        if problems:
            w.refuse_all(problems, item)
            continue
        conflict = w.accept("conflict", m.Conflict(run_id=run.id, position=pos, **_columns("conflict", item)))
        members = [("involved", fid) for fid in item["fact_ids"]] + [("loser", fid) for fid in item["loser_fact_ids"]]
        for mpos, (role, fid) in enumerate(members):
            w._add(m.ConflictFact(conflict_pk=conflict.id, fact_pk=facts[fid].id, role=role, position=mpos))
        conflicts[item["conflict_id"]] = conflict

    known = set(docs) | set(facts) | set(conflicts)
    write_rationale(w, "01", payload.get("rationale") or [], docs, conflicts, {}, {}, known, checked_prefixes=("FCT-", "CNF-", "DOC-"))
    return w


# ── Stage 02 ──────────────────────────────────────────────────────────────────


def write_stage_02(db: Session, run: m.StageRun, stage01: m.StageRun, payload: dict) -> RunWriter:
    w = RunWriter(db, run)
    item_def = payload.get("item_definition") or {}
    docs = _index(db, m.Document, stage01.id, "doc_id")
    facts = _index(db, m.Fact, stage01.id, "fact_id")
    conflicts = _index(db, m.Conflict, stage01.id, "conflict_id")
    stage01_rationale = _index(db, m.RationaleItem, stage01.id, "rationale_id")
    zones, containers, elements, links, functions, questions = {}, {}, {}, {}, {}, {}

    def fact_problems(ids):
        problems = []
        for fid in ids:
            if fid not in facts:
                problems.append(("R-18", {"fact_id": fid}))
            elif facts[fid].status == "rejected":
                problems.append(("R-12", {"fact_id": fid}))
        return problems

    header = {k: item_def[k] for k in COLUMNS["item_header"].keys() | RELATIONS["item_header"] if k in item_def}
    header_problems = format_problems("item_header", header)
    if header_problems:
        w.refuse_all(header_problems, header)
        return w
    w.accept("item_definition", m.ItemDefinition(
        run_id=run.id,
        boundary_text=header["boundary_statement"]["text"],
        boundary_proposed=header["boundary_statement"]["proposed"],
        **_columns("item_header", header),
    ))

    # Zones
    for pos, item in enumerate(item_def.get("zones") or []):
        problems = w.check("zone", item, lambda it: fact_problems(it["fact_ids"]))
        if problems:
            w.refuse_all(problems, item)
            continue
        zone = w.accept("zone", m.Zone(run_id=run.id, position=pos, **_columns("zone", item)))
        w.fact_ref("zone", zone.id, "support", [facts[f] for f in item["fact_ids"]])
        zones[item["zone_id"]] = zone

    # Containers, parents before children
    def container_extra(item):
        problems = fact_problems(item["fact_ids"])
        if "zone_id" in item and item["zone_id"] not in zones:
            problems.append(("R-18", {"zone_id": item["zone_id"]}))
        return problems

    pending = []
    for pos, item in enumerate(item_def.get("containers") or []):
        problems = w.check("container", item, container_extra)
        if problems:
            w.refuse_all(problems, item)
        else:
            pending.append((pos, item))
    progress = True
    while pending and progress:
        progress = False
        for pos, item in list(pending):
            parent = item.get("parent_id")
            if parent is not None and parent not in containers:
                continue
            container = w.accept("container", m.Container(
                run_id=run.id, position=pos,
                parent_pk=containers[parent].id if parent else None,
                zone_pk=zones[item["zone_id"]].id if "zone_id" in item else None,
                **_columns("container", item),
            ))
            w.fact_ref("container", container.id, "support", [facts[f] for f in item["fact_ids"]])
            containers[item["container_id"]] = container
            pending.remove((pos, item))
            progress = True
    for pos, item in pending:
        w.refusals.add("R-18", item, container_id=item["parent_id"])

    # Elements
    def element_extra(item):
        problems = fact_problems(item["fact_ids"])
        exposure = item.get("internet_exposed")
        if exposure:
            problems.extend(fact_problems(exposure["evidence_fact_ids"]))
        zone = zones.get(item["zone_id"])
        if zone is None:
            problems.append(("R-18", {"zone_id": item["zone_id"]}))
        parent = item.get("parent_container_id")
        if parent and parent not in containers:
            problems.append(("R-18", {"container_id": parent}))
        if zone is not None:
            external = zone.kind in EXTERNAL_ZONES
            if external == bool(parent):
                problems.append(("R-13", {"element_id": item["element_id"], "zone_id": item["zone_id"]}))
        return problems

    for pos, item in enumerate(item_def.get("elements") or []):
        problems = w.check("element", item, element_extra)
        if problems:
            w.refuse_all(problems, item)
            continue
        exposure = item.get("internet_exposed")
        parent = item.get("parent_container_id")
        element = w.accept("element", m.Element(
            run_id=run.id, position=pos,
            zone_pk=zones[item["zone_id"]].id,
            parent_container_pk=containers[parent].id if parent else None,
            internet_exposed=exposure["value"] if exposure else None,
            **_columns("element", item),
        ))
        w.fact_ref("element", element.id, "support", [facts[f] for f in item["fact_ids"]])
        if exposure:
            w.fact_ref("element", element.id, "exposure_evidence", [facts[f] for f in exposure["evidence_fact_ids"]])
        elements[item["element_id"]] = element

    def missing_elements(ids):
        return [("R-18", {"element_id": eid}) for eid in dict.fromkeys(ids) if eid not in elements]

    # Links
    def link_extra(item):
        problems = fact_problems(item["fact_ids"])
        for end in dict.fromkeys([item["source_id"], item["destination_id"]]):
            if end not in elements:
                problems.append(("R-04", {"element_id": end}))
        return problems

    for pos, item in enumerate(item_def.get("links") or []):
        problems = w.check("link", item, link_extra)
        if problems:
            w.refuse_all(problems, item)
            continue
        link = w.accept("link", m.Link(
            run_id=run.id, position=pos,
            source_pk=elements[item["source_id"]].id,
            destination_pk=elements[item["destination_id"]].id,
            **_columns("link", item),
        ))
        w.fact_ref("link", link.id, "support", [facts[f] for f in item["fact_ids"]])
        links[item["link_id"]] = link

    # Functions
    for pos, item in enumerate(item_def.get("functions") or []):
        problems = w.check("function", item, lambda it: fact_problems(it["fact_ids"]) + missing_elements(it["actor_ids"] + it["element_ids"]))
        if problems:
            w.refuse_all(problems, item)
            continue
        function = w.accept("function", m.Function(run_id=run.id, position=pos, **_columns("function", item)))
        members = [("actor", e) for e in item["actor_ids"]] + [("element", e) for e in item["element_ids"]]
        for mpos, (role, eid) in enumerate(members):
            w._add(m.FunctionMember(function_pk=function.id, element_pk=elements[eid].id, role=role, position=mpos))
        w.fact_ref("function", function.id, "support", [facts[f] for f in item["fact_ids"]])
        functions[item["function_id"]] = function

    # Questions
    def target_of(target_id):
        if target_id.startswith("EL-"):
            return elements.get(target_id)
        if target_id.startswith("IF-"):
            return links.get(target_id)
        return containers.get(target_id)

    asked = {}  # (target, fact_type or topic) -> question_id
    visible = {}  # target -> [question_id]

    def question_extra(item):
        target_id = item["target_id"]
        if target_of(target_id) is None:
            return [("R-18", {"target_id": target_id})]
        problems = []
        key = (target_id, "generic", item.get("topic")) if item["fact_type"] == "generic" else (target_id, item["fact_type"])
        if key in asked:
            problems.append(("R-06", {"question_id": asked[key]}))
        if item["status"] != "dropped_answered_by_docs":
            target = target_of(target_id)
            cap = question_cap_unknown_kind() if isinstance(target, m.Element) and target.asset_type == "unknown_kind" else question_cap()
            existing = visible.get(target_id, [])
            if len(existing) >= cap:
                problems.append(("R-07", {"cap": cap, "target_id": target_id, "question_ids": list(existing)}))
        return problems

    for pos, item in enumerate(payload.get("questions") or []):
        problems = w.check("question", item, question_extra)
        if problems:
            w.refuse_all(problems, item)
            continue
        target = target_of(item["target_id"])
        question = w.accept("question", m.Question(
            run_id=run.id, position=pos,
            target_element_pk=target.id if isinstance(target, m.Element) else None,
            target_link_pk=target.id if isinstance(target, m.Link) else None,
            target_container_pk=target.id if isinstance(target, m.Container) else None,
            **_columns("question", item),
        ))
        key = (item["target_id"], "generic", item.get("topic")) if item["fact_type"] == "generic" else (item["target_id"], item["fact_type"])
        asked[key] = item["question_id"]
        if item["status"] != "dropped_answered_by_docs":
            visible.setdefault(item["target_id"], []).append(item["question_id"])
        questions[item["question_id"]] = question

    # Scope decisions
    decided = set()

    def scope_extra(item):
        problems = fact_problems(item["based_on_fact_ids"]) + missing_elements([item["element_id"]])
        problems += [("R-18", {"question_id": q}) for q in item["based_on_question_ids"] if q not in questions]
        if item["element_id"] in decided:
            problems.append(("R-19", {"element_id": item["element_id"]}))
        return problems

    for pos, item in enumerate(item_def.get("scope_decisions") or []):
        problems = w.check("scope_decision", item, scope_extra)
        if problems:
            w.refuse_all(problems, item)
            continue
        decision = w.accept("scope_decision", m.ScopeDecision(
            run_id=run.id, position=pos, element_pk=elements[item["element_id"]].id, **_columns("scope_decision", item),
        ))
        for qpos, qid in enumerate(item["based_on_question_ids"]):
            w._add(m.ScopeDecisionQuestion(decision_pk=decision.id, question_pk=questions[qid].id, position=qpos))
        w.fact_ref("scope_decision", decision.id, "support", [facts[f] for f in item["based_on_fact_ids"]])
        decided.add(item["element_id"])

    # Assumptions
    def assumption_extra(item):
        fact_ids = [b for b in item["based_on"] if b.startswith("FCT-")]
        problems = fact_problems(fact_ids)
        problems += [("R-18", {"question_id": b}) for b in item["based_on"] if b.startswith("Q-") and b not in questions]
        return problems

    for pos, item in enumerate(item_def.get("assumptions") or []):
        problems = w.check("assumption", item, assumption_extra)
        if problems:
            w.refuse_all(problems, item)
            continue
        assumption = w.accept("assumption", m.Assumption(run_id=run.id, position=pos, **_columns("assumption", item)))
        for bpos, basis in enumerate(item["based_on"]):
            w._add(m.AssumptionBasis(
                assumption_pk=assumption.id, position=bpos,
                fact_pk=facts[basis].id if basis.startswith("FCT-") else None,
                question_pk=questions[basis].id if basis.startswith("Q-") else None,
            ))

    # Responsibility split
    for pos, item in enumerate(item_def.get("responsibility_split") or []):
        problems = w.check("responsibility_split", item, lambda it: missing_elements([it["element_id"]]))
        if problems:
            w.refuse_all(problems, item)
            continue
        w.accept("responsibility_split", m.ResponsibilitySplit(
            run_id=run.id, position=pos, element_pk=elements[item["element_id"]].id, **_columns("responsibility_split", item),
        ))

    # Stated controls and absences: each reference stands on its own
    item_def_row = db.query(m.ItemDefinition).filter_by(run_id=run.id).one()
    for field, role in [("stated_control_fact_ids", "stated_control"), ("stated_absence_fact_ids", "stated_absence")]:
        pos = 0
        for fid in header.get(field) or []:
            problems = fact_problems([fid])
            if problems:
                w.refuse_all(problems, {field: fid})
                continue
            w.fact_ref("item_definition", item_def_row.id, role, [facts[fid]], start=pos)
            pos += 1

    known = (
        set(docs) | set(facts) | set(conflicts) | set(zones) | set(containers) | set(elements)
        | set(links) | set(functions) | set(questions) | decided_ids(db, run.id) | assumption_ids(db, run.id)
    )
    write_rationale(w, "02", payload.get("rationale") or [], docs, conflicts, questions, stage01_rationale, known, checked_prefixes=None)
    return w


def decided_ids(db: Session, run_id: int) -> set:
    return {row.decision_id for row in db.query(m.ScopeDecision).filter_by(run_id=run_id)}


def assumption_ids(db: Session, run_id: int) -> set:
    return {row.assumption_id for row in db.query(m.Assumption).filter_by(run_id=run_id)}


# ── Rationale ─────────────────────────────────────────────────────────────────


def write_rationale(w: RunWriter, stage: str, items: list, docs: dict, conflicts: dict, questions: dict,
                    earlier: dict, known: set, checked_prefixes):
    """Stores Rationale items. The `review` a stage sends is ignored: only the analyst reviews (13b).

    `affects` ids are checked when they can already exist: in Stage 01 only documents, facts and
    conflicts (Stage 01 may name elements Stage 02 builds later); in Stage 02 every id.
    """
    accepted = {}
    valid = []
    for pos, item in enumerate(items):
        def extra(it):
            problems = []
            if it["stage"] != stage:
                problems.append(("R-20", {"problems": [f"stage: must be {stage}"]}))
            problems += [("R-02", {"doc_id": s["doc_id"]}) for s in it["why"].get("sources", []) if s["doc_id"] not in docs]
            if "conflict_id" in it and it["conflict_id"] not in conflicts:
                problems.append(("R-18", {"conflict_id": it["conflict_id"]}))
            if "question_id" in it and it["question_id"] not in questions:
                problems.append(("R-18", {"question_id": it["question_id"]}))
            for target in it["affects"]:
                checkable = checked_prefixes is None or target.startswith(checked_prefixes)
                if checkable and target not in known:
                    problems.append(("R-18", {"affects": target}))
            return problems

        problems = w.check("rationale", item, extra)
        if problems:
            w.refuse_all(problems, item)
        else:
            valid.append((pos, item))

    stuck = list(valid)
    progress = True
    while stuck and progress:
        progress = False
        for pos, item in list(stuck):
            based_on = item["why"].get("based_on_rationale_ids", [])
            if not all(r in accepted or r in earlier for r in based_on):
                continue
            row = w.accept("rationale", m.RationaleItem(
                run_id=w.run.id, position=pos,
                why_note=item["why"].get("note"),
                conflict_pk=conflicts[item["conflict_id"]].id if "conflict_id" in item else None,
                question_pk=questions[item["question_id"]].id if "question_id" in item else None,
                **_columns("rationale", item),
            ))
            for spos, src in enumerate(item["why"].get("sources", [])):
                w._add(m.RationaleSource(rationale_pk=row.id, document_pk=docs[src["doc_id"]].id, position=spos, location=src["location"], quote=src["quote"]))
            for bpos, rid in enumerate(based_on):
                target = accepted.get(rid) or earlier[rid]
                w._add(m.RationaleBasedOn(rationale_pk=row.id, based_on_pk=target.id, position=bpos))
            for apos, target in enumerate(item["affects"]):
                w._add(m.RationaleAffects(rationale_pk=row.id, target_id=target, position=apos))
            accepted[item["rationale_id"]] = row
            stuck.remove((pos, item))
            progress = True
    for pos, item in stuck:
        missing = [r for r in item["why"].get("based_on_rationale_ids", []) if r not in accepted and r not in earlier]
        w.refusals.add("R-18", item, rationale_id=missing[0])


# ── Reading back ──────────────────────────────────────────────────────────────


def _read(kind: str, row) -> dict:
    out = {}
    for field, attr in COLUMNS[kind].items():
        value = getattr(row, attr)
        if value is not None:
            out[field] = value
    return out


def _ordered(db: Session, model, run_id: int):
    return db.query(model).filter_by(run_id=run_id).order_by(model.position).all()


def _fact_refs(db: Session, run_id: int) -> dict:
    refs = {}
    rows = db.query(m.FactRef).filter_by(run_id=run_id).order_by(m.FactRef.position).all()
    for ref in rows:
        refs.setdefault((ref.owner_kind, ref.owner_pk, ref.role), []).append(ref.fact.fact_id)
    return refs


def review_of(db: Session, assessment_id: str, stage: str, rationale_id: str) -> dict:
    review = db.query(m.RationaleReview).filter_by(assessment_id=assessment_id, stage=stage, rationale_id=rationale_id).first()
    if review is None:
        return {"status": "unreviewed"}
    out = {"status": review.status, "by": review.reviewed_by, "at": _iso(review.reviewed_at)}
    if review.note:
        out["note"] = review.note
    return out


def _iso(value) -> str:
    text = value.isoformat()
    return text.replace("+00:00", "Z") if "+00:00" in text else text + "Z"


def read_rationale_item(db: Session, assessment_id: str, row: m.RationaleItem) -> dict:
    out = _read("rationale", row)
    why = {}
    if row.sources:
        why["sources"] = [{"doc_id": s.document.doc_id, "location": s.location, "quote": s.quote} for s in row.sources]
    if row.based_on:
        why["based_on_rationale_ids"] = [b.based_on_item.rationale_id for b in row.based_on]
    if row.why_note:
        why["note"] = row.why_note
    out["why"] = why
    if row.question is not None:
        out["question_id"] = row.question.question_id
    if row.conflict is not None:
        out["conflict_id"] = row.conflict.conflict_id
    out["affects"] = [a.target_id for a in row.affects]
    out["review"] = review_of(db, assessment_id, row.stage, row.rationale_id)
    return out


def read_rationale(db: Session, run: m.StageRun) -> list:
    return [read_rationale_item(db, run.assessment_id, row) for row in _ordered(db, m.RationaleItem, run.id)]


def read_stage_01(db: Session, run: m.StageRun) -> dict:
    facts = []
    for row in _ordered(db, m.Fact, run.id):
        fact = _read("fact", row)
        fact["source_refs"] = [{"doc_id": s.document.doc_id, "location": s.location, "quote": s.quote} for s in row.sources]
        facts.append(fact)
    conflicts = []
    for row in _ordered(db, m.Conflict, run.id):
        conflict = _read("conflict", row)
        conflict["fact_ids"] = [c.fact.fact_id for c in row.members if c.role == "involved"]
        conflict["loser_fact_ids"] = [c.fact.fact_id for c in row.members if c.role == "loser"]
        conflicts.append(conflict)
    return {
        "document_register": [_read("document", row) for row in _ordered(db, m.Document, run.id)],
        "facts": facts,
        "conflicts": conflicts,
        "rationale": read_rationale(db, run),
    }


def read_stage_02(db: Session, run: m.StageRun) -> dict:
    refs = _fact_refs(db, run.id)

    def facts_of(kind, pk, role="support"):
        return refs.get((kind, pk, role), [])

    header = db.query(m.ItemDefinition).filter_by(run_id=run.id).first()
    item_def = {}
    if header is not None:
        item_def = _read("item_header", header)
        item_def["boundary_statement"] = {"text": header.boundary_text, "proposed": header.boundary_proposed}

    item_def["zones"] = []
    for row in _ordered(db, m.Zone, run.id):
        zone = _read("zone", row)
        zone["fact_ids"] = facts_of("zone", row.id)
        item_def["zones"].append(zone)

    item_def["containers"] = []
    for row in _ordered(db, m.Container, run.id):
        container = _read("container", row)
        if row.parent is not None:
            container["parent_id"] = row.parent.container_id
        if row.zone is not None:
            container["zone_id"] = row.zone.zone_id
        container["fact_ids"] = facts_of("container", row.id)
        item_def["containers"].append(container)

    item_def["elements"] = []
    for row in _ordered(db, m.Element, run.id):
        element = _read("element", row)
        element["zone_id"] = row.zone.zone_id
        if row.parent_container is not None:
            element["parent_container_id"] = row.parent_container.container_id
        if row.internet_exposed is not None:
            element["internet_exposed"] = {
                "value": row.internet_exposed,
                "evidence_fact_ids": facts_of("element", row.id, "exposure_evidence"),
            }
        element["fact_ids"] = facts_of("element", row.id)
        item_def["elements"].append(element)

    item_def["links"] = []
    for row in _ordered(db, m.Link, run.id):
        link = _read("link", row)
        link["source_id"] = row.source.element_id
        link["destination_id"] = row.destination.element_id
        link["fact_ids"] = facts_of("link", row.id)
        item_def["links"].append(link)

    item_def["functions"] = []
    for row in _ordered(db, m.Function, run.id):
        function = _read("function", row)
        function["actor_ids"] = [mb.element.element_id for mb in row.members if mb.role == "actor"]
        function["element_ids"] = [mb.element.element_id for mb in row.members if mb.role == "element"]
        function["fact_ids"] = facts_of("function", row.id)
        item_def["functions"].append(function)

    item_def["scope_decisions"] = []
    for row in _ordered(db, m.ScopeDecision, run.id):
        decision = _read("scope_decision", row)
        decision["element_id"] = row.element.element_id
        decision["based_on_fact_ids"] = facts_of("scope_decision", row.id)
        decision["based_on_question_ids"] = [q.question.question_id for q in row.questions]
        item_def["scope_decisions"].append(decision)

    item_def["assumptions"] = []
    for row in _ordered(db, m.Assumption, run.id):
        assumption = _read("assumption", row)
        assumption["based_on"] = [b.fact.fact_id if b.fact is not None else b.question.question_id for b in row.basis]
        item_def["assumptions"].append(assumption)

    item_def["responsibility_split"] = []
    for row in _ordered(db, m.ResponsibilitySplit, run.id):
        split = _read("responsibility_split", row)
        split["element_id"] = row.element.element_id
        item_def["responsibility_split"].append(split)

    if header is not None:
        item_def["stated_control_fact_ids"] = facts_of("item_definition", header.id, "stated_control")
        item_def["stated_absence_fact_ids"] = facts_of("item_definition", header.id, "stated_absence")

    questions = []
    for row in _ordered(db, m.Question, run.id):
        question = _read("question", row)
        target = row.target_element or row.target_link or row.target_container
        question["target_id"] = getattr(target, "element_id", None) or getattr(target, "link_id", None) or target.container_id
        questions.append(question)

    return {"item_definition": item_def, "questions": questions, "rationale": read_rationale(db, run)}


def read_output(db: Session, run: m.StageRun) -> dict:
    output = read_stage_01(db, run) if run.stage == "01" else read_stage_02(db, run)
    based_on = db.get(m.StageRun, run.based_on_run_id) if run.based_on_run_id else None
    return {
        "stage": run.stage,
        "run_number": run.run_number,
        "based_on_stage_01_run": based_on.run_number if based_on else None,
        "created_at": _iso(run.created_at),
        "created_by": run.created_by,
        **output,
    }


# ── Entry point ───────────────────────────────────────────────────────────────


class NothingAccepted(Exception):
    def __init__(self, refused):
        super().__init__("nothing accepted")
        self.refused = refused


class NoStage01(Exception):
    pass


def store_run(db: Session, assessment_id: str, stage: str, payload: dict, created_by: str) -> dict:
    """Stores one stage run. Raises NothingAccepted (and stores nothing) if every item is refused."""
    stage01 = None
    if stage == "02":
        stage01 = current_run(db, assessment_id, "01")
        if stage01 is None:
            raise NoStage01()
    last = db.query(func.max(m.StageRun.run_number)).filter_by(assessment_id=assessment_id, stage=stage).scalar() or 0
    run = m.StageRun(
        assessment_id=assessment_id, stage=stage, run_number=last + 1, created_by=created_by,
        based_on_run_id=stage01.id if stage01 else None,
    )
    db.add(run)
    db.flush()
    writer = write_stage_01(db, run, payload) if stage == "01" else write_stage_02(db, run, stage01, payload)
    result = writer.result()
    if result["accepted_total"] == 0:
        db.rollback()
        raise NothingAccepted(result["refused"])
    run.accepted_count = result["accepted_total"]
    run.refused_count = len(result["refused"])
    db.commit()
    return result

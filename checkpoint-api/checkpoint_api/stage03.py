"""Stage 03 store, review and comments (spec 27, D-56).

Stage 03 is stored like Stages 01 and 02: one run per build, a table per kind of record. The analyst's edits
(confirm, remove, change a property) sit on the current run's rows and carry over to a re-run when the asset id
and its source match. Comments are kept outside runs, like Rationale reviews.
"""

import json
import re
from datetime import datetime, timezone

from jsonschema import Draft7Validator
from sqlalchemy.orm import Session

from . import asset_rules
from . import stage_models as m
from . import stage_store as store

PROPERTIES = asset_rules.PROPERTIES
ID_IN_TEXT = re.compile(r"\b(EL|IF|FN|FCT|SD|ASM|Q|CNF|DOC|CTR|ZN|EXT|NET|INF|WL|DS|IAM|API|COMM)-\d{1,3}\b")
STATUSES = ("proposed", "confirmed", "removed")


class Refused(Exception):
    """A request the analyst can fix. `status` is the HTTP status the route answers with."""

    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def now() -> datetime:
    return datetime.now(timezone.utc)


_VALIDATOR = None


def validator() -> Draft7Validator:
    global _VALIDATOR
    if _VALIDATOR is None:
        schema = store._load("stage-03-assets.schema.json")
        item = dict(schema["items"])
        item["definitions"] = schema["definitions"]
        _VALIDATOR = Draft7Validator(item, format_checker=Draft7Validator.FORMAT_CHECKER)
    return _VALIDATOR


def source_key(source_ids) -> str:
    return ",".join(sorted(source_ids))


# ── Writing a run ─────────────────────────────────────────────────────────────


def write_stage_03(db: Session, run: m.StageRun, stage02: m.StageRun, previous: m.StageRun | None, payload: dict) -> store.RunWriter:
    w = store.RunWriter(db, run)
    stage01 = db.get(m.StageRun, stage02.based_on_run_id)
    docs = store._index(db, m.Document, stage01.id, "doc_id")
    facts = store._index(db, m.Fact, stage01.id, "fact_id")
    elements = store._index(db, m.Element, stage02.id, "element_id")
    links = store._index(db, m.Link, stage02.id, "link_id")
    functions = store._index(db, m.Function, stage02.id, "function_id")
    known_sources = set(elements) | set(links) | set(functions)

    before = {}
    if previous is not None:
        for row in db.query(m.Asset).filter_by(run_id=previous.id):
            before[(row.asset_id, source_key(row.source_ids))] = row

    accepted = {}
    for pos, item in enumerate(payload.get("assets") or []):
        if not isinstance(item, dict):
            w.refusals.add("R-20", item, problems=["item: not an object"])
            continue
        problems = sorted(f"{'/'.join(str(p) for p in e.path) or 'item'}: {e.message}" for e in validator().iter_errors(item))
        for code, prop in (item.get("properties") or {}).items():
            if isinstance(prop, dict) and isinstance(prop.get("reason"), str) and ID_IN_TEXT.search(prop["reason"]):
                problems.append(f"properties/{code}/reason: a reason must not contain ids")
        if problems:
            w.refusals.add("R-20", item, problems=problems)
            continue
        if item["asset_id"] in accepted:
            w.refusals.add("R-19", item, asset_id=item["asset_id"])
            continue
        missing = [i for i in item["source"]["ids"] if i not in known_sources]
        if missing:
            w.refusals.add("R-18", item, source_id=missing[0])
            continue
        missing_facts = [f for f in item["fact_ids"] if f not in facts]
        if missing_facts:
            w.refusals.add("R-18", item, fact_id=missing_facts[0])
            continue

        row = w.accept("asset", m.Asset(
            run_id=run.id, position=pos, asset_id=item["asset_id"], family=item["family"], name=item["name"], type_label=item["type_label"],
            description=item["description"], source_kind=item["source"]["kind"], source_ids=item["source"]["ids"], source_label=item["source"]["label"],
            scope_status=item["source"]["scope"], interface=item["interface"], would_change=item["would_change"], fact_ids=item["fact_ids"],
            asset_type_row=item["asset_type_row"],
        ))
        old = before.get((item["asset_id"], source_key(item["source"]["ids"])))
        if old is not None and old.status != "proposed":
            row.status, row.status_note, row.status_by, row.status_at = old.status, old.status_note, old.status_by, old.status_at
        old_props = {p.property: p for p in old.properties} if old is not None else {}
        for ppos, code in enumerate(PROPERTIES):
            prop = item["properties"][code]
            fields = dict(applies=prop["applies"], reason=prop["reason"], origin=prop["origin"], reviewed=prop["reviewed"], reviewed_by=None, reviewed_at=None)
            carried = old_props.get(code)
            if carried is not None and carried.origin == "analyst":
                # A property the analyst changed is never replaced by a default or a model change.
                fields = dict(applies=carried.applies, reason=carried.reason, origin="analyst", reviewed=True, reviewed_by=carried.reviewed_by, reviewed_at=carried.reviewed_at)
            elif carried is not None and carried.reviewed and carried.applies == fields["applies"] and not fields["reviewed"]:
                fields.update(reviewed=True, reviewed_by=carried.reviewed_by, reviewed_at=carried.reviewed_at)
            w._add(m.AssetProperty(asset_pk=row.id, position=ppos, property=code, **fields))
        accepted[item["asset_id"]] = row

    known = (
        set(docs) | set(facts) | known_sources | set(accepted)
        | {f"{asset_id}.{code}" for asset_id in accepted for code in PROPERTIES}
        | {f"{element}" for element in elements}
    )
    store.write_rationale(w, "03", payload.get("rationale") or [], docs, {}, {}, {}, known, checked_prefixes=None)
    return w


# ── Reading ───────────────────────────────────────────────────────────────────


def _quotes(db: Session, stage01_run_id: int, fact_ids: list, limit: int = 2) -> list:
    quotes, seen = [], set()
    if not fact_ids:
        return quotes
    rows = db.query(m.Fact).filter(m.Fact.run_id == stage01_run_id, m.Fact.fact_id.in_(fact_ids)).all()
    by_id = {r.fact_id: r for r in rows}
    for fid in fact_ids:
        fact = by_id.get(fid)
        for src in (fact.sources if fact else []):
            where = f"{src.document.client_doc_ref or src.document.title}, {src.location}"
            key = (src.quote, where)
            if key not in seen and len(quotes) < limit:
                seen.add(key)
                quotes.append({"text": src.quote, "where": where})
    return quotes


def _iso(value) -> str | None:
    return store._iso(value) if value else None


def read_asset(db: Session, row: m.Asset, stage01_run_id: int | None) -> dict:
    return {
        "asset_id": row.asset_id,
        "family": row.family,
        "name": row.name,
        "type_label": row.type_label,
        "description": row.description,
        "source": {"kind": row.source_kind, "ids": row.source_ids, "label": row.source_label, "scope": row.scope_status},
        "interface": row.interface,
        "would_change": row.would_change,
        "quotes": _quotes(db, stage01_run_id, row.fact_ids) if stage01_run_id else [],
        "asset_type_row": row.asset_type_row,
        "status": row.status,
        "status_note": row.status_note,
        "properties": {
            p.property: {"applies": p.applies, "reason": p.reason, "origin": p.origin, "reviewed": p.reviewed}
            for p in row.properties
        },
    }


def register_state(db: Session, assessment_id: str) -> m.AssetRegisterState | None:
    return db.query(m.AssetRegisterState).filter_by(assessment_id=assessment_id).first()


def read_output(db: Session, run: m.StageRun) -> dict:
    stage02 = db.get(m.StageRun, run.based_on_run_id)
    latest02 = store.current_run(db, run.assessment_id, "02")
    rows = db.query(m.Asset).filter_by(run_id=run.id).order_by(m.Asset.position).all()
    assets = [read_asset(db, row, stage02.based_on_run_id if stage02 else None) for row in rows]
    counts = {}
    for a in assets:
        counts[a["family"]] = counts.get(a["family"], 0) + 1
    finished = db.query(m.StageReview).filter_by(assessment_id=run.assessment_id, stage="03").first()
    state = register_state(db, run.assessment_id)
    return {
        "stage": "03",
        "run_number": run.run_number,
        "created_at": store._iso(run.created_at),
        "created_by": run.created_by,
        "built_from_02_run": stage02.run_number if stage02 else None,
        "stale": bool(latest02 and stage02 and latest02.id != stage02.id),
        "register_source": state.source if state else "stage03",
        "assets": assets,
        "families": [{**f, "count": counts.get(f["code"], 0)} for f in asset_rules.families() if counts.get(f["code"])],
        "finished": {"by": finished.finished_by, "at": store._iso(finished.finished_at)} if finished else None,
        "rationale": store.read_rationale(db, run),
    }


# ── The analyst's edits ───────────────────────────────────────────────────────


def _asset(db: Session, assessment_id: str, asset_id: str) -> tuple[m.StageRun, m.Asset]:
    run = store.current_run(db, assessment_id, "03")
    if run is None:
        raise Refused(404, "Stage 03 has no stored output yet.")
    row = db.query(m.Asset).filter_by(run_id=run.id, asset_id=asset_id).first()
    if row is None:
        raise Refused(404, f"Asset {asset_id} not found.")
    return run, row


def set_status(db: Session, assessment_id: str, asset_id: str, status: str, note: str | None, by: str) -> m.Asset:
    _, row = _asset(db, assessment_id, asset_id)
    note = (note or "").strip() or None
    if status not in STATUSES:
        raise Refused(422, "Status must be confirmed, removed or proposed.")
    if status == "removed" and (note is None or len(note) < 3):
        raise Refused(422, "Removing an asset needs a note saying why.")
    row.status = status
    row.status_note = note if status != "proposed" else None
    row.status_by, row.status_at = (by, now()) if status != "proposed" else (None, None)
    db.commit()
    return row


def change_property(db: Session, assessment_id: str, asset_id: str, prop: str, by: str, body: dict) -> m.Asset:
    _, row = _asset(db, assessment_id, asset_id)
    if prop not in PROPERTIES:
        raise Refused(404, f"Unknown property {prop}.")
    cell = next(p for p in row.properties if p.property == prop)
    if body.get("confirm") is True:
        cell.reviewed, cell.reviewed_by, cell.reviewed_at = True, by, now()
        db.commit()
        return row
    applies, reason = body.get("applies"), " ".join(str(body.get("reason") or "").split())
    if not isinstance(applies, bool):
        raise Refused(422, "Say whether the property applies.")
    if not 10 <= len(reason) <= 500:
        raise Refused(422, "Give a reason of 10 to 500 characters.")
    if ID_IN_TEXT.search(reason):
        raise Refused(422, "A reason must not contain ids.")
    if not applies and row.status != "removed" and all(not p.applies for p in row.properties if p.property != prop):
        raise Refused(422, "At least one property must apply to an asset. Remove the asset instead.")
    cell.applies, cell.reason, cell.origin = applies, reason, "analyst"
    cell.reviewed, cell.reviewed_by, cell.reviewed_at = True, by, now()
    db.commit()
    return row


# ── Comments ──────────────────────────────────────────────────────────────────


def read_comment(c: m.AssetComment) -> dict:
    return {
        "id": c.id,
        "run_number": c.run_number,
        "asset_id": c.asset_id,
        "property": c.property,
        "author": c.author,
        "text": c.text,
        "created_at": store._iso(c.created_at),
        "resolved": c.resolved,
        "proposed_change": c.proposed_change,
    }


def list_comments(db: Session, assessment_id: str) -> list:
    rows = db.query(m.AssetComment).filter_by(assessment_id=assessment_id).order_by(m.AssetComment.id).all()
    return [read_comment(c) for c in rows]


def _thread(db: Session, assessment_id: str, asset_id: str, prop: str | None):
    return db.query(m.AssetComment).filter_by(assessment_id=assessment_id, asset_id=asset_id, property=prop)


def add_comment(db: Session, assessment_id: str, by: str, body: dict, author: str = "analyst", proposed_change: dict | None = None) -> m.AssetComment:
    asset_id, prop = body.get("asset_id"), body.get("property") or None
    run, _ = _asset(db, assessment_id, str(asset_id))
    if prop is not None and prop not in PROPERTIES:
        raise Refused(404, f"Unknown property {prop}.")
    text = " ".join(str(body.get("text") or "").split())
    if not 2 <= len(text) <= 2000:
        raise Refused(422, "Write a comment of 2 to 2000 characters.")
    _thread(db, assessment_id, asset_id, prop).update({"resolved": False})  # a new message reopens the thread
    comment = m.AssetComment(
        assessment_id=assessment_id, run_number=run.run_number, asset_id=asset_id, property=prop, author=author,
        author_id=by, text=text, proposed_change=proposed_change,
    )
    db.add(comment)
    db.commit()
    return comment


def update_comment(db: Session, assessment_id: str, comment_id: int, by: str, body: dict) -> m.AssetComment:
    comment = db.query(m.AssetComment).filter_by(id=comment_id, assessment_id=assessment_id).first()
    if comment is None:
        raise Refused(404, f"Comment {comment_id} not found.")
    change = body.get("proposed_change")
    if change is not None:
        state = change.get("state") if isinstance(change, dict) else None
        if comment.author != "assistant" or not comment.proposed_change or state not in ("applied", "kept"):
            raise Refused(422, "Only a proposed change can be applied or kept.")
        if comment.proposed_change.get("state") != "open":
            raise Refused(409, "This proposal has already been answered.")
        if state == "applied":
            if comment.property is None:
                raise Refused(422, "A change can only be applied to a property.")
            change_property(db, assessment_id, comment.asset_id, comment.property, by, {"applies": bool(comment.proposed_change.get("applies")), "reason": comment.text[:500]})
            _thread(db, assessment_id, comment.asset_id, comment.property).update({"resolved": True})
        comment.proposed_change = {**comment.proposed_change, "state": state}
    if "resolved" in body:
        _thread(db, assessment_id, comment.asset_id, comment.property).update({"resolved": bool(body["resolved"])})
    db.commit()
    db.refresh(comment)
    return comment


# ── Finish ────────────────────────────────────────────────────────────────────


def open_assumptions(db: Session, run: m.StageRun) -> int:
    return sum(1 for item in store.read_rationale(db, run) if item["attention"] == "needs_attention" and item["review"]["status"] == "unreviewed")


def finish(db: Session, assessment_id: str, by: str) -> dict:
    run = store.current_run(db, assessment_id, "03")
    if run is None:
        raise Refused(404, "Stage 03 has no stored output yet.")
    open_count = open_assumptions(db, run)
    if open_count:
        raise Refused(409, f"{open_count} assumption{'s' if open_count != 1 else ''} still need you.")
    row = db.query(m.StageReview).filter_by(assessment_id=assessment_id, stage="03").first()
    if row is None:
        row = m.StageReview(assessment_id=assessment_id, stage="03", finished_by=by)
        db.add(row)
    row.finished_by, row.finished_at = by, now()
    db.commit()
    return {"by": row.finished_by, "at": store._iso(row.finished_at)}

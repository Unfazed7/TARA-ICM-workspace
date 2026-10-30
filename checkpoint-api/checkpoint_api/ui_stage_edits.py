"""The analyst's changes on screens 04 Impacts, 05 Threats and 06 TARA (specs 29 to 31, D-62).

An edit is written into the folder's own output file, checked against that folder's schema, and logged with its reason.
What is pure maths is recalculated at once, with the pipeline's own engines: the attack feasibility of a changed CVSS
factor, and folder 08 (the risk scores) after a changed rating or factor. What a model wrote is never rewritten:
the later model folders are marked out of date and the screen offers Rebuild.
"""

import copy
import json
import os
import re
import shutil
import subprocess
from datetime import datetime, timezone

from jsonschema import Draft7Validator, FormatChecker
from sqlalchemy.orm import Session

from . import engine_bridge
from . import pipeline_runner
from . import run_log
from . import stage_models as m
from . import stage_store
from . import ui_stages as u


log = run_log.get("pipeline")

LEVELS = u.LEVELS
STRIDE = ("spoofing", "tampering", "repudiation", "information_disclosure", "denial_of_service", "elevation_of_privilege")
OPTIONS = ("reduce", "accept", "share", "avoid")
ACCEPTABLE = ("informational", "low")
IMPACT_EDITABLE = tuple(f"{g}.{k}" for g, k, fixed in u.IMPACT_CATEGORIES if not fixed)
ID_IN_TEXT = re.compile(r"\b(DS|TH|AT|IM|RSK|TRT|CG|CC|CTR|RES|AS|DMG|THR|AP|EL|IF|FN|FCT|SD|ASM|Q|CNF|DOC|ZN|EXT|NET|INF|WL|IAM|API|COMM)[-_]\d{1,3}\b")
SCHEMAS = {
    5: "stage-05-threats.schema.json",
    6: "stage-06-attack-paths.schema.json",
    7: "stage-07-impact-analysis.schema.json",
    8: "stage-08-risk-register.schema.json",
    9: "stage-09-risk-treatment.schema.json",
}
# What each kind of edit puts out of date: only folders a model wrote (folder 08 is recalculated at once).
STALE = {"stride": [6, 7, 9, 10], "scoring": [9, 10], "treatment": [10]}
COMMENT_FIELDS = {
    "04": {"overall", *(f"{g}.{k}" for g, k, _ in u.IMPACT_CATEGORIES)},
    "05": {"stride_category", "cvss", "feasibility", "attack_path", *u.FACTORS},
    "06": {"treatment_option", "cybersecurity_goal", "risk", "feasibility", "impact"},
}


class Refused(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status, self.message = status, message


# ── Files ─────────────────────────────────────────────────────────────────────


def read(number: int, assessment_id: str):
    data = u.read_folder(number, assessment_id)
    if data is None:
        raise Refused(409, f"Folder {number:02d} has no output yet. Build it first.")
    return data


def check(number: int, data) -> None:
    schema = stage_store._load(SCHEMAS[number])
    problems = sorted(e.message for e in Draft7Validator(schema, format_checker=FormatChecker()).iter_errors(data))
    if problems:
        raise Refused(422, f"The change does not fit the folder's rules, so nothing was saved: {problems[0]}")


def write(number: int, assessment_id: str, data) -> None:
    path = u.output_path(number, assessment_id)
    tmp = path.with_suffix(f"{path.suffix}.tmp")
    tmp.write_text(f"{json.dumps(data, indent=2)}\n", encoding="utf-8")
    os.replace(tmp, path)


class Backup:
    """Puts the folder files back as they were if anything after the first write fails, so a refused edit changes nothing."""

    def __init__(self, assessment_id: str, numbers):
        self.saved = {n: (u.output_path(n, assessment_id), u.output_path(n, assessment_id).read_bytes() if u.output_path(n, assessment_id).is_file() else None) for n in numbers}

    def restore(self) -> None:
        for path, content in self.saved.values():
            if content is None:
                path.unlink(missing_ok=True)
            else:
                path.write_bytes(content)


def reason_of(body: dict) -> str:
    reason = " ".join(str(body.get("reason") or "").split())
    if not 10 <= len(reason) <= 500:
        raise Refused(422, "Give a reason of 10 to 500 characters.")
    if ID_IN_TEXT.search(reason):
        raise Refused(422, "A reason must not contain ids.")
    return reason


# ── Folder 08 ─────────────────────────────────────────────────────────────────


def rerun_scoring(assessment_id: str) -> None:
    """Folder 08 again on the edited ratings and attacks: deterministic, so it runs here and now. Its ids follow the rank, so
    the treatments and residual records are pointed at the same threats' new risk ids."""
    out = u.output_path(8, assessment_id)
    tmp = out.with_suffix(".json.tmp")
    node = shutil.which("node")
    if node is None:
        raise Refused(500, "Node.js was not found, so the risk scores could not be recalculated.")
    done = subprocess.run(
        [node, pipeline_runner.get_agent_path(8), "--impact", str(u.output_path(7, assessment_id)), "--attacks", str(u.output_path(6, assessment_id)), "--out", str(tmp)],
        capture_output=True, cwd=pipeline_runner.WORKSPACE_ROOT, env=os.environ.copy(), timeout=300,
    )
    if done.returncode != 0:
        tmp.unlink(missing_ok=True)
        text = (done.stderr or done.stdout).decode(errors="replace").strip().splitlines()
        raise Refused(500, f"The risk scores could not be recalculated, so nothing was saved. {text[-1] if text else ''}".strip())
    os.replace(tmp, out)
    new = {r["threat_id"]: r["risk_id"] for r in u.read_folder(8, assessment_id) or []}
    for number in (9, 10):
        records = u.read_folder(number, assessment_id)
        if not records:
            continue
        changed = False
        for record in records:
            fresh = new.get(record["threat_id"])
            if fresh and record["risk_id"] != fresh:
                record["risk_id"], changed = fresh, True
        if changed:
            write(number, assessment_id, records)


# ── The edits ─────────────────────────────────────────────────────────────────


def log_edit(db: Session, assessment_id: str, ui_stage: str, folder: int, record_id: str, field: str, old, new, reason: str, stale: list, by: str) -> m.StageEdit:
    edit = m.StageEdit(assessment_id=assessment_id, ui_stage=ui_stage, folder=folder, record_id=record_id, field=field, old=old, new=new, reason=reason, stale_folders=stale, by=by)
    db.add(edit)
    db.commit()
    log.info("%s | %s edited %s %s on screen %s: %s -> %s", assessment_id, by, record_id, field, ui_stage, old, new)
    return edit


def edit_impact(db: Session, assessment_id: str, record_id: str, field: str, body: dict, by: str) -> dict:
    if field not in {f"{g}.{k}" for g, k, _ in u.IMPACT_CATEGORIES}:
        raise Refused(404, f"Unknown rating {field}.")
    impacts = read(7, assessment_id)
    pairs = [i for i in impacts if i["damage_scenario_id"] == record_id]
    if not pairs:
        raise Refused(409, "This damage scenario has no impact rating yet.")
    group, key = field.split(".")
    current = max((p[group][key] for p in pairs), key=u._level_index)
    if body.get("confirm") is True:
        log_edit(db, assessment_id, "04", 7, record_id, field, current, current, "Confirmed", [], by)
        return {"record_id": record_id, "field": field, "value": current, "stale_folders": []}
    if field not in IMPACT_EDITABLE:
        raise Refused(422, "This rating is fixed by rule and cannot be changed.")
    value, reason = body.get("value"), reason_of(body)
    if value not in LEVELS:
        raise Refused(422, "Choose Negligible, Moderate, Major or Severe.")
    backup = Backup(assessment_id, (7, 8, 9, 10))
    try:
        for p in pairs:
            p[group][key] = value
        check(7, impacts)
        write(7, assessment_id, impacts)
        rerun_scoring(assessment_id)
    except Exception:
        backup.restore()
        raise
    log_edit(db, assessment_id, "04", 7, record_id, field, current, value, reason, STALE["scoring"], by)
    return {"record_id": record_id, "field": field, "value": value, "stale_folders": STALE["scoring"]}


def edit_threat(db: Session, assessment_id: str, record_id: str, field: str, body: dict, by: str) -> dict:
    if field == "stride_category":
        threats = read(5, assessment_id)
        threat = next((t for t in threats if t["threat_id"] == record_id), None)
        if threat is None:
            raise Refused(404, f"Threat {record_id} not found.")
        current = threat["stride_category"]
        if body.get("confirm") is True:
            log_edit(db, assessment_id, "05", 5, record_id, field, current, current, "Confirmed", [], by)
            return {"record_id": record_id, "field": field, "value": current, "stale_folders": []}
        value, reason = body.get("value"), reason_of(body)
        if value not in STRIDE:
            raise Refused(422, "Choose one of the six STRIDE categories.")
        backup = Backup(assessment_id, (5,))
        try:
            threat["stride_category"] = value
            check(5, threats)
            write(5, assessment_id, threats)
        except Exception:
            backup.restore()
            raise
        log_edit(db, assessment_id, "05", 5, record_id, field, current, value, reason, STALE["stride"], by)
        return {"record_id": record_id, "field": field, "value": value, "stale_folders": STALE["stride"]}
    if field in u.FACTORS:
        attacks = read(6, assessment_id)
        attack = next((a for a in attacks if a["threat_id"] == record_id), None)
        if attack is None:
            raise Refused(409, "This threat has no attack path yet.")
        current = attack["cvss_metrics"][field]
        if body.get("confirm") is True:
            log_edit(db, assessment_id, "05", 6, record_id, field, current, current, "Confirmed", [], by)
            return {"record_id": record_id, "field": field, "value": current, "stale_folders": []}
        value, reason = body.get("value"), reason_of(body)
        if value not in u.FACTOR_WORDS[field]:
            raise Refused(422, f"Choose one of {', '.join(u.FACTOR_WORDS[field])} for this factor.")
        backup = Backup(assessment_id, (6, 8, 9, 10))
        try:
            attack["cvss_metrics"][field] = value
            attack.update(engine_bridge.afr([attack["cvss_metrics"]])[0])
            check(6, attacks)
            write(6, assessment_id, attacks)
            rerun_scoring(assessment_id)
        except Exception:
            backup.restore()
            raise
        log_edit(db, assessment_id, "05", 6, record_id, field, current, value, reason, STALE["scoring"], by)
        return {"record_id": record_id, "field": field, "value": value, "stale_folders": STALE["scoring"]}
    raise Refused(404, f"Unknown field {field}.")


def next_id(records: list, getter, prefix: str) -> str:
    numbers = [int(getter(r)[len(prefix) + 1:]) for r in records if getter(r)]
    return f"{prefix}_{max(numbers, default=0) + 1:02d}"


def edit_treatment(db: Session, assessment_id: str, record_id: str, field: str, body: dict, by: str) -> dict:
    if field != "treatment_option":
        raise Refused(404, f"Unknown field {field}.")
    treatments = read(9, assessment_id)
    risks = u.read_folder(8, assessment_id) or []
    record = next((t for t in treatments if t["threat_id"] == record_id), None)
    risk = next((r for r in risks if r["threat_id"] == record_id), None)
    if record is None or risk is None:
        raise Refused(404, f"Risk for {record_id} not found.")
    current = record["treatment_option"]
    if body.get("confirm") is True:
        log_edit(db, assessment_id, "06", 9, record_id, field, current, current, "Confirmed", [], by)
        return {"record_id": record_id, "field": field, "value": current, "stale_folders": []}
    option, reason = body.get("value"), reason_of(body)
    if option not in OPTIONS:
        raise Refused(422, "Choose Reduce, Accept, Share or Avoid.")
    if option == "accept" and risk["risk_level"] not in ACCEPTABLE:
        raise Refused(422, f"Only informational and low risks can be accepted. This risk is {risk['risk_level']}.")
    updated = copy.deepcopy(record)
    goal_text = " ".join(str(body.get("goal_statement") or "").split())
    action = " ".join(str(body.get("avoidance_action") or "").split())
    updated["treatment_option"], updated["treatment_rationale"] = option, reason
    if option in ("reduce", "share"):
        goal = updated["cybersecurity_goal"]
        statement = goal_text or (goal["goal_statement"] if goal else "")
        if option == "reduce" and not statement:
            raise Refused(422, "Write the cybersecurity goal that Reduce should reach.")
        statement = statement or f"Part of this risk is shared with another party: {reason}"
        controls = updated["controls_assigned"]
        note = goal["self_test_note"] if goal else None
        if not 1 <= len(controls) <= 3:
            try:
                picked = engine_bridge.call("controls", {"inputs": treatment_inputs(assessment_id), "risk_id": risk["risk_id"], "option": option})
            except engine_bridge.EngineError as exc:
                raise Refused(500, f"The controls for this treatment could not be chosen: {exc}") from exc
            controls = [{"control_id": c["control_id"], "control_title": c["control_title"], "control_type": c["control_type"], "assignment_rationale": c["assignment_rationale"]} for c in picked["controls"]]
            note = note or picked["goal_self_test_note"]
        updated["controls_assigned"] = controls
        updated["cybersecurity_goal"] = {
            "goal_id": goal["goal_id"] if goal else next_id([t["cybersecurity_goal"] for t in treatments if t["cybersecurity_goal"]], lambda g: g["goal_id"], "CG"),
            "goal_statement": statement,
            "cal": updated["cal"],
            "cal_rationale": goal["cal_rationale"] if goal else f"CAL {updated['cal']} derived from {risk['risk_level']} risk level for {risk['risk_id']}.",
            "self_test_note": note or "Checked by the analyst against the asset it protects.",
        }
        updated["cybersecurity_claim"], updated["avoidance_action"] = None, None
        if option == "share" and not any(c["control_id"] for c in controls):
            raise Refused(422, "Sharing a risk needs a control for it.")
        updated["residual_risk_expected"] = record["residual_risk_expected"] if current in ("reduce", "share") else expected_residual(risk["risk_level"])
    elif option == "accept":
        claim = record["cybersecurity_claim"]
        updated["cybersecurity_claim"] = {
            "claim_id": claim["claim_id"] if claim else next_id([t["cybersecurity_claim"] for t in treatments if t["cybersecurity_claim"]], lambda c: c["claim_id"], "CC"),
            "claim_statement": f"The risk is accepted because {reason[0].lower()}{reason[1:].rstrip('.')}. Attack feasibility is {risk['afr_label']} (AFR={risk['afr_value']}), impact is {risk['impact_rating_label']} (score={risk['impact_rating_value']}), the risk score is {risk['risk_score']} and the risk level is {risk['risk_level']}, within the project acceptance threshold of low or below.",
            "acceptance_basis": reason,
        }
        updated["cybersecurity_goal"], updated["controls_assigned"], updated["avoidance_action"] = None, [], None
        updated["residual_risk_expected"] = risk["risk_level"]
    else:  # avoid
        if not action:
            raise Refused(422, "Say what is done to avoid the risk.")
        updated["avoidance_action"] = action
        updated["cybersecurity_goal"], updated["cybersecurity_claim"], updated["controls_assigned"] = None, None, []
        updated["residual_risk_expected"] = "informational"
    backup = Backup(assessment_id, (9,))
    try:
        treatments[treatments.index(record)] = updated
        check(9, treatments)
        write(9, assessment_id, treatments)
    except Exception:
        backup.restore()
        raise
    log_edit(db, assessment_id, "06", 9, record_id, field, current, option, reason, STALE["treatment"], by)
    return {"record_id": record_id, "field": field, "value": option, "stale_folders": STALE["treatment"]}


def expected_residual(level: str) -> str:
    return {"critical": "high", "high": "medium", "medium": "low"}.get(level, level)


def treatment_inputs(assessment_id: str) -> dict:
    return {
        "riskRegister": u.read_folder(8, assessment_id), "threats": u.read_folder(5, assessment_id), "damageScenarios": u.read_folder(4, assessment_id),
        "attacks": u.read_folder(6, assessment_id), "impacts": u.read_folder(7, assessment_id), "assets": u.read_folder(3, assessment_id),
    }


EDITORS = {"04": edit_impact, "05": edit_threat, "06": edit_treatment}


def apply_edit(db: Session, assessment_id: str, ui_stage: str, record_id: str, field: str, body: dict, by: str) -> dict:
    if u.anything_running(db, assessment_id):
        raise Refused(409, "A build is running. Wait for it to finish, then make this change.")
    return EDITORS[ui_stage](db, assessment_id, record_id, field, body, by)


# ── Comments, assumptions, finish ─────────────────────────────────────────────


def valid_record(assessment_id: str, ui_stage: str, record_id: str) -> bool:
    folder, key = {"04": (4, "damage_id"), "05": (5, "threat_id"), "06": (8, "threat_id")}[ui_stage]
    return any(r.get(key) == record_id for r in u.read_folder(folder, assessment_id) or [])


def read_comment(c: m.StageComment) -> dict:
    return {
        "id": c.id, "record_id": c.record_id, "field": c.field, "author": c.author, "text": c.text,
        "created_at": u._iso(c.created_at), "resolved": c.resolved, "proposed_change": c.proposed_change,
    }


def list_comments(db: Session, assessment_id: str, ui_stage: str) -> list:
    rows = db.query(m.StageComment).filter_by(assessment_id=assessment_id, ui_stage=ui_stage).order_by(m.StageComment.id).all()
    return [read_comment(c) for c in rows]


def _thread(db: Session, assessment_id: str, ui_stage: str, record_id: str, field):
    return db.query(m.StageComment).filter_by(assessment_id=assessment_id, ui_stage=ui_stage, record_id=record_id, field=field)


def add_comment(db: Session, assessment_id: str, ui_stage: str, by: str, body: dict, author: str = "analyst", proposed_change: dict | None = None) -> m.StageComment:
    record_id, field = str(body.get("record_id") or ""), body.get("field") or None
    if field == "row":
        field = None
    if not valid_record(assessment_id, ui_stage, record_id):
        raise Refused(404, f"Row {record_id} not found.")
    if field is not None and field not in COMMENT_FIELDS[ui_stage]:
        raise Refused(404, f"Unknown field {field}.")
    text = " ".join(str(body.get("text") or "").split())
    if not 2 <= len(text) <= 2000:
        raise Refused(422, "Write a comment of 2 to 2000 characters.")
    _thread(db, assessment_id, ui_stage, record_id, field).update({"resolved": False})  # a new message reopens the thread
    comment = m.StageComment(assessment_id=assessment_id, ui_stage=ui_stage, record_id=record_id, field=field, author=author, author_id=by, text=text, proposed_change=proposed_change)
    db.add(comment)
    db.commit()
    return comment


def update_comment(db: Session, assessment_id: str, ui_stage: str, comment_id: int, by: str, body: dict) -> m.StageComment:
    comment = db.query(m.StageComment).filter_by(id=comment_id, assessment_id=assessment_id, ui_stage=ui_stage).first()
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
            proposal = comment.proposed_change
            apply_edit(db, assessment_id, ui_stage, comment.record_id, proposal["field"], {"value": proposal["value"], "reason": comment.text[:500]}, by)
            _thread(db, assessment_id, ui_stage, comment.record_id, comment.field).update({"resolved": True})
        comment.proposed_change = {**comment.proposed_change, "state": state}
    if "resolved" in body:
        _thread(db, assessment_id, ui_stage, comment.record_id, comment.field).update({"resolved": bool(body["resolved"])})
    db.commit()
    db.refresh(comment)
    return comment


def review_assumption(db: Session, assessment_id: str, ui_stage: str, assumption_id: str, by: str, body: dict) -> dict:
    ctx = u.context(assessment_id)
    found = next((a for a in u.build_assumptions(db, assessment_id, ui_stage, ctx) if a["id"] == assumption_id), None)
    if found is None:
        raise Refused(404, f"Assumption {assumption_id} not found.")
    status, note = body.get("status"), " ".join(str(body.get("note") or "").split()) or None
    if status not in ("confirmed", "disputed", "open"):
        raise Refused(422, "Status must be confirmed or disputed.")
    if status == "disputed" and (note is None or len(note) < 3):
        raise Refused(422, "A dispute needs a note saying what is wrong.")
    row = db.query(m.StageAssumptionReview).filter_by(assessment_id=assessment_id, ui_stage=ui_stage, key=found["key"]).first()
    if status == "open":
        if row is not None:
            db.delete(row)
    else:
        if row is None:
            row = m.StageAssumptionReview(assessment_id=assessment_id, ui_stage=ui_stage, key=found["key"], assumption_id=assumption_id, status=status, reviewed_by=by)
            db.add(row)
        row.status, row.note, row.assumption_id, row.reviewed_by = status, note, assumption_id, by
        row.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    return {"id": assumption_id, "status": status, "note": note}


def finish(db: Session, assessment_id: str, ui_stage: str, by: str) -> dict:
    """Records who finished the review and when. It never refuses and gates nothing: the design allows Finish anyway."""
    row = db.query(m.StageReview).filter_by(assessment_id=assessment_id, stage=ui_stage).first()
    if row is None:
        row = m.StageReview(assessment_id=assessment_id, stage=ui_stage, finished_by=by)
        db.add(row)
        db.commit()
    return {"by": row.finished_by, "at": u._iso(row.finished_at)}

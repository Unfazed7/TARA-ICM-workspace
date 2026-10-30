"""What screens 04 Impacts, 05 Threats and 06 TARA show: the pipeline's folders joined into rows (specs 29 to 31, D-61).

Nothing here computes a rating. Levels, feasibility, scores and treatments are read from the folders' own output;
the screens print them in the design's look. The analyst's edits are written back to those files by `ui_stage_edits`.
"""

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from . import asset_rules
from . import engine_bridge
from . import pipeline_runner
from . import stage_models as m
from . import stage_store
from .models import PipelineRun, PipelineRunAttempt


UI_STAGES = ("04", "05", "06")
# The pipeline folders each screen shows, and the folder each screen's data starts from (D-61).
UI_FOLDERS = {"04": (4, 7), "05": (5, 6), "06": (8, 9, 10)}
FIRST_FOLDER = {"04": 4, "05": 5, "06": 8}
CHAIN = (4, 5, 6, 7, 8, 9, 10)
RUNNING = ("pending", "running", "paused")
LEVELS = ("Negligible", "Moderate", "Major", "Severe")
# (group, key, fixed): the seven categories in the design's order; two are fixed by rule (D-62).
IMPACT_CATEGORIES = (
    ("tool_user", "safety", True),
    ("tool_user", "financial", True),
    ("tool_user", "operational", False),
    ("tool_user", "privacy", False),
    ("other_stakeholders", "legal", False),
    ("other_stakeholders", "financial", False),
    ("other_stakeholders", "business", False),
)
IMPACT_RULES = {
    "tool_user.safety": "Negligible by default: a web tool cannot cause physical harm to anyone.",
    "tool_user.financial": "Negligible by default: the tool does not handle the user’s money.",
}
FACTORS = ("attack_vector", "attack_complexity", "privileges_required", "user_interaction")
FACTOR_WORDS = {
    "attack_vector": {"N": "Network", "A": "Adjacent", "L": "Local", "P": "Physical"},
    "attack_complexity": {"L": "Low", "H": "High"},
    "privileges_required": {"N": "None", "L": "Low", "H": "High"},
    "user_interaction": {"N": "None", "R": "Required"},
}
BUILT_FROM_LABEL = {"04": "asset analysis", "05": "impact analysis", "06": "impact and threat analysis"}


def upload_dir() -> Path:
    return Path(pipeline_runner.WORKSPACE_ROOT)


def output_path(number: int, assessment_id: str) -> Path:
    return Path(pipeline_runner.get_output_path(number, assessment_id))


def assumptions_path(number: int, assessment_id: str) -> Path:
    return output_path(number, assessment_id).with_name("assumptions.json")


def read_folder(number: int, assessment_id: str):
    path = output_path(number, assessment_id)
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def _iso(value) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()


# ── Status of the folders ─────────────────────────────────────────────────────


def folder_runs(db: Session, assessment_id: str) -> dict[int, PipelineRun]:
    rows = db.query(PipelineRun).filter(PipelineRun.assessment_id == assessment_id, PipelineRun.stage_num.in_(CHAIN)).all()
    return {r.stage_num: r for r in rows}


def attempt_number(db: Session, assessment_id: str, number: int) -> int | None:
    """Which build of this folder it is: the count of its finished attempts."""
    count = db.query(PipelineRunAttempt).filter_by(assessment_id=assessment_id, stage_num=number, status="complete").count()
    return count or None


def anything_running(db: Session, assessment_id: str) -> bool:
    if any(r.status in RUNNING for r in folder_runs(db, assessment_id).values()):
        return True
    jobs = db.query(m.StageJob).filter_by(assessment_id=assessment_id).all()
    return any(j.status in ("pending", "running") for j in jobs)


def stale_folders(db: Session, assessment_id: str, runs: dict[int, PipelineRun] | None = None) -> dict[int, dict]:
    """Folders whose model output is older than an edit that changes what it was built from: {folder: {reason, at}}."""
    runs = runs if runs is not None else folder_runs(db, assessment_id)
    out: dict[int, dict] = {}
    for edit in db.query(m.StageEdit).filter_by(assessment_id=assessment_id).order_by(m.StageEdit.id):
        for number in edit.stale_folders or []:
            run = runs.get(number)
            built = run.completed_at if run is not None else None
            if built is not None and built.tzinfo is None:
                built = built.replace(tzinfo=timezone.utc)
            at = edit.at if edit.at.tzinfo else edit.at.replace(tzinfo=timezone.utc)
            if built is None or at > built:
                out[number] = {"reason": f"{edit.field.replace('_', ' ')} was changed", "at": _iso(edit.at)}
    return out


# ── Assets ────────────────────────────────────────────────────────────────────


def asset_index(assessment_id: str) -> dict:
    """AS_nn -> {ref, name, family, order}. The reference is the register's `asset_ref` (WL-01), else the AS_nn."""
    register = read_json_file(output_path(3, assessment_id)) or []
    names = {f["code"]: f["name"] for f in asset_rules.families()}
    index = {}
    for order, asset in enumerate(register):
        ref = asset.get("asset_ref") or asset["asset_id"]
        family = ref.split("-")[0] if asset.get("asset_ref") else "AS"
        index[asset["asset_id"]] = {"ref": ref, "name": asset.get("asset_title", ref), "family": family, "family_name": names.get(family, "Assets"), "order": order}
    return index


def read_json_file(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8")) if path.is_file() else None
    except (OSError, ValueError):
        return None


def asset_fields(assets: dict, asset_id: str) -> dict:
    a = assets.get(asset_id) or {"ref": asset_id, "name": asset_id, "family": "AS", "family_name": "Assets", "order": 10**6}
    return {"asset_id": asset_id, "asset_ref": a["ref"], "asset_name": a["name"], "family": a["family"], "family_name": a["family_name"], "_order": a["order"]}


# ── Notes: comments, assumptions and the analyst's edits ──────────────────────


def assumption_key(about_id: str, field, text: str) -> str:
    return hashlib.sha1(f"{about_id}|{field or ''}|{text}".encode()).hexdigest()[:12]


def resolve_record(ui_stage: str, about_id: str, ctx: dict) -> str | None:
    """The row an assumption is about: DS_nn on 04, TH_nn on 05 and 06, whatever kind of id the agent gave."""
    if ui_stage == "04":
        if about_id.startswith("DS_"):
            return about_id
        if about_id.startswith("IM_"):
            return ctx["impact_ds"].get(about_id)
        return ctx["threat_ds"].get(about_id)
    if about_id.startswith("TH_"):
        return about_id
    return ctx["to_threat"].get(about_id)


def build_assumptions(db: Session, assessment_id: str, ui_stage: str, ctx: dict) -> list[dict]:
    items = []
    for number in UI_FOLDERS[ui_stage]:
        for raw in read_json_file(assumptions_path(number, assessment_id)) or []:
            if not isinstance(raw, dict) or not raw.get("text") or not raw.get("about_id"):
                continue
            items.append({"folder": number, "about_id": str(raw["about_id"]), "field": raw.get("field") or None, "text": str(raw["text"])})
    items.sort(key=lambda i: (i["folder"], i["about_id"], i["field"] or "", i["text"]))
    reviews = {r.key: r for r in db.query(m.StageAssumptionReview).filter_by(assessment_id=assessment_id, ui_stage=ui_stage)}
    out, seen = [], set()
    for item in items:
        key = assumption_key(item["about_id"], item["field"], item["text"])
        if key in seen:
            continue
        seen.add(key)
        review = reviews.get(key)
        out.append({
            "id": f"AS-{ui_stage}-{len(out) + 1:02d}",
            "key": key,
            "folder": item["folder"],
            "record_id": resolve_record(ui_stage, item["about_id"], ctx),
            "field": item["field"],
            "text": item["text"],
            "status": review.status if review else "open",
            "note": review.note if review else None,
        })
    return out


def comment_flags(db: Session, assessment_id: str, ui_stage: str) -> dict[str, set]:
    flags: dict[str, set] = {}
    for c in db.query(m.StageComment).filter_by(assessment_id=assessment_id, ui_stage=ui_stage, resolved=False):
        flags.setdefault(c.record_id, set()).add(c.field or "row")
    return flags


def latest_edits(db: Session, assessment_id: str, ui_stage: str) -> dict[tuple, m.StageEdit]:
    out = {}
    for e in db.query(m.StageEdit).filter_by(assessment_id=assessment_id, ui_stage=ui_stage).order_by(m.StageEdit.id):
        out[(e.record_id, e.field)] = e
    return out


def edit_info(edit: m.StageEdit | None) -> dict | None:
    if edit is None:
        return None
    return {"kind": "confirmed" if edit.reason == "Confirmed" else "changed", "reason": edit.reason, "by": edit.by, "at": _iso(edit.at), "from": edit.old}


def notes_for(record_id: str, flags: dict, assumptions: list) -> dict:
    open_asm = [a for a in assumptions if a["record_id"] == record_id and a["status"] == "open"]
    return {
        "comment_fields": sorted(flags.get(record_id, set())),
        "assumption_fields": sorted({a["field"] or "row" for a in open_asm}),
        "assumptions_open": len(open_asm),
    }


# ── The three screens ─────────────────────────────────────────────────────────


def _level_index(level: str) -> int:
    return LEVELS.index(level) if level in LEVELS else 0


def impact_rows(db: Session, assessment_id: str, assets: dict, ctx: dict, assumptions: list, flags: dict, edits: dict) -> list[dict]:
    scenarios = read_folder(4, assessment_id) or []
    impacts = read_folder(7, assessment_id)
    by_ds: dict[str, list] = {}
    for impact in impacts or []:
        by_ds.setdefault(impact["damage_scenario_id"], []).append(impact)
    ratings = {r["impact_id"]: r for r in zip_ratings(impacts)} if impacts else {}
    rows = []
    for ds in scenarios:
        pairs = by_ds.get(ds["damage_id"], [])
        cells = {}
        for group, key, fixed in IMPACT_CATEGORIES:
            field = f"{group}.{key}"
            levels = [p[group][key] for p in pairs]
            top = max(levels, key=_level_index) if levels else None
            cells[field] = {
                "level": top,
                "mixed": len(set(levels)) > 1,
                "locked": fixed,
                "rule": IMPACT_RULES.get(field),
                "why": [{"threat_id": p["threat_id"], "level": p[group][key], "reason": p[group][f"rationale_{key}"]} for p in pairs],
                "edit": edit_info(edits.get((ds["damage_id"], field))),
            }
        overall = None
        if pairs:
            best = max((ratings[p["impact_id"]] for p in pairs if p["impact_id"] in ratings), key=lambda r: r["value"], default=None)
            overall = best
        rows.append({
            "record_id": ds["damage_id"],
            **asset_fields(assets, ds["asset_id"]),
            "property": ds["property"],
            "damage": ds["damage_scenario"],
            "stakeholder": ds["stakeholder_affected"],
            "impact_ids": [p["impact_id"] for p in pairs],
            "rated": bool(pairs),
            "cells": cells,
            "overall": overall,
            "notes": notes_for(ds["damage_id"], flags, assumptions),
        })
    return rows


def zip_ratings(impacts: list) -> list[dict]:
    return [{"impact_id": i["impact_id"], **r} for i, r in zip(impacts, engine_bridge.impact_ratings(impacts))]


def threat_rows(db: Session, assessment_id: str, assets: dict, ctx: dict, assumptions: list, flags: dict, edits: dict) -> list[dict]:
    threats = read_folder(5, assessment_id) or []
    attacks = {a["threat_id"]: a for a in read_folder(6, assessment_id) or []}
    scenarios = {d["damage_id"]: d for d in read_folder(4, assessment_id) or []}
    rows = []
    for t in threats:
        attack = attacks.get(t["threat_id"])
        ds = scenarios.get(t["damage_scenario_id"], {})
        factors = None
        if attack:
            factors = {}
            for f in FACTORS:
                code = attack["cvss_metrics"][f]
                factors[f] = {"code": code, "label": FACTOR_WORDS[f][code], "why": attack["justifications"][f], "edit": edit_info(edits.get((t["threat_id"], f)))}
        rows.append({
            "record_id": t["threat_id"],
            **asset_fields(assets, t["asset_id"]),
            "property": t["property"],
            "threat": t["threat_statement"],
            "derivation_note": t["derivation_note"],
            "damage_id": t["damage_scenario_id"],
            "damage": ds.get("damage_scenario"),
            "stride": {"value": t["stride_category"], "edit": edit_info(edits.get((t["threat_id"], "stride_category")))},
            "attack_id": attack["attack_id"] if attack else None,
            "factors": factors,
            "cvss": engine_bridge.cvss_number(attack["cvss_metrics"]) if attack else None,
            "feasibility": {"value": attack["afr_value"], "label": attack["afr_label"]} if attack and attack.get("afr_value") else None,
            "attack_path": {
                "description": attack["attack_description"],
                "steps": [attack["attack_path"][k] for k in sorted(attack["attack_path"])],
            } if attack else None,
            "notes": notes_for(t["threat_id"], flags, assumptions),
        })
    return rows


def tara_rows(db: Session, assessment_id: str, assets: dict, ctx: dict, assumptions: list, flags: dict, edits: dict) -> list[dict]:
    risks = read_folder(8, assessment_id) or []
    treatments = {t["threat_id"]: t for t in read_folder(9, assessment_id) or []}
    residuals = {r["threat_id"]: r for r in read_folder(10, assessment_id) or []}
    threats = {t["threat_id"]: t for t in read_folder(5, assessment_id) or []}
    scenarios = {d["damage_id"]: d for d in read_folder(4, assessment_id) or []}
    attacks = {a["attack_id"]: a for a in read_folder(6, assessment_id) or []}
    rows = []
    for r in risks:
        t = threats.get(r["threat_id"], {})
        tr = treatments.get(r["threat_id"])
        res = residuals.get(r["threat_id"])
        attack = attacks.get(r["attack_id"], {})
        goal = tr["cybersecurity_goal"] if tr else None
        rows.append({
            "record_id": r["threat_id"],
            "risk_id": r["risk_id"],
            **asset_fields(assets, r["asset_id"]),
            "property": t.get("property"),
            "damage_id": r["damage_scenario_id"],
            "damage": (scenarios.get(r["damage_scenario_id"]) or {}).get("damage_scenario"),
            "impact": {"value": r["impact_rating_value"], "label": r["impact_rating_label"]},
            "threat_id": r["threat_id"],
            "threat": t.get("threat_statement"),
            "feasibility": {"value": r["afr_value"], "label": r["afr_label"]},
            "risk": {"score": r["risk_score"], "level": r["risk_level"], "rank": r["risk_rank"]},
            "cvss": engine_bridge.cvss_number(attack["cvss_metrics"]) if attack.get("cvss_metrics") else None,
            "treatment": {
                "option": tr["treatment_option"],
                "rationale": tr["treatment_rationale"],
                "goal": {"id": goal["goal_id"], "statement": goal["goal_statement"], "cal": goal["cal"]} if goal else None,
                "claim": ({"id": tr["cybersecurity_claim"]["claim_id"], "statement": tr["cybersecurity_claim"]["claim_statement"], "basis": tr["cybersecurity_claim"]["acceptance_basis"]} if tr["cybersecurity_claim"] else None),
                "avoidance_action": tr["avoidance_action"],
                "controls": [{"id": c["control_id"], "title": c["control_title"], "type": c["control_type"]} for c in tr["controls_assigned"]],
                "cal": tr["cal"],
                "edit": edit_info(edits.get((r["threat_id"], "treatment_option"))),
            } if tr else None,
            "residual": {"pre": res["pre"], "post": res["post"], "changes": res["metric_changes"]} if res else None,
            "notes": notes_for(r["threat_id"], flags, assumptions),
        })
    return rows


BUILDERS = {"04": impact_rows, "05": threat_rows, "06": tara_rows}


def context(assessment_id: str) -> dict:
    """Maps for resolving what an assumption is about."""
    impacts = read_folder(7, assessment_id) or []
    threats = read_folder(5, assessment_id) or []
    attacks = read_folder(6, assessment_id) or []
    risks = read_folder(8, assessment_id) or []
    treatments = read_folder(9, assessment_id) or []
    to_threat = {a["attack_id"]: a["threat_id"] for a in attacks}
    to_threat.update({r["risk_id"]: r["threat_id"] for r in risks})
    to_threat.update({t["treatment_id"]: t["threat_id"] for t in treatments})
    to_threat.update({i["impact_id"]: i["threat_id"] for i in impacts})
    return {
        "impact_ds": {i["impact_id"]: i["damage_scenario_id"] for i in impacts},
        "threat_ds": {t["threat_id"]: t["damage_scenario_id"] for t in threats},
        "to_threat": to_threat,
    }


def read_screen(db: Session, assessment_id: str, ui_stage: str) -> dict:
    runs = folder_runs(db, assessment_id)
    stale_by_folder = stale_folders(db, assessment_id, runs)
    mine = [n for n in UI_FOLDERS[ui_stage] if n in stale_by_folder]
    stale = {"is": bool(mine), "folders": mine, "reason": stale_by_folder[mine[0]]["reason"] if mine else None}
    ctx = context(assessment_id)
    assumptions = build_assumptions(db, assessment_id, ui_stage, ctx)
    flags = comment_flags(db, assessment_id, ui_stage)
    edits = latest_edits(db, assessment_id, ui_stage)
    assets = asset_index(assessment_id)
    rows = BUILDERS[ui_stage](db, assessment_id, assets, ctx, assumptions, flags, edits)
    rows.sort(key=lambda r: (r["_order"], r["record_id"]))
    for r in rows:
        r.pop("_order", None)
    families = []
    for r in rows:
        if r["family"] not in [f["code"] for f in families]:
            families.append({"code": r["family"], "name": r["family_name"]})
    review = db.query(m.StageReview).filter_by(assessment_id=assessment_id, stage=ui_stage).first()
    built_from = None
    if ui_stage == "04":
        run03 = stage_store.current_run(db, assessment_id, "03")
        built_from = run03.run_number if run03 else None
    else:
        built_from = attempt_number(db, assessment_id, 4 if ui_stage == "05" else 7)
    has_data = bool(rows)
    return {
        "ui_stage": ui_stage,
        "built_from": {"label": BUILT_FROM_LABEL[ui_stage], "run": built_from},
        "building": anything_running(db, assessment_id),
        "folders": [{"stage_num": n, "status": runs[n].status if n in runs else "not_started", "error": runs[n].error_message if n in runs else None} for n in CHAIN],
        "stale": stale,
        "finished": {"by": review.finished_by, "at": _iso(review.finished_at)} if review else None,
        "has_data": has_data,
        "families": families,
        "rows": rows,
        "assumptions": assumptions,
        "scales": engine_bridge.scales(),
    }

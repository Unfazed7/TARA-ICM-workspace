#!/usr/bin/env python3
"""Builds the demo TARA that ships with the API image: `checkpoint_api/demo_seed/` (D-67).

Run it by hand when the example must change:  python scripts/build_demo_seed.py
The server never runs it. It needs Node and the repo's test fixtures; it needs no model.

What it does:
  1. Stages 01 and 02 come from the synthetic item-01 ("key and certificate portal") answer key and its input documents.
  2. Stage 03 comes from the 22 assets of the design sample (tests/fixtures/design/03-assets.json), which is built on item-01.
  3. Folders 04 to 10 are made by the real stage programs with no model (the offline wrappers the tests use), on that register.
  4. A few comments and confirmed assumptions are added, with ids taken from the generated folders.
  5. A fresh copy is made from the seed and compared with it, so the ids in the folders match the register of every copy.
"""

import asyncio
import copy
import json
import os
import re
import shutil
import sys
import tempfile
from pathlib import Path

API = Path(__file__).resolve().parents[1]
REPO = API.parent
WORK = Path(tempfile.mkdtemp(prefix="demo-seed-"))
FAKES = API / "tests" / "fake_agents"

os.environ["DATABASE_URL"] = f"sqlite:///{WORK / 'seed.db'}"
os.environ["UPLOAD_DIR"] = str(WORK / "uploads")
os.environ.setdefault("JWT_SECRET", "seed-builder-only-never-used-on-a-server")
os.environ.setdefault("LOG_FILE", str(WORK / "seed.log"))
for number in range(4, 11):
    os.environ[f"STAGE{number:02d}_AGENT"] = str(FAKES / f"stage{number:02d}.js")
sys.path[:0] = [str(API), str(API / "tests")]

import stage_support as s  # noqa: E402
from checkpoint_api import demo, pipeline_runner, stage_pipeline, stage_store, ui_stage_edits, ui_stages  # noqa: E402
from checkpoint_api import main as _main  # noqa: E402,F401  (creates the tables)
from checkpoint_api.database import SessionLocal  # noqa: E402
from checkpoint_api.models import Assessment, User  # noqa: E402
from checkpoint_api.stage_catalog import STAGES_BY_NUMBER  # noqa: E402

pipeline_runner.WORKSPACE_ROOT = str(WORK)
pipeline_runner.UPLOAD_DIR = str(WORK / "uploads")

INPUTS = REPO / "tests" / "fixtures" / "synthetic" / "item-01" / "inputs"
DESIGN_03 = REPO / "tests" / "fixtures" / "design" / "03-assets.json"
SEED = demo.SEED
TYPE_LABELS = {"diagram": ("components", "Architecture diagram"), "functional": ("behaviour", "Functional description"), "qa": ("behaviour", "Client answers (Q&A)")}

# Sentences the stage programs write when they have no model. A tester must not read them.
NO_MODEL = (
    (" This deterministic fallback was used because the LLM request failed twice (network down (test)).", ""),
    ("The model could not re-rate this threat (network down (test)). ", ""),
)
# The built-in sentences speak of a workshop tool. The demo is a key and certificate portal.
WORDING = (
    ("diagnostic workflow decisions", "certificate decisions"),
    ("diagnostic or vehicle", "key or certificate"),
    ("diagnostic workflows", "certificate services"),
    ("diagnostic functionality", "portal functionality"),
    ("diagnostic", "certificate"),
    ("service teams", "production teams"),
    ("identity, vehicle, or tenant data", "identity, certificate, or tenant data"),
    (" affecting tool_user ", " affecting the portal user "),
    (" affecting organization ", " affecting the organization "),
    (" affecting regulator ", " affecting the regulator "),
)
CUT_SHORT = re.compile(r"\bdiagn\w*\u2026")  # a sentence the program cut in the middle of the word
MUST_NOT_REMAIN = re.compile(r"fallback|network down|\bLLM\b|diagn", re.I)

# What the stage programs would have noted with a model: (folder, asset, property, field, sentence). No ids in a sentence.
ASSUMPTIONS = (
    (7, "Certificate records", "confidentiality", "tool_user.privacy", "Certificate records are taken to hold the names of the people who asked for a certificate."),
    (7, "Certificate issuance", "availability", "other_stakeholders.financial", "A stop of certificate issuance is taken to stop a production line after one working day."),
    (4, "Audit trail records", "integrity", None, "The audit trail is taken to be the only record used in a later review."),
    (6, "Token check", "authenticity", "attack_vector", "The token check is taken to be reachable from the internet."),
    (6, "Key service signing logic", "integrity", "privileges_required", "A change to the signing logic is taken to need an operator account."),
    (5, "Certificate revocation", "integrity", "stride_category", "A wrong revocation is treated as tampering, because the list is changed and not only delayed."),
    (9, "CA signing key", "confidentiality", "treatment_option", "The client is taken to accept only risks that are rated low."),
    (9, "Certificate issuance", "authorization", "cybersecurity_goal", "The goal is taken to cover the test environment as well as production."),
    (9, "Database password", "confidentiality", None, "The database password is taken to be changed at least once a year."),
)
TITLES_03 = {"AS-03-01": "What the cache holds", "AS-03-02": "A second way in", "AS-03-03": "Scope of the deploy identity"}
COMMENTS = {
    "04": ("Certificate issuance", "availability", "other_stakeholders.financial", "Check this rating with the client. Ask how long production can run when no certificate can be issued."),
    "05": ("Token check", "authenticity", None, "The attack path looks right. Ask the client if the token check can be reached from the office network only."),
    "06": ("CA signing key", "confidentiality", None, "Agree with the treatment. The controls must be in place before the first release."),
}


def user(db, email: str) -> str:
    row = User(email=email, name="Seed builder", hashed_password="x", role="analyst")
    db.add(row)
    db.commit()
    return row.email


def payloads() -> dict:
    design = json.loads(DESIGN_03.read_text(encoding="utf-8"))
    # The screen shows "title. concluded"; the design sample has the same sentence in both, so the demo gets short titles.
    rationale = [{**{k: v for k, v in item.items() if k != "design_id"}, "title": TITLES_03[item["design_id"]]} for item in design["rationale"]]
    return {"01": s.stage01_payload(), "02": s.stage02_payload(), "03": {"assets": design["assets"], "rationale": rationale}}, design


def clean(value):
    """Takes the no-model sentences out of a folder's output and fits the built-in wording to the demo's item."""
    if isinstance(value, str):
        for old, new in NO_MODEL + WORDING:
            value = value.replace(old, new)
        return CUT_SHORT.sub("certificate\u2026", value)
    if isinstance(value, list):
        return [clean(v) for v in value]
    if isinstance(value, dict):
        return {k: clean(v) for k, v in value.items()}
    return value


def record_ids(folders: dict) -> dict:
    """(asset title, property) -> the damage scenario and the threat made for it."""
    out = {}
    for d in folders[4]:
        out[(d["asset_title"], d["property"])] = {"damage": d["damage_id"]}
    for t in folders[5]:
        out[(t["asset_title"], t["property"])]["threat"] = t["threat_id"]
    return out


def main() -> None:
    keep = "--keep" in sys.argv
    db = SessionLocal()
    stages, design = payloads()
    owner = user(db, "seed@example.com")
    assessment = Assessment(name=demo.NAME, vehicle_type="backend", domains=["backend"], owner_id=owner)
    db.add(assessment)
    db.commit()
    aid = assessment.assessment_id

    for stage in ("01", "02", "03"):
        result = stage_store.store_run(db, aid, stage, copy.deepcopy(stages[stage]), created_by=demo.BY)
        if result["refused"]:
            raise SystemExit(f"Stage {stage} refused items: {json.dumps(result['refused'][:3], indent=2)}")
    if not asyncio.run(stage_pipeline.run_folders(aid, stage_pipeline.CHAIN)):
        raise SystemExit(f"A folder did not complete. See {os.environ['LOG_FILE']}")

    if SEED.exists():
        shutil.rmtree(SEED)
    (SEED / "folders").mkdir(parents=True)
    (SEED / "__init__.py").write_text('"""The demo TARA\'s data. Built by scripts/build_demo_seed.py; do not edit by hand."""\n', encoding="utf-8")
    for stage in ("01", "02", "03"):
        (SEED / f"stage{stage}.json").write_text(json.dumps(stages[stage], indent=1) + "\n", encoding="utf-8")

    docs = SEED / "documents"
    docs.mkdir()
    manifest = []
    for entry in json.loads((INPUTS / "manifest.json").read_text(encoding="utf-8")):
        shutil.copy2(INPUTS / entry["file"], docs / entry["file"])
        category, label = TYPE_LABELS[entry["doc_type"]]
        manifest.append({**entry, "category": category, "type_label": label})
    (docs / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    shutil.copy2(INPUTS / "boundary.txt", docs / "boundary.txt")

    folders = {}
    for number in stage_pipeline.CHAIN:
        output = Path(pipeline_runner.get_output_path(number, aid))
        target = SEED / "folders" / STAGES_BY_NUMBER[number].key
        target.mkdir()
        for path in sorted(output.parent.glob("*.json")):
            data = clean(json.loads(path.read_text(encoding="utf-8")))
            if path.name == output.name:
                folders[number] = data
                if number in ui_stage_edits.SCHEMAS:
                    ui_stage_edits.check(number, data)
            text = json.dumps(data, indent=1) + "\n"
            left = MUST_NOT_REMAIN.search(text)
            if left:
                raise SystemExit(f"{target.name}/{path.name} still has no-model or workshop wording: ...{text[max(0, left.start() - 80):left.end() + 40]}...")
            (target / path.name).write_text(text, encoding="utf-8")

    ids = record_ids(folders)
    notes_by_folder: dict[int, list] = {}
    for number, asset, prop, field, text in ASSUMPTIONS:
        about = ids[(asset, prop)]["damage" if number in (4, 7) else "threat"]
        notes_by_folder.setdefault(number, []).append({"about_id": about, "field": field, "text": text})
    for number, items in notes_by_folder.items():
        (SEED / "folders" / STAGES_BY_NUMBER[number].key / "assumptions.json").write_text(json.dumps(items, indent=1) + "\n", encoding="utf-8")
    # The working assessment gets the same files, so the notes below are built from what a copy will show.
    for number in stage_pipeline.CHAIN:
        shutil.copytree(SEED / "folders" / STAGES_BY_NUMBER[number].key, Path(pipeline_runner.get_output_path(number, aid)).parent, dirs_exist_ok=True)

    notes = build_notes(db, aid, design, ids)
    (SEED / "notes.json").write_text(json.dumps(notes, indent=1) + "\n", encoding="utf-8")

    verify(db)
    db.close()
    size = sum(p.stat().st_size for p in SEED.rglob("*") if p.is_file())
    print(f"Seed written to {SEED} ({size // 1024} KB)")
    if keep:
        print(f"Work folder kept: {WORK}")
    else:
        shutil.rmtree(WORK, ignore_errors=True)


def build_notes(db, aid: str, design: dict, ids: dict) -> dict:
    """Sample comments and confirmed assumptions. Ids come from the generated folders, so they always exist."""
    by_design = {item["design_id"]: item["rationale_id"] for item in design["rationale"]}
    notes = {
        "comments_03": design["comments"] + design["change_proposed"],
        "confirmed_03": [by_design[i] for i in design["confirmed_design_ids"]],
        "screens": {},
    }
    for ui, (asset, prop, field, text) in COMMENTS.items():
        screen = ui_stages.read_screen(db, aid, ui)
        record = ids[(asset, prop)]["damage" if ui == "04" else "threat"]
        assert any(r["record_id"] == record for r in screen["rows"]), (ui, record)
        assert len(screen["assumptions"]) >= 2 and all(a["record_id"] for a in screen["assumptions"]), (ui, screen["assumptions"])
        comment = {"record_id": record, "text": text}
        if field:
            comment["field"] = field
        notes["screens"][ui] = {"comments": [comment], "confirmed": [screen["assumptions"][0]["id"]]}
    return notes


def verify(db) -> None:
    """A fresh copy from the seed must show the same rows as the seed's folders, with nothing out of date."""
    tester = user(db, "tester@example.com")
    copy_id = demo.open_copy(db, tester, "seed-check-0001")
    assert demo.open_copy(db, tester, "seed-check-0001") == copy_id
    register = json.loads(Path(pipeline_runner.get_output_path(3, copy_id)).read_text(encoding="utf-8"))
    known = {a["asset_id"]: a["asset_ref"] for a in register}
    seeded = json.loads((SEED / "folders" / STAGES_BY_NUMBER[4].key / Path(pipeline_runner.get_output_path(4, copy_id)).name).read_text(encoding="utf-8"))
    used = {d["asset_id"] for d in seeded}
    assert used <= set(known), f"folder 04 names assets the copy's register does not have: {sorted(used - set(known))}"
    for ui in ("03", "04", "05", "06"):
        if ui == "03":
            continue
        screen = ui_stages.read_screen(db, copy_id, ui)
        assert screen["rows"] and not screen["stale"]["is"] and not screen["building"], (ui, screen["stale"])
        assert all(r.get("asset_ref") for r in screen["rows"]), ui
    print(f"Checked: a fresh copy has {len(register)} assets in its register and screens 04 to 06 load.")
    demo.delete_copy(db, copy_id)


if __name__ == "__main__":
    main()

"""The demo TARA and the AI switch (D-67, D-68) and adding an asset by hand (D-69).

The demo copy comes from the seed that ships with the API (`checkpoint_api/demo_seed/`). No model and no stage program
runs in these tests, except where a test checks that a run still starts with AI on.
"""

import json
import time
from datetime import timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import stage_support as s
from checkpoint_api import demo, pipeline_runner
from checkpoint_api import stage_models as m
from checkpoint_api.database import SessionLocal
from checkpoint_api.main import app
from checkpoint_api.models import Assessment, PipelineRun, PipelineRunAttempt, User
from checkpoint_api.stage_models import StageBase
from test_pipeline_run import FAKES, ready

AI_OFF = "AI is switched off in this preview."
KEY = "session-key-0001"


@pytest.fixture(autouse=True)
def setup(tmp_path, monkeypatch):
    s.reset_database()
    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path / "uploads"))
    monkeypatch.setattr(pipeline_runner, "WORKSPACE_ROOT", str(tmp_path))
    monkeypatch.setattr(pipeline_runner, "UPLOAD_DIR", str(tmp_path / "uploads"))
    for number in range(1, 11):
        monkeypatch.setenv(f"STAGE{number:02d}_AGENT", str(FAKES / f"stage{number:02d}.js"))
    monkeypatch.setenv("AI_ENABLED", "false")
    monkeypatch.delenv("DEMO_ENABLED", raising=False)
    yield


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def headers(client):
    return s.analyst_headers(client)


def admin_headers(client, email="boss@example.com") -> dict:
    """An admin: registration only makes analysts, so the role is set in the database, as deploy/make-admin.sh does."""
    s.analyst_headers(client, email)
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(email=email).one()
        user.role = "admin"
        db.commit()
    finally:
        db.close()
    token = client.post("/api/v1/auth/login", json={"email": email, "password": "Test1234!"}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def open_demo(client, headers, key=KEY) -> str:
    response = client.post("/api/v1/demo/session", headers=headers, json={"session_key": key})
    assert response.status_code == 200, response.text
    return response.json()["assessment_id"]


@pytest.fixture
def copy_id(client, headers):
    return open_demo(client, headers)


def get(client, headers, path):
    response = client.get(f"/api/v1{path}", headers=headers)
    assert response.status_code == 200, f"{path}: {response.text}"
    return response.json()


def rows_for(assessment_id: str) -> dict[str, int]:
    """Every stored row that names the assessment, by table."""
    db = SessionLocal()
    try:
        found = {}
        for table in StageBase.metadata.sorted_tables:
            if "assessment_id" in table.c:
                count = db.execute(table.select().where(table.c.assessment_id == assessment_id)).fetchall()
                if count:
                    found[table.name] = len(count)
        for model in (Assessment, PipelineRun, PipelineRunAttempt):
            count = db.query(model).filter_by(assessment_id=assessment_id).count()
            if count:
                found[model.__tablename__] = count
        return found
    finally:
        db.close()


# ── The switch ────────────────────────────────────────────────────────────────


def test_config_follows_the_switch_and_the_login(client, headers, monkeypatch):
    boss = admin_headers(client)
    # No login: the plain server switch. An analyst: demo only. An admin: AI on, not limited.
    assert client.get("/api/v1/config").json() == {"ai_enabled": False, "demo_available": True, "preview_only": False}
    assert client.get("/api/v1/config", headers=headers).json() == {"ai_enabled": False, "demo_available": True, "preview_only": True}
    assert client.get("/api/v1/config", headers=boss).json() == {"ai_enabled": True, "demo_available": True, "preview_only": False}
    assert client.get("/api/v1/config", headers={"Authorization": "Bearer not-a-token"}).json()["preview_only"] is False
    monkeypatch.setenv("AI_ENABLED", "true")
    assert client.get("/api/v1/config", headers=headers).json() == {"ai_enabled": True, "demo_available": False, "preview_only": False}
    monkeypatch.setenv("DEMO_ENABLED", "true")  # offered with AI on, but nobody is limited to it
    assert client.get("/api/v1/config", headers=headers).json() == {"ai_enabled": True, "demo_available": True, "preview_only": False}
    monkeypatch.delenv("AI_ENABLED")
    monkeypatch.delenv("DEMO_ENABLED")
    assert client.get("/api/v1/config").json() == {"ai_enabled": True, "demo_available": False, "preview_only": False}


def test_an_analyst_is_limited_to_the_demo_and_an_admin_is_not(client, headers):
    response = client.post("/api/v1/assessments", headers=headers, json={"name": "mine", "vehicle_type": "sedan", "domains": ["backend"]})
    assert response.status_code == 403 and "demo only" in response.json()["detail"]
    boss = admin_headers(client)
    assert client.post("/api/v1/assessments", headers=boss, json={"name": "boss item", "vehicle_type": "sedan", "domains": ["backend"]}).status_code == 201
    assert [a["name"] for a in get(client, boss, "/assessments")] == ["boss item"]


def test_an_admin_can_run_the_model_while_the_switch_is_off(client, headers):
    boss = admin_headers(client)
    own = s.create_assessment(client, boss)
    ready(client, boss, own)
    assert client.post(f"/api/v1/assessments/{own}/run", headers=headers).status_code in (403, 404)  # not theirs
    assert client.post(f"/api/v1/assessments/{own}/run", headers=boss).status_code in (200, 202)
    end = time.time() + 180
    while time.time() < end:
        body = get(client, boss, f"/assessments/{own}/pipeline")
        if all(j["status"] == "complete" for j in body["stages"]) and len(body.get("folders", [])) == 7 and all(f["status"] == "complete" for f in body["folders"]):
            break
        time.sleep(0.5)
    else:
        raise AssertionError("the run did not finish")
    # The admin can also rebuild on a demo copy; the analyst cannot.
    copy = open_demo(client, boss)
    assert client.post(f"/api/v1/assessments/{copy}/ui-stages/06/rebuild", headers=boss).status_code == 202
    theirs = open_demo(client, headers)
    assert client.post(f"/api/v1/assessments/{theirs}/ui-stages/06/rebuild", headers=headers).status_code == 503


def test_every_model_run_is_refused_with_503_when_ai_is_off(client, headers, copy_id):
    calls = [
        f"/assessments/{copy_id}/run",
        f"/assessments/{copy_id}/stages/03/rebuild",
        f"/assessments/{copy_id}/ui-stages/04/rebuild",
        f"/assessments/{copy_id}/ui-stages/05/rebuild",
        f"/assessments/{copy_id}/ui-stages/06/rebuild",
        f"/assessments/{copy_id}/stages/4/run",
        f"/assessments/{copy_id}/stages/9/run",
    ]
    for path in calls:
        response = client.post(f"/api/v1{path}", headers=headers)
        assert response.status_code == 503, f"{path}: {response.status_code} {response.text}"
        assert response.json()["detail"] == AI_OFF
    # Nothing was started and nothing was cleared.
    assert {f["status"] for f in get(client, headers, f"/assessments/{copy_id}/pipeline")["folders"]} == {"complete"}
    assert get(client, headers, f"/assessments/{copy_id}/ui-stages/04")["rows"]


def test_the_same_calls_start_a_run_when_ai_is_on(client, headers, copy_id, monkeypatch):
    monkeypatch.setenv("AI_ENABLED", "true")
    assert client.post(f"/api/v1/assessments/{copy_id}/ui-stages/06/rebuild", headers=headers).status_code == 202
    end = time.time() + 120
    while time.time() < end and get(client, headers, f"/assessments/{copy_id}/ui-stages/06")["building"]:
        time.sleep(0.3)
    assert not get(client, headers, f"/assessments/{copy_id}/ui-stages/06")["building"]
    boss = admin_headers(client)
    own = s.create_assessment(client, boss)
    ready(client, boss, own)
    assert client.post(f"/api/v1/assessments/{own}/run", headers=boss).status_code in (200, 202)
    end = time.time() + 180
    while time.time() < end:
        body = get(client, boss, f"/assessments/{own}/pipeline")
        if all(j["status"] == "complete" for j in body["stages"]) and len(body.get("folders", [])) == 7 and all(f["status"] == "complete" for f in body["folders"]):
            break
        time.sleep(0.5)
    else:
        raise AssertionError("the run did not finish")


def test_the_demo_is_not_offered_when_ai_is_on(client, headers, monkeypatch):
    monkeypatch.setenv("AI_ENABLED", "true")
    assert client.post("/api/v1/demo/session", headers=headers, json={"session_key": KEY}).status_code == 404


# ── The copy ──────────────────────────────────────────────────────────────────


def test_one_copy_per_session_key(client, headers):
    first = open_demo(client, headers)
    assert open_demo(client, headers) == first
    assert client.post("/api/v1/demo/session", headers=headers, json={"session_key": "short"}).status_code == 422
    assert client.post("/api/v1/demo/session", headers=headers, json={}).status_code == 422
    assert client.post("/api/v1/demo/session", json={"session_key": KEY}).status_code in (401, 403)
    # A new login session of the same tester starts from a clean copy; the old one is gone.
    second = open_demo(client, headers, "session-key-0002")
    assert second != first
    assert rows_for(first) == {}


def test_a_copy_is_made_fast(client, headers):
    started = time.monotonic()
    open_demo(client, headers)
    assert time.monotonic() - started < 5


def test_the_copy_has_every_stage(client, headers, copy_id, tmp_path):
    assessment = get(client, headers, f"/assessments/{copy_id}")
    assert assessment["is_demo"] is True and assessment["name"] == demo.NAME

    documents = get(client, headers, f"/assessments/{copy_id}/documents")
    assert [d["file"] for d in documents] == ["architecture.drawio", "architecture.png", "client-answers.md", "functional.md"]
    assert get(client, headers, f"/assessments/{copy_id}/boundary-statement")["text"]

    pipeline = get(client, headers, f"/assessments/{copy_id}/pipeline")
    assert [(j["stage"], j["status"]) for j in pipeline["stages"]] == [("01", "complete"), ("02", "complete"), ("03", "complete")]
    assert [(f["stage_num"], f["status"]) for f in pipeline["folders"]] == [(n, "complete") for n in range(4, 11)]

    one = get(client, headers, f"/assessments/{copy_id}/stages/01/runs/current/output")
    assert len(one["document_register"]) == 4 and one["facts"]
    two = get(client, headers, f"/assessments/{copy_id}/stages/02/runs/current/output")
    assert two["item_definition"]["elements"] and two["questions"]
    three = get(client, headers, f"/assessments/{copy_id}/stages/03/runs/current/output")
    assert len(three["assets"]) == 22 and not three["stale"]
    assert [r["review"]["status"] for r in three["rationale"]].count("confirmed") == 1
    comments = get(client, headers, f"/assessments/{copy_id}/stages/03/comments")
    assert len(comments) == 3 and any(c["author"] == "assistant" and c["proposed_change"]["state"] == "open" for c in comments)

    for ui in ("04", "05", "06"):
        screen = get(client, headers, f"/assessments/{copy_id}/ui-stages/{ui}")
        assert screen["rows"] and not screen["stale"]["is"] and not screen["building"], ui
        assert all(r["asset_ref"] and "_" not in r["asset_ref"] for r in screen["rows"]), ui  # WL-01, never a bare AS_nn
        assert [a["status"] for a in screen["assumptions"]].count("confirmed") == 1 and len(screen["assumptions"]) >= 2, ui
        assert len(get(client, headers, f"/assessments/{copy_id}/ui-stages/{ui}/comments")) == 1, ui
    assert len(get(client, headers, f"/assessments/{copy_id}/ui-stages/04")["rows"]) == 66

    attempts = get(client, headers, f"/assessments/{copy_id}/runs")
    assert {a["stage_num"] for a in attempts} >= set(range(4, 11)) and {a["status"] for a in attempts} == {"complete"}
    for number in range(3, 11):
        assert Path(pipeline_runner.get_output_path(number, copy_id)).is_file()
    assert client.get(f"/api/v1/assessments/{copy_id}/sheets", headers=headers).status_code in (200, 404)


def test_no_model_wording_in_the_seed():
    for path in (demo.SEED / "folders").rglob("*.json"):
        text = path.read_text(encoding="utf-8").lower()
        for word in ("fallback", "network down", "llm request"):
            assert word not in text, f"{path.name}: {word}"


def test_edits_on_a_copy_recalculate_without_a_model(client, headers, copy_id):
    row = get(client, headers, f"/assessments/{copy_id}/ui-stages/04")["rows"][0]
    before = get(client, headers, f"/assessments/{copy_id}/ui-stages/06")["rows"]
    target = "Severe" if row["cells"]["other_stakeholders.financial"]["level"] != "Severe" else "Negligible"
    response = client.patch(
        f"/api/v1/assessments/{copy_id}/ui-stages/04/records/{row['record_id']}/fields/other_stakeholders.financial",
        headers=headers, json={"value": target, "reason": "The client said a stop costs a full day of production."},
    )
    assert response.status_code == 200, response.text
    after = get(client, headers, f"/assessments/{copy_id}/ui-stages/06")["rows"]
    assert json.dumps(before, sort_keys=True) != json.dumps(after, sort_keys=True)


def test_only_the_owner_sees_a_copy_and_lists_leave_it_out(client, headers, copy_id):
    boss = admin_headers(client)
    own = s.create_assessment(client, boss)
    assert [a["assessment_id"] for a in get(client, boss, "/assessments")] == [own]
    assert get(client, headers, "/assessments") == []
    assert client.get(f"/api/v1/assessments/{copy_id}", headers=headers).status_code == 200
    listed = get(client, boss, "/assessments")
    assert all(a["is_demo"] is False for a in listed)

    other = s.analyst_headers(client, "other@example.com")
    assert client.get(f"/api/v1/assessments/{copy_id}", headers=other).status_code in (403, 404)
    assert client.get(f"/api/v1/assessments/{copy_id}/ui-stages/04", headers=other).status_code in (403, 404)
    assert client.delete(f"/api/v1/demo/session/{copy_id}", headers=other).status_code == 404
    theirs = open_demo(client, other, "their-session-key")
    assert theirs != copy_id
    assert get(client, other, "/assessments") == []

    # An edit by one tester does not reach the other tester's copy.
    cell = lambda who, which: get(client, who, f"/assessments/{which}/stages/03/runs/current/output")["assets"][0]["properties"]["C"]  # noqa: E731
    was = cell(other, theirs)["applies"]
    asset = get(client, headers, f"/assessments/{copy_id}/stages/03/runs/current/output")["assets"][0]["asset_id"]
    assert client.patch(f"/api/v1/assessments/{copy_id}/stages/03/assets/{asset}/properties/C", headers=headers, json={"applies": not was, "reason": "Changed by the first tester only."}).status_code == 200
    assert cell(headers, copy_id)["applies"] is (not was) and cell(other, theirs)["applies"] is was


def test_logout_deletes_the_copy_and_leaves_nothing(client, headers, copy_id, tmp_path):
    # Leave every kind of note first, so the delete has something of each to remove.
    asset = get(client, headers, f"/assessments/{copy_id}/stages/03/runs/current/output")["assets"][0]["asset_id"]
    assert client.post(f"/api/v1/assessments/{copy_id}/stages/03/comments", headers=headers, json={"asset_id": asset, "text": "A note."}).status_code == 201
    assert client.post(f"/api/v1/assessments/{copy_id}/ui-stages/05/finish", headers=headers).status_code == 200
    assert client.patch(f"/api/v1/assessments/{copy_id}/stages/03/assets/{asset}", headers=headers, json={"status": "removed", "note": "Not part of this item."}).status_code == 200
    before = rows_for(copy_id)
    for table in ("stage_runs", "stage_jobs", "asset_comments", "stage_comments", "stage_assumption_reviews", "stage_edits", "stage_reviews", "rationale_reviews", "demo_copies", "assessments", "pipeline_runs", "pipeline_run_attempts"):
        assert before.get(table), f"{table} had no row before the delete: {sorted(before)}"
    db = SessionLocal()
    run_ids = [r.id for r in db.query(m.StageRun).filter_by(assessment_id=copy_id)]
    db.close()

    assert client.delete(f"/api/v1/demo/session/{copy_id}", headers=headers).status_code == 204
    assert rows_for(copy_id) == {}
    db = SessionLocal()
    try:
        for model in (m.Asset, m.Element, m.Fact, m.Document, m.RationaleItem):
            assert db.query(model).filter(model.run_id.in_(run_ids)).count() == 0, model.__tablename__
    finally:
        db.close()
    assert not (tmp_path / "artifacts" / copy_id).exists() and not (tmp_path / "uploads" / copy_id).exists()
    assert client.get(f"/api/v1/assessments/{copy_id}", headers=headers).status_code == 404
    assert client.delete(f"/api/v1/demo/session/{copy_id}", headers=headers).status_code == 404
    # Logging in again gives a clean copy.
    fresh = open_demo(client, headers, "session-key-0003")
    assert get(client, headers, f"/assessments/{fresh}/stages/03/runs/current/output")["assets"][0]["status"] != "removed"


def test_a_normal_assessment_cannot_be_deleted_as_a_demo(client, headers):
    boss = admin_headers(client)
    own = s.create_assessment(client, boss)
    assert client.delete(f"/api/v1/demo/session/{own}", headers=boss).status_code == 404
    assert client.get(f"/api/v1/assessments/{own}", headers=boss).status_code == 200


def test_copies_older_than_a_login_are_removed(client, headers, copy_id):
    other = s.analyst_headers(client, "other@example.com")
    db = SessionLocal()
    try:
        row = db.query(m.DemoCopy).filter_by(assessment_id=copy_id).one()
        row.created_at = demo.now() - demo.lifetime() - timedelta(minutes=1)
        db.commit()
        # Another tester opening the demo cleans up; so does a server start.
        open_demo(client, other, "their-session-key")
        assert rows_for(copy_id) == {}
        theirs = db.query(m.DemoCopy).one()
        theirs.created_at = demo.now() - demo.lifetime() - timedelta(minutes=1)
        db.commit()
        assert demo.cleanup_expired(db) == 1
        assert db.query(m.DemoCopy).count() == 0 and db.query(Assessment).count() == 0
    finally:
        db.close()


# ── Add, remove and restore an asset ──────────────────────────────────────────


def new_asset(**changes) -> dict:
    body = {
        "family": "DS", "name": "Operator session records", "type_label": "Data store",
        "description": "The sessions of operators who are signed in to the portal.", "source_id": "EL-018",
        "properties": {
            "C": {"applies": True, "reason": "A session record lets its reader act as the operator."},
            "I": {"applies": True, "reason": "A changed session record can give more rights."},
            "A": {"applies": False}, "Au": {"applies": False}, "Az": {"applies": False}, "NR": {"applies": False},
        },
    }
    body.update(changes)
    return body


def register(assessment_id: str) -> list:
    return json.loads(Path(pipeline_runner.get_output_path(3, assessment_id)).read_text())


def stale(client, headers, assessment_id) -> dict:
    return {ui: get(client, headers, f"/assessments/{assessment_id}/ui-stages/{ui}")["stale"] for ui in ("04", "05", "06")}


def test_add_asset(client, headers, copy_id):
    options = get(client, headers, f"/assessments/{copy_id}/stages/03/asset-options")
    assert {f["code"] for f in options["families"]} == {"EXT", "NET", "INF", "WL", "DS", "IAM", "API", "COMM"}
    assert all(f["type_labels"] for f in options["families"])
    assert {x["kind"] for x in options["sources"]} == {"element", "link", "function"}
    assert any(x["id"] == "EL-018" and x["label"].startswith("EL-018 ") for x in options["sources"])

    assert not any(v["is"] for v in stale(client, headers, copy_id).values())
    response = client.post(f"/api/v1/assessments/{copy_id}/stages/03/assets", headers=headers, json=new_asset())
    assert response.status_code == 201, response.text
    asset = response.json()
    assert asset["asset_id"] == "DS-07" and asset["status"] == "confirmed" and asset["source"]["ids"] == ["EL-018"]
    assert all(p["origin"] == "analyst" and p["reviewed"] for p in asset["properties"].values())
    assert [code for code, p in asset["properties"].items() if p["applies"]] == ["C", "I"]

    output = get(client, headers, f"/assessments/{copy_id}/stages/03/runs/current/output")
    assert len(output["assets"]) == 23 and output["assets"][-1]["asset_id"] == "DS-07"
    entry = register(copy_id)[-1]
    assert len(register(copy_id)) == 23 and entry["asset_ref"] == "DS-07" and entry["asset_id"] == "AS_23"
    assert entry["ciaaan"] == {"confidentiality": True, "integrity": True, "availability": False, "authenticity": False, "authorization": False, "non_repudiation": False}

    after = stale(client, headers, copy_id)
    assert all(v["is"] for v in after.values()), after
    # The screens still load, and Rebuild is refused while AI is off.
    assert client.post(f"/api/v1/assessments/{copy_id}/ui-stages/04/rebuild", headers=headers).status_code == 503
    # The next one in the family follows.
    again = client.post(f"/api/v1/assessments/{copy_id}/stages/03/assets", headers=headers, json=new_asset(name="Operator audit notes"))
    assert again.status_code == 201 and again.json()["asset_id"] == "DS-08"


@pytest.mark.parametrize("changes, code, text", [
    ({"family": "XX"}, 422, "family"),
    ({"name": "ab"}, 422, "name"),
    ({"description": "short"}, 422, "at least 10"),
    ({"type_label": ""}, 422, "asset type"),
    ({"source_id": "EL-999"}, 422, "comes from"),
    ({"source_id": ""}, 422, "comes from"),
    ({"properties": {}}, 422, "At least one property"),
    ({"properties": {"C": {"applies": True, "reason": ""}}}, 422, "reason"),
    ({"properties": {"C": {"applies": True, "reason": "too short"}}}, 422, "10 to 500"),
    ({"properties": {"C": {"applies": True, "reason": "The same data as DS-01 holds."}}}, 422, "ids"),
    ({"name": "Certificate records"}, 409, "already"),
])
def test_add_asset_is_checked(client, headers, copy_id, changes, code, text):
    response = client.post(f"/api/v1/assessments/{copy_id}/stages/03/assets", headers=headers, json=new_asset(**changes))
    assert response.status_code == code, response.text
    assert text in response.json()["detail"]
    assert len(get(client, headers, f"/assessments/{copy_id}/stages/03/runs/current/output")["assets"]) == 22
    assert len(register(copy_id)) == 22
    assert not any(v["is"] for v in stale(client, headers, copy_id).values())


def test_remove_and_restore_rewrite_the_register_and_mark_later_folders(client, headers, copy_id):
    path = f"/api/v1/assessments/{copy_id}/stages/03/assets/DS-02"
    assert client.patch(path, headers=headers, json={"status": "removed"}).status_code == 422
    assert not any(v["is"] for v in stale(client, headers, copy_id).values())
    assert client.patch(path, headers=headers, json={"status": "removed", "note": "The cache holds nothing of its own."}).status_code == 200
    assert "DS-02" not in [a["asset_ref"] for a in register(copy_id)] and len(register(copy_id)) == 21
    marked = stale(client, headers, copy_id)
    assert all(v["is"] for v in marked.values()) and "asset list" in json.dumps(marked)
    for ui in ("04", "05", "06"):  # the rows of the removed asset still show until a rebuild
        assert get(client, headers, f"/assessments/{copy_id}/ui-stages/{ui}")["rows"]
    assert client.patch(path, headers=headers, json={"status": "proposed"}).status_code == 200
    restored = [a["asset_ref"] for a in register(copy_id)]
    assert "DS-02" in restored and len(restored) == 22
    # The asset keeps the number it had, so the folders built before still point at it.
    assert next(a["asset_id"] for a in register(copy_id) if a["asset_ref"] == "DS-02") == "AS_06"


def test_a_property_change_marks_later_folders_but_a_confirm_does_not(client, headers, copy_id):
    base = f"/api/v1/assessments/{copy_id}/stages/03/assets/DS-01"
    assert client.patch(f"{base}/properties/C", headers=headers, json={"confirm": True}).status_code == 200
    assert client.patch(base, headers=headers, json={"status": "confirmed"}).status_code == 200
    assert not any(v["is"] for v in stale(client, headers, copy_id).values())
    assert client.patch(f"{base}/properties/Au", headers=headers, json={"applies": True, "reason": "Readers rely on where the records come from."}).status_code == 200
    assert all(v["is"] for v in stale(client, headers, copy_id).values())


def test_a_rebuild_with_ai_on_clears_the_mark(client, headers, copy_id, monkeypatch):
    assert client.post(f"/api/v1/assessments/{copy_id}/stages/03/assets", headers=headers, json=new_asset()).status_code == 201
    assert stale(client, headers, copy_id)["04"]["is"]
    monkeypatch.setenv("AI_ENABLED", "true")
    assert client.post(f"/api/v1/assessments/{copy_id}/ui-stages/04/rebuild", headers=headers).status_code == 202
    end = time.time() + 180
    while time.time() < end and get(client, headers, f"/assessments/{copy_id}/ui-stages/06")["building"]:
        time.sleep(0.5)
    after = stale(client, headers, copy_id)
    assert not any(v["is"] for v in after.values()), after
    assert any(r["asset_ref"] == "DS-07" for r in get(client, headers, f"/assessments/{copy_id}/ui-stages/04")["rows"])


def test_03_edits_on_an_assessment_with_no_later_folders_mark_nothing(client, headers):
    headers = admin_headers(client)
    own = s.create_assessment(client, headers)
    service = s.service_headers(client)
    for stage, payload in (("01", s.stage01_payload()), ("02", s.stage02_payload()), ("03", json.loads((demo.SEED / "stage03.json").read_text()))):
        assert s.post_run(client, service, own, stage, payload).status_code == 201
    assert client.post(f"/api/v1/assessments/{own}/stages/03/assets", headers=headers, json=new_asset()).status_code == 201
    db = SessionLocal()
    try:
        assert db.query(m.StageEdit).filter_by(assessment_id=own).count() == 0
    finally:
        db.close()

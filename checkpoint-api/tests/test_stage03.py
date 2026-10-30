"""Stage 03 Assets: the store, the review API, comments, finish, and the bridge to Stages 04 to 10 (spec 27)."""

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from jsonschema import Draft7Validator, FormatChecker
from sqlalchemy import text

import stage_support as s
from checkpoint_api import pipeline_runner, stage03, stage03_bridge
from checkpoint_api import stage_models as m
from checkpoint_api.database import SessionLocal, engine
from checkpoint_api.main import app
from checkpoint_api.models import PipelineRun

FAKES = Path(__file__).resolve().parent / "fake_agents"
EXPECTED = s.ITEM_01


@pytest.fixture(autouse=True)
def setup(tmp_path, monkeypatch):
    s.reset_database()
    monkeypatch.setattr(pipeline_runner, "WORKSPACE_ROOT", str(tmp_path))
    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path / "uploads"))
    monkeypatch.setenv("STAGE01_AGENT", str(FAKES / "stage01.js"))
    monkeypatch.setenv("STAGE02_AGENT", str(FAKES / "stage02.js"))
    monkeypatch.setenv("STAGE03_AGENT", str(FAKES / "stage03.js"))
    for number in range(4, 11):
        monkeypatch.setenv(f"STAGE{number:02d}_AGENT", str(FAKES / f"stage{number:02d}.js"))
    monkeypatch.delenv("FAKE_FAIL", raising=False)
    yield


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def headers(client):
    return s.analyst_headers(client)


@pytest.fixture
def assessment(client, headers):
    return s.create_assessment(client, headers)


def payload() -> dict:
    return {"assets": s.load(EXPECTED / "assets.json"), "rationale": s.load(EXPECTED / "assets-rationale.json")}


@pytest.fixture
def stored(client, assessment):
    service = s.service_headers(client)
    assert s.post_run(client, service, assessment, "01", s.stage01_payload()).status_code == 201
    assert s.post_run(client, service, assessment, "02", s.stage02_payload()).status_code == 201
    response = s.post_run(client, service, assessment, "03", payload())
    assert response.status_code == 201, response.text
    assert response.json()["refused"] == []
    return service


def url(assessment, tail=""):
    return f"/api/v1/assessments/{assessment}/stages/03{tail}"


def output(client, headers, assessment):
    return client.get(url(assessment, "/runs/current/output"), headers=headers).json()


def asset(out, asset_id):
    return next(a for a in out["assets"] if a["asset_id"] == asset_id)


def register(assessment):
    return json.loads(Path(pipeline_runner.get_output_path(3, assessment)).read_text(encoding="utf-8"))


# ── Storing ───────────────────────────────────────────────────────────────────


def test_item_01_assets_are_stored_with_nothing_refused_and_read_back_with_evidence(client, headers, assessment, stored):
    out = output(client, headers, assessment)
    assert out["run_number"] == 1 and out["built_from_02_run"] == 1 and out["stale"] is False
    assert len(out["assets"]) == 44
    assert [f["code"] for f in out["families"]] == ["EXT", "NET", "WL", "DS", "INF", "API", "IAM", "COMM"]
    wl = asset(out, "WL-03")
    assert wl["properties"]["Az"] == {"applies": True, "reason": wl["properties"]["Az"]["reason"], "origin": "model", "reviewed": False}
    assert wl["quotes"] and set(wl["quotes"][0]) == {"text", "where"}  # from Stage 01's facts, never invented
    assert wl["status"] == "proposed" and out["finished"] is None
    assert asset(out, "INF-02")["asset_type_row"] is False
    rationale = client.get(url(assessment, "/rationale"), headers=headers).json()
    assert rationale["counts"]["needs_attention"] == 4 and all(i["topic"] == "assets" for i in rationale["items"])


def test_stage_03_needs_a_stored_stage_02(client, assessment):
    service = s.service_headers(client)
    assert s.post_run(client, service, assessment, "01", s.stage01_payload()).status_code == 201
    response = s.post_run(client, service, assessment, "03", payload())
    assert response.status_code == 409 and "Stage 02 has no stored result yet" in response.json()["detail"]


def test_refusals_name_the_rule(client, assessment):
    service = s.service_headers(client)
    s.post_run(client, service, assessment, "01", s.stage01_payload())
    s.post_run(client, service, assessment, "02", s.stage02_payload())
    good = s.load(EXPECTED / "assets.json")
    unknown_source = json.loads(json.dumps(good[7])); unknown_source["asset_id"] = "WL-90"; unknown_source["source"]["ids"] = ["EL-999"]
    repeated = json.loads(json.dumps(good[0]))
    malformed = json.loads(json.dumps(good[1])); malformed["properties"]["C"]["reason"] = "short"
    with_id = json.loads(json.dumps(good[2])); with_id["properties"]["C"]["reason"] = "It holds what EL-015 sends to it."
    none_apply = json.loads(json.dumps(good[3]))
    for p in none_apply["properties"].values():
        p["applies"] = False
    response = s.post_run(client, service, assessment, "03", {"assets": [good[0], repeated, unknown_source, malformed, with_id, none_apply], "rationale": []})
    assert response.status_code == 201
    assert s.rules(response) == ["R-19", "R-18", "R-20", "R-20", "R-20"]
    assert response.json()["accepted"]["asset"] == 1


# ── The register for Stages 04 to 10 ──────────────────────────────────────────


def test_the_register_for_the_later_stages_is_written_and_stage_03_is_marked_complete(client, headers, assessment, stored):
    rows = register(assessment)
    assert len(rows) == 44
    schema = json.loads((s.REPO / "src" / "schemas" / "stage-03-asset-register.schema.json").read_text(encoding="utf-8"))
    assert list(Draft7Validator(schema, format_checker=FormatChecker()).iter_errors(rows)) == []
    first = rows[0]
    assert first["asset_id"] == "AS_01" and first["asset_ref"] == "EXT-01" and first["input_mode"] == "manual"
    types = {r["asset_ref"].split("-")[0]: r["asset_type"] for r in rows}
    assert types == {"EXT": "auth_credential", "NET": "cloud_service", "WL": "function", "DS": "data_store", "INF": "cloud_service", "API": "function", "IAM": "auth_credential", "COMM": "communication_path"}
    with SessionLocal() as db:
        run = db.query(PipelineRun).filter_by(assessment_id=assessment, stage_num=3).one()
        assert run.status == "complete"


def test_numbers_stay_the_same_when_stage_03_is_built_again(client, headers, assessment, stored):
    before = {r["asset_ref"]: r["asset_id"] for r in register(assessment)}
    assert s.post_run(client, stored, assessment, "03", payload()).status_code == 201
    assert {r["asset_ref"]: r["asset_id"] for r in register(assessment)} == before


def test_removed_assets_and_assets_with_no_property_are_left_out_of_the_register(client, headers, assessment, stored):
    r = client.patch(url(assessment, "/assets/WL-01"), headers=headers, json={"status": "removed", "note": "It is part of the next row."})
    assert r.status_code == 200
    refs = [row["asset_ref"] for row in register(assessment)]
    assert "WL-01" not in refs and len(refs) == 43
    assert output(client, headers, assessment)["assets"][0]["asset_id"] == "EXT-01"  # still listed on screen


def test_a_later_stage_reads_the_register_stage_03_wrote(client, headers, assessment, stored):
    from checkpoint_api.pipeline_runner import build_stage_args

    args = build_stage_args(assessment, 4)
    assert args[0] == "--assets" and args[1] == pipeline_runner.get_output_path(3, assessment)
    assert Path(args[1]).is_file()


def test_a_running_later_stage_makes_the_register_wait(client, headers, assessment, stored):
    with SessionLocal() as db:
        db.add(PipelineRun(assessment_id=assessment, stage_num=4, stage_name="04-damage-analysis", status="running"))
        db.commit()
    before = Path(pipeline_runner.get_output_path(3, assessment)).read_text(encoding="utf-8")
    client.patch(url(assessment, "/assets/WL-01"), headers=headers, json={"status": "removed", "note": "Covered by another row."})
    assert Path(pipeline_runner.get_output_path(3, assessment)).read_text(encoding="utf-8") == before
    with SessionLocal() as db:
        assert db.query(m.AssetRegisterState).filter_by(assessment_id=assessment).one().pending is True
        db.query(PipelineRun).filter_by(assessment_id=assessment, stage_num=4).update({"status": "complete"})
        db.commit()
        stage03_bridge.flush_pending(db, assessment)
    assert len(register(assessment)) == 43


# ── Review ────────────────────────────────────────────────────────────────────


def test_only_the_analyst_reviews(client, headers, assessment, stored):
    for call, body in ((client.patch(url(assessment, "/assets/WL-01"), headers=stored, json={"status": "confirmed"}), None),
                       (client.patch(url(assessment, "/assets/WL-03/properties/Az"), headers=stored, json={"confirm": True}), None),
                       (client.post(url(assessment, "/comments"), headers=stored, json={"asset_id": "WL-01", "text": "Hello"}), None),
                       (client.post(url(assessment, "/finish"), headers=stored), None)):
        assert call.status_code == 403


def test_confirming_and_changing_a_property(client, headers, assessment, stored):
    cell = url(assessment, "/assets/WL-03/properties/Az")
    assert client.patch(cell, headers=headers, json={"confirm": True}).status_code == 200
    out = output(client, headers, assessment)
    az = asset(out, "WL-03")["properties"]["Az"]
    assert az["reviewed"] is True and az["origin"] == "model" and az["applies"] is True  # confirming keeps the value
    # a change needs a reason of 10 to 500 characters and no ids
    assert client.patch(cell, headers=headers, json={"applies": False, "reason": "short"}).status_code == 422
    assert client.patch(cell, headers=headers, json={"applies": False, "reason": "See EL-015 for the reason."}).status_code == 422
    assert client.patch(cell, headers=headers, json={"applies": False, "reason": "x" * 501}).status_code == 422
    assert client.patch(cell, headers=headers, json={"applies": False, "reason": "The service decides nothing here."}).status_code == 200
    az = asset(output(client, headers, assessment), "WL-03")["properties"]["Az"]
    assert az == {"applies": False, "reason": "The service decides nothing here.", "origin": "analyst", "reviewed": True}
    assert client.patch(url(assessment, "/assets/WL-03/properties/ZZ"), headers=headers, json={"confirm": True}).status_code == 404
    assert client.patch(url(assessment, "/assets/NOPE-01/properties/C"), headers=headers, json={"confirm": True}).status_code == 404


def test_the_last_property_cannot_be_unticked(client, headers, assessment, stored):
    # EXT-01 starts with Authenticity and Non-repudiation
    base = url(assessment, "/assets/EXT-01/properties")
    assert client.patch(f"{base}/Au", headers=headers, json={"applies": False, "reason": "Changed on the grid"}).status_code == 200
    last = client.patch(f"{base}/NR", headers=headers, json={"applies": False, "reason": "Changed on the grid"})
    assert last.status_code == 422 and "At least one property" in last.json()["detail"]


def test_removing_needs_a_note(client, headers, assessment, stored):
    asset_url = url(assessment, "/assets/WL-02")
    assert client.patch(asset_url, headers=headers, json={"status": "removed"}).status_code == 422
    assert client.patch(asset_url, headers=headers, json={"status": "removed", "note": "No."}).status_code == 200
    assert asset(output(client, headers, assessment), "WL-02")["status"] == "removed"
    assert client.patch(asset_url, headers=headers, json={"status": "proposed"}).status_code == 200
    assert asset(output(client, headers, assessment), "WL-02")["status"] == "proposed"


def test_the_analysts_edits_survive_a_new_run(client, headers, assessment, stored):
    client.patch(url(assessment, "/assets/WL-03/properties/I"), headers=headers, json={"applies": False, "reason": "Nothing in it changes on its own."})
    client.patch(url(assessment, "/assets/WL-03/properties/Az"), headers=headers, json={"confirm": True})
    client.patch(url(assessment, "/assets/WL-04"), headers=headers, json={"status": "confirmed"})
    client.patch(url(assessment, "/assets/DS-01"), headers=headers, json={"status": "removed", "note": "It is only static pages."})
    assert s.post_run(client, stored, assessment, "03", payload()).status_code == 201
    out = output(client, headers, assessment)
    assert out["run_number"] == 2
    assert asset(out, "WL-03")["properties"]["I"] == {"applies": False, "reason": "Nothing in it changes on its own.", "origin": "analyst", "reviewed": True}
    assert asset(out, "WL-03")["properties"]["Az"]["reviewed"] is True
    assert asset(out, "WL-04")["status"] == "confirmed"
    assert asset(out, "DS-01")["status"] == "removed"
    assert asset(output(client, headers, assessment), "WL-01")["status"] == "proposed"


def test_a_new_stage_02_run_marks_stage_03_as_built_on_an_older_item_definition(client, headers, assessment, stored):
    assert s.post_run(client, stored, assessment, "02", s.stage02_payload()).status_code == 201
    out = output(client, headers, assessment)
    assert out["stale"] is True and out["built_from_02_run"] == 1


def test_an_uploaded_list_is_shown_as_the_source_until_an_edit_or_a_rebuild(client, headers, assessment, stored):
    assert output(client, headers, assessment)["register_source"] == "stage03"
    csv = ("asset_title,asset_type,asset_description,confidentiality,integrity,availability,authenticity,authorization,non_repudiation\n"
           "My own asset,api_endpoint,Accepts requests,true,true,true,false,true,false\n").encode()
    upload = client.post(f"/api/v1/assessments/{assessment}/stages/3/asset-register", headers=headers, files={"asset_file": ("mine.csv", csv)})
    assert upload.status_code == 200, upload.text
    assert [r["asset_title"] for r in register(assessment)] == ["My own asset"]
    assert output(client, headers, assessment)["register_source"] == "upload:mine.csv"
    status = client.get(f"/api/v1/assessments/{assessment}/stages/3/asset-register", headers=headers).json()
    assert status["uploaded"] is True and status["filename"] == "mine.csv"
    # an edit rewrites the register from Stage 03 again
    client.patch(url(assessment, "/assets/WL-03/properties/Az"), headers=headers, json={"confirm": True})
    assert output(client, headers, assessment)["register_source"] == "stage03"
    assert len(register(assessment)) == 44
    assert client.get(f"/api/v1/assessments/{assessment}/stages/3/asset-register", headers=headers).json()["uploaded"] is False


def test_rebuild_runs_stage_03_on_the_current_stage_02(client, headers, assessment, stored):
    assert client.post(url(assessment, "/rebuild"), headers=headers).status_code == 202
    assert output(client, headers, assessment)["run_number"] == 2
    with SessionLocal() as db:
        assert db.query(m.StageJob).filter_by(assessment_id=assessment, stage="03").one().status == "complete"


def test_rebuild_needs_a_stage_02(client, headers, assessment):
    assert client.post(url(assessment, "/rebuild"), headers=headers).status_code == 409


# ── Comments ──────────────────────────────────────────────────────────────────


def test_comments_are_stored_resolved_and_reopened(client, headers, assessment, stored):
    first = client.post(url(assessment, "/comments"), headers=headers, json={"asset_id": "DS-03", "property": "C", "text": "Ask the client what the cache holds."})
    assert first.status_code == 201 and first.json()["author"] == "analyst" and first.json()["resolved"] is False
    assert client.post(url(assessment, "/comments"), headers=headers, json={"asset_id": "DS-03", "property": "ZZ", "text": "Hello"}).status_code == 404
    assert client.post(url(assessment, "/comments"), headers=headers, json={"asset_id": "NOPE-01", "text": "Hello"}).status_code == 404
    assert client.post(url(assessment, "/comments"), headers=headers, json={"asset_id": "DS-03", "text": "x"}).status_code == 422
    cid = first.json()["id"]
    assert client.patch(url(assessment, f"/comments/{cid}"), headers=headers, json={"resolved": True}).json()["resolved"] is True
    # another message on the thread reopens it
    client.post(url(assessment, "/comments"), headers=headers, json={"asset_id": "DS-03", "property": "C", "text": "Still not answered."})
    assert [c["resolved"] for c in client.get(url(assessment, "/comments"), headers=headers).json()] == [False, False]
    # the thread of the asset itself is separate from the thread of one of its properties
    client.post(url(assessment, "/comments"), headers=headers, json={"asset_id": "DS-03", "text": "About the asset."})
    assert [c["property"] for c in client.get(url(assessment, "/comments"), headers=headers).json()] == ["C", "C", None]


def test_a_proposed_change_is_applied_or_kept_by_the_analyst(client, headers, assessment, stored):
    with SessionLocal() as db:
        db.add(m.AssetComment(assessment_id=assessment, run_number=1, asset_id="WL-03", property="Az", author="assistant",
                              text="Agreed. The service decides nothing on its own, so this should be off.",
                              proposed_change={"property": "Az", "applies": False, "state": "open"}))
        db.add(m.AssetComment(assessment_id=assessment, run_number=1, asset_id="DS-03", property="C", author="assistant",
                              text="It keeps nothing itself.", proposed_change={"property": "C", "applies": False, "state": "open"}))
        db.commit()
    comments = client.get(url(assessment, "/comments"), headers=headers).json()
    apply_id, keep_id = comments[0]["id"], comments[1]["id"]
    done = client.patch(url(assessment, f"/comments/{apply_id}"), headers=headers, json={"proposed_change": {"state": "applied"}}).json()
    assert done["proposed_change"]["state"] == "applied" and done["resolved"] is True
    az = asset(output(client, headers, assessment), "WL-03")["properties"]["Az"]
    assert az["applies"] is False and az["origin"] == "analyst"
    assert client.patch(url(assessment, f"/comments/{keep_id}"), headers=headers, json={"proposed_change": {"state": "kept"}}).json()["proposed_change"]["state"] == "kept"
    assert asset(output(client, headers, assessment), "DS-03")["properties"]["C"]["applies"] is True
    assert client.patch(url(assessment, f"/comments/{keep_id}"), headers=headers, json={"proposed_change": {"state": "applied"}}).status_code == 409
    # a comment of the analyst's own has no proposal to answer
    mine = client.post(url(assessment, "/comments"), headers=headers, json={"asset_id": "WL-01", "text": "A note."}).json()
    assert client.patch(url(assessment, f"/comments/{mine['id']}"), headers=headers, json={"proposed_change": {"state": "applied"}}).status_code == 422


# ── Finish ────────────────────────────────────────────────────────────────────


def test_finishing_waits_for_every_assumption_and_then_only_records_who_and_when(client, headers, assessment, stored):
    refused = client.post(url(assessment, "/finish"), headers=headers)
    assert refused.status_code == 409 and "4 assumptions still need you" in refused.json()["detail"]
    items = client.get(url(assessment, "/rationale"), headers=headers).json()["items"]
    for item in items:
        if item["attention"] == "needs_attention":
            assert client.patch(url(assessment, f"/rationale/{item['rationale_id']}"), headers=headers, json={"status": "confirmed"}).status_code == 200
    done = client.post(url(assessment, "/finish"), headers=headers)
    assert done.status_code == 200 and done.json()["finished"]["by"]
    assert output(client, headers, assessment)["finished"]["by"] == done.json()["finished"]["by"]
    # it gates nothing: the register is already there for Stage 04
    assert Path(pipeline_runner.get_output_path(3, assessment)).is_file()


# ── Deleting an assessment ────────────────────────────────────────────────────


def test_deleting_an_assessment_removes_its_assets_comments_and_review(client, headers, assessment, stored):
    client.post(url(assessment, "/comments"), headers=headers, json={"asset_id": "WL-01", "text": "A note."})
    for item in client.get(url(assessment, "/rationale"), headers=headers).json()["items"]:
        client.patch(url(assessment, f"/rationale/{item['rationale_id']}"), headers=headers, json={"status": "confirmed"})
    client.post(url(assessment, "/finish"), headers=headers)
    assert client.delete(f"/api/v1/assessments/{assessment}", headers=headers).status_code == 204
    with engine.connect() as connection:
        for table in ("assets", "asset_properties", "asset_comments", "stage_reviews", "asset_register_ids", "asset_register_state", "stage_runs"):
            assert connection.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar() == 0, table

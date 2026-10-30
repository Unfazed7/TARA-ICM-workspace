"""Screens 04 Impacts, 05 Threats and 06 TARA: rows from the folders, edits that recalculate, comments, assumptions, finish
and rebuild (specs 29 to 31). The folders come from one real Execute with fake agents."""

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import stage_support as s
from checkpoint_api import engine_bridge, pipeline_runner
from checkpoint_api import stage_models as m
from checkpoint_api.database import SessionLocal
from checkpoint_api.main import app
from test_execute_chain import FAKES, finish, ready  # noqa: F401


@pytest.fixture(autouse=True)
def setup(tmp_path, monkeypatch):
    s.reset_database()
    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path / "uploads"))
    monkeypatch.setattr(pipeline_runner, "WORKSPACE_ROOT", str(tmp_path))
    monkeypatch.setattr(pipeline_runner, "UPLOAD_DIR", str(tmp_path / "uploads"))
    for number in range(1, 11):
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
def built(client, headers):
    """An assessment with every folder built."""
    assessment = s.create_assessment(client, headers)
    ready(client, headers, assessment)
    assert client.post(f"/api/v1/assessments/{assessment}/run", headers=headers).status_code in (200, 202)
    body = finish(client, headers, assessment)
    assert {f["status"] for f in body["folders"]} == {"complete"}
    return assessment


def screen(client, headers, assessment, ui):
    response = client.get(f"/api/v1/assessments/{assessment}/ui-stages/{ui}", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def patch(client, headers, assessment, ui, record, field, body):
    return client.patch(f"/api/v1/assessments/{assessment}/ui-stages/{ui}/records/{record}/fields/{field}", headers=headers, json=body)


def folder(assessment, number):
    return json.loads(Path(pipeline_runner.get_output_path(number, assessment)).read_text())


# ── Reading ───────────────────────────────────────────────────────────────────


def test_impacts_one_row_per_damage_scenario(client, headers, built):
    body = screen(client, headers, built, "04")
    scenarios = folder(built, 4)
    assert [r["record_id"] for r in body["rows"]] and len(body["rows"]) == len(scenarios)
    row = next(r for r in body["rows"] if r["record_id"] == "DS_01")
    assert row["asset_ref"] and row["rated"] and row["overall"]["label"] in ("Negligible", "Moderate", "Major", "Severe")
    assert set(row["cells"]) == {"tool_user.safety", "tool_user.financial", "tool_user.operational", "tool_user.privacy", "other_stakeholders.legal", "other_stakeholders.financial", "other_stakeholders.business"}
    assert row["cells"]["tool_user.safety"]["locked"] and row["cells"]["tool_user.safety"]["level"] == "Negligible"
    assert row["cells"]["tool_user.safety"]["rule"]
    assert body["built_from"] == {"label": "asset analysis", "run": 1}
    assert not body["building"] and not body["stale"]["is"] and body["finished"] is None
    assert [x["level"] for x in body["scales"]["risk_levels"]] == ["informational", "low", "medium", "high", "critical"]


def test_overall_rating_is_the_engines(client, headers, built):
    body = screen(client, headers, built, "04")
    impacts = {i["damage_scenario_id"]: i for i in folder(built, 7)}
    risks = {r["impact_id"]: r for r in folder(built, 8)}
    for row in body["rows"]:
        impact = impacts[row["record_id"]]
        assert row["overall"]["value"] == risks[impact["impact_id"]]["impact_rating_value"]


def test_threats_join_the_attack_path(client, headers, built):
    body = screen(client, headers, built, "05")
    row = body["rows"][0]
    attack = next(a for a in folder(built, 6) if a["threat_id"] == row["record_id"])
    assert row["attack_id"] == attack["attack_id"]
    assert [row["factors"][f]["code"] for f in ("attack_vector", "attack_complexity", "privileges_required", "user_interaction")] == [attack["cvss_metrics"][f] for f in ("attack_vector", "attack_complexity", "privileges_required", "user_interaction")]
    assert row["factors"]["attack_vector"]["label"] in ("Network", "Adjacent", "Local", "Physical")
    assert row["factors"]["attack_vector"]["why"] == attack["justifications"]["attack_vector"]
    assert row["cvss"] == engine_bridge.cvss_number(attack["cvss_metrics"])
    assert row["feasibility"] == {"value": attack["afr_value"], "label": attack["afr_label"]}
    assert len(row["attack_path"]["steps"]) == 5
    assert row["stride"]["value"] in ("spoofing", "tampering", "repudiation", "information_disclosure", "denial_of_service", "elevation_of_privilege")


def test_tara_one_row_per_risk_record(client, headers, built):
    body = screen(client, headers, built, "06")
    risks = folder(built, 8)
    assert len(body["rows"]) == len(risks)
    row = next(r for r in body["rows"] if r["risk_id"] == "RSK_01")
    risk = next(r for r in risks if r["risk_id"] == "RSK_01")
    assert row["risk"] == {"score": risk["risk_score"], "level": risk["risk_level"], "rank": 1}
    assert row["treatment"]["option"] in ("reduce", "accept", "share", "avoid")
    assert row["residual"]["pre"]["risk_score"] == risk["risk_score"]
    assert body["built_from"]["run"] == 1


def test_unknown_screen_and_other_users_assessment(client, headers, built):
    assert client.get(f"/api/v1/assessments/{built}/ui-stages/07", headers=headers).status_code == 404
    other = s.analyst_headers(client, "other@example.com")
    assert client.get(f"/api/v1/assessments/{built}/ui-stages/04", headers=other).status_code == 404


# ── Editing ───────────────────────────────────────────────────────────────────


def test_changing_a_rating_writes_every_pair_and_recalculates(client, headers, built):
    before = screen(client, headers, built, "04")
    row = before["rows"][0]
    field = "other_stakeholders.business"
    target = "Severe" if row["cells"][field]["level"] != "Severe" else "Moderate"
    response = patch(client, headers, built, "04", row["record_id"], field, {"value": target, "reason": "The client confirmed that customers would notice."})
    assert response.status_code == 200, response.text
    assert response.json()["stale_folders"] == [9, 10]
    impacts = [i for i in folder(built, 7) if i["damage_scenario_id"] == row["record_id"]]
    assert impacts and all(i["other_stakeholders"]["business"] == target for i in impacts)
    after = screen(client, headers, built, "04")
    changed = next(r for r in after["rows"] if r["record_id"] == row["record_id"])
    assert changed["cells"][field]["level"] == target
    assert changed["cells"][field]["edit"]["reason"] == "The client confirmed that customers would notice."
    if target == "Severe":
        assert changed["overall"]["label"] == "Severe"
    risk = next(r for r in folder(built, 8) if r["impact_id"] == impacts[0]["impact_id"])
    assert risk["impact_rating_label"] == changed["overall"]["label"]
    assert risk["risk_score"] == risk["impact_rating_value"] * risk["afr_value"]
    log = SessionLocal().query(m.StageEdit).filter_by(assessment_id=built).all()
    assert len(log) == 1 and log[0].old == row["cells"][field]["level"] and log[0].new == target and log[0].folder == 7
    # 09 and 10 still point at the same threats after folder 08 re-ranked
    risk_of = {r["threat_id"]: r["risk_id"] for r in folder(built, 8)}
    assert all(t["risk_id"] == risk_of[t["threat_id"]] for t in folder(built, 9))
    assert all(t["risk_id"] == risk_of[t["threat_id"]] for t in folder(built, 10))
    # 09 and 10 are out of date; 04 (folders 04 and 07) is not
    assert screen(client, headers, built, "06")["stale"]["is"] is True
    assert screen(client, headers, built, "04")["stale"]["is"] is False


def test_refused_edits_change_nothing(client, headers, built):
    row = screen(client, headers, built, "04")["rows"][0]
    before = folder(built, 7)
    for field, body, code in (
        ("tool_user.safety", {"value": "Severe", "reason": "A reason that is long enough."}, 422),
        ("tool_user.privacy", {"value": "Severe", "reason": "short"}, 422),
        ("tool_user.privacy", {"value": "Severe", "reason": "The note on DS_01 says so, really."}, 422),
        ("tool_user.privacy", {"value": "Huge", "reason": "A reason that is long enough."}, 422),
        ("tool_user.nothing", {"value": "Severe", "reason": "A reason that is long enough."}, 404),
    ):
        assert patch(client, headers, built, "04", row["record_id"], field, body).status_code == code
    assert patch(client, headers, built, "04", "DS_9999", "tool_user.privacy", {"value": "Severe", "reason": "A reason that is long enough."}).status_code == 409
    assert folder(built, 7) == before
    assert SessionLocal().query(m.StageEdit).count() == 0


def test_a_failing_recalculation_restores_the_files(client, headers, built, monkeypatch):
    row = screen(client, headers, built, "04")["rows"][0]
    before7, before8 = folder(built, 7), folder(built, 8)
    monkeypatch.setenv("FAKE_FAIL", "stage08")
    response = patch(client, headers, built, "04", row["record_id"], "tool_user.privacy", {"value": "Severe" if before7[0]["tool_user"]["privacy"] != "Severe" else "Moderate", "reason": "A reason that is long enough."})
    assert response.status_code == 500 and "nothing was saved" in response.json()["detail"]
    assert folder(built, 7) == before7 and folder(built, 8) == before8
    assert SessionLocal().query(m.StageEdit).count() == 0


def test_changing_a_cvss_factor_recalculates_feasibility_with_the_engine(client, headers, built):
    row = next(r for r in screen(client, headers, built, "05")["rows"] if r["factors"]["attack_vector"]["code"] == "N")
    response = patch(client, headers, built, "05", row["record_id"], "attack_vector", {"value": "P", "reason": "The endpoint is only reachable in the data centre."})
    assert response.status_code == 200, response.text
    attack = next(a for a in folder(built, 6) if a["threat_id"] == row["record_id"])
    expected = engine_bridge.afr([attack["cvss_metrics"]])[0]
    assert attack["cvss_metrics"]["attack_vector"] == "P"
    assert (attack["afr_value"], attack["afr_label"]) == (expected["afr_value"], expected["afr_label"])
    after = next(r for r in screen(client, headers, built, "05")["rows"] if r["record_id"] == row["record_id"])
    assert after["cvss"] < row["cvss"] and after["feasibility"]["value"] <= row["feasibility"]["value"]
    risk = next(r for r in folder(built, 8) if r["attack_id"] == attack["attack_id"])
    assert risk["afr_value"] == attack["afr_value"] and risk["risk_score"] == risk["impact_rating_value"] * risk["afr_value"]
    assert patch(client, headers, built, "05", row["record_id"], "attack_vector", {"value": "Q", "reason": "A reason that is long enough."}).status_code == 422


def test_changing_stride_marks_the_model_folders_out_of_date(client, headers, built):
    row = screen(client, headers, built, "05")["rows"][0]
    value = "tampering" if row["stride"]["value"] != "tampering" else "spoofing"
    response = patch(client, headers, built, "05", row["record_id"], "stride_category", {"value": value, "reason": "The threat changes data rather than who is acting."})
    assert response.status_code == 200 and response.json()["stale_folders"] == [6, 7, 9, 10]
    assert folder(built, 5)[0]["stride_category"] == value if folder(built, 5)[0]["threat_id"] == row["record_id"] else True
    assert screen(client, headers, built, "05")["stale"]["is"] is True
    assert screen(client, headers, built, "06")["stale"]["is"] is True
    assert screen(client, headers, built, "04")["stale"]["folders"] == [7]
    # nothing was recalculated: the scores are untouched
    assert folder(built, 8)  # still there


def test_treatment_rules(client, headers, built):
    rows = screen(client, headers, built, "06")["rows"]
    high, other = rows[0], rows[1]
    reason = "Agreed with the security lead on the call."
    # a risk above low cannot be accepted
    assert patch(client, headers, built, "06", high["record_id"], "treatment_option", {"value": "accept", "reason": reason}).status_code == 422
    # avoid needs its action
    assert patch(client, headers, built, "06", high["record_id"], "treatment_option", {"value": "avoid", "reason": reason}).status_code == 422
    ok = patch(client, headers, built, "06", high["record_id"], "treatment_option", {"value": "avoid", "reason": reason, "avoidance_action": "Remove the endpoint from the first release."})
    assert ok.status_code == 200 and ok.json()["stale_folders"] == [10]
    record = next(t for t in folder(built, 9) if t["threat_id"] == high["record_id"])
    assert record["treatment_option"] == "avoid" and record["avoidance_action"].startswith("Remove") and record["cybersecurity_goal"] is None and record["controls_assigned"] == []
    # rate every category of another risk Negligible: its score becomes 0, so it can be accepted
    for field in ("tool_user.operational", "tool_user.privacy", "other_stakeholders.legal", "other_stakeholders.financial", "other_stakeholders.business"):
        assert patch(client, headers, built, "04", other["damage_id"], field, {"value": "Negligible", "reason": "Nothing here touches this category."}).status_code == 200
    low = next(r for r in screen(client, headers, built, "06")["rows"] if r["record_id"] == other["record_id"])
    assert low["risk"]["level"] == "informational"
    ok = patch(client, headers, built, "06", low["record_id"], "treatment_option", {"value": "accept", "reason": "The risk is already low enough."})
    assert ok.status_code == 200, ok.text
    record = next(t for t in folder(built, 9) if t["threat_id"] == low["record_id"])
    risk = next(r for r in folder(built, 8) if r["threat_id"] == low["record_id"])
    claim = record["cybersecurity_claim"]["claim_statement"]
    assert str(risk["afr_value"]) in claim and str(risk["risk_score"]) in claim
    assert record["cybersecurity_goal"] is None and record["controls_assigned"] == []
    after = next(r for r in screen(client, headers, built, "06")["rows"] if r["record_id"] == low["record_id"])
    assert after["treatment"]["edit"]["reason"] == "The risk is already low enough."
    # back to Reduce: it needs a goal, and takes the controls the treatment step would pick
    assert patch(client, headers, built, "06", low["record_id"], "treatment_option", {"value": "reduce", "reason": reason}).status_code == 422
    ok = patch(client, headers, built, "06", low["record_id"], "treatment_option", {"value": "reduce", "reason": reason, "goal_statement": "Requests to this service are checked before they are used."})
    assert ok.status_code == 200, ok.text
    record = next(t for t in folder(built, 9) if t["threat_id"] == low["record_id"])
    assert record["cybersecurity_goal"]["goal_statement"].startswith("Requests") and 1 <= len(record["controls_assigned"]) <= 3 and record["cybersecurity_claim"] is None
    goals = [t["cybersecurity_goal"]["goal_id"] for t in folder(built, 9) if t["cybersecurity_goal"]]
    assert len(goals) == len(set(goals))
    # Share needs a reason only; its control comes from the controls catalogue
    ok = patch(client, headers, built, "06", low["record_id"], "treatment_option", {"value": "share", "reason": "The cloud provider carries this part of the risk."})
    assert ok.status_code == 200, ok.text
    record = next(t for t in folder(built, 9) if t["threat_id"] == low["record_id"])
    assert record["treatment_option"] == "share" and record["cybersecurity_goal"] and 1 <= len(record["controls_assigned"]) <= 3


def test_confirming_is_kept_as_a_review(client, headers, built):
    row = screen(client, headers, built, "04")["rows"][0]
    assert patch(client, headers, built, "04", row["record_id"], "tool_user.safety", {"confirm": True}).status_code == 200
    after = screen(client, headers, built, "04")["rows"][0]
    assert after["cells"]["tool_user.safety"]["edit"]["kind"] == "confirmed"
    assert screen(client, headers, built, "06")["stale"]["is"] is False


def test_only_the_analyst_reviews(client, headers, built):
    service = s.service_headers(client)
    row = screen(client, headers, built, "04")["rows"][0]
    assert patch(client, service, built, "04", row["record_id"], "tool_user.privacy", {"value": "Severe", "reason": "A reason that is long enough."}).status_code == 403
    assert client.post(f"/api/v1/assessments/{built}/ui-stages/04/finish", headers=service).status_code == 403
    assert client.post(f"/api/v1/assessments/{built}/ui-stages/04/comments", headers=service, json={"record_id": row["record_id"], "text": "hello"}).status_code == 403


def test_no_edits_while_a_build_runs(client, headers, built):
    db = SessionLocal()
    run = db.query(__import__("checkpoint_api.models", fromlist=["PipelineRun"]).PipelineRun).filter_by(assessment_id=built, stage_num=9).first()
    run.status = "running"
    db.commit()
    row = screen(client, headers, built, "04")["rows"][0]
    assert screen(client, headers, built, "04")["building"] is True
    response = patch(client, headers, built, "04", row["record_id"], "tool_user.privacy", {"value": "Severe", "reason": "A reason that is long enough."})
    assert response.status_code == 409 and "build is running" in response.json()["detail"]


# ── Comments, assumptions, finish ─────────────────────────────────────────────


def test_comments_threads_and_proposals(client, headers, built):
    row = screen(client, headers, built, "05")["rows"][0]
    url = f"/api/v1/assessments/{built}/ui-stages/05/comments"
    first = client.post(url, headers=headers, json={"record_id": row["record_id"], "field": "attack_vector", "text": "Check this with the network team."})
    assert first.status_code == 201 and first.json()["author"] == "analyst"
    assert client.post(url, headers=headers, json={"record_id": row["record_id"], "field": "nonsense", "text": "hello there"}).status_code == 404
    assert client.post(url, headers=headers, json={"record_id": "TH_9999", "text": "hello there"}).status_code == 404
    assert client.post(url, headers=headers, json={"record_id": row["record_id"], "text": "x"}).status_code == 422
    assert "attack_vector" in screen(client, headers, built, "05")["rows"][0]["notes"]["comment_fields"]
    resolved = client.patch(f"{url}/{first.json()['id']}", headers=headers, json={"resolved": True})
    assert resolved.json()["resolved"] is True
    assert screen(client, headers, built, "05")["rows"][0]["notes"]["comment_fields"] == []
    client.post(url, headers=headers, json={"record_id": row["record_id"], "field": "attack_vector", "text": "One more thing."})
    assert all(not c["resolved"] for c in client.get(url, headers=headers).json())  # a new message reopens the thread
    # an assistant proposal is applied through the same edit
    db = SessionLocal()
    value = "L" if row["factors"]["attack_vector"]["code"] != "L" else "A"
    db.add(m.StageComment(assessment_id=built, ui_stage="05", record_id=row["record_id"], field="attack_vector", author="assistant",
                          text="The service is only reachable from the host itself, so Local fits.", proposed_change={"field": "attack_vector", "value": value, "state": "open"}))
    db.commit()
    proposal = next(c for c in client.get(url, headers=headers).json() if c["author"] == "assistant")
    applied = client.patch(f"{url}/{proposal['id']}", headers=headers, json={"proposed_change": {"state": "applied"}})
    assert applied.status_code == 200 and applied.json()["proposed_change"]["state"] == "applied"
    attack = next(a for a in folder(built, 6) if a["threat_id"] == row["record_id"])
    assert attack["cvss_metrics"]["attack_vector"] == value
    again = client.patch(f"{url}/{proposal['id']}", headers=headers, json={"proposed_change": {"state": "kept"}})
    assert again.status_code == 409
    assert client.patch(f"{url}/{first.json()['id']}", headers=headers, json={"proposed_change": {"state": "applied"}}).status_code == 422


def test_assumptions_are_numbered_and_reviewed(client, headers, built):
    folder6 = Path(pipeline_runner.get_output_path(6, built)).with_name("assumptions.json")
    folder5 = Path(pipeline_runner.get_output_path(5, built)).with_name("assumptions.json")
    first = folder(built, 5)[0]["threat_id"]
    folder5.write_text(json.dumps([{"about_id": first, "field": "stride_category", "text": "The service is reachable from the internet.", "needs_attention": True}]))
    attack = folder(built, 6)[0]
    folder6.write_text(json.dumps([{"about_id": attack["attack_id"], "field": "attack_vector", "text": "No VPN sits in front of it.", "needs_attention": True}]))
    body = screen(client, headers, built, "05")
    assert [a["id"] for a in body["assumptions"]] == ["AS-05-01", "AS-05-02"]
    assert [a["record_id"] for a in body["assumptions"]] == [first, attack["threat_id"]]
    assert all(a["status"] == "open" for a in body["assumptions"])
    row = next(r for r in body["rows"] if r["record_id"] == first)
    assert row["notes"]["assumptions_open"] >= 1
    url = f"/api/v1/assessments/{built}/ui-stages/05/assumptions/AS-05-01"
    assert client.patch(url, headers=headers, json={"status": "disputed"}).status_code == 422
    assert client.patch(url, headers=headers, json={"status": "disputed", "note": "It is behind a VPN."}).status_code == 200
    assert client.patch(f"{url[:-2]}02", headers=headers, json={"status": "confirmed"}).status_code == 200
    assert client.patch(f"{url[:-2]}99", headers=headers, json={"status": "confirmed"}).status_code == 404
    again = screen(client, headers, built, "05")["assumptions"]
    assert [(a["status"], a["note"]) for a in again] == [("disputed", "It is behind a VPN."), ("confirmed", None)]
    assert screen(client, headers, built, "04")["assumptions"] == []


def test_finish_is_never_refused(client, headers, built):
    folder(built, 5)
    Path(pipeline_runner.get_output_path(5, built)).with_name("assumptions.json").write_text(json.dumps([{"about_id": folder(built, 5)[0]["threat_id"], "text": "Open on purpose.", "needs_attention": True}]))
    response = client.post(f"/api/v1/assessments/{built}/ui-stages/05/finish", headers=headers)
    assert response.status_code == 200 and response.json()["finished"]["by"]
    assert screen(client, headers, built, "05")["finished"]["at"]
    assert client.post(f"/api/v1/assessments/{built}/ui-stages/05/finish", headers=headers).status_code == 200  # again: unchanged


# ── Rebuild ───────────────────────────────────────────────────────────────────


def test_rebuild_runs_from_the_first_folder_of_the_screen(client, headers, built):
    row = screen(client, headers, built, "05")["rows"][0]
    value = "tampering" if row["stride"]["value"] != "tampering" else "spoofing"
    assert patch(client, headers, built, "05", row["record_id"], "stride_category", {"value": value, "reason": "The threat changes data rather than who is acting."}).status_code == 200
    assert screen(client, headers, built, "05")["stale"]["is"] is True
    before = client.get(f"/api/v1/assessments/{built}/runs", headers=headers).json()
    response = client.post(f"/api/v1/assessments/{built}/ui-stages/05/rebuild", headers=headers)
    assert response.status_code == 202
    after = client.get(f"/api/v1/assessments/{built}/runs", headers=headers).json()
    new = [a for a in after if a["attempt_id"] not in {b["attempt_id"] for b in before}]
    assert sorted(a["stage_num"] for a in new) == [5, 6, 7, 8, 9, 10]  # folder 04 is not rebuilt from screen 05
    body = screen(client, headers, built, "05")
    assert body["stale"]["is"] is False and not body["building"]
    assert {f["status"] for f in body["folders"]} == {"complete"}


def test_rebuild_from_tara_runs_only_scoring_and_after(client, headers, built):
    before = client.get(f"/api/v1/assessments/{built}/runs", headers=headers).json()
    assert client.post(f"/api/v1/assessments/{built}/ui-stages/06/rebuild", headers=headers).status_code == 202
    after = client.get(f"/api/v1/assessments/{built}/runs", headers=headers).json()
    new = {a["stage_num"] for a in after if a["attempt_id"] not in {b["attempt_id"] for b in before}}
    assert new == {8, 9, 10}


def test_rebuild_needs_something_to_build_from(client, headers):
    assessment = s.create_assessment(client, headers)
    response = client.post(f"/api/v1/assessments/{assessment}/ui-stages/05/rebuild", headers=headers)
    assert response.status_code == 409 and "Run Execute first" in response.json()["detail"]


def test_screens_are_empty_before_the_first_run(client, headers):
    assessment = s.create_assessment(client, headers)
    for ui in ("04", "05", "06"):
        body = screen(client, headers, assessment, ui)
        assert body["rows"] == [] and body["has_data"] is False and body["built_from"]["run"] is None


def test_deleting_the_assessment_removes_the_new_rows(client, headers, built):
    row = screen(client, headers, built, "05")["rows"][0]
    client.post(f"/api/v1/assessments/{built}/ui-stages/05/comments", headers=headers, json={"record_id": row["record_id"], "text": "A note."})
    patch(client, headers, built, "04", "DS_01", "tool_user.safety", {"confirm": True})
    client.post(f"/api/v1/assessments/{built}/ui-stages/05/finish", headers=headers)
    assert client.delete(f"/api/v1/assessments/{built}", headers=headers).status_code == 204
    db = SessionLocal()
    for model in (m.StageEdit, m.StageComment, m.StageAssumptionReview, m.StageReview):
        assert db.query(model).filter_by(assessment_id=built).count() == 0

"""Document upload and the automatic Stage 01 then Stage 02 run (spec 22). Stage programs are faked."""

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import stage_support as s
from checkpoint_api.main import app


FAKES = Path(__file__).resolve().parent / "fake_agents"
BOUNDARY = "The key and certificate portal and everything deployed in its cloud account."


@pytest.fixture(autouse=True)
def setup(tmp_path, monkeypatch):
    s.reset_database()
    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path / "uploads"))
    monkeypatch.setenv("STAGE01_AGENT", str(FAKES / "stage01.js"))
    monkeypatch.setenv("STAGE02_AGENT", str(FAKES / "stage02.js"))
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


def upload(client, headers, assessment, name="answers.md", doc_type="qa", content=b"# Answers\n"):
    return client.post(
        f"/api/v1/assessments/{assessment}/documents",
        headers=headers,
        files={"file": (name, content)},
        data={"doc_type": doc_type, "date_received": "2026-10-03"},
    )


def ready(client, headers, assessment):
    assert upload(client, headers, assessment).status_code == 201
    assert upload(client, headers, assessment, "architecture.drawio", "diagram", b"<mxfile/>").status_code == 201
    assert client.put(f"/api/v1/assessments/{assessment}/boundary-statement", headers=headers, json={"text": BOUNDARY}).status_code == 200


def status(client, headers, assessment):
    return client.get(f"/api/v1/assessments/{assessment}/pipeline", headers=headers).json()


# ── Uploads ───────────────────────────────────────────────────────────────────


def test_upload_lists_and_deletes_with_the_chosen_type(client, headers, assessment, tmp_path):
    response = upload(client, headers, assessment)
    assert response.status_code == 201
    assert response.json() == {"file": "answers.md", "doc_type": "qa", "date_received": "2026-10-03", "size_bytes": 10}
    listed = client.get(f"/api/v1/assessments/{assessment}/documents", headers=headers).json()
    assert [d["file"] for d in listed] == ["answers.md"]
    manifest = (tmp_path / "uploads" / assessment / "documents" / "manifest.json").read_text()
    assert '"doc_type": "qa"' in manifest
    assert client.delete(f"/api/v1/assessments/{assessment}/documents/answers.md", headers=headers).status_code == 204
    assert client.get(f"/api/v1/assessments/{assessment}/documents", headers=headers).json() == []


def test_upload_again_replaces_the_type(client, headers, assessment):
    upload(client, headers, assessment)
    upload(client, headers, assessment, doc_type="functional")
    listed = client.get(f"/api/v1/assessments/{assessment}/documents", headers=headers).json()
    assert [(d["file"], d["doc_type"]) for d in listed] == [("answers.md", "functional")]


@pytest.mark.parametrize("name,doc_type,message", [
    ("tool.exe", "qa", "cannot be read"),
    ("manifest.json", "qa", "cannot be read"),
    ("boundary.txt", "qa", "cannot be read"),
    ("answers.md", "letter", "Unknown document type"),
])
def test_bad_uploads_are_refused(client, headers, assessment, name, doc_type, message):
    response = upload(client, headers, assessment, name, doc_type)
    assert response.status_code == 422
    assert message in response.json()["detail"]


def test_file_names_cannot_leave_the_assessment_folder(client, headers, assessment, tmp_path):
    response = upload(client, headers, assessment, "../../../etc/answers.md")
    assert response.status_code == 201
    assert response.json()["file"] == "answers.md"
    assert (tmp_path / "uploads" / assessment / "documents" / "answers.md").exists()


def test_other_users_cannot_upload_or_run(client, assessment):
    other = s.analyst_headers(client, "other@example.com")
    assert upload(client, other, assessment).status_code == 404
    assert client.post(f"/api/v1/assessments/{assessment}/run", headers=other).status_code == 404


def test_boundary_statement_needs_a_sentence(client, headers, assessment):
    assert client.put(f"/api/v1/assessments/{assessment}/boundary-statement", headers=headers, json={"text": "Portal"}).status_code == 422
    client.put(f"/api/v1/assessments/{assessment}/boundary-statement", headers=headers, json={"text": BOUNDARY})
    assert client.get(f"/api/v1/assessments/{assessment}/boundary-statement", headers=headers).json() == {"text": BOUNDARY}


# ── Run ───────────────────────────────────────────────────────────────────────


def test_run_without_documents_is_refused(client, headers, assessment):
    response = client.post(f"/api/v1/assessments/{assessment}/run", headers=headers)
    assert response.status_code == 422


def test_one_run_call_completes_both_stages_and_stores_them(client, headers, assessment, tmp_path):
    ready(client, headers, assessment)
    assert client.post(f"/api/v1/assessments/{assessment}/run", headers=headers).status_code == 202
    body = status(client, headers, assessment)
    assert [(x["stage"], x["status"], x["run_number"], x["refused_count"]) for x in body["stages"]] == [("01", "complete", 1, 0), ("02", "complete", 1, 0)]
    assert body["documents"] == 2 and body["boundary_set"] is True

    out01 = client.get(f"/api/v1/assessments/{assessment}/stages/01/runs/current/output", headers=headers).json()
    out02 = client.get(f"/api/v1/assessments/{assessment}/stages/02/runs/current/output", headers=headers).json()
    assert len(out01["facts"]) == 70
    assert len(out02["item_definition"]["elements"]) == 26

    run_dir = next((tmp_path / "uploads" / assessment / "runs").iterdir())
    assert (run_dir / "stage-01" / "seen-input.txt").read_text().endswith(f"{assessment}/documents")
    assert (run_dir / "stage-02" / "seen-boundary.txt").read_text().endswith("boundary.txt")


def test_failed_stage_01_shows_the_error_and_leaves_stage_02_not_started(client, headers, assessment, monkeypatch):
    ready(client, headers, assessment)
    monkeypatch.setenv("FAKE_FAIL", "missing")
    client.post(f"/api/v1/assessments/{assessment}/run", headers=headers)
    stage01, stage02 = status(client, headers, assessment)["stages"]
    assert stage01["status"] == "failed"
    assert "Missing input" in stage01["error"]
    assert stage02["status"] == "not_started"


def test_a_crashing_stage_is_reported_not_left_running(client, headers, assessment, monkeypatch):
    ready(client, headers, assessment)
    monkeypatch.setenv("STAGE02_AGENT", str(FAKES / "does-not-exist.js"))
    client.post(f"/api/v1/assessments/{assessment}/run", headers=headers)
    stage01, stage02 = status(client, headers, assessment)["stages"]
    assert stage01["status"] == "complete"
    assert stage02["status"] == "failed"
    assert stage02["error"]


def test_two_assessments_do_not_share_outputs(client, headers, tmp_path):
    first, second = s.create_assessment(client, headers), s.create_assessment(client, headers)
    for a in (first, second):
        ready(client, headers, a)
        client.post(f"/api/v1/assessments/{a}/run", headers=headers)
    assert (tmp_path / "uploads" / first / "runs").exists()
    assert (tmp_path / "uploads" / second / "runs").exists()
    assert next((tmp_path / "uploads" / first / "runs").iterdir()) != next((tmp_path / "uploads" / second / "runs").iterdir())


def test_a_second_run_while_one_is_pending_is_refused(client, headers, assessment):
    from checkpoint_api import stage_models as m
    from checkpoint_api.database import SessionLocal

    ready(client, headers, assessment)
    with SessionLocal() as db:
        db.add(m.StageJob(assessment_id=assessment, stage="01", status="running"))
        db.commit()
    response = client.post(f"/api/v1/assessments/{assessment}/run", headers=headers)
    assert response.status_code == 409
    assert "still running" in response.json()["detail"]


def test_rerun_creates_new_stored_runs(client, headers, assessment):
    ready(client, headers, assessment)
    client.post(f"/api/v1/assessments/{assessment}/run", headers=headers)
    client.post(f"/api/v1/assessments/{assessment}/run", headers=headers)
    assert [x["run_number"] for x in status(client, headers, assessment)["stages"]] == [2, 2]

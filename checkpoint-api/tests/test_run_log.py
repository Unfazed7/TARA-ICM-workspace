"""Run log: every run writes what started, what finished and what stopped it (C7 follow-up)."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import stage_support as s
from checkpoint_api import run_log, stage_pipeline
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
    monkeypatch.setenv("LOG_FILE", str(tmp_path / "logs" / "aegis.log"))
    run_log.setup()
    yield
    monkeypatch.undo()
    run_log.setup()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def logged(tmp_path) -> str:
    return (tmp_path / "logs" / "aegis.log").read_text(encoding="utf-8")


def start(client):
    headers = s.analyst_headers(client)
    assessment = s.create_assessment(client, headers)
    for name, doc_type, content in (("answers.md", "qa", b"# Answers\n"), ("architecture.drawio", "diagram", b"<mxfile/>")):
        client.post(f"/api/v1/assessments/{assessment}/documents", headers=headers,
                    files={"file": (name, content)}, data={"doc_type": doc_type, "date_received": "2026-10-03"})
    client.put(f"/api/v1/assessments/{assessment}/boundary-statement", headers=headers, json={"text": BOUNDARY})
    client.post(f"/api/v1/assessments/{assessment}/run", headers=headers)
    stages = client.get(f"/api/v1/assessments/{assessment}/pipeline", headers=headers).json()["stages"]
    return assessment, stages


def test_a_complete_run_logs_each_step(client, tmp_path):
    assessment, _ = start(client)
    text = logged(tmp_path)
    assert f"{assessment} | Execute pressed" in text
    assert "Run started: 2 document(s) ['answers.md', 'architecture.drawio']; boundary set" in text
    assert "Stage 01 starting: node" in text and "Stage 02 starting: node" in text
    assert "Stage 01 finished with exit code 0" in text
    assert "Stage 02 stored as run 1" in text
    assert f"{assessment} | Run complete after" in text
    assert "POST /api/v1/assessments/" in text and "/run 202" in text


def test_a_failed_stage_logs_its_error_output_and_exit_code(client, tmp_path, monkeypatch):
    monkeypatch.setenv("FAKE_FAIL", "missing")
    _, stages = start(client)
    assert stages[0]["status"] == "failed"
    text = logged(tmp_path)
    assert "ERROR aegis.pipeline" in text
    assert "Stage 01 finished with exit code 2" in text
    assert "Stage 01 error output: Stage 01 stopped. Missing input:" in text
    assert "Run stopped: Stage 01 failed; Stage 02 not started" in text


def test_an_unexpected_error_is_logged_with_its_traceback_and_never_shown_empty(client, tmp_path, monkeypatch):
    def boom(*_args, **_kwargs):
        raise NotImplementedError()

    monkeypatch.setattr(stage_pipeline.stage_store, "read_output", boom)
    _, stages = start(client)
    assert [x["status"] for x in stages] == ["complete", "failed"]
    errors = [x["error"] for x in stages if x["status"] == "failed"]
    assert errors and all(e.endswith("NotImplementedError") for e in errors)
    text = logged(tmp_path)
    assert "The run stopped unexpectedly" in text
    assert "Traceback (most recent call last)" in text


def test_missing_node_is_reported_in_plain_words(monkeypatch):
    monkeypatch.setattr(stage_pipeline.shutil, "which", lambda _name: None)
    code, _, stderr = stage_pipeline._run_node_blocking(["agent.js"])
    assert code == -1 and "Node.js was not found" in stderr

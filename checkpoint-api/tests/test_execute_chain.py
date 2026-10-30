"""Execute builds everything: Stage 01, 02, 03, then folders 04 to 10 (spec 29 to 31, D-61). Stage programs are faked:
01 to 03 write item-01's answers; 04 to 10 are the real programs with no model, so each takes its built-in answer."""

import json
import os
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import stage_support as s
from checkpoint_api import pipeline_runner
from checkpoint_api.main import app
from test_pipeline_run import BOUNDARY, FAKES, ready  # noqa: F401  (fixtures below reuse their helpers)


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
def assessment(client, headers):
    return s.create_assessment(client, headers)


def folder_status(client, headers, assessment) -> dict[int, str]:
    rows = client.get(f"/api/v1/assessments/{assessment}/pipeline", headers=headers).json().get("folders", [])
    return {row["stage_num"]: row["status"] for row in rows}


def finish(client, headers, assessment, timeout=180):
    end = time.time() + timeout
    while time.time() < end:
        body = client.get(f"/api/v1/assessments/{assessment}/pipeline", headers=headers).json()
        jobs = [j["status"] for j in body["stages"]]
        folders = [f["status"] for f in body.get("folders", [])]
        if "failed" in jobs + folders:
            return body
        if all(v == "complete" for v in jobs) and len(folders) == 7 and all(v == "complete" for v in folders):
            return body
        time.sleep(0.5)
    raise AssertionError(f"the run did not finish: {body}")


def test_execute_runs_every_folder_in_order(client, headers, assessment):
    ready(client, headers, assessment)
    assert client.post(f"/api/v1/assessments/{assessment}/run", headers=headers).status_code in (200, 202)
    body = finish(client, headers, assessment)
    assert [f["stage_num"] for f in body["folders"]] == [4, 5, 6, 7, 8, 9, 10]
    assert {f["status"] for f in body["folders"]} == {"complete"}
    for number in range(4, 11):
        out = Path(pipeline_runner.get_output_path(number, assessment))
        assert out.is_file(), out
        assert json.loads(out.read_text())  # not empty
    attempts = client.get(f"/api/v1/assessments/{assessment}/runs", headers=headers).json()
    assert {a["stage_num"] for a in attempts} >= set(range(4, 11))
    assert all(a["log_available"] for a in attempts if a["stage_num"] >= 4)


def test_execute_stops_at_the_first_failed_folder(client, headers, assessment, monkeypatch):
    ready(client, headers, assessment)
    monkeypatch.setenv("FAKE_FAIL", "stage06")
    assert client.post(f"/api/v1/assessments/{assessment}/run", headers=headers).status_code in (200, 202)
    body = finish(client, headers, assessment)
    status = {f["stage_num"]: f["status"] for f in body["folders"]}
    assert status[4] == "complete" and status[5] == "complete"
    assert status[6] == "failed"
    assert [status[n] for n in (7, 8, 9, 10)] == ["not_started"] * 4
    assert not Path(pipeline_runner.get_output_path(7, assessment)).exists()

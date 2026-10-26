"""Stage 03 from the Item Definition, Stage 10 arguments, the delete cleanup (merge of stages 03 to 10)."""

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

import stage_support as s
from checkpoint_api import pipeline_runner
from checkpoint_api.database import SessionLocal, engine
from checkpoint_api.main import app


@pytest.fixture(autouse=True)
def setup(tmp_path, monkeypatch):
    s.reset_database()
    monkeypatch.setattr(pipeline_runner, "WORKSPACE_ROOT", str(tmp_path))

    async def no_run(*args, **kwargs):
        return None

    # The route queues the stage program; here only the answer of the route matters.
    monkeypatch.setattr("checkpoint_api.routers.pipeline.run_stage_subprocess", no_run)
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


def store_stages_01_and_02(client, assessment):
    service = s.service_headers(client)
    assert s.post_run(client, service, assessment, "01", s.stage01_payload()).status_code == 201
    assert s.post_run(client, service, assessment, "02", s.stage02_payload()).status_code == 201


def test_stage_3_is_refused_until_the_item_definition_is_stored(client, headers, assessment):
    response = client.post(f"/api/v1/assessments/{assessment}/stages/3/run", headers=headers)
    assert response.status_code == 409
    assert "stage 02" in response.json()["detail"]


def test_stage_3_runs_once_stage_02_is_stored_without_any_review_step(client, headers, assessment):
    store_stages_01_and_02(client, assessment)
    response = client.post(f"/api/v1/assessments/{assessment}/stages/3/run", headers=headers)
    assert response.status_code == 202


def test_stage_4_still_waits_for_stage_3(client, headers, assessment):
    store_stages_01_and_02(client, assessment)
    response = client.post(f"/api/v1/assessments/{assessment}/stages/4/run", headers=headers)
    assert response.status_code == 409
    assert response.json()["detail"] == "Stage 4 requires stage 3 to be complete first"


def test_the_catalog_offers_stages_3_and_10(client, headers, assessment):
    stages = client.get(f"/api/v1/assessments/{assessment}/stages", headers=headers).json()
    assert [stage["stage_num"] for stage in stages if not stage["available"]] == [1, 2]


def test_stage_3_arguments_write_the_stored_item_definition(client, headers, assessment, tmp_path):
    store_stages_01_and_02(client, assessment)
    args = pipeline_runner.build_stage_args(assessment, 3)
    flags = dict(zip(args[::2], args[1::2]))
    assert flags["--assessment-id"] == assessment
    assert flags["--out"] == pipeline_runner.get_output_path(3, assessment)
    written = json.loads(Path(flags["--item-definition"]).read_text(encoding="utf-8"))
    assert written["stage"] == "02"
    assert written["item_definition"]["elements"]
    assert written["item_definition"]["scope_decisions"]
    assert str(tmp_path) in flags["--item-definition"]


def test_stage_3_arguments_without_a_stored_item_definition_fail_clearly(assessment):
    with pytest.raises(RuntimeError, match="Stage 02 has no stored result"):
        pipeline_runner.build_stage_args(assessment, 3)


def test_other_stage_arguments_do_not_need_the_item_definition(assessment):
    args = pipeline_runner.build_stage_args(assessment, 4)
    assert args[0] == "--assets"


def test_stage_10_arguments(assessment):
    args = pipeline_runner.build_stage_args(assessment, 10)
    flags = dict(zip(args[::2], args[1::2]))
    assert flags["--attacks"] == pipeline_runner.get_output_path(6, assessment)
    assert flags["--treatments"] == pipeline_runner.get_output_path(9, assessment)
    assert flags["--impacts"] == pipeline_runner.get_output_path(7, assessment)
    assert flags["--risk-register"] == pipeline_runner.get_output_path(8, assessment)
    assert flags["--out"] == pipeline_runner.get_output_path(10, assessment)


def test_stage_10_is_accepted_by_the_run_route(client, headers, assessment):
    from checkpoint_api.models import PipelineRun

    db = SessionLocal()
    try:
        for stage, name in ((8, "risk-scoring"), (9, "risk-treatment")):
            db.add(PipelineRun(assessment_id=assessment, stage_num=stage, stage_name=name, status="complete"))
        db.commit()
    finally:
        db.close()
    response = client.post(f"/api/v1/assessments/{assessment}/stages/10/run", headers=headers)
    assert response.status_code == 202


def test_the_recorded_model_is_the_models_json_default_unless_overridden(monkeypatch, tmp_path):
    config = tmp_path / "tara-workspace" / "web-based-tara" / "_config"
    config.mkdir(parents=True)
    (config / "models.json").write_text(json.dumps({"default": {"model": "some-lab/default-model"}}), encoding="utf-8")
    monkeypatch.setattr(pipeline_runner, "LLM_MODEL", "")
    assert pipeline_runner.effective_llm_model() == "some-lab/default-model"
    monkeypatch.setattr(pipeline_runner, "LLM_MODEL", "other/override")
    assert pipeline_runner.effective_llm_model() == "other/override"


def test_stage_assumptions_file_is_served_read_only(client, headers, assessment):
    url = f"/api/v1/assessments/{assessment}/stages/3/rationale-file"
    assert client.get(url, headers=headers).status_code == 404
    out = Path(pipeline_runner.get_output_path(3, assessment))
    out.parent.mkdir(parents=True)
    items = [
        {"rationale_id": "RAT-301", "stage": "03", "attention": "information", "review": {"status": "unreviewed"}},
        {"rationale_id": "RAT-302", "stage": "03", "attention": "needs_attention", "review": {"status": "unreviewed"}},
    ]
    (out.parent / "rationale.json").write_text(json.dumps(items), encoding="utf-8")
    body = client.get(url, headers=headers).json()
    assert body["stage"] == "03"
    assert [item["rationale_id"] for item in body["items"]] == ["RAT-302", "RAT-301"]
    assert body["counts"]["needs_attention"] == 1


def count(table: str, assessment: str) -> int:
    with engine.connect() as connection:
        return connection.execute(text(f"SELECT COUNT(*) FROM {table} WHERE assessment_id = :a"), {"a": assessment}).scalar()


def test_deleting_an_assessment_removes_its_stage_01_and_02_rows(client, headers, assessment):
    store_stages_01_and_02(client, assessment)
    assert count("stage_runs", assessment) == 2
    with engine.connect() as connection:
        assert connection.execute(text("SELECT COUNT(*) FROM facts")).scalar() > 0
        assert connection.execute(text("SELECT COUNT(*) FROM elements")).scalar() > 0

    assert client.delete(f"/api/v1/assessments/{assessment}", headers=headers).status_code == 204

    assert count("stage_runs", assessment) == 0
    with engine.connect() as connection:
        for table in ("facts", "elements", "links", "documents", "rationale_items"):
            assert connection.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar() == 0, table

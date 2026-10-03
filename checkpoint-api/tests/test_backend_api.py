import os
import sys
import tempfile
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET"] = "test-secret"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from fastapi.testclient import TestClient

from checkpoint_api.database import Base, engine
from checkpoint_api.main import app
from checkpoint_api.models import BoundaryEdit, BoundaryState, Checkpoint, PipelineRun


@pytest.fixture(autouse=True)
def reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def register_and_login(client):
    register = client.post(
        "/api/v1/auth/register",
        json={"email": "test@example.com", "password": "Test1234!", "name": "Tester"},
    )
    assert register.status_code == 201

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "Test1234!"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def create_assessment(client, headers):
    response = client.post(
        "/api/v1/assessments",
        headers=headers,
        json={
            "name": "Demo TARA",
            "vehicle_type": "sedan",
            "domains": ["infotainment"],
        },
    )
    assert response.status_code == 201
    return response.json()


def test_auth_register_login_and_assessment_crud(client):
    headers = register_and_login(client)
    created = create_assessment(client, headers)
    assessment_id = created["assessment_id"]
    assert created["owner_id"] == "test@example.com"
    assert created["stages"] == {
        "01": "not_started",
        "02": "not_started",
        "03": "not_started",
        "04": "not_started",
        "05": "not_started",
        "06": "not_started",
        "07": "not_started",
        "08": "not_started",
        "09": "not_started",
        "10": "not_started",
    }

    listed = client.get("/api/v1/assessments", headers=headers)
    assert listed.status_code == 200
    assert [item["assessment_id"] for item in listed.json()] == [assessment_id]

    patched = client.patch(
        f"/api/v1/assessments/{assessment_id}",
        headers=headers,
        json={"description": "Updated description", "status": "archived"},
    )
    assert patched.status_code == 200
    assert patched.json()["description"] == "Updated description"
    assert patched.json()["status"] == "archived"

    deleted = client.delete(f"/api/v1/assessments/{assessment_id}", headers=headers)
    assert deleted.status_code == 204
    missing = client.get(f"/api/v1/assessments/{assessment_id}", headers=headers)
    assert missing.status_code == 404


def test_login_rejects_bad_password(client):
    register_and_login(client)
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401


def test_csv_upload_and_status(client, monkeypatch):
    from checkpoint_api import pipeline_runner
    from checkpoint_api.routers import uploads

    with tempfile.TemporaryDirectory() as upload_dir:
        monkeypatch.setattr(pipeline_runner, "UPLOAD_DIR", upload_dir)
        monkeypatch.setattr(uploads, "UPLOAD_DIR", upload_dir)
        headers = register_and_login(client)
        assessment_id = create_assessment(client, headers)["assessment_id"]

        upload = client.post(
            f"/api/v1/assessments/{assessment_id}/upload/csv",
            headers=headers,
            files={"assets_csv": ("assets.csv", b"asset_id,asset_title\nAS_01,Diagnostic API\n", "text/csv")},
        )
        assert upload.status_code == 200
        assert upload.json()["uploaded"] is True
        assert upload.json()["filename"] == "assets.csv"

        status = client.get(f"/api/v1/assessments/{assessment_id}/upload/csv", headers=headers)
        assert status.status_code == 200
        assert status.json()["uploaded"] is True


def test_stage_dependency_check_returns_409(client):
    headers = register_and_login(client)
    assessment_id = create_assessment(client, headers)["assessment_id"]

    response = client.post(
        f"/api/v1/assessments/{assessment_id}/stages/4/run",
        headers=headers,
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Stage 4 requires stage 3 to be complete first"


def test_stage_catalog_uses_canonical_ten_stage_flow(client):
    headers = register_and_login(client)
    assessment_id = create_assessment(client, headers)["assessment_id"]

    response = client.get(
        f"/api/v1/assessments/{assessment_id}/stages",
        headers=headers,
    )

    assert response.status_code == 200
    stages = response.json()
    assert [stage["stage_num"] for stage in stages] == list(range(1, 11))
    assert stages[0]["name"] == "Input Normalization"
    assert stages[0]["outputs"] == ["document-register.json", "facts.json"]
    assert stages[2]["name"] == "Asset Identification"
    assert stages[2]["outputs"] == ["asset-register.json"]
    assert stages[9]["name"] == "Residual Risk"
    assert [stage["stage_num"] for stage in stages if not stage["available"]] == [1, 2, 3, 10]


def test_available_stages_have_runners():
    from checkpoint_api.pipeline_runner import get_agent_path
    from checkpoint_api.stage_catalog import STAGES

    missing = [
        stage.number
        for stage in STAGES
        if stage.available and not Path(get_agent_path(stage.number)).is_file()
    ]
    assert missing == []


def test_unavailable_stage_cannot_be_run(client):
    headers = register_and_login(client)
    assessment_id = create_assessment(client, headers)["assessment_id"]

    response = client.post(
        f"/api/v1/assessments/{assessment_id}/stages/1/run",
        headers=headers,
    )

    assert response.status_code == 501
    assert response.json()["detail"] == "Stage 01 — Input Normalization is not implemented yet"


def test_stage_status_defaults_to_not_started(client):
    headers = register_and_login(client)
    assessment_id = create_assessment(client, headers)["assessment_id"]

    response = client.get(
        f"/api/v1/assessments/{assessment_id}/stages/1/status",
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["status"] == "not_started"


def test_stage_output_reads_json_file(client, monkeypatch):
    from checkpoint_api import pipeline_runner

    with tempfile.TemporaryDirectory() as workspace_root:
        monkeypatch.setattr(pipeline_runner, "WORKSPACE_ROOT", workspace_root)
        headers = register_and_login(client)
        assessment_id = create_assessment(client, headers)["assessment_id"]
        output_path = Path(pipeline_runner.get_output_path(3, assessment_id))
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text('[{"asset_id":"AS_01"}]\n', encoding="utf-8")

        response = client.get(
            f"/api/v1/assessments/{assessment_id}/stages/3/output",
            headers=headers,
        )
        assert response.status_code == 200
        assert response.json() == [{"asset_id": "AS_01"}]

        alias_response = client.get(
            f"/api/v1/assessments/{assessment_id}/outputs/03",
            headers=headers,
        )
        assert alias_response.status_code == 200
        assert alias_response.json() == [{"asset_id": "AS_01"}]


def test_manual_csv_asset_register_marks_stage_3_complete(client, monkeypatch):
    from checkpoint_api import pipeline_runner

    csv_content = (
        b"asset_title,asset_type,asset_description,confidentiality,integrity,availability,"
        b"authenticity,authorization,non_repudiation\n"
        b"Diagnostic API,api_endpoint,Accepts diagnostic requests,yes,true,1,no,yes,false\n"
    )
    with tempfile.TemporaryDirectory() as workspace_root:
        monkeypatch.setattr(pipeline_runner, "WORKSPACE_ROOT", workspace_root)
        headers = register_and_login(client)
        assessment_id = create_assessment(client, headers)["assessment_id"]

        response = client.post(
            f"/api/v1/assessments/{assessment_id}/stages/3/asset-register",
            headers=headers,
            files={"asset_file": ("assets.csv", csv_content, "text/csv")},
        )

        assert response.status_code == 200
        assert response.json()["asset_count"] == 1
        assessment = client.get(f"/api/v1/assessments/{assessment_id}", headers=headers)
        assert assessment.json()["stages"]["03"] == "complete"
        output = client.get(
            f"/api/v1/assessments/{assessment_id}/stages/3/output",
            headers=headers,
        )
        assert output.status_code == 200
        asset = output.json()[0]
        assert asset["asset_id"] == "AS_01"
        assert asset["input_mode"] == "manual"
        assert asset["ciaaan"]["authorization"] is True


def test_manual_xlsx_asset_register_is_supported(client, monkeypatch):
    from io import BytesIO

    from openpyxl import Workbook

    from checkpoint_api import pipeline_runner

    workbook = Workbook()
    worksheet = workbook.active
    worksheet.append([
        "asset_id", "asset_title", "asset_type", "asset_description",
        "confidentiality", "integrity", "availability", "authenticity",
        "authorization", "non_repudiation",
    ])
    worksheet.append([
        "AS_42", "Audit Log", "data_store", "Records privileged operations",
        False, True, True, True, False, True,
    ])
    content = BytesIO()
    workbook.save(content)
    workbook.close()

    with tempfile.TemporaryDirectory() as workspace_root:
        monkeypatch.setattr(pipeline_runner, "WORKSPACE_ROOT", workspace_root)
        headers = register_and_login(client)
        assessment_id = create_assessment(client, headers)["assessment_id"]
        response = client.post(
            f"/api/v1/assessments/{assessment_id}/stages/3/asset-register",
            headers=headers,
            files={
                "asset_file": (
                    "assets.xlsx",
                    content.getvalue(),
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            },
        )

        assert response.status_code == 200
        assert response.json()["asset_count"] == 1


def test_manual_asset_register_returns_row_specific_validation_error(client, monkeypatch):
    from checkpoint_api import pipeline_runner

    csv_content = (
        b"asset_title,asset_type,asset_description,confidentiality,integrity,availability,"
        b"authenticity,authorization,non_repudiation\n"
        b"Diagnostic API,api_endpoint,Accepts requests,maybe,true,true,false,true,false\n"
    )
    with tempfile.TemporaryDirectory() as workspace_root:
        monkeypatch.setattr(pipeline_runner, "WORKSPACE_ROOT", workspace_root)
        headers = register_and_login(client)
        assessment_id = create_assessment(client, headers)["assessment_id"]
        response = client.post(
            f"/api/v1/assessments/{assessment_id}/stages/3/asset-register",
            headers=headers,
            files={"asset_file": ("assets.csv", csv_content, "text/csv")},
        )

        assert response.status_code == 422
        assert response.json()["detail"].startswith("Row 2, confidentiality:")


def test_manual_asset_register_unblocks_stage_4(client, monkeypatch):
    from checkpoint_api import pipeline_runner
    from checkpoint_api.routers import pipeline

    async def do_not_launch_agent(*_args, **_kwargs):
        return None

    monkeypatch.setattr(pipeline, "run_stage_subprocess", do_not_launch_agent)
    csv_content = (
        b"asset_title,asset_type,asset_description,confidentiality,integrity,availability,"
        b"authenticity,authorization,non_repudiation\n"
        b"Diagnostic API,api_endpoint,Accepts requests,true,true,true,false,true,false\n"
    )
    with tempfile.TemporaryDirectory() as workspace_root:
        monkeypatch.setattr(pipeline_runner, "WORKSPACE_ROOT", workspace_root)
        headers = register_and_login(client)
        assessment_id = create_assessment(client, headers)["assessment_id"]
        imported = client.post(
            f"/api/v1/assessments/{assessment_id}/stages/3/asset-register",
            headers=headers,
            files={"asset_file": ("assets.csv", csv_content, "text/csv")},
        )
        assert imported.status_code == 200
        upload_status = client.get(
            f"/api/v1/assessments/{assessment_id}/stages/3/asset-register",
            headers=headers,
        )
        assert upload_status.status_code == 200
        assert upload_status.json() == {
            "uploaded": True,
            "filename": "assets.csv",
            "asset_count": 1,
        }

        run = client.post(
            f"/api/v1/assessments/{assessment_id}/stages/4/run",
            headers=headers,
        )
        assert run.status_code == 202
        assert run.json()["status"] == "pending"


def test_manual_asset_registers_are_isolated_by_assessment(client, monkeypatch):
    from checkpoint_api import pipeline_runner

    def asset_csv(title: str) -> bytes:
        return (
            "asset_title,asset_type,asset_description,confidentiality,integrity,availability,"
            "authenticity,authorization,non_repudiation\n"
            f"{title},api_endpoint,Accepts requests,true,true,true,false,true,false\n"
        ).encode()

    with tempfile.TemporaryDirectory() as workspace_root:
        monkeypatch.setattr(pipeline_runner, "WORKSPACE_ROOT", workspace_root)
        headers = register_and_login(client)
        first_id = create_assessment(client, headers)["assessment_id"]
        second_id = create_assessment(client, headers)["assessment_id"]
        for assessment_id, title in ((first_id, "First API"), (second_id, "Second API")):
            response = client.post(
                f"/api/v1/assessments/{assessment_id}/stages/3/asset-register",
                headers=headers,
                files={"asset_file": ("assets.csv", asset_csv(title), "text/csv")},
            )
            assert response.status_code == 200

        first_output = client.get(
            f"/api/v1/assessments/{first_id}/stages/3/output",
            headers=headers,
        ).json()
        second_output = client.get(
            f"/api/v1/assessments/{second_id}/stages/3/output",
            headers=headers,
        ).json()
        assert first_output[0]["asset_title"] == "First API"
        assert second_output[0]["asset_title"] == "Second API"


def test_assessment_stage_status_reflects_pipeline_runs(client):
    from checkpoint_api.database import SessionLocal

    headers = register_and_login(client)
    assessment_id = create_assessment(client, headers)["assessment_id"]
    session = SessionLocal()
    try:
        session.add(
            PipelineRun(
                assessment_id=assessment_id,
                stage_num=1,
                stage_name="01-input-normalization",
                status="complete",
            )
        )
        session.commit()
    finally:
        session.close()

    response = client.get(f"/api/v1/assessments/{assessment_id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["stages"]["01"] == "complete"


def test_running_stage_can_pause_resume_and_cancel(client, monkeypatch):
    from checkpoint_api.database import SessionLocal
    from checkpoint_api.routers import pipeline

    headers = register_and_login(client)
    assessment_id = create_assessment(client, headers)["assessment_id"]
    session = SessionLocal()
    try:
        session.add(PipelineRun(
            assessment_id=assessment_id,
            stage_num=4,
            stage_name="04-damage-analysis",
            status="running",
        ))
        session.commit()
    finally:
        session.close()

    monkeypatch.setattr(pipeline, "pause_stage_process", lambda *_args: True)
    monkeypatch.setattr(pipeline, "resume_stage_process", lambda *_args: True)
    monkeypatch.setattr(pipeline, "cancel_stage_process", lambda *_args: True)

    paused = client.post(f"/api/v1/assessments/{assessment_id}/stages/4/pause", headers=headers)
    assert paused.status_code == 200
    assert paused.json()["status"] == "paused"

    resumed = client.post(f"/api/v1/assessments/{assessment_id}/stages/4/resume", headers=headers)
    assert resumed.status_code == 200
    assert resumed.json()["status"] == "running"

    cancelled = client.post(f"/api/v1/assessments/{assessment_id}/stages/4/cancel", headers=headers)
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"
    assert client.get(f"/api/v1/assessments/{assessment_id}", headers=headers).json()["stages"]["04"] == "cancelled"


def test_delete_assessment_removes_related_data_and_files(client, monkeypatch, tmp_path):
    from checkpoint_api import pipeline_runner
    from checkpoint_api.database import SessionLocal

    workspace_root = tmp_path / "workspace"
    upload_root = tmp_path / "uploads"
    monkeypatch.setattr(pipeline_runner, "WORKSPACE_ROOT", str(workspace_root))
    monkeypatch.setattr(pipeline_runner, "UPLOAD_DIR", str(upload_root))
    monkeypatch.setattr(pipeline_runner, "cancel_assessment_processes", lambda *_args: None)

    headers = register_and_login(client)
    assessment_id = create_assessment(client, headers)["assessment_id"]
    artifact_dir = workspace_root / "artifacts" / assessment_id
    upload_dir = upload_root / assessment_id
    artifact_dir.mkdir(parents=True)
    upload_dir.mkdir(parents=True)
    (artifact_dir / "output.json").write_text("{}", encoding="utf-8")
    (upload_dir / "input.csv").write_text("asset_id\nAS_01", encoding="utf-8")

    session = SessionLocal()
    try:
        boundary = BoundaryState(
            assessment_id=assessment_id,
            model_ref="model.json",
            boundary_statement="Test boundary",
            decisions=[],
        )
        session.add(boundary)
        session.flush()
        session.add(BoundaryEdit(
            boundary_id=boundary.boundary_id,
            assessment_id=assessment_id,
            action="rename",
            element_id="EL_01",
            actor="test@example.com",
        ))
        session.add(Checkpoint(
            assessment_id=assessment_id,
            stage_num=4,
            stage_name="damage-analysis",
        ))
        session.add(PipelineRun(
            assessment_id=assessment_id,
            stage_num=4,
            stage_name="04-damage-analysis",
            status="cancelled",
        ))
        session.commit()
    finally:
        session.close()

    response = client.delete(f"/api/v1/assessments/{assessment_id}", headers=headers)
    assert response.status_code == 204
    assert not artifact_dir.exists()
    assert not upload_dir.exists()

    session = SessionLocal()
    try:
        assert session.query(PipelineRun).filter_by(assessment_id=assessment_id).count() == 0
        assert session.query(Checkpoint).filter_by(assessment_id=assessment_id).count() == 0
        assert session.query(BoundaryState).filter_by(assessment_id=assessment_id).count() == 0
        assert session.query(BoundaryEdit).filter_by(assessment_id=assessment_id).count() == 0
    finally:
        session.close()

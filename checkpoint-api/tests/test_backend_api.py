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
from checkpoint_api.models import PipelineRun


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
        f"/api/v1/assessments/{assessment_id}/stages/2/run",
        headers=headers,
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Stage 2 requires stage 1 to be complete first"


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
        output_path = Path(pipeline_runner.get_output_path(1))
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text('[{"asset_id":"AS_01"}]\n', encoding="utf-8")

        response = client.get(
            f"/api/v1/assessments/{assessment_id}/stages/1/output",
            headers=headers,
        )
        assert response.status_code == 200
        assert response.json() == [{"asset_id": "AS_01"}]

        alias_response = client.get(
            f"/api/v1/assessments/{assessment_id}/outputs/01",
            headers=headers,
        )
        assert alias_response.status_code == 200
        assert alias_response.json() == [{"asset_id": "AS_01"}]


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

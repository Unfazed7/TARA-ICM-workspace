import os
import sys
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET"] = "test-secret"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import jwt
import pytest
from fastapi.testclient import TestClient

from checkpoint_api.database import Base, engine
from checkpoint_api.main import app


@pytest.fixture(autouse=True)
def reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def auth_headers():
    token = jwt.encode({"sub": "usr_test"}, "test-secret", algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


def create_checkpoint(client, auth_headers, assessment_id="ASS_01", stage_num=2):
    return client.post(
        f"/api/v1/assessments/{assessment_id}/checkpoints",
        headers=auth_headers,
        json={
            "stage_num": stage_num,
            "stage_name": "damage-analysis",
            "output_summary": {
                "total_damage_scenarios": 12,
                "assets_covered": 5,
            },
        },
    )


def test_full_approval_flow(client, auth_headers):
    create_response = create_checkpoint(client, auth_headers)
    assert create_response.status_code == 201
    checkpoint_id = create_response.json()["checkpoint_id"]

    review_response = client.post(
        f"/api/v1/checkpoints/{checkpoint_id}/review",
        headers=auth_headers,
        json={"decision": "approved"},
    )
    assert review_response.status_code == 200
    assert review_response.json()["status"] == "approved"
    assert review_response.json()["reviewer_id"] == "usr_test"

    poll_response = client.get(
        "/api/v1/assessments/ASS_01/checkpoints/2",
        headers=auth_headers,
    )
    assert poll_response.status_code == 200
    assert poll_response.json()["status"] == "approved"


def test_rejection_flow(client, auth_headers):
    create_response = create_checkpoint(client, auth_headers)
    checkpoint_id = create_response.json()["checkpoint_id"]

    review_response = client.post(
        f"/api/v1/checkpoints/{checkpoint_id}/review",
        headers=auth_headers,
        json={
            "decision": "rejected",
            "notes": "Damage scenario needs clearer stakeholder impact.",
        },
    )
    assert review_response.status_code == 200

    poll_response = client.get(
        "/api/v1/assessments/ASS_01/checkpoints/2",
        headers=auth_headers,
    )
    body = poll_response.json()
    assert body["status"] == "rejected"
    assert body["reviewer_id"] == "usr_test"
    assert body["notes"] == "Damage scenario needs clearer stakeholder impact."


def test_duplicate_checkpoint(client, auth_headers):
    assert create_checkpoint(client, auth_headers).status_code == 201
    duplicate = create_checkpoint(client, auth_headers)
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "Checkpoint for this assessment and stage already exists"


def test_status_transitions(client, auth_headers):
    create_response = create_checkpoint(client, auth_headers)
    checkpoint_id = create_response.json()["checkpoint_id"]

    pending = client.get(
        "/api/v1/assessments/ASS_01/checkpoints/2",
        headers=auth_headers,
    )
    assert pending.json()["status"] == "pending_review"

    approved = client.post(
        f"/api/v1/checkpoints/{checkpoint_id}/review",
        headers=auth_headers,
        json={"decision": "approved"},
    )
    assert approved.status_code == 200

    second_review = client.post(
        f"/api/v1/checkpoints/{checkpoint_id}/review",
        headers=auth_headers,
        json={"decision": "rejected"},
    )
    assert second_review.status_code == 409
    assert second_review.json()["detail"] == "Checkpoint already reviewed"


def test_list_checkpoints(client, auth_headers):
    assert create_checkpoint(client, auth_headers, stage_num=2).status_code == 201
    assert create_checkpoint(client, auth_headers, stage_num=3).status_code == 201

    response = client.get("/api/v1/assessments/ASS_01/checkpoints", headers=auth_headers)
    assert response.status_code == 200
    assert [item["stage_num"] for item in response.json()] == [2, 3]


def test_auth_required(client):
    response = client.get("/api/v1/assessments/ASS_01/checkpoints/2")
    assert response.status_code == 401

"""Rationale list and analyst review (spec 13b)."""

import jwt
import pytest
from fastapi.testclient import TestClient

import stage_support as s
from checkpoint_api.main import app


@pytest.fixture(autouse=True)
def reset_database():
    s.reset_database()
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
    assessment_id = s.create_assessment(client, headers)
    assert s.post_run(client, headers, assessment_id, "01", s.stage01_payload()).status_code == 201
    assert s.post_run(client, headers, assessment_id, "02", s.stage02_payload()).status_code == 201
    return assessment_id


def url(assessment_id, stage, rationale_id=None):
    base = f"/api/v1/assessments/{assessment_id}/stages/{stage}/rationale"
    return f"{base}/{rationale_id}" if rationale_id else base


def test_list_puts_needs_attention_first_with_counts(client, headers, assessment):
    body = client.get(url(assessment, "01"), headers=headers).json()
    assert [item["rationale_id"] for item in body["items"]] == ["RAT-101", "RAT-109"]
    # RAT-109 is a naming merge, which needs the analyst since D-46.
    assert body["counts"] == {"needs_attention": 2, "information": 0, "confirmed": 0, "disputed": 0, "unreviewed": 2}
    assert [item["topic"] for item in body["items"]] == ["exposure", "naming"]


def test_review_sent_by_a_stage_is_ignored(client, headers, assessment):
    items = client.get(url(assessment, "01"), headers=headers).json()["items"]
    assert {item["review"]["status"] for item in items} == {"unreviewed"}


def test_analyst_confirms(client, headers, assessment):
    response = client.patch(url(assessment, "01", "RAT-101"), headers=headers, json={"status": "confirmed"})
    assert response.status_code == 200
    review = response.json()["review"]
    assert review["status"] == "confirmed"
    assert review["by"] == "analyst@example.com"
    assert review["at"].endswith("Z")
    counts = client.get(url(assessment, "01"), headers=headers).json()["counts"]
    assert (counts["confirmed"], counts["unreviewed"]) == (1, 1)


def test_dispute_needs_a_note(client, headers, assessment):
    response = client.patch(url(assessment, "02", "RAT-201"), headers=headers, json={"status": "disputed"})
    assert response.status_code == 422
    assert response.json()["detail"] == "A dispute needs a note saying what is wrong."
    response = client.patch(url(assessment, "02", "RAT-201"), headers=headers, json={"status": "disputed", "note": "The gateway is private."})
    assert response.status_code == 200
    assert response.json()["review"]["note"] == "The gateway is private."


def test_unknown_status_is_422(client, headers, assessment):
    assert client.patch(url(assessment, "01", "RAT-101"), headers=headers, json={"status": "approved"}).status_code == 422


def test_unknown_item_is_404(client, headers, assessment):
    assert client.patch(url(assessment, "01", "RAT-999"), headers=headers, json={"status": "confirmed"}).status_code == 404


def test_service_login_cannot_review(client, assessment):
    response = client.patch(url(assessment, "01", "RAT-101"), headers=s.service_headers(client), json={"status": "confirmed"})
    assert response.status_code == 403


def test_token_without_role_cannot_review(client, assessment):
    token = jwt.encode({"sub": "analyst@example.com"}, "test-secret", algorithm="HS256")
    response = client.patch(url(assessment, "01", "RAT-101"), headers={"Authorization": f"Bearer {token}"}, json={"status": "confirmed"})
    assert response.status_code == 403


def test_review_carries_over_to_a_rerun(client, headers, assessment):
    client.patch(url(assessment, "01", "RAT-101"), headers=headers, json={"status": "confirmed"})
    assert s.post_run(client, headers, assessment, "01", s.stage01_payload()).json()["run_number"] == 2
    body = client.get(url(assessment, "01"), headers=headers).json()
    assert body["run_number"] == 2
    assert body["items"][0]["review"]["status"] == "confirmed"


def test_back_to_unreviewed(client, headers, assessment):
    client.patch(url(assessment, "01", "RAT-101"), headers=headers, json={"status": "confirmed"})
    response = client.patch(url(assessment, "01", "RAT-101"), headers=headers, json={"status": "unreviewed"})
    assert response.json()["review"] == {"status": "unreviewed"}


def test_registered_users_are_analysts(client):
    s.analyst_headers(client, "new@example.com")
    login = client.post("/api/v1/auth/login", json={"email": "new@example.com", "password": "Test1234!"}).json()
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {login['access_token']}"}).json()
    assert me["role"] == "analyst"


def test_service_login_needs_the_secret(client):
    assert client.post("/api/v1/auth/service-token", json={"secret": "wrong"}).status_code == 401

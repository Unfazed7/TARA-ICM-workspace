"""Shared setup for the stage store tests (spec 18): item-01 payloads and logins."""

import copy
import json
import os
import sys
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET"] = "test-secret"
os.environ["PIPELINE_SERVICE_SECRET"] = "pipeline-test-secret"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from checkpoint_api.database import Base, engine  # noqa: E402
from checkpoint_api.main import app  # noqa: E402,F401
from checkpoint_api.stage_models import StageBase  # noqa: E402


REPO = Path(__file__).resolve().parents[2]
ITEM_01 = REPO / "tests" / "fixtures" / "synthetic" / "item-01" / "expected"
RATIONALE = REPO / "tests" / "fixtures" / "valid" / "rationale.json"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    StageBase.metadata.drop_all(bind=engine)
    StageBase.metadata.create_all(bind=engine)


def rationale_for(stage: str) -> list:
    return [item for item in load(RATIONALE) if item["stage"] == stage]


def stage01_payload() -> dict:
    return {
        "document_register": load(ITEM_01 / "document-register.json"),
        "facts": load(ITEM_01 / "facts.json"),
        "conflicts": load(ITEM_01 / "conflicts.json"),
        "rationale": rationale_for("01"),
    }


def stage02_payload() -> dict:
    item_definition = load(ITEM_01 / "item-definition.json")
    item_definition["scope_decisions"] = load(ITEM_01 / "scope-decisions.json")
    return {
        "item_definition": item_definition,
        "questions": load(ITEM_01 / "questions.json"),
        "rationale": rationale_for("02"),
    }


def as_stored(payload: dict) -> dict:
    """What reading back should return: a stage cannot set reviews, so all start unreviewed."""
    stored = copy.deepcopy(payload)
    for item in stored["rationale"]:
        item["review"] = {"status": "unreviewed"}
    return stored


def analyst_headers(client, email="analyst@example.com") -> dict:
    password = "Test1234!"
    assert client.post("/api/v1/auth/register", json={"email": email, "password": password, "name": "Analyst"}).status_code == 201
    token = client.post("/api/v1/auth/login", json={"email": email, "password": password}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def service_headers(client) -> dict:
    response = client.post("/api/v1/auth/service-token", json={"secret": "pipeline-test-secret"})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def create_assessment(client, headers) -> str:
    response = client.post(
        "/api/v1/assessments",
        headers=headers,
        json={"name": "item-01", "vehicle_type": "sedan", "domains": ["backend"]},
    )
    assert response.status_code == 201
    return response.json()["assessment_id"]


def post_run(client, headers, assessment_id, stage, payload):
    return client.post(f"/api/v1/assessments/{assessment_id}/stages/{stage}/runs", headers=headers, json=payload)


def rules(response) -> list:
    return [refusal["rule"] for refusal in response.json()["refused"]]


def refusals(response, rule) -> list:
    return [refusal for refusal in response.json()["refused"] if refusal["rule"] == rule]

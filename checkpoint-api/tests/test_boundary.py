"""Stage 1 CP1 boundary review tests.

Focus: the finalize gate. The Stage 1 spec requires that an analyst cannot
proceed while any element is ambiguous or any conflict is still escalated.
"""

import os
import sys
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET"] = "test-secret"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import jwt
import pytest
from fastapi.testclient import TestClient

from checkpoint_api.database import Base, SessionLocal, engine
from checkpoint_api.main import app
from checkpoint_api.models import BoundaryState

ASSESSMENT = "ASS_TEST01"
BOUNDARY_URL = f"/api/v1/assessments/{ASSESSMENT}/boundary"


@pytest.fixture(autouse=True)
def reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def auth():
    token = jwt.encode({"sub": "usr_test"}, "test-secret", algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def seeded():
    db = SessionLocal()
    db.add(
        BoundaryState(
            assessment_id=ASSESSMENT,
            model_ref="MM-001",
            phase="proposal",
            boundary_statement="Item is the telematics function: TCU and gateway path.",
            decisions=[
                {
                    "element_id": "COMP-001",
                    "status": "in_scope",
                    "rationale": "Core of the item per boundary statement",
                    "decided_by": "agent",
                },
                {
                    "element_id": "COMP-004",
                    "status": "interface",
                    "rationale": "External communication partner",
                    "decided_by": "agent",
                },
                {
                    "element_id": "COMP-006",
                    "status": "ambiguous",
                    "rationale": "Present in topology export only",
                    "escalation_reason": "unresolved_conflict",
                    "decided_by": "agent",
                },
            ],
            merged_model={
                "elements": [
                    {"element_id": "COMP-001", "type": "component", "name": "TCU"},
                    {"element_id": "COMP-004", "type": "component", "name": "OEM Backend"},
                    {"element_id": "COMP-006", "type": "node", "name": "GW2"},
                ],
                "links": [
                    {"link_id": "LINK-001", "from": "COMP-001", "to": "COMP-004"}
                ],
            },
            conflicts={
                "model_ref": "MM-001",
                "conflicts": [
                    {
                        "conflict_id": "CFL-002",
                        "type": "element_missing_in_source",
                        "description": "GW2 appears in topology but not architecture.",
                        "involved": [{"source_id": "network_topology_v2.xlsx"}],
                        "resolution_status": "escalated_cp1",
                    }
                ],
            },
            coverage={
                "sources_provided": ["architecture_diagram"],
                "sources_absent": [],
                "consequences": [],
            },
        )
    )
    db.commit()
    db.close()
    yield


def resolve_gw2(client, auth):
    return client.patch(
        f"{BOUNDARY_URL}/elements/COMP-006",
        headers=auth,
        json={
            "status": "out_of_scope",
            "rationale": "Duplicate label for Central Gateway, confirmed with arch owner",
            "actor": "omkar",
        },
    )


def resolve_conflict(client, auth):
    return client.post(
        f"{BOUNDARY_URL}/conflicts/resolve",
        headers=auth,
        json={
            "conflict_id": "CFL-002",
            "analyst_note": "Confirmed duplicate; architecture is authoritative here",
            "actor": "omkar",
        },
    )


def test_get_boundary_reports_unresolved_count(client, auth, seeded):
    response = client.get(BOUNDARY_URL, headers=auth)
    assert response.status_code == 200
    body = response.json()
    assert body["phase"] == "proposal"
    assert body["unresolved_count"] == 1


def test_finalize_blocked_while_ambiguous(client, auth, seeded):
    response = client.post(
        f"{BOUNDARY_URL}/finalize", headers=auth, json={"actor": "omkar"}
    )
    assert response.status_code == 422
    assert response.json()["detail"]["unresolved_element_ids"] == ["COMP-006"]


def test_scope_update_logs_edit_and_clears_escalation(client, auth, seeded):
    response = resolve_gw2(client, auth)
    assert response.status_code == 200
    body = response.json()
    assert body["unresolved_count"] == 0

    decision = next(d for d in body["decisions"] if d["element_id"] == "COMP-006")
    assert decision["status"] == "out_of_scope"
    assert decision["decided_by"] == "analyst"
    assert decision["escalation_reason"] is None

    edits = client.get(f"{BOUNDARY_URL}/edits", headers=auth).json()
    assert len(edits) == 1
    assert edits[0]["action"] == "status_change"
    assert edits[0]["before"]["status"] == "ambiguous"
    assert edits[0]["after"]["status"] == "out_of_scope"
    assert edits[0]["actor"] == "omkar"


def test_finalize_still_blocked_by_open_conflict(client, auth, seeded):
    resolve_gw2(client, auth)
    response = client.post(
        f"{BOUNDARY_URL}/finalize", headers=auth, json={"actor": "omkar"}
    )
    assert response.status_code == 422
    assert response.json()["detail"]["open_conflict_ids"] == ["CFL-002"]


def test_full_resolution_allows_finalize_then_freezes(client, auth, seeded):
    resolve_gw2(client, auth)
    resolve_conflict(client, auth)

    response = client.post(
        f"{BOUNDARY_URL}/finalize", headers=auth, json={"actor": "omkar"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["phase"] == "final"
    assert body["edit_count"] == 2

    frozen = client.patch(
        f"{BOUNDARY_URL}/elements/COMP-001",
        headers=auth,
        json={
            "status": "out_of_scope",
            "rationale": "This edit must be rejected",
            "actor": "omkar",
        },
    )
    assert frozen.status_code == 409


def test_unknown_element_returns_404(client, auth, seeded):
    response = client.patch(
        f"{BOUNDARY_URL}/elements/COMP-999",
        headers=auth,
        json={
            "status": "in_scope",
            "rationale": "Element does not exist",
            "actor": "omkar",
        },
    )
    assert response.status_code == 404


def test_add_element_appends_decision_and_model_entry(client, auth, seeded):
    response = client.post(
        f"{BOUNDARY_URL}/elements",
        headers=auth,
        json={
            "name": "Secure Element",
            "type": "component",
            "status": "in_scope",
            "rationale": "Present on the board, missed by extraction",
            "actor": "omkar",
        },
    )
    assert response.status_code == 201
    body = response.json()
    added = [d for d in body["decisions"] if d["element_id"].startswith("COMP-A")]
    assert len(added) == 1
    assert added[0]["decided_by"] == "analyst"

    names = [e["name"] for e in body["merged_model"]["elements"]]
    assert "Secure Element" in names


def test_delete_element_removes_decision_links_and_requires_rationale(
    client, auth, seeded
):
    response = client.request(
        "DELETE",
        f"{BOUNDARY_URL}/elements/COMP-004",
        headers=auth,
        json={"rationale": "Hallucinated, no such backend exists", "actor": "omkar"},
    )
    assert response.status_code == 200
    body = response.json()
    assert all(d["element_id"] != "COMP-004" for d in body["decisions"])
    assert body["merged_model"]["links"] == []

    missing_rationale = client.request(
        "DELETE",
        f"{BOUNDARY_URL}/elements/COMP-001",
        headers=auth,
        json={"actor": "omkar"},
    )
    assert missing_rationale.status_code == 422


def test_missing_boundary_returns_404(client, auth):
    response = client.get("/api/v1/assessments/ASS_NOPE/boundary", headers=auth)
    assert response.status_code == 404


def test_seed_creates_boundary_from_pipeline_output(client, auth):
    """The bridge test: pipeline JSON in, live BoundaryState out."""
    payload = {
        "boundary_statement": "Item is the telematics function: TCU and gateway path.",
        "decisions": [
            {
                "element_id": "COMP-001",
                "status": "in_scope",
                "rationale": "Core of the item",
                "decided_by": "agent",
            },
            {
                "element_id": "COMP-006",
                "status": "ambiguous",
                "rationale": "Present in topology only",
                "escalation_reason": "unresolved_conflict",
                "decided_by": "agent",
            },
        ],
        "merged_model": {
            "model_id": "MM-002",
            "version": 1,
            "elements": [
                {"element_id": "COMP-001", "type": "component", "name": "TCU"},
                {"element_id": "COMP-006", "type": "node", "name": "GW2"},
            ],
            "links": [],
        },
        "conflicts": {"model_ref": "MM-002", "conflicts": []},
        "coverage": {"sources_provided": ["architecture_diagram"], "sources_absent": [], "consequences": []},
    }
    response = client.post(
        f"/api/v1/assessments/{ASSESSMENT}/boundary/seed", headers=auth, json=payload
    )
    assert response.status_code == 201
    body = response.json()
    assert body["phase"] == "proposal"
    assert body["model_ref"] == "MM-002"
    assert body["unresolved_count"] == 1

    # a seed event is logged too
    edits = client.get(f"{BOUNDARY_URL}/edits", headers=auth).json()
    assert any(e["actor"] == "pipeline" for e in edits)


def test_seed_refuses_to_overwrite_existing_boundary(client, auth, seeded):
    payload = {
        "boundary_statement": "A second, unrelated run",
        "decisions": [],
        "merged_model": {"model_id": "MM-003"},
    }
    response = client.post(
        f"{BOUNDARY_URL}/seed", headers=auth, json=payload
    )
    assert response.status_code == 409


def test_full_pipeline_to_finalize_flow(client, auth):
    """End-to-end: seed -> resolve -> finalize, as the runner script performs it."""
    seed_payload = {
        "boundary_statement": "Item is the telematics function: TCU and gateway path.",
        "decisions": [
            {"element_id": "COMP-001", "status": "in_scope", "rationale": "Core of the item statement", "decided_by": "agent"},
            {
                "element_id": "COMP-006",
                "status": "ambiguous",
                "rationale": "Present in topology only",
                "escalation_reason": "unresolved_conflict",
                "decided_by": "agent",
            },
        ],
        "merged_model": {
            "model_id": "MM-004",
            "elements": [
                {"element_id": "COMP-001", "type": "component", "name": "TCU"},
                {"element_id": "COMP-006", "type": "node", "name": "GW2"},
            ],
            "links": [],
        },
        "conflicts": {
            "model_ref": "MM-004",
            "conflicts": [
                {
                    "conflict_id": "CFL-009",
                    "type": "element_missing_in_source",
                    "description": "GW2 in topology only",
                    "involved": [],
                    "resolution_status": "escalated_cp1",
                }
            ],
        },
        "coverage": {"sources_provided": [], "sources_absent": [], "consequences": []},
    }
    seeded_response = client.post(
        f"{BOUNDARY_URL}/seed", headers=auth, json=seed_payload
    )
    assert seeded_response.status_code == 201

    client.patch(
        f"{BOUNDARY_URL}/elements/COMP-006",
        headers=auth,
        json={"status": "out_of_scope", "rationale": "Confirmed duplicate", "actor": "omkar"},
    )
    client.post(
        f"{BOUNDARY_URL}/conflicts/resolve",
        headers=auth,
        json={"conflict_id": "CFL-009", "analyst_note": "Duplicate confirmed", "actor": "omkar"},
    )
    final = client.post(
        f"{BOUNDARY_URL}/finalize", headers=auth, json={"actor": "omkar"}
    )
    assert final.status_code == 200
    assert final.json()["phase"] == "final"

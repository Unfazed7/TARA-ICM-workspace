"""Document groups, asset type, topics and answers (spec 23)."""

import pytest
from fastapi.testclient import TestClient

import stage_support as s
from checkpoint_api.main import app

BOUNDARY = "The key and certificate portal and everything deployed in its cloud account."


@pytest.fixture(autouse=True)
def setup(tmp_path, monkeypatch):
    s.reset_database()
    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path / "uploads"))
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


def upload(client, headers, assessment, name, **form):
    return client.post(f"/api/v1/assessments/{assessment}/documents", headers=headers, files={"file": (name, b"# text\n")}, data=form)


def pipeline(client, headers, assessment):
    return client.get(f"/api/v1/assessments/{assessment}/pipeline", headers=headers).json()


def test_a_dropdown_label_sets_the_group_and_type(client, headers, assessment):
    body = upload(client, headers, assessment, "spec.md", type_label="Spec book").json()
    assert (body["doc_type"], body["category"], body["type_label"]) == ("srs", "behaviour", "Spec book")
    body = upload(client, headers, assessment, "parts.md", type_label="Component diagram").json()
    assert (body["doc_type"], body["category"]) == ("diagram", "components")


def test_other_keeps_the_typed_words_and_counts_for_its_group(client, headers, assessment):
    assert pipeline(client, headers, assessment)["missing"] == [
        "What is being assessed: the item name and one sentence on what it covers.",
        "At least one document describing the system's components or architecture.",
        "At least one document describing what the system does.",
    ]
    body = upload(client, headers, assessment, "policy.md", type_label="Security policy", category="components").json()
    assert (body["doc_type"], body["category"], body["type_label"]) == ("other", "components", "Security policy")
    upload(client, headers, assessment, "answers.md", type_label="Client answers (Q&A)")
    client.put(f"/api/v1/assessments/{assessment}/boundary-statement", headers=headers, json={"text": BOUNDARY})
    assert pipeline(client, headers, assessment)["missing"] == []


@pytest.mark.parametrize("form,message", [
    ({"type_label": "Security policy"}, "which group"),
    ({"type_label": "ab", "category": "components"}, "3 to 60"),
    ({"type_label": "API specification", "category": "components"}, "belongs with"),
    ({"type_label": "Diagram", "category": "pictures"}, "Unknown group"),
])
def test_bad_choices_are_refused_in_plain_words(client, headers, assessment, form, message):
    response = upload(client, headers, assessment, "x.md", **form)
    assert response.status_code == 422
    assert message in response.json()["detail"]


@pytest.fixture
def stored(client, headers, assessment):
    assert s.post_run(client, headers, assessment, "01", s.stage01_payload()).status_code == 201
    assert s.post_run(client, headers, assessment, "02", s.stage02_payload()).status_code == 201
    return assessment


def test_elements_read_back_with_asset_type(client, headers, stored):
    out = client.get(f"/api/v1/assessments/{stored}/stages/02/runs/current/output", headers=headers).json()
    element = out["item_definition"]["elements"][0]
    assert "asset_type" in element and "kind" not in element


def test_the_analyst_answers_an_open_question(client, headers, stored):
    out = client.get(f"/api/v1/assessments/{stored}/stages/02/runs/current/output", headers=headers).json()
    question = next(q for q in out["questions"] if q["status"] == "open")
    path = f"/api/v1/assessments/{stored}/stages/02/questions/{question['question_id']}/answer"
    assert client.put(path, headers=headers, json={"answer": "no"}).status_code == 422
    assert client.put(path, headers=headers, json={"answer": "Company laptops managed by IT."}).status_code == 200
    out = client.get(f"/api/v1/assessments/{stored}/stages/02/runs/current/output", headers=headers).json()
    answered = next(q for q in out["questions"] if q["question_id"] == question["question_id"])
    assert (answered["status"], answered["answer"], answered["answered_by"]) == ("answered", "Company laptops managed by IT.", "analyst")


def test_only_the_analyst_answers_and_unknown_questions_are_404(client, headers, stored):
    base = f"/api/v1/assessments/{stored}/stages/02/questions"
    assert client.put(f"{base}/Q-999/answer", headers=headers, json={"answer": "Something."}).status_code == 404
    service = s.service_headers(client)
    assert client.put(f"{base}/Q-001/answer", headers=service, json={"answer": "Something."}).status_code == 403

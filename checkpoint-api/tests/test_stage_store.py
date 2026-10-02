"""Stage 01 and Stage 02 storage: item-01 round trip, refusal rules, runs, drift (specs 12d, 18)."""

import copy

import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import stage_support as s
from checkpoint_api import stage_models as m
from checkpoint_api import stage_store
from checkpoint_api.database import engine
from checkpoint_api.main import app
from checkpoint_api.migrate import alembic_config


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
    return s.create_assessment(client, headers)


@pytest.fixture
def with_stage01(client, headers, assessment):
    response = s.post_run(client, headers, assessment, "01", s.stage01_payload())
    assert response.status_code == 201, response.json()
    return assessment


def post01(client, headers, assessment, change):
    payload = s.stage01_payload()
    change(payload)
    return s.post_run(client, headers, assessment, "01", payload)


def post02(client, headers, assessment, change):
    payload = s.stage02_payload()
    change(payload)
    return s.post_run(client, headers, assessment, "02", payload)


def find(items, key, value):
    return next(item for item in items if item[key] == value)


# ── item-01 round trip ────────────────────────────────────────────────────────


def test_item01_is_accepted_and_reads_back_unchanged(client, headers, assessment):
    first = s.post_run(client, headers, assessment, "01", s.stage01_payload())
    assert first.status_code == 201
    assert first.json()["refused"] == []
    assert first.json()["accepted"] == {"document": 4, "fact": 70, "conflict": 4, "rationale": 2}

    second = s.post_run(client, headers, assessment, "02", s.stage02_payload())
    assert second.status_code == 201
    assert second.json()["refused"] == []
    accepted = second.json()["accepted"]
    assert (accepted["element"], accepted["link"], accepted["question"], accepted["scope_decision"]) == (26, 27, 19, 26)

    out01 = client.get(f"/api/v1/assessments/{assessment}/stages/01/runs/current/output", headers=headers).json()
    expected01 = s.as_stored(s.stage01_payload())
    for key in ["document_register", "facts", "conflicts", "rationale"]:
        assert out01[key] == expected01[key], key

    out02 = client.get(f"/api/v1/assessments/{assessment}/stages/02/runs/current/output", headers=headers).json()
    expected02 = s.as_stored(s.stage02_payload())
    assert out02["questions"] == expected02["questions"]
    assert out02["rationale"] == expected02["rationale"]
    for key, value in expected02["item_definition"].items():
        assert out02["item_definition"][key] == value, key
    assert out02["based_on_stage_01_run"] == 1


def test_stage_02_needs_stage_01(client, headers, assessment):
    response = s.post_run(client, headers, assessment, "02", s.stage02_payload())
    assert response.status_code == 409
    assert response.json()["detail"] == "Stage 01 has no stored output yet."


def test_unknown_stage_is_404(client, headers, assessment):
    assert s.post_run(client, headers, assessment, "03", {}).status_code == 404


def test_service_login_can_store(client, assessment):
    response = s.post_run(client, s.service_headers(client), assessment, "01", s.stage01_payload())
    assert response.status_code == 201


def test_other_users_assessment_is_hidden(client, assessment):
    other = s.analyst_headers(client, "other@example.com")
    assert s.post_run(client, other, assessment, "01", s.stage01_payload()).status_code == 404


def test_nothing_accepted_returns_422_and_stores_nothing(client, headers, assessment):
    response = s.post_run(client, headers, assessment, "01", {"document_register": [], "facts": [{"fact_id": "FCT-001"}]})
    assert response.status_code == 422
    assert response.json()["accepted_total"] == 0
    assert client.get(f"/api/v1/assessments/{assessment}/stages/01/runs", headers=headers).json() == []


# ── Refusal rules (spec 12d) ──────────────────────────────────────────────────


def test_r01_fact_without_source(client, headers, assessment):
    response = post01(client, headers, assessment, lambda p: p["facts"][0].update(source_refs=[]))
    refused = s.refusals(response, "R-01")
    assert len(refused) == 1
    assert refused[0]["message"] == stage_store.MESSAGES["R-01"]
    assert refused[0]["details"] == {"fact_id": "FCT-001"}
    assert s.rules(response).count("R-20") == 0


def test_r02_source_points_to_unknown_document(client, headers, assessment):
    response = post01(client, headers, assessment, lambda p: p["facts"][0]["source_refs"][0].update(doc_id="DOC-99"))
    assert s.refusals(response, "R-02")[0]["details"] == {"doc_id": "DOC-99"}


def test_r03_element_without_fact(client, headers, with_stage01):
    response = post02(client, headers, with_stage01, lambda p: p["item_definition"]["elements"][0].update(fact_ids=[]))
    assert s.refusals(response, "R-03")[0]["details"] == {"element_id": "EL-001"}


def test_r04_link_to_missing_element(client, headers, with_stage01):
    response = post02(client, headers, with_stage01, lambda p: p["item_definition"]["links"][0].update(destination_id="EL-999"))
    refused = s.refusals(response, "R-04")
    assert refused[0]["details"] == {"element_id": "EL-999"}
    assert refused[0]["message"] == "This link connects to an element that does not exist."


def test_r04_link_to_refused_element(client, headers, with_stage01):
    def change(p):
        link = p["item_definition"]["links"][0]
        find(p["item_definition"]["elements"], "element_id", link["source_id"]).update(fact_ids=[])
    response = post02(client, headers, with_stage01, change)
    assert "R-03" in s.rules(response)
    assert "R-04" in s.rules(response)


def test_r05_question_without_target(client, headers, with_stage01):
    response = post02(client, headers, with_stage01, lambda p: p["questions"][0].pop("target_id"))
    assert s.refusals(response, "R-05")[0]["details"] == {"question_id": "Q-001"}
    assert "R-20" not in s.rules(response)


def test_r06_repeated_question(client, headers, with_stage01):
    def change(p):
        copy_of_first = copy.deepcopy(p["questions"][0])
        copy_of_first["question_id"] = "Q-900"
        p["questions"].append(copy_of_first)
    response = post02(client, headers, with_stage01, change)
    assert s.refusals(response, "R-06")[0]["details"] == {"question_id": "Q-001"}


def test_r07_question_cap(client, headers, with_stage01):
    def change(p):
        target = p["questions"][0]["target_id"]
        used = {q["fact_type"] for q in p["questions"] if q["target_id"] == target}
        free = [ft for ft in ["FT-01", "FT-02", "FT-03", "FT-04", "FT-05", "FT-06", "FT-07"] if ft not in used]
        for n, fact_type in enumerate(free[:3]):
            extra = copy.deepcopy(p["questions"][0])
            extra.update(question_id=f"Q-90{n}", fact_type=fact_type, status="open")
            p["questions"].append(extra)
    response = post02(client, headers, with_stage01, change)
    refused = s.refusals(response, "R-07")
    assert refused
    assert refused[0]["message"] == "This item already has 3 questions. Merge this into one of them or drop it."
    assert len(refused[0]["details"]["question_ids"]) == 3


def test_r08_scope_decision_without_reason(client, headers, with_stage01):
    response = post02(client, headers, with_stage01, lambda p: p["item_definition"]["scope_decisions"][0].update(reason=""))
    assert s.refusals(response, "R-08")
    assert "R-20" not in s.rules(response)


def test_r12_rejected_fact(client, headers, with_stage01):
    rejected = next(f["fact_id"] for f in s.stage01_payload()["facts"] if f["status"] == "rejected")
    response = post02(client, headers, with_stage01, lambda p: p["item_definition"]["elements"][0]["fact_ids"].append(rejected))
    refused = s.refusals(response, "R-12")
    assert refused[0]["details"] == {"fact_id": rejected}
    assert refused[0]["message"] == "This refers to a fact that was rejected."


def test_r13_container_does_not_match_zone(client, headers, with_stage01):
    def change(p):
        element = next(e for e in p["item_definition"]["elements"] if "parent_container_id" in e)
        element.pop("parent_container_id")
    response = post02(client, headers, with_stage01, change)
    assert s.refusals(response, "R-13")


def test_r13_external_element_with_container(client, headers, with_stage01):
    def change(p):
        zones = {z["zone_id"]: z["kind"] for z in p["item_definition"]["zones"]}
        element = next(e for e in p["item_definition"]["elements"] if zones[e["zone_id"]] in stage_store.EXTERNAL_ZONES)
        element["parent_container_id"] = p["item_definition"]["containers"][0]["container_id"]
    response = post02(client, headers, with_stage01, change)
    assert s.refusals(response, "R-13")


def test_r15_assumed_scope_decision_without_question(client, headers, with_stage01):
    def change(p):
        decision = p["item_definition"]["scope_decisions"][0]
        decision.update(assumed=True, based_on_question_ids=[])
    response = post02(client, headers, with_stage01, change)
    assert s.refusals(response, "R-15")
    assert "R-20" not in s.rules(response)


def test_r18_reference_to_missing_item(client, headers, assessment):
    response = post01(client, headers, assessment, lambda p: p["conflicts"][0]["fact_ids"].append("FCT-999"))
    assert s.refusals(response, "R-18")[0]["details"] == {"fact_id": "FCT-999"}


def test_r19_repeated_id(client, headers, assessment):
    response = post01(client, headers, assessment, lambda p: p["facts"].append(copy.deepcopy(p["facts"][0])))
    assert s.refusals(response, "R-19")[0]["details"] == {"fact_id": "FCT-001"}


def test_r20_wrong_format(client, headers, assessment):
    response = post01(client, headers, assessment, lambda p: p["facts"][0].update(confidence="certain"))
    refused = s.refusals(response, "R-20")
    assert refused[0]["details"]["problems"][0].startswith("confidence:")


def test_every_broken_rule_is_returned(client, headers, with_stage01):
    def change(p):
        decision = p["item_definition"]["scope_decisions"][0]
        decision.update(reason="", assumed=True, based_on_question_ids=[])
    response = post02(client, headers, with_stage01, change)
    assert {"R-08", "R-15"} <= set(s.rules(response))


def test_partial_acceptance_stores_the_rest(client, headers, assessment):
    response = post01(client, headers, assessment, lambda p: p["facts"][0].update(source_refs=[]))
    assert response.status_code == 201
    assert response.json()["accepted"]["fact"] == 69
    out = client.get(f"/api/v1/assessments/{assessment}/stages/01/runs/current/output", headers=headers).json()
    assert "FCT-001" not in {f["fact_id"] for f in out["facts"]}


# ── Runs ──────────────────────────────────────────────────────────────────────


def test_rerun_keeps_earlier_runs(client, headers, with_stage01):
    second = post01(client, headers, with_stage01, lambda p: p["facts"][0].update(value="changed in run 2"))
    assert second.json()["run_number"] == 2
    runs = client.get(f"/api/v1/assessments/{with_stage01}/stages/01/runs", headers=headers).json()
    assert [r["run_number"] for r in runs] == [1, 2]
    current = client.get(f"/api/v1/assessments/{with_stage01}/stages/01/runs/current/output", headers=headers).json()
    old = client.get(f"/api/v1/assessments/{with_stage01}/stages/01/runs/1/output", headers=headers).json()
    assert current["facts"][0]["value"] == "changed in run 2"
    assert old["facts"][0]["value"] == s.stage01_payload()["facts"][0]["value"]


# ── Storage safety ────────────────────────────────────────────────────────────


def test_every_schema_field_has_a_place_to_be_stored():
    schemas = stage_store.item_schemas()
    for kind, schema in schemas.items():
        fields = set(schema["properties"])
        handled = set(stage_store.COLUMNS[kind]) | stage_store.RELATIONS[kind]
        assert fields == handled, f"{kind}: schema and storage differ by {sorted(fields ^ handled)}"
        model_columns = set(stage_store.MODELS[kind].__table__.columns.keys())
        for attr in stage_store.COLUMNS[kind].values():
            assert attr in model_columns, f"{kind}: no column {attr}"


def test_migrations_build_exactly_the_model_tables(tmp_path):
    test_engine = create_engine(f"sqlite:///{tmp_path / 'migrated.db'}")
    with test_engine.begin() as connection:
        command.upgrade(alembic_config(connection), "head")
    with test_engine.connect() as connection:
        context = MigrationContext.configure(connection, opts={"include_name": lambda name, type_, parents: type_ != "table" or name in m.StageBase.metadata.tables})
        assert compare_metadata(context, m.StageBase.metadata) == []
    assert set(m.StageBase.metadata.tables) <= set(inspect(test_engine).get_table_names())


def test_database_enforces_references():
    with Session(engine) as db:
        run = m.StageRun(assessment_id="ASS_X", stage="02", run_number=1, created_by="t")
        db.add(run)
        db.flush()
        db.add(m.Zone(run_id=run.id, position=0, zone_id="ZN-01", kind="internet_external", name="Internet"))
        db.flush()
        db.add(m.Link(
            run_id=run.id, position=0, link_id="IF-01", link_type="data_flow", source_pk=9999, destination_pk=9998,
            direction="unidirectional", protocol="unknown", usage_at_destination="x", authentication="x",
            encryption="x", data_carried=[], crosses_trust_boundary=False, remark="", inferred_from_text=False,
            confidence="low",
        ))
        with pytest.raises(IntegrityError):
            db.flush()
        db.rollback()

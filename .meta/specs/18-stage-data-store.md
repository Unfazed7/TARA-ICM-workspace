# Spec 18: Stage Data Store (Stages 01 and 02)

**Status:** approved by the analyst for C3 (2026-10-02).
**Code:** `checkpoint-api/checkpoint_api/stage_models.py`, `stage_store.py`, `routers/stages.py`, `migrations/`
**Decisions:** D-36, D-37, D-42
**See also:** 12a to 12d (fields and refusals), 13b (Rationale API).

## Goal

Store each stage run item by item, refuse bad items with a plain reason, read runs back in the stage's JSON shape, and let the analyst review Rationale.

## Success Criteria

```bash
cd checkpoint-api && python -m pytest   # item-01 round trip, one test per rule, runs, roles, drift, migration
```

## File Ownership

WILL touch: `checkpoint-api/` (new stage tables, router, auth role, migrations, tests). WON'T touch: the older tables and routers (boundary, checkpoints, pipeline).

## Input/Output

**Tables (D-42):** one per kind, a column per field (25 tables). Every record belongs to a stage run. References between records are foreign keys, switched on in SQLite. Lists that point to nothing (`data_handled`, `page_methods`, `endpoints`, `stakeholders` ...) are JSON columns. All "based on facts" lists share `fact_refs`. Reviews live in `rationale_reviews`, outside runs. Alembic creates and changes these tables at startup.

**Endpoints** under `/api/v1/assessments/{id}/stages/{n}`, `n` is `01` or `02`:

| Call | Does |
|---|---|
| `POST /runs` | Stage 01 body `{document_register, facts, conflicts, rationale}`; Stage 02 body `{item_definition, questions, rationale}` (scope decisions inside the item definition). 201 `{run_number, accepted, accepted_total, refused}`; 422 when nothing is accepted (nothing stored); Stage 02 without a Stage 01 run: 409. |
| `GET /runs` | Runs with time, author, counts. |
| `GET /runs/current/output`, `GET /runs/{k}/output` | The run in the stage's JSON shape. (`GET /output` stays with the legacy pipeline.) |
| `GET /rationale`, `PATCH /rationale/{rationale_id}` | Spec 13b. |

**Roles:** everyone who registers is `analyst` (older `user` accounts count as analysts). The pipeline gets a `service` token from `POST /api/v1/auth/service-token` with `PIPELINE_SERVICE_SECRET`; it can store runs and read, never review (403).

## Process

1. Check each item against its schema in `src/schemas/`, then the 12d rules, in dependency order (documents, facts, conflicts; zones, containers, elements, links, functions, questions, scope decisions, assumptions; Rationale last).
2. Store good items; refuse the rest. An item that depends on a refused item is refused too.
3. A Stage 02 run is based on the current Stage 01 run and records which one.
4. The `review` a stage sends is ignored; reviews come only from PATCH and carry over to later runs by Rationale id.

## Validation Rules

12d rules R-01 to R-08, R-12, R-13, R-15, plus:

| ID | Refused when | Message | `details` |
|---|---|---|---|
| R-18 | A reference points to an item that does not exist or was refused | "This refers to an item that does not exist or was refused." | the missing id |
| R-19 | An id, or a scope decision for an element, repeats in the run | "This item repeats one already given in this run." | the id |
| R-20 | Any other schema problem | "This item does not match the expected format." | list of problems |

Stage 01 Rationale `affects` is checked for documents, facts and conflicts only (it may name elements Stage 02 builds later).

## Error Conditions

Unknown stage: 404. Unknown run: 404. Other user's assessment: 404.

## Verification Steps

```bash
cd checkpoint-api && python -m pytest && cd .. && npm test
```

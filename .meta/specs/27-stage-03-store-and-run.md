# Spec 27: Stage 03 Store, Run and Review API (C12, part 2)

**Status:** draft, waiting for the analyst (2026-10-26).
**Code:** `checkpoint-api/checkpoint_api/stage_models.py` (migration `0004`), `stage_store.py`, `stage_pipeline.py`, `routers/stages.py`, `routers/pipeline_v2.py`.
**Decisions:** D-36, D-42, D-52. Builds on specs 18, 22 and 26.

## Goal

Store Stage 03 runs like Stages 01 and 02, run Stage 03 automatically after Stage 02 in the same Execute, and let the analyst confirm or change assets and properties.

## Success Criteria

```bash
cd checkpoint-api && python -m pytest
```

## File Ownership

WILL touch the files above and `checkpoint-api/tests/`. WON'T touch the Stage 01 and 02 tables or the legacy routes.

## Input/Output

**Tables (one per kind of record, D-42):**
- `assets`: id, run, prefix, name, description, source kind and ids, scope status.
- `asset_properties`: asset, property, applies, reason, origin.
- Rationale items for Stage 03 go in the existing tables.

**Endpoints:**
- `POST /{id}/stages/03/runs`: stores a run (pipeline service login). Refusals as in spec 18: R-18 for an unknown source id, R-19 for a repeat, R-20 for a format error.
- `GET /{id}/stages/03/runs/current/output`.
- `GET /{id}/stages/03/rationale` and `PATCH` it, as for Stages 01 and 02.
- `PATCH /{id}/stages/03/assets/{asset_id}`: analyst only. Body `{status: confirmed | removed, note}`. Removing needs a note.
- `PATCH /{id}/stages/03/assets/{asset_id}/properties/{property}`: analyst only. Body `{applies, reason}`. The reason is required, 10 to 500 characters, and sets origin to `analyst`.

## Process

1. The pipeline runs Stage 01, then Stage 02, then Stage 03. Stage 03 is given the *stored* Stage 02 result, never the documents.
2. Stage 03 starts only when Stage 02 completed. Stage 02 has no partial runs: if it fails, Stage 03 stays "not started".
3. `GET /pipeline` lists three stages.
4. Analyst changes carry over to a re-run when the asset id and source match. A property the analyst changed is never replaced by a default or by a model change.
5. A re-run of Stage 02 marks the current Stage 03 run as "built on an older item definition" until Stage 03 runs again.

## Validation Rules

- Every asset's source must exist in the Stage 02 run it was built from.
- At least one property applies on every asset that is not removed.
- The service login cannot review (403).

## Error Conditions

- Unknown asset or property: 404.
- Removing without a note, or a reason that is too short: 422.
- Storing Stage 03 with no stored Stage 02 run: 409, "Stage 02 has no stored result yet."

## Verification Steps

- pytest:
  - a fake three-stage run stores Stage 03;
  - Stage 03 stays "not started" when Stage 02 fails;
  - review edits survive a re-run;
  - refusals and roles.
- Store the item-01 expected assets through the API with nothing refused.

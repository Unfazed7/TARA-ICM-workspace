# Spec 22: Automatic Run of Stages 01 and 02

**Status:** approved by the analyst for C6 (2026-10-03).
**Code:** `checkpoint-api/checkpoint_api/routers/pipeline_v2.py`, `stage_pipeline.py`, `stage_models.StageJob` (migration `0002`)
**Decisions:** D-36, D-41, D-43
**See also:** 18 (store), 19 and 21 (the stage programs).

## Goal

One call runs Stage 01, stores it, runs Stage 02 on the stored result and stores it, with a status per stage and a separate folder per assessment and run.

## Success Criteria

```bash
cd checkpoint-api && python -m pytest tests/test_pipeline_run.py   # stage programs faked
```

## File Ownership

WILL touch: the new router, runner, model, migration, tests and fake agents; Stage 01 `agent.js` (names unreadable files when input is missing). WON'T touch: the legacy stage endpoints and CSV upload (on hold, D-41), the frontend (upload screen and refresh are in C7).

## Input/Output

Under `/api/v1/assessments/{id}`, owner or admin only:

| Call | Does |
|---|---|
| `POST /documents` (multipart `file`, `doc_type`, optional `date_received`) | Saves to `UPLOAD_DIR/{id}/documents/`, updates `manifest.json` (same name replaces). Allowed: drawio, md, txt, html, htm, docx, xlsx, pdf, png, jpg, jpeg; types from spec 12a; 25 MB; names cleaned to the file's own name. |
| `GET /documents`, `DELETE /documents/{name}` | List, remove. |
| `PUT /boundary-statement` `{text}`, `GET /boundary-statement` | At least six words. (`/boundary` belongs to the old screen.) |
| `POST /run` | 202. 409 while a stage is pending or running; 422 without documents. |
| `GET /pipeline` | Per stage: status (`not_started`, `pending`, `running`, `complete`, `failed`), error, stored run number, refused count, times; documents count; boundary set. |

## Process

1. Run folder `UPLOAD_DIR/{id}/runs/<time>/` with `stage-01/`, `stage01-stored/`, `stage-02/`.
2. `node STAGE01_AGENT --input documents --out stage-01`. Non-zero exit: Stage 01 failed with the program's message; Stage 02 stays not started.
3. Store through the stage store directly (no HTTP, no service secret). Nothing accepted: failed with the first reason.
4. Write the stored Stage 01 result to `stage01-stored/`; `node STAGE02_AGENT --stage01 stage01-stored --boundary documents/boundary.txt --out stage-02`; store.
5. Any unexpected error marks pending or running stages failed; nothing is left running.

## Validation Rules

1. Stage 02 never receives the documents folder.
2. Agent paths and the timeout (`STAGE_TIMEOUT_SECONDS`, default 1800) come from the environment; model keys pass through the environment.

## Error Conditions

Timeout: the stage is stopped and failed with a plain message. Missing input: the program's list, plus which files could not be read and why.

## Verification Steps

```bash
cd checkpoint-api && python -m pytest && cd .. && npm test
```

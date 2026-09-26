# Stale Inventory

Task A1 of `.meta/CLAUDE-CODE-INSTRUCTIONS.md`. Read-only survey, dated 2026-09-25, of every file that still describes the old flow. Nothing listed here has been changed yet.

**Search:** whole repo, case-insensitive, text files only, excluding `node_modules`, `.git`, `frontend/src/components/ui`, `frontend/src/components/effects`. Terms: `asset-register`, `input_mode`, `asset-list`, `Mode A`, `Mode B`, `01-input-normalization`, `01-item-definition`, `02-asset-analysis`, `single step`, `merged_model`, `boundary review`, `CP1`, `vehicle_type`, `claude-opus`, `claude-sonnet`, `ANTHROPIC_API_KEY`, `hermes-3`.
**Result:** 70 files, each listed once below.

**Actions:** `update`, `supersede` (R6 banner, file kept), `move`, `keep`, `delete-after-approval`. Where a file needs two steps, both are named, for example "move (A6), then delete-after-approval (C14)".

---

## 1. Governance and history documents

| File | What is stale | Proposed action | Task |
|---|---|---|---|
| `.meta/CLAUDE.md` | Status tracker lists the old Stage 01 spec as current; file ownership table uses old stage folders | update | A5 |
| `.meta/CONTEXT.md` | Module status table uses the old 8-stage list and contradicts the tracker in `.meta/CLAUDE.md` | update | A5 |
| `.meta/WORKFLOW.md` | Claude and Qwen workflow; specs in `/Agents/Claude/SPECIFICATIONS/` (folder does not exist) | supersede (or update, per D-17) | A5 |
| `.meta/DELIVERY-SUMMARY.md` | Original 7-stage plan with `stage-01-item-definition` and `stage-02-asset-analysis` schemas | supersede | A5 |
| `.meta/SPEC-ENGINE-INITIALIZATION.md` | Qwen era setup with the original 7-stage plan | supersede | A5 |
| `README.md` | Claude and Qwen workflow; old stage list | update | A5 |
| `AEGIS-STAGE1-INTEGRATION.md` | Documents the boundary blob wiring (seed, `demo-run.js`, Anthropic key) | supersede | A5 |
| `Agents/Claude/REVIEW-PROTOCOL.md` | Review checklist expects Stage 01 CSV and diagram modes with `input_mode` | update | A5 |
| `Agents/Codex/CODEX-PROTOCOL.md` | Stage to file table points at the old Stage 01 spec and agent | update | A5 |
| `.meta/codex-briefs/BRIEF-backend-api.md` | Brief for the old Stage 01 CSV upload, Anthropic key, `vehicle_type` | supersede | A5 |
| `.meta/codex-briefs/BRIEF-stage-07-risk-treatment.md` | Names `claude-opus-4-8` and the `stage-01-asset-register` fixture | supersede | A5 |
| `CONTEXT.md` (root glossary) | Says Input Normalization and Item Definition run as a single step | update | A4 |
| `.meta/CLAUDE-CODE-INSTRUCTIONS.md` | Current plan; the terms appear only as instructions | keep | A1 (no change) |
| `.meta/web-item-definition-questions.md` | Current; `CP1` is the new meaning | keep | A1 (no change) |

## 2. Specs

| File | What is stale | Proposed action | Task |
|---|---|---|---|
| `.meta/specs/00-json-schema-contracts.md` | Stage 01 is the asset register with `input_mode`; old stage numbers throughout | update | B1 |
| `.meta/specs/01-input-normalization-agent.md` | Whole spec has the old meaning (CSV or PNG straight to CIAAAN assets); cites clause 15.3 as item definition | supersede | B1 |
| `.meta/specs/item-definition-agent.md` | v1 agent spec: shared folder outside the web workspace, Anthropic key, boundary blob; cites clause 15.3 | supersede | B1 |
| `.meta/specs/WEB-TARA-MVP-ARCHITECTURE.md` | Original flow with item definition and asset analysis stages; `claude-sonnet` | supersede | A7 |
| `.meta/specs/02-damage-analysis-agent.md` | Reads the Stage 01 asset register; `claude-opus` | update | A6 (path), C1 (model) |
| `.meta/specs/03-threat-identification-agent.md` | `claude-opus`; reads the asset register by old stage number | update | A6 (path), C1 (model) |
| `.meta/specs/04-attack-path-agent.md` | `claude-opus` | update | C1 |
| `.meta/specs/05-impact-analysis-agent.md` | `claude-opus` | update | C1 |
| `.meta/specs/07-risk-treatment-agent.md` | Reads the Stage 01 asset register; `claude-opus` | update | A6 (path), C1 (model) |
| `.meta/specs/10-backend-api.md` | Stage 01 CSV upload route, Anthropic key, `vehicle_type` | update | C3 |
| `.meta/specs/11-frontend-integration.md` | `vehicle_type` on assessments | update (after decision) | A3 (decision), C7 |

## 3. Runtime workspace (`tara-workspace/`)

| File | What is stale | Proposed action | Task |
|---|---|---|---|
| `tara-workspace/CLAUDE.md` | Names model `claude-sonnet-4-20250514` | update | C1 |
| `tara-workspace/stages/01-item-definition/agent.js` | v1 agent outside the web workspace; `claude-opus`; boundary blob output | move to `web-based-tara/stages/02-item-definition/legacy/agent.v1.js`, then delete-after-approval | A6, C14 |
| `tara-workspace/web-based-tara/CLAUDE.md` | Dual input Mode A and Mode B; `claude-sonnet` | update | A7 |
| `tara-workspace/web-based-tara/CONTEXT.md` | Routing table with old Stage 01 and asset list input | update | A7 |
| `tara-workspace/web-based-tara/orchestrator/run-web-tara.js` | Header lists a 7-stage sequence starting `01-item-definition`, `02-asset-analysis` | update (header comment only) | A6 |
| `tara-workspace/web-based-tara/stages/01-input-normalization/CONTEXT.md` | Old meaning: CSV or diagram to `asset-register.json`, no checkpoint | update | A7 |
| `tara-workspace/web-based-tara/stages/01-input-normalization/agent.js` | Old CSV and diagram agent; Anthropic key; `claude-opus` | move to `legacy/agent.csv-mode.js`, then delete-after-approval | A6, C14 |
| `tara-workspace/web-based-tara/stages/02-damage-analysis/CONTEXT.md` | Reads the asset register from Stage 01 | move (renumber to 04), update input path | A6 |
| `tara-workspace/web-based-tara/stages/02-damage-analysis/agent.js` | Asset register path; `claude-opus` | move (renumber to 04), update path; model | A6, C1 |
| `tara-workspace/web-based-tara/stages/03-threat-identification/agent.js` | `claude-opus` | move (renumber to 05); model | A6, C1 |
| `tara-workspace/web-based-tara/stages/04-attack-path-modelling/agent.js` | `claude-opus` | move (renumber to 06); model | A6, C1 |
| `tara-workspace/web-based-tara/stages/05-impact-analysis/agent.js` | `claude-opus` | move (renumber to 07); model | A6, C1 |
| `tara-workspace/web-based-tara/stages/07-risk-treatment/agent.js` | `claude-opus` | move (renumber to 09); model | A6, C1 |
| `tara-workspace/web-based-tara/stages/llm-client.js` | Anthropic is the default provider; `claude-opus` default; `hermes-3` free model default; images sent in Anthropic format on the OpenRouter path | update | C1 |

## 4. Backend (`checkpoint-api/`)

| File | What is stale | Proposed action | Task |
|---|---|---|---|
| `checkpoint-api/checkpoint_api/models.py` | `BoundaryState` blob (`merged_model`, `decisions`); `vehicle_type` required on assessments | update (new per-item tables), then delete-after-approval of the blob model | C3, C14 |
| `checkpoint-api/checkpoint_api/schemas.py` | Boundary blob schemas (`BoundarySeed`, `merged_model`); `vehicle_type` | update, then delete-after-approval of blob schemas | C3, C14 |
| `checkpoint-api/checkpoint_api/routers/boundary.py` | Blob endpoints; docstring points at `tara-workspace/stages/01-item-definition` | keep until replaced, supersede, then delete-after-approval | C9, C14 |
| `checkpoint-api/checkpoint_api/routers/assessments.py` | `vehicle_type` on create and response | update (after decision) | A3 (decision), C3 |
| `checkpoint-api/checkpoint_api/pipeline_runner.py` | Old stage folder map; Stage 01 run with `--csv`; forwards `ANTHROPIC_API_KEY`; outputs not per assessment | update | A6 (paths), C1 (provider) |
| `checkpoint-api/tests/test_backend_api.py` | Stage 01 CSV upload test; `vehicle_type` | update | A6, C3 |
| `checkpoint-api/tests/test_boundary.py` | Tests the blob endpoints | keep until C9, then delete-after-approval | C14 |

## 5. Frontend

| File | What is stale | Proposed action | Task |
|---|---|---|---|
| `frontend/src/components/workspace/BoundaryReview.tsx` | Review screen over the boundary blob | keep until replaced by `ItemDefinitionReview.tsx`, then delete-after-approval | C9, C14 |
| `frontend/src/types/item-definition.ts` | Blob types; vehicle-only enums (`ecu`, `CAN`, `BLE`); `openConflicts` uses `escalated_cp1` | update | C9 |
| `frontend/src/types/api.ts` | `vehicle_type` on assessments | update (after decision) | A3 (decision), C7 |
| `frontend/src/contexts/ProjectContext.tsx` | `vehicle_type` | update (after decision) | A3 (decision), C7 |
| `frontend/src/lib/mappers.ts` | `vehicle_type` | update (after decision) | A3 (decision), C7 |
| `frontend/src/types/tara.ts` | Tab id `asset-list`; not the old flow, the tab will show Stage 03 output | keep | C12 |
| `frontend/.lovable/plan.md` | UI generator plan; `asset-list` is a tab name only | keep | C12 |

## 6. Scripts, schemas and tests

| File | What is stale | Proposed action | Task |
|---|---|---|---|
| `scripts/demo-run.js` | Seeds the boundary blob; requires `tara-workspace/stages/01-item-definition/agent.js`; Anthropic key; `vehicle_type` | update path so it does not break, then delete-after-approval | A6, C14 |
| `scripts/validate-chain.js` | Chain starts from `stage-01-asset-register.json` | update | A6, C13 |
| `src/schemas/stage-01-asset-register.schema.json` | Asset register numbered Stage 01; `input_mode` field | move (rename to `stage-03-...`), then update fields | A6, C12 |
| `src/schemas/tool-use-schemas.json` | References `stage-01-asset-register.schema.json` | update | A6 |
| `tests/helpers/schema-validation.js` | Maps stage numbers to old schema names | update | A6 |
| `tests/schemas.test.js` | Old schema names | update | A6 |
| `tests/fixtures/valid/stage-01-asset-register.json` | Old stage number; `input_mode` | move (rename to `stage-03-...`), then update | A6, C12 |
| `tests/fixtures/invalid/stage-01-bad-no-ciaaan-true.json` | Old stage number; `input_mode` | move (rename to `stage-03-...`), then update | A6, C12 |
| `tests/agents/input-normalization.test.js` | Tests the legacy CSV and diagram agent | update path, then delete-after-approval | A6, C14 |
| `tests/agents/item-definition.test.js` | Tests the v1 agent and blob output | update path, then delete-after-approval | A6, C14 |
| `tests/agents/damage-analysis.test.js` | Stage path; asset register fixture; `ANTHROPIC_API_KEY` in mocks | update | A6, C1 |
| `tests/agents/threat-identification.test.js` | Stage path; `ANTHROPIC_API_KEY` in mocks | update | A6, C1 |
| `tests/agents/attack-path-modelling.test.js` | Stage path; `ANTHROPIC_API_KEY` in mocks | update | A6, C1 |
| `tests/agents/impact-analysis.test.js` | Stage path; `ANTHROPIC_API_KEY` in mocks | update | A6, C1 |
| `tests/agents/risk-treatment.test.js` | Stage path; asset register fixture; `ANTHROPIC_API_KEY` in mocks | update | A6, C1 |

## 7. Other documentation

| File | What is stale | Proposed action | Task |
|---|---|---|---|
| `docs/ARCHITECTURE.md` | Original 7-stage diagram (item definition, asset analysis) | supersede | A7 |
| `docs/README.md` | 7-stage pipeline; `claude-sonnet` | update | A7 |

---

## Governance conflicts (listed separately)

| # | Conflict | Where | Resolved by |
|---|---|---|---|
| G1 | Spec location: `.meta/specs/` versus `/Agents/Claude/SPECIFICATIONS/` (the second folder does not exist) | `.meta/CLAUDE.md` vs `.meta/WORKFLOW.md` | D-17, A5 |
| G2 | Who implements: Codex versus Qwen | `.meta/CLAUDE.md`, `Agents/Codex/` vs `.meta/WORKFLOW.md`, `README.md`, `.meta/SPEC-ENGINE-INITIALIZATION.md`, `Agents/Qwen/` | D-17, A5 |
| G3 | Two folders that differ only by case: `Agents/Claude/` and `Agents/claude/`. On Windows and macOS these collide into one folder | `Agents/` | A5 |
| G4 | Orchestrator header lists a 7-stage sequence (`01-item-definition`, `02-asset-analysis`, ...) that matches neither the 8 stage folders on disk nor the new 10-stage flow | `orchestrator/run-web-tara.js` | A6 |
| G5 | Status trackers disagree: `.meta/CONTEXT.md` marks most stages "Blocked", `.meta/CLAUDE.md` marks the same items "Complete" | `.meta/CONTEXT.md` vs `.meta/CLAUDE.md` | A5 |
| G6 | Spec numbering: two specs numbered 05; `08-residual-risk` stage folder has no spec; `.meta/CLAUDE.md` lists `09-orchestrator.md` while `09-checkpoint-api.md` uses number 09 | `.meta/specs/`, `.meta/CLAUDE.md` | A5 |
| G7 | Model named in docs (`claude-sonnet-4-20250514`) differs from the model in code (`claude-opus-4-8`); both conflict with DR-11 (OpenRouter, open-weight) | `tara-workspace/CLAUDE.md`, `web-based-tara/CLAUDE.md`, agents | A3 (D-10), C1 |

## Decisions this inventory needs

1. **`vehicle_type`** is required on every assessment (values like sedan or truck). It does not fit a web-based TARA. Options: make it optional, or replace it with TARA type. Proposed: record as a decision in A3, apply in C3 and C7.
2. **`scripts/demo-run.js`**: A6 moves the agent it loads. Proposed: A6 updates its path so nothing breaks, C14 deletes it.

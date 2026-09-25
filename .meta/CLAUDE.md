# TARA ICM Workspace: Governance

This is the one current governance document for building TARA Aegis. It says who does what, where specs live, and how work flows. The work plan itself is `.meta/CLAUDE-CODE-INSTRUCTIONS.md`.

---

## Roles

- **The analyst** (repo owner) decides. Every HUMAN GATE in the instructions stops for the analyst's go-ahead, and only the analyst confirms checkpoints in the running tool.
- **Claude Code** writes specs and implements them, one task at a time, following `.meta/CLAUDE-CODE-INSTRUCTIONS.md`.

No other implementer is used. Earlier Codex and Qwen documents are superseded or removed (decision D-17 in `.meta/DECISIONS.md`).

---

## Where things live

| What | Where |
|---|---|
| Work plan, rules and design reference | `.meta/CLAUDE-CODE-INSTRUCTIONS.md` |
| Task progress (the only status tracker) | `.meta/REBUILD-PROGRESS.md` |
| Decisions | `.meta/DECISIONS.md` |
| Domain glossary | `CONTEXT.md` (repo root) |
| Analyst answers on the Web Item Definition | `.meta/web-item-definition-questions.md` |
| Specs (the only spec location) | `.meta/specs/` |
| Routing for this meta-workspace | `.meta/CONTEXT.md` |

---

## ICM Architecture (5 Layers)

```
Layer 0: tara-workspace/web-based-tara/CLAUDE.md            Runtime identity. Always loaded.
Layer 1: tara-workspace/web-based-tara/CONTEXT.md           Stage routing. Loaded by orchestrator.
Layer 2: web-based-tara/stages/*/CONTEXT.md                 Per-stage instructions. Loaded per stage.
Layer 3: web-based-tara/_config/                            Static domain knowledge. Loaded selectively.
Layer 4: web-based-tara/stages/*/output/                    Runtime artifacts. Written/read per stage.
```

Multi-TARA type structure:
- `tara-workspace/web-based-tara/`: Web TARA module (MVP, active)
- `tara-workspace/vehicle-domain-tara/`: Vehicle/Domain TARA (future)
- `tara-workspace/ecu-component-tara/`: ECU/Component TARA (future)

Two ICM workspaces in this repo:
- `.meta/`: meta-workspace, how the tool is built
- `tara-workspace/`: runtime workspace, the TARA tool itself

---

## Spec Format

Every spec in `.meta/specs/` must include:

| Section | Content |
|---------|---------|
| Goal | What this module does in 1-2 sentences |
| Success Criteria | Verifiable: "run test X, check output Y" |
| File Ownership | Exact files the implementation WILL and WON'T touch |
| Input/Output | JSON schema references or schema inline |
| Process | Step-by-step what the implementation does |
| Validation Rules | What makes output valid/invalid |
| Error Conditions | What happens when input is bad |
| Verification Steps | How the implementation proves it works |

Max 800 tokens per spec. If longer, the spec covers too much: split it into several numbered specs.

---

## File Ownership

Claude Code may edit any file a task names; the task's "Do" list and rule R3 decide what is touched.

| Area | Path |
|---|---|
| Governance, specs, decisions | `.meta/` |
| Runtime identity and routing (Layers 0 and 1) | `tara-workspace/CLAUDE.md`, `tara-workspace/CONTEXT.md`, `tara-workspace/web-based-tara/CLAUDE.md`, `tara-workspace/web-based-tara/CONTEXT.md` |
| Stage instructions and agents (Layer 2) | `tara-workspace/web-based-tara/stages/<NN>-<name>/` |
| Domain knowledge (Layer 3) | `tara-workspace/web-based-tara/_config/` |
| Deterministic engines | `tara-workspace/web-based-tara/_engines/` |
| Model access (the only path to a model) | `tara-workspace/web-based-tara/stages/llm-client.js` |
| Store and API | `checkpoint-api/` |
| Screens | `frontend/` |
| Shared JSON contract | `src/schemas/` |
| Tests and fixtures | `tests/`, `checkpoint-api/tests/` |

Web stage folders after task A6:

| Stage | Folder |
|---|---|
| 01 Input Normalization | `stages/01-input-normalization/` |
| 02 Item Definition | `stages/02-item-definition/` |
| 03 Asset Identification | `stages/03-asset-identification/` |
| 04 Damage Analysis | `stages/04-damage-analysis/` |
| 05 Threat Identification | `stages/05-threat-identification/` |
| 06 Attack Path Modelling | `stages/06-attack-path-modelling/` |
| 07 Impact Analysis | `stages/07-impact-analysis/` |
| 08 Risk Scoring | `stages/08-risk-scoring/` |
| 09 Risk Treatment | `stages/09-risk-treatment/` |
| 10 Residual Risk | `stages/10-residual-risk/` |

---

## Workflow

```
Analyst names the next task
    ↓
Claude Code reads PART 1 and the task's Design Reference sections
    ↓
Spec first (Phase C tasks need an approved spec)
    ↓
Implement, run npm test and pytest
    ↓
One commit per task on the claude branch, pushed
    ↓
Update .meta/REBUILD-PROGRESS.md
    ↓
HUMAN GATE tasks stop for the analyst's go-ahead
```

---

## Spec Writing Rules

1. Specs are contracts. Once approved, they do not change mid-implementation.
2. If a schema must change, update the spec, all test fixtures and the decisions log together.
3. Never assume the implementation will "just know". Write it down.
4. Success criteria must be executable commands, not prose.
5. Keep specs under 800 tokens.

---

## Spec Register

Spec numbers are file IDs, not stage numbers. Two existing specs share number 05; they keep their names so existing references stay valid. Task progress lives in `.meta/REBUILD-PROGRESS.md`, not here.

| Spec | Covers (stage after A6) | Status |
|---|---|---|
| `00-json-schema-contracts.md` | Schemas for stages 04 onwards; old Stage 01 section replaced in B1 | in force, partly stale |
| `01-input-normalization-agent.md` | Old Stage 01 meaning | to be superseded in B1 |
| `item-definition-agent.md` | v1 Item Definition agent | to be superseded in B1 |
| `02-damage-analysis-agent.md` | Stage 04 | in force (paths in A6, model in C1) |
| `03-threat-identification-agent.md` | Stage 05 | in force (model in C1) |
| `04-attack-path-agent.md` | Stage 06 | in force (model in C1) |
| `05-cvss-afr-engine.md` | CVSS engine used by stages 06 and 08 | in force |
| `05-impact-analysis-agent.md` | Stage 07 | in force (model in C1) |
| `06-risk-scoring-engine.md` | Stage 08 | in force |
| `07-risk-treatment-agent.md` | Stage 09 | in force (paths in A6, model in C1) |
| `09-checkpoint-api.md` | Checkpoint API | in force; blob parts replaced in C3 and C9 |
| `10-backend-api.md` | Backend REST API | in force; `vehicle_type` made optional in C3 |
| `11-frontend-integration.md` | Frontend integration | in force; `vehicle_type` made optional in C7 |
| `WEB-TARA-MVP-ARCHITECTURE.md` | Old flow overview | to be superseded in A7 |
| `12a` to `12d` | Data contract and refusal rules | planned, B1 |
| `13-cp0-reading-review.md` | CP0 | planned, B5 |
| `14-cp1-item-definition-review.md` | CP1 | planned, B6 |
| `15-evaluation.md` | Evaluation scorer | planned, B7 |
| `16-asset-identification.md` | Stage 03 | planned, C12 |
| none | Stage 10 Residual Risk and the orchestrator | no spec; outside this rebuild |

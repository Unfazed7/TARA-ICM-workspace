# TARA ICM Workspace — Claude Specification Engine

## Identity

Claude is the **specification & design authority** for the TARA Aegis project.  
Every component Codex implements must trace to a Claude-authored spec in `.meta/specs/`.

**Claude writes specs. Codex writes code. Never swap roles.**

---

## Core Responsibilities

1. **Write architectural specs** — testable, measurable, unambiguous
2. **Define JSON schemas** — frozen before any implementation starts
3. **Write Layer 2-3 ICM files** — all `stages/*/CONTEXT.md` and `_config/` files
4. **Review Codex PRs** — spec compliance only, not code style
5. **Update module status** in CONTEXT.md after each spec or review

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
- `tara-workspace/web-based-tara/` — Web TARA module (MVP, active)
- `tara-workspace/vehicle-domain-tara/` — Vehicle/Domain TARA (future)
- `tara-workspace/ecu-component-tara/` — ECU/Component TARA (future)

Two ICM workspaces in this repo:
- `.meta/` — Meta-workspace (how Claude + Codex BUILD the tool)
- `tara-workspace/` — Runtime workspace (the TARA tool ITSELF)

---

## Spec Format

Every spec in `.meta/specs/` must include:

| Section | Content |
|---------|---------|
| Goal | What this module does in 1-2 sentences |
| Success Criteria | Verifiable: "run test X, check output Y" |
| File Ownership | Exact files Codex WILL and WON'T touch |
| Input/Output | JSON schema references or schema inline |
| Process | Step-by-step what the implementation does |
| Validation Rules | What makes output valid/invalid |
| Error Conditions | What happens when input is bad |
| Verification Steps | How Codex proves it works |

Max 800 tokens per spec. If longer: too much scope in one spec — split it.

---

## File Ownership

**Claude owns:**
```
.meta/                                          All specs, governance, workflow docs
tara-workspace/CLAUDE.md                        Top-level multi-TARA router (Layer 0)
tara-workspace/CONTEXT.md                       Top-level dispatcher (Layer 1)
tara-workspace/web-based-tara/CLAUDE.md         Web TARA identity (Layer 0)
tara-workspace/web-based-tara/CONTEXT.md        Web TARA stage routing (Layer 1)
tara-workspace/web-based-tara/stages/*/CONTEXT.md  Per-stage instructions (Layer 2)
tara-workspace/web-based-tara/_config/          Domain knowledge files (Layer 3)
Agents/claude/                                  Claude agent docs
```

**Codex owns:**
```
tara-workspace/web-based-tara/_engines/         Deterministic engine implementations
tara-workspace/web-based-tara/stages/*/agent.js AI stage agent implementations
tara-workspace/web-based-tara/orchestrator/     Pipeline runner
output-formatters/                              Excel formatter, audit trail
src/schemas/                                    JSON schema files
tests/                                          All tests and fixtures
Agents/Codex/                                   Codex protocol docs
```

---

## Workflow

```
Claude writes spec
    ↓
Commits to claude branch
    ↓
Opens PR: claude → develop
    ↓
Omkar reviews + merges
    ↓
Codex creates codex/{module} from develop
    ↓
Codex implements + opens PR: codex/{module} → develop
    ↓
Claude reviews (spec compliance)
    ↓
Omkar final merge → develop
    ↓
(milestone complete) develop → main → tag release
```

---

## Spec Writing Rules

1. Specs are contracts — once approved, don't change mid-implementation
2. If schema must change: Claude updates spec + all test fixtures + notifies Codex
3. Never assume Codex will "just know" — write it down
4. Success criteria must be executable commands, not prose
5. Keep specs under 800 tokens — concise and surgical

---

## Status Tracker

Last updated: 2026-05-31

**Active MVP: Web-Based TARA** — 8-stage pipeline, CIAAAN + CVSS v3.1 + 7-dimension impact

| Spec | File | Status | Notes |
|------|------|--------|-------|
| JSON Schema Contracts | `00-json-schema-contracts.md` | ✅ Complete | CIAAAN, 8-stage, full chain |
| Web-TARA MVP Architecture | `WEB-TARA-MVP-ARCHITECTURE.md` | ✅ Complete | |
| CVSS AFR Engine | `05-cvss-afr-engine.md` | ✅ Complete | Codex-ready |
| Stage 05 — Impact Analysis | `05-impact-analysis-agent.md` | ✅ Complete | Codex-ready |
| Stage 06 — Risk Scoring | `06-risk-scoring-engine.md` | ✅ Complete | Codex-ready |
| Stage 01 — Input Normalization | `01-input-normalization-agent.md` | ⏸ Blocked | Checkpoint API |
| Stage 02 — Damage Analysis | `02-damage-analysis-agent.md` | ⏸ Blocked | Checkpoint API |
| Stage 03 — Threat Identification | `03-threat-identification-agent.md` | ⏸ Blocked | Checkpoint API |
| Stage 04 — Attack Path Modelling | `04-attack-path-agent.md` | ⏸ Blocked | Checkpoint API |
| Stage 07 — Risk Treatment | `07-risk-treatment-agent.md` | ⏸ Blocked | Controls DB schema |
| Stage 08 — Residual Risk | `08-residual-risk-engine.md` | ⏸ Blocked | Custom logic needed |
| Orchestrator | `09-orchestrator.md` | ⏸ Blocked | All above + checkpoint API |
| Excel Formatter | `10-excel-formatter.md` | ⏸ Blocked | Needs stage 07 |
| Audit Trail | `11-audit-trail.md` | ⏸ Blocked | Needs all AI stages |

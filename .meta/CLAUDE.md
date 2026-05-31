# TARA ICM Workspace — Claude Specification Engine

## Identity

Claude is the **specification & design authority** for the TARA Lima project.  
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
Layer 0: tara-workspace/CLAUDE.md        Runtime identity. Always loaded.
Layer 1: tara-workspace/CONTEXT.md       Stage routing. Loaded by orchestrator.
Layer 2: stages/*/CONTEXT.md             Per-stage instructions. Loaded per stage.
Layer 3: _config/                        Static domain knowledge. Loaded selectively.
Layer 4: stages/*/output/                Runtime artifacts. Written/read per stage.
```

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
.meta/                          All specs, governance, workflow docs
tara-workspace/CLAUDE.md        Layer 0 runtime identity
tara-workspace/CONTEXT.md       Layer 1 stage routing
tara-workspace/stages/*/CONTEXT.md   Layer 2 per-stage instructions
tara-workspace/_config/         Layer 3 domain knowledge files
Agents/claude/                  Claude agent docs
```

**Codex owns:**
```
tara-workspace/_engines/        Deterministic engine implementations
tara-workspace/stages/*/agent.js  AI stage agent implementations
tara-workspace/orchestrator/    Pipeline runner
output-formatters/              Excel formatter, audit trail
src/schemas/                    JSON schema files
tests/                          All tests and fixtures
Agents/Codex/                   Codex protocol docs
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

| Spec | File | Status |
|------|------|--------|
| JSON Schema Contracts | `00-json-schema-contracts.md` | ✅ Complete |
| Web-TARA MVP Architecture | `WEB-TARA-MVP-ARCHITECTURE.md` | ✅ Complete |
| Feasibility Engine | `05-feasibility-engine.md` | 📋 Write next (no blockers) |
| Risk Engine | `05-risk-engine.md` | 📋 Write next (no blockers) |
| Item Definition Agent | `01-item-definition-agent.md` | ⏸ Blocked: checkpoint API |
| Asset Analysis Agent | `02-asset-analysis-agent.md` | ⏸ Blocked: checkpoint API |
| Impact Analysis Agent | `03-impact-analysis-agent.md` | ⏸ Blocked: checkpoint API |
| Threat Analysis Agent | `04-threat-analysis-agent.md` | ⏸ Blocked: checkpoint API |
| Risk Treatment Agent | `06-risk-treatment-agent.md` | ⏸ Blocked: controls DB schema |
| Residual Risk Engine | `07-residual-risk-engine.md` | ⏸ Blocked: custom logic |
| Orchestrator | `09-orchestrator.md` | ⏸ Blocked: all above |
| Excel Formatter | `10-excel-formatter.md` | ⏸ Blocked: stage 07 |
| Audit Trail | `11-audit-trail.md` | ⏸ Blocked: all AI stages |

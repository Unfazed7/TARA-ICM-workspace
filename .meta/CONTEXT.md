# TARA ICM Workspace — Module Status & Routing

Last updated: 2026-05-31  
Scope: Web-Based Automotive Application TARA, MVP Phase

---

## Quick Status

| Module | Spec | Implementation | Notes |
|--------|------|---------------|-------|
| JSON Schemas | ✅ Done | 📋 Codex: start `codex/schemas` | Spec 00 complete |
| Feasibility Engine | 📋 Write now | 📋 After spec | No blockers |
| Impact Engine | 📋 Write now | 📋 After spec | No blockers |
| Risk Score Engine | 📋 Write now | 📋 After spec | No blockers |
| Stage 01 Agent | ⏸ Blocked | ⏸ Blocked | Needs checkpoint API |
| Stage 02 Agent | ⏸ Blocked | ⏸ Blocked | Needs checkpoint API |
| Stage 03 Agent | ⏸ Blocked | ⏸ Blocked | Needs checkpoint API |
| Stage 04 Agent | ⏸ Blocked | ⏸ Blocked | Needs checkpoint API |
| Stage 05 Runner | 📋 Write after engines | 📋 After spec | Wraps deterministic engines |
| Stage 06 Agent | ⏸ Blocked | ⏸ Blocked | Needs controls DB schema |
| Stage 07 Runner | ⏸ Blocked | ⏸ Blocked | Needs residual risk logic |
| Orchestrator | ⏸ Blocked | ⏸ Blocked | Needs all stages + checkpoint API |
| Excel Formatter | ⏸ Blocked | ⏸ Blocked | Needs stage 07 |
| Audit Trail | ⏸ Blocked | ⏸ Blocked | Needs all AI stages |

---

## Blocked Items (From Omkar)

| Item | Unblocks | Status |
|------|----------|--------|
| Checkpoint API contract (URL, auth, req/res format) | Specs 01-04, orchestrator | ⏸ PENDING |
| Controls DB schema (type, tables, access method) | Spec 06 | ⏸ PENDING |
| Residual risk calculation logic | Spec 07 | ⏸ PENDING |
| Frontend repo URL | UI integration | ⏸ PENDING |

---

## Module Routing

| Request | Module | Spec | Branch |
|---------|--------|------|--------|
| Implement JSON schemas | JSON Schemas | `00-json-schema-contracts.md` | `codex/schemas` |
| Implement feasibility calculator | Feasibility Engine | `05-feasibility-engine.md` (TODO) | `codex/engines` |
| Implement impact rater | Impact Engine | `05-impact-engine.md` (TODO) | `codex/engines` |
| Implement risk scorer | Risk Engine | `05-risk-engine.md` (TODO) | `codex/engines` |
| Implement Stage 1 agent | Item Definition | `01-item-definition-agent.md` (TODO) | `codex/stage-01` |
| Implement Stage 2 agent | Asset Analysis | `02-asset-analysis-agent.md` (TODO) | `codex/stage-02` |
| Implement Stage 3 agent | Impact Analysis | `03-impact-analysis-agent.md` (TODO) | `codex/stage-03` |
| Implement Stage 4 agent | Threat Analysis | `04-threat-analysis-agent.md` (TODO) | `codex/stage-04` |
| Implement Stage 6 agent | Risk Treatment | `06-risk-treatment-agent.md` (TODO) | `codex/stage-06` |
| Implement orchestrator | Orchestrator | `09-orchestrator.md` (TODO) | `codex/orchestrator` |
| Implement Excel output | Excel Formatter | `10-excel-formatter.md` (TODO) | `codex/output-formatters` |
| Implement audit trail | Audit Trail | `11-audit-trail.md` (TODO) | `codex/output-formatters` |

---

## What Codex Can Start Today

1. **`codex/schemas`** — Read `00-json-schema-contracts.md`, create all 7 JSON schema files in `src/schemas/`
2. **`codex/engines`** — Engines spec coming soon (no external blockers). Implement once spec is merged.

---

## Architecture Reference

Full architecture: `.meta/specs/WEB-TARA-MVP-ARCHITECTURE.md`  
JSON schemas: `.meta/specs/00-json-schema-contracts.md`  
Git workflow: `Agents/Codex/BRANCH-WORKFLOW.md`  
Codex rules: `Agents/Codex/CODEX-PROTOCOL.md`

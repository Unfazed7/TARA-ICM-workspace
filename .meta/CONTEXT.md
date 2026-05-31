# TARA ICM Workspace — Module Status & Routing

Last updated: 2026-05-31  
Scope: Web-Based Automotive Application TARA, MVP Phase  
Architecture: Multi-TARA type isolation (web-based-tara/ | vehicle-domain-tara/ | ecu-component-tara/)

---

## Quick Status

**Web-Based TARA MVP — 8-Stage Pipeline**

| Stage | Name | Spec | Implementation | Notes |
|-------|------|------|---------------|-------|
| — | JSON Schemas | ✅ Done (needs CIAAAN update) | 📋 Codex: `codex/schemas` | CIA → CIAAAN |
| — | CVSS AFR Engine | 📋 Write next | 📋 After spec | No blockers |
| — | Impact Rating Engine | 📋 Write next | 📋 After spec | No blockers |
| — | Risk Score Engine | 📋 Write next | 📋 After spec | No blockers |
| 01 | Input Normalization | ⏸ Blocked | ⏸ Blocked | Checkpoint API |
| 02 | Damage Analysis | ⏸ Blocked | ⏸ Blocked | Checkpoint API |
| 03 | Threat Identification | ⏸ Blocked | ⏸ Blocked | Checkpoint API |
| 04 | Attack Path Modelling | ⏸ Blocked | ⏸ Blocked | Checkpoint API |
| 05 | Impact Analysis | 📋 Write next | 📋 After spec | No blockers |
| 06 | Risk Scoring | 📋 Write next | 📋 After spec | Wraps risk-score.js |
| 07 | Risk Treatment | ⏸ Blocked | ⏸ Blocked | Controls DB schema |
| 08 | Residual Risk | ⏸ Blocked | ⏸ Blocked | Custom logic needed |
| — | Orchestrator | ⏸ Blocked | ⏸ Blocked | All stages + checkpoint API |
| — | Excel Formatter | ⏸ Blocked | ⏸ Blocked | Needs stage 07 |
| — | Audit Trail | ⏸ Blocked | ⏸ Blocked | Needs all AI stages |

---

## Blocked Items (From Omkar)

| Item | Unblocks | Status |
|------|----------|--------|
| Checkpoint API contract (URL, auth, req/res format) | Stage 01-04 specs, orchestrator | ⏸ PENDING |
| Controls DB schema (structure, access method, fields) | Stage 07 spec | ⏸ PENDING |
| Residual risk calculation logic | Stage 08 spec | ⏸ PENDING |
| Frontend repo URL | UI integration | ⏸ PENDING |

---

## What Codex Can Start Today

1. **`codex/schemas`** — Read `00-json-schema-contracts.md`, create all stage JSON schema files in `src/schemas/`
   - Note: Schema spec needs CIAAAN update before Codex touches Stage 01 schema
2. **`codex/engines`** — CVSS AFR + Impact Rating + Risk Score engine specs coming soon. Implement once specs are merged.

---

## Module Routing

| Request | Module | Spec file | Codex branch |
|---------|--------|-----------|--------------|
| Implement JSON schemas | JSON Schemas | `00-json-schema-contracts.md` | `codex/schemas` |
| Implement CVSS AFR calculator | CVSS AFR Engine | `05-cvss-afr-engine.md` (TODO) | `codex/engines` |
| Implement impact rater | Impact Engine | `05-impact-engine.md` (TODO) | `codex/engines` |
| Implement risk scorer | Risk Engine | `05-risk-engine.md` (TODO) | `codex/engines` |
| Implement Stage 01 agent | Input Normalization | `01-input-normalization-agent.md` (TODO) | `codex/stage-01` |
| Implement Stage 02 agent | Damage Analysis | `02-damage-analysis-agent.md` (TODO) | `codex/stage-02` |
| Implement Stage 03 agent | Threat Identification | `03-threat-identification-agent.md` (TODO) | `codex/stage-03` |
| Implement Stage 04 agent | Attack Path Modelling | `04-attack-path-agent.md` (TODO) | `codex/stage-04` |
| Implement Stage 05 agent | Impact Analysis | `05-impact-analysis-agent.md` (TODO) | `codex/stage-05` |
| Implement Stage 06 runner | Risk Scoring | `06-risk-scoring-engine.md` (TODO) | `codex/stage-06` |
| Implement Stage 07 agent | Risk Treatment | `07-risk-treatment-agent.md` (TODO) | `codex/stage-07` |
| Implement Stage 08 runner | Residual Risk | `08-residual-risk-engine.md` (TODO) | `codex/stage-08` |
| Implement orchestrator | Orchestrator | `09-orchestrator.md` (TODO) | `codex/orchestrator` |
| Implement Excel output | Excel Formatter | `10-excel-formatter.md` (TODO) | `codex/output-formatters` |
| Implement audit trail | Audit Trail | `11-audit-trail.md` (TODO) | `codex/output-formatters` |

---

## Architecture Reference

Full architecture: `.meta/specs/WEB-TARA-MVP-ARCHITECTURE.md`  
JSON schemas: `.meta/specs/00-json-schema-contracts.md`  
Git workflow: `Agents/Codex/BRANCH-WORKFLOW.md`  
Codex rules: `Agents/Codex/CODEX-PROTOCOL.md`

Web TARA identity: `tara-workspace/web-based-tara/CLAUDE.md`  
Web TARA stage routing: `tara-workspace/web-based-tara/CONTEXT.md`

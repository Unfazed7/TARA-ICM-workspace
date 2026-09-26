# Web-Based TARA: Runtime Identity (Layer 0)

**Tool:** TARA Aegis, Web-Based Application TARA module
**Models:** open-weight models through OpenRouter, pinned per stage in `_config/models.json` (filled in task C1). All model calls go through `stages/llm-client.js`.
**Standards:** ISO/SAE 21434, ISO/IEC 27001:2022, ISO/IEC 27005:2022, OWASP, CVSS v3.1
**Scope:** SaaS platforms, automotive cloud backends, web diagnostic portals, OTA management systems

---

## What This Module Does

Runs a 10-stage TARA on a web-based automotive application. Stages 01 to 03 build an agreed picture of the system with the analyst before any risk work starts.

| Stage | Name | Type | Output | Checkpoint |
|-------|------|------|--------|------------|
| 01 | Input Normalization | AI plus deterministic reconciliation | `document-register.json`, `facts.json` | CP0 Reading review |
| 02 | Item Definition | AI plus deterministic grouping | `item-definition.json`, `questions.json` | CP1 Item Definition review |
| 03 | Asset Identification | AI | `asset-register.json` (CIAAAN) | light asset review |
| 04 | Damage Analysis | AI | `damage-scenarios.json` (DS_##) | required |
| 05 | Threat Identification | AI | `threats.json` (TH_##) | required |
| 06 | Attack Path Modelling | AI plus CVSS engine | `attack-paths.json` (AT_##) | required |
| 07 | Impact Analysis | AI | `impact-analysis.json` (7-dimension) | required |
| 08 | Risk Scoring | Deterministic | `risk-register.json` (RSK_##) | none |
| 09 | Risk Treatment | AI | `risk-treatment.json` (TRT_##) | optional |
| 10 | Residual Risk | Deterministic | `residual-risk.json` | none |

---

## Rules for Stages 01 to 03

1. **Read client documents once.** Only Stage 01 reads client documents. No stage after CP0 re-reads them. Stage 02 works only from facts confirmed at CP0 and the analyst's answers. No stage after CP1 reads anything except the finalized Item Definition and later stage outputs.
2. **Only the analyst confirms.** Only the analyst can confirm CP0 and CP1. No model-facing code path calls a confirm endpoint.
3. **Sources on every fact.** Every fact carries at least one source reference (document, location, short quote). The API refuses anything without one.
4. **Plain language to the analyst.** Conclusion first, then reason, then source. One idea per sentence, one question per card. Never show rule IDs, scores or internal labels.
5. **Say what you do not know.** If nothing stored supports an answer, say it is an open question. Never guess.
6. **One path to a model.** Every model call goes through `stages/llm-client.js`, using OpenRouter with the model and provider pinned in `_config/models.json`.
7. **Web variant only.** Never blend in the vehicle Item Definition. A vehicle the item talks to is one external element at the edge.

## Rules for Stages 04 to 10

1. **CIAAAN, not CIA.** Use all 6 properties; derive one DS_## per asset and applicable property.
2. **CVSS v3.1 metrics.** Estimate AV, AC, PR, UI; `cvss-afr-calc.js` computes the score.
3. **Never generate numeric scores.** Engines do all numeric computation.
4. **Tool use for all output.** No free-text JSON; every agent submits through a tool call.
5. **Safety and Financial for the tool user are always NA.** Do not compute; set as Negligible by rule.
6. **Damage scenario first, threat second.** Derive TH_## from DS_##, not from the CIAAAN label alone.
7. **Asset-specific threats.** Self-test: could this threat apply to a different asset unchanged? If yes, derive it again.
8. **Deeper reasoning for Stage 06 only.** Attack path reasoning needs depth; other stages use standard calls.

---

## What Makes Web TARA Different

| Dimension | Web-Based TARA | ECU/Vehicle TARA |
|-----------|---------------|-----------------|
| Cybersecurity properties | **CIAAAN** (6) | CIA (3) |
| Feasibility method | **CVSS v3.1 Exploitability** | ISO 21434 AFR (5 sub-factors) |
| Impact dimensions | **7-dimension** (S+P+F+O tool user; L+F+B others) | SFOP (4-dimension) |
| Threat library | OWASP Top 10, OWASP API Top 10 | AUTOSAR, UDS, CAN attacks |
| Asset types | API endpoints, auth tokens, cloud services | ECUs, CAN signals, firmware |
| Safety impact (tool user) | **Always NA**: web tools cannot cause physical harm | Applicable |
| Financial impact (tool user) | **Always NA**: web diagnostic tools do not handle user money | N/A |
| Primary standards | NIST 800-53, ISO 27001 Annex A | ISO 21434 Clause 15 controls |

---

## CIAAAN Properties

| Property | Symbol | Web Relevance |
|----------|--------|--------------|
| Confidentiality | C | PII, credentials, session tokens, API responses |
| Integrity | I | Data accuracy, firmware packages, audit logs |
| Availability | A | Service uptime, API responsiveness |
| Authenticity | Au | Identity verification, message origin validation |
| Authorization | Az | Access control, privilege enforcement |
| Non-repudiation | NR | Audit trail, action attribution |

---

## Layer Structure

```
Layer 0: web-based-tara/CLAUDE.md               <- THIS FILE
Layer 1: web-based-tara/CONTEXT.md              <- Stage routing
Layer 2: web-based-tara/stages/*/CONTEXT.md     <- Per-stage instructions
Layer 3: web-based-tara/_config/                <- Domain knowledge (read-only)
Layer 4: web-based-tara/stages/*/output/        <- Runtime artifacts
```

Once a stage's output is seeded into `checkpoint-api`, later stages read the confirmed state from the API, not from these output files.

---

**This file is read-only at runtime. Load next: `CONTEXT.md` for stage routing.**

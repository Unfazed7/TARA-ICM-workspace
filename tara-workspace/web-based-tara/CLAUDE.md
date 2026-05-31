# Web-Based TARA — Runtime Identity (Layer 0)

**Tool:** TARA Lima — Web-Based Application TARA Module  
**Model:** claude-sonnet-4-20250514  
**Standards:** ISO/SAE 21434 + ISO/IEC 27001:2022 + ISO/IEC 27005:2022 + OWASP + CVSS v3.1  
**Scope:** SaaS platforms, automotive cloud backends, web diagnostic portals, OTA management systems

---

## What This Module Does

Runs an 8-stage automated TARA on a web-based automotive application:

| Stage | Name | Type | Output |
|-------|------|------|--------|
| 01 | Input Normalization | AI or Deterministic | asset-register.json (CIAAAN) |
| 02 | Damage Analysis | AI | damage-scenarios.json (DS_##) |
| 03 | Threat Identification | AI | threats.json (TH_##) |
| 04 | Attack Path Modelling | AI (extended thinking) | attack-paths.json (AT_##) |
| 05 | Impact Analysis | AI | impact-analysis.json (7-dimension) |
| 06 | Risk Scoring | Deterministic | risk-register.json (RSK_##) |
| 07 | Risk Treatment | AI | risk-treatment.json (TRT_##) — BLOCKED |
| 08 | Residual Risk | Deterministic | residual-risk.json — BLOCKED |

---

## What Makes Web TARA Different

| Dimension | Web-Based TARA | ECU/Vehicle TARA |
|-----------|---------------|-----------------|
| Cybersecurity properties | **CIAAAN** (6) | CIA (3) |
| Feasibility method | **CVSS v3.1 Exploitability** | ISO 21434 AFR (5 sub-factors) |
| Impact dimensions | **7-dimension** (S+P+F+O tool user; L+F+B others) | SFOP (4-dimension) |
| Threat library | OWASP Top 10, OWASP API Top 10 | AUTOSAR, UDS, CAN attacks |
| Asset types | API endpoints, auth tokens, cloud services | ECUs, CAN signals, firmware |
| Safety impact (tool user) | **Always NA** — web tools cannot cause physical harm | Applicable |
| Financial impact (tool user) | **Always NA** — web diagnostic tools don't handle user money | N/A |
| Primary standards | NIST 800-53, ISO 27001 Annex A | ISO 21434 Clause 15 controls |

---

## CIAAAN Properties

All 6 cybersecurity properties apply to web assets:

| Property | Symbol | Web Relevance |
|----------|--------|--------------|
| Confidentiality | C | PII, credentials, session tokens, API responses |
| Integrity | I | Data accuracy, firmware packages, audit logs |
| Availability | A | Service uptime, API responsiveness |
| Authenticity | Au | Identity verification, message origin validation |
| Authorization | Az | Access control, privilege enforcement |
| Non-repudiation | NR | Audit trail, action attribution |

---

## Dual Input Mode

This module accepts EITHER input type. Output is always identical.

```
Mode A: Asset List CSV  →  validate + normalize  →  asset-register.json
Mode B: Architecture PNG  →  Claude Vision extract  →  asset-register.json
                                                            ↓
                                              All subsequent stages
                                              read only from asset-register.json
```

Downstream stages never know which input mode was used.

---

## Rules for AI Agents in This Module

1. **CIAAAN, not CIA** — use all 6 properties; derive one DS_## per asset × applicable property
2. **CVSS v3.1 metrics** — estimate AV, AC, PR, UI; `cvss-afr-calc.js` computes the score
3. **Never generate numeric scores** — engines do all numeric computation
4. **Tool Use for all output** — no free-text JSON; every agent uses tool_use to submit
5. **Safety + Financial for Tool User = NA always** — do not compute; set as Negligible by rule
6. **Damage scenario first, threat second** — derive TH_## from DS_##, not from CIAAAN label alone
7. **Asset-specific threats** — self-test: can this threat apply to a different asset unchanged? If yes, rederive.
8. **Extended thinking Stage 04 only** — attack path reasoning requires depth; other stages use standard

---

## Layer Structure

```
Layer 0: web-based-tara/CLAUDE.md               ← THIS FILE
Layer 1: web-based-tara/CONTEXT.md              ← Stage routing
Layer 2: web-based-tara/stages/*/CONTEXT.md     ← Per-stage instructions
Layer 3: web-based-tara/_config/                ← Domain knowledge (read-only)
Layer 4: web-based-tara/stages/*/output/        ← Runtime artifacts
```

---

**This file is read-only at runtime. Load next: `CONTEXT.md` for stage routing.**

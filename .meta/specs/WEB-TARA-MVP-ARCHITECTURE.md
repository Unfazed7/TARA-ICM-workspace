# WEB-TARA MVP ARCHITECTURE

**Status:** ACTIVE  
**Author:** Claude (Specification Engine)  
**For:** Codex (Implementation Engine) + Omkar (Review)  
**Scope:** Web-Based Automotive Application TARA, MVP Phase  
**Date:** 2026-05-31

---

## 1. What We Are Building

TARA Lima — automated Threat Analysis & Risk Assessment tool for web-based automotive applications.

**Target systems (MVP):** Azure-hosted automotive web platforms — diagnostic portals, licensing services, telematics backends, OTA update management systems.

**Not in scope for MVP:** ECU TARA, hardware/CAN bus analysis, embedded firmware.

**Input:** Architecture diagram (PNG/JSON) + feature list (XLSX/JSON)  
**Output:** ISO/SAE 21434-compliant TARA report (Excel .xlsm) + audit trail (JSON)  
**Time target:** ~45 minutes automated vs 3-5 days manual

---

## 2. Why We Improve the Existing Basic Agent

The current basic agent (single monolithic prompt → CSV output) works but has critical gaps:

| Gap | Risk |
|-----|------|
| Single API call for all stages | Context overflow at scale; no stage isolation |
| Free-text JSON output (no tool_use) | Schema drift between runs; not auditable |
| AI generates risk scores | Non-reproducible; violates ISO 21434 AFR requirement |
| Missing Stage 1 (Item Definition) | No structured asset boundary — assets unanchored |
| Missing Stage 2 (Asset Analysis) | No CIA classification before impact ratings |
| Missing Stage 6 (Risk Treatment) | No control recommendations — TARA incomplete |
| Missing Stage 7 (Residual Risk) | No post-treatment validation — R155 non-compliant |
| No audit trail | Not ISO 21434 compliant |
| CSV output only | No compliance-ready Excel deliverable |

The improved architecture fixes all of these.

---

## 3. The 7-Stage Pipeline

ISO 21434 Clauses 15.4–15.11 map to exactly 7 stages:

| Stage | Clause | Type | Input | Output |
|-------|--------|------|-------|--------|
| 01 Item Definition | 15.4 | AI (Vision) | architecture.png + features.xlsx | item-definition.json |
| 02 Asset Analysis | 15.5 | AI | item-definition.json | asset-register.json |
| 03 Impact Analysis | 15.7 | AI + Engine | asset-register.json | impact-analysis.json |
| 04 Threat Analysis | 15.6/15.8/15.9 | AI (extended thinking) | impact-analysis.json + asset-register.json | threat-analysis.json |
| 05 Risk Determination | 15.10 | Deterministic only | threat-analysis.json + impact-analysis.json | risk-register.json |
| 06 Risk Treatment | 15.11 | AI | risk-register.json + controls-db | risk-treatment.json |
| 07 Residual Risk | 15.11 | Deterministic only | risk-register.json + risk-treatment.json | residual-risk-register.json |

**AI never generates numbers. All risk scores, impact ratings, feasibility values = deterministic engines.**

---

## 4. Web-Specific Adaptations

### 4.1 Asset Taxonomy (Stage 2)
Web assets differ from ECU assets:

| ECU TARA | Web-Based TARA |
|----------|----------------|
| CAN bus, LIN bus | REST API endpoints, WebSocket connections |
| Firmware image | Authentication tokens (JWT, OAuth) |
| AUTOSAR service | Azure cloud service (Key Vault, App Service) |
| OBD-II port | Admin portal, API gateway |
| ECU flash memory | Database tables, configuration stores |
| CAN message | Session state, user data flows |

Config file `_config/web-asset-types.md` defines the full taxonomy.

### 4.2 Threat Library (Stage 4)
Web threats map to STRIDE but need OWASP context:

| OWASP Top 10 (2021) | STRIDE Category | Automotive Relevance |
|---------------------|-----------------|----------------------|
| A01 Broken Access Control | Elevation of Privilege | Diagnostic portal unauthorized vehicle access |
| A02 Cryptographic Failures | Information Disclosure | License key exposure, PII leakage |
| A03 Injection | Tampering | Fleet management data manipulation |
| A04 Insecure Design | Elevation of Privilege | Missing auth on OTA update endpoint |
| A05 Security Misconfiguration | Information Disclosure | Azure storage public exposure |
| A06 Vulnerable Components | Tampering | Outdated dependencies in backend |
| A07 Auth/Session Failures | Spoofing | Session hijacking, token theft |
| A08 Data Integrity Failures | Tampering | OTA package manipulation without signing |
| A09 Logging Failures | Repudiation | No audit trail for diagnostic commands |
| A10 SSRF | Information Disclosure | Internal Azure service enumeration |

Config file `_config/owasp-stride-mapping.md` defines the full mapping.

### 4.3 Control Catalog (Stage 6)
Web app controls come from multiple standards:
- NIST 800-53 Rev 5 (primary for US-market automotive)
- OWASP ASVS 4.0 (web app specific)
- Azure Security Benchmark (cloud deployment)
- ISO 27001:2022 Annex A (enterprise controls)
- ISO/SAE 21434 security controls

Controls are queried from Omkar's controls database (schema TBD — spec 06 blocked pending this).

---

## 5. Deterministic Engines (Build First — Zero Dependencies)

These 3 functions have no dependencies on AI stages, database, or external APIs.  
Codex builds them first. Test them fully before any AI stage.

### 5.1 feasibility-calc.js

```
Location: tara-workspace/_engines/feasibility-calc.js
Input:    { elapsed_time, expertise_required, knowledge_of_target, opportunity_window, equipment_cost }
          Each sub-factor: integer 1-5
Scale:    5 = easiest/fastest/cheapest | 1 = hardest/slowest/most expensive
Formula:  AFR per ISO/SAE 21434 Clause 15.9
Output:   { feasibility_rating_value: integer 1-5 }
```

Sub-factor scales:
- elapsed_time: 5=seconds, 4=hours, 3=days, 2=weeks, 1=months+
- expertise_required: 5=novice, 4=informed user, 3=competent, 2=expert, 1=nation-state
- knowledge_of_target: 5=fully public, 4=restricted, 3=sensitive, 2=critical, 1=zero
- opportunity_window: 5=always open, 4=easy, 3=moderate, 2=difficult, 1=rare/brief
- equipment_cost: 5=free tools, 4=affordable, 3=moderate, 2=expensive, 1=millions

### 5.2 impact-rating.js

```
Location: tara-workspace/_engines/impact-rating.js
Input:    { safety: 0-4, financial: 0-4, operational: 0-4, privacy: 0-4 }
Formula:  impact_rating_value = max(safety, financial, operational, privacy)
Output:   { impact_rating_value: 1-4, impact_rating_level: string }
Mapping:  0=not applicable, 1=negligible, 2=minor, 3=major, 4=severe
```

### 5.3 risk-score.js

```
Location: tara-workspace/_engines/risk-score.js
Input:    impact_rating_value (1-4), feasibility_rating_value (1-5)
Formula:  risk_score = impact_rating_value × feasibility_rating_value
Matrix:   _config/iso-21434-risk-matrix.json
Output:   { risk_score: 1-20, risk_level: string, risk_rank: integer }
Levels:   low: 1-4, medium: 5-8, high: 9-14, critical: 15-20
```

---

## 6. AI Agent Design Principles

All AI stages follow these rules:

1. **Tool use for output** — never prompt-for-JSON. Use `tool_use` to submit structured output.
2. **Context minimization** — each stage loads only its Layer 3 files (see CONTEXT.md routing table).
3. **Extended thinking Stage 4 only** — deepest reasoning for attack path analysis.
4. **One API call per stage** — no chaining multiple calls within one stage (except retries).
5. **Audit every call** — log model, tokens, context loaded, input hash, output hash, timestamp.

---

## 7. Checkpoint Protocol

Checkpoints are a compliance requirement (UNECE WP.29/R155), not optional.

| Stage | Checkpoint | Mechanism |
|-------|-----------|-----------|
| 01 Item Definition | Required | POST to checkpoint API |
| 02 Asset Analysis | Required | POST to checkpoint API |
| 03 Impact Analysis | Required | POST to checkpoint API |
| 04 Threat Analysis | Required | POST to checkpoint API |
| 05 Risk Determination | None | Deterministic — no human review needed |
| 06 Risk Treatment | Optional (org policy) | POST to checkpoint API if configured |
| 07 Residual Risk | None | Deterministic |

Checkpoint API contract (TBD — blocked item from Omkar):
```
POST {checkpoint_url}
Body: { stage_id: "01-item-definition", output_json: {...}, assessment_id: "TARA-xxx" }
Response: { approved: boolean, feedback?: string }
```

Fallback (until API is provided): write `.APPROVED` file to `stages/0X/output/`.

---

## 8. Output Artifacts

| Artifact | Location | Format | Purpose |
|----------|----------|--------|---------|
| Stage JSONs | `stages/0X/output/*.json` | JSON | Inter-stage data transfer |
| TARA Final Package | `outputs/json/tara-final-package.json` | JSON | All 7 stages merged |
| Excel Report | `outputs/excel/TARA_Report_YYYY-MM-DD.xlsm` | Excel | Compliance deliverable |
| Audit Trail | `outputs/audit-trail/audit-trail.json` | JSON | Every Claude API call logged |

---

## 9. Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Runtime | Node.js 18+ | Owns the code, no framework lock |
| AI model | claude-sonnet-4-20250514 | Best quality/cost for TARA reasoning |
| AI output | Tool use (not prompt) | Schema reliability |
| Frameworks | None | No LangChain, no CrewAI, no n8n |
| Excel | ExcelJS | Native Node.js, no external service |
| Schema validation | AJV | Fast, JSON Schema draft 7 |
| Staging storage | Filesystem JSON | ICM principle — transparent, versionable |
| Database | Omkar's controls DB | Schema TBD |

---

## 10. MVP Scope

### In MVP
- Upload architecture diagram (PNG, max 20MB) or structured JSON
- Run all 7 stages with checkpoint gates
- View stage-by-stage output
- Download Excel compliance report
- Full audit trail per assessment

### Out of MVP (Phase 2)
- Real-time streaming progress via WebSocket
- Multi-user concurrent assessments
- Versioned TARA comparison
- Custom control template upload
- Programmatic API access
- Mobile UI

---

## 11. Cost Per Assessment

| Stage | AI Cost | Notes |
|-------|---------|-------|
| 01 | ~$0.015 | Vision input |
| 02 | ~$0.035 | Standard Claude call |
| 03 | ~$0.050 | Standard Claude call |
| 04 | ~$0.400 | Extended thinking — most expensive |
| 05 | $0.000 | Deterministic only |
| 06 | ~$0.035 | Standard Claude call |
| 07 | $0.000 | Deterministic only |
| **Total** | **~$0.55** | vs $3,000-5,000 manual |

---

## 12. Blocked Items (Spec Writing Cannot Proceed Without These)

| Item | Blocks | Status |
|------|--------|--------|
| Controls DB schema (type, table structure, access method) | Spec 06 (Risk Treatment) | Awaiting Omkar |
| Checkpoint API contract (URL, auth, request/response format) | Specs 01-04, Orchestrator | Awaiting Omkar |
| Residual risk calculation logic | Spec 07 (Residual Risk) | Awaiting Omkar |
| Frontend repo access | UI integration specs | Awaiting Omkar |

---

## 13. Spec Writing Order

Codex can start today with spec 00 (schemas) and engines spec. Everything else waits for blocked items.

| Order | Spec | Blocks Codex? | Status |
|-------|------|--------------|--------|
| 00 | json-schema-contracts.md | codex/schemas | DONE |
| — | WEB-TARA-MVP-ARCHITECTURE.md (this) | Overall context | DONE |
| 1 | 05-feasibility-engine.md | codex/engines | Can write NOW |
| 2 | 05-risk-engine.md | codex/engines | Can write NOW |
| 3 | 01-item-definition-agent.md | codex/stage-01 | Needs checkpoint API |
| 4 | 02-asset-analysis-agent.md | codex/stage-02 | Needs checkpoint API |
| 5 | 03-impact-analysis-agent.md | codex/stage-03 | Needs checkpoint API |
| 6 | 04-threat-analysis-agent.md | codex/stage-04 | Needs checkpoint API |
| 7 | 06-risk-treatment-agent.md | codex/stage-06 | Needs controls DB schema |
| 8 | 07-residual-risk-engine.md | codex/stage-07 | Needs custom logic |
| 9 | 09-orchestrator.md | codex/orchestrator | Needs all above |
| 10 | 10-excel-formatter.md | codex/output-formatters | Needs stage 07 complete |
| 11 | 11-audit-trail.md | codex/output-formatters | Needs API-calling stages |

---

**ARCHITECTURE COMPLETE.** Awaiting 4 blocked items from Omkar to proceed with full spec writing.  
Codex can start: `codex/schemas` (spec 00) + `codex/engines` (once engine specs are written).

# TARA Tool: Threat Analysis and Risk Assessment

Automated TARA pipeline aligned with ISO/SAE 21434, currently for web-based automotive applications (cloud backends, web portals, OTA systems).

---

## What is TARA?

TARA (Threat Analysis and Risk Assessment) is the cybersecurity risk assessment required by ISO/SAE 21434. It defines the item, identifies what needs protection, how it could be harmed, how likely and how severe that is, and what to do about it.

---

## How it works

The tool reads the client's documents once, builds an agreed picture of the system with the analyst, and only then does risk work.

| Stage | Name | ISO/SAE 21434 | Checkpoint |
|---|---|---|---|
| 01 | Input Normalization: documents into facts with sources | supports clause 9.3 | CP0 Reading review |
| 02 | Item Definition: elements, links, zones and scope | clause 9.3 | CP1 Item Definition review |
| 03 | Asset Identification | clause 15.3 | light asset review |
| 04 | Damage Analysis | clause 15.3 (damage scenarios) | required |
| 05 | Threat Identification | clause 15.4 | required |
| 06 | Attack Path Modelling and feasibility | clauses 15.6 and 15.7 | required |
| 07 | Impact Analysis | clause 15.5 | required |
| 08 | Risk Scoring | clause 15.8 | none |
| 09 | Risk Treatment | clause 15.9 | optional |
| 10 | Residual Risk | after clause 15.9 | none |

Stage details: `tara-workspace/web-based-tara/CONTEXT.md`. Terms: `CONTEXT.md` at the repo root.

---

## Key principles

- **Discussion, not hand-over.** The tool shows what it concluded, why and what it assumed; the analyst confirms or corrects at CP0 and CP1.
- **Review by exception.** The analyst answers only conflicts, gaps and uncertain points; everything else is grouped and spot-checked.
- **Sources on every fact.** Every fact traces to a document location and quote, or to an analyst decision.
- **Deterministic scoring.** All numbers come from engines, never from a model.
- **Server-enforced rules.** `checkpoint-api` refuses anything that breaks a rule, item by item.

---

## Tech stack

- **Stages:** Node.js, model calls only through `stages/llm-client.js`
- **Models:** open-weight models through OpenRouter, pinned per stage in `_config/models.json`
- **Store and API:** Python, FastAPI, SQLAlchemy (`checkpoint-api/`)
- **Screens:** React (`frontend/`)
- **Shared contract:** JSON schemas in `src/schemas/`

How to run the tests, backend and frontend: see `README.md` at the repo root.

---

## Audit trail

Every model call records the model, the provider actually used, the prompt version, token counts and a request id, so any result can be traced to exactly what produced it.

# TARA ICM Workspace

TARA Aegis produces ISO/SAE 21434 threat analysis and risk assessments (TARA) for automotive systems. The current focus is web-based TARAs: cloud backends, web portals and OTA systems that support vehicles.

The tool reads the client's documents, proposes an item definition, and discusses every conclusion with the analyst before anything is built on it. Models propose; the analyst decides; the server enforces the rules.

---

## Flow (web-based TARA)

```
Client documents
  -> Stage 01 Input Normalization     reads every document once, produces facts with sources
  -> CP0 Reading review               analyst confirms what was read
  -> Stage 02 Item Definition         elements, links, zones and scope from confirmed facts
  -> CP1 Item Definition review       analyst confirms scope, boundary and assumptions
  -> Stage 03 Asset Identification    assets from the finalized item definition
  -> Stages 04 to 10                  damage, threats, attack paths, impact, risk, treatment, residual risk
```

Terms are defined in `CONTEXT.md`. The reasons behind each design choice are in `.meta/DECISIONS.md`.

---

## Repository structure

```
TARA-ICM-workspace/
├── CONTEXT.md             domain glossary
├── .meta/                 how the tool is built: governance, plan, decisions, specs
│   ├── CLAUDE.md          governance (roles, spec format, spec register)
│   ├── CLAUDE-CODE-INSTRUCTIONS.md   rebuild plan and design reference
│   ├── REBUILD-PROGRESS.md           task status
│   ├── DECISIONS.md       decisions log
│   └── specs/             all specs
├── tara-workspace/        the TARA tool's runtime workspace (ICM layers)
│   └── web-based-tara/    stages, _config, _engines, orchestrator
├── checkpoint-api/        FastAPI store and API (single source of truth)
├── frontend/              React screens
├── src/schemas/           JSON schemas shared by Node stages and the API
├── scripts/               helper scripts
└── tests/                 Node tests and fixtures
```

---

## How work is done

Claude Code works through `.meta/CLAUDE-CODE-INSTRUCTIONS.md` one task at a time on the `claude` branch. Tasks marked HUMAN GATE stop for the analyst. Current status: `.meta/REBUILD-PROGRESS.md`.

---

## Running locally

Tests:

```bash
npm install
npm test                                   # Node stages and schemas
cd checkpoint-api && pip install -r requirements.txt pytest httpx && python -m pytest
```

Backend:

```bash
cd checkpoint-api
DATABASE_URL=sqlite:///./local.db JWT_SECRET=<a-long-random-string> python -m uvicorn checkpoint_api.main:app --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

---

## Data policy

This repository is public. Nothing derived from client work goes into it. Test items are synthetic. Real material is used only locally in the git-ignored `/private-eval/` folder.

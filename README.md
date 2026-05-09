# TARA ICM Workspace

**Automated Threat Analysis & Risk Assessment Tool**  
Built with Claude AI + Deterministic Engines following ICM Architecture

---

## 🎯 Two Purposes, Two Folders

### 1. **Workspace Governance** → `/.meta/`
How Claude and Qwen collaborate to build this tool.

**Start here if you're:**
- Reviewing the architectural specs
- Understanding the build process
- Working as Claude or Qwen in this workspace

**Key files:**
- `.meta/CLAUDE.md` — Workspace identity and roles
- `.meta/CONTEXT.md` — Module status tracker
- `.meta/WORKFLOW.md` — Collaboration protocol
- `.meta/specs/` — All architectural specifications

### 2. **TARA Tool** → `/docs/` + `/src/`
The actual threat assessment tool being built.

**Start here if you're:**
- Using the TARA tool
- Understanding the TARA pipeline
- Contributing to TARA implementation

**Key files:**
- `docs/README.md` — TARA tool overview
- `docs/ARCHITECTURE.md` — Pipeline diagrams
- `docs/references/` — ISO standards, STRIDE taxonomy

---

## 📂 Repository Structure

```
TARA-ICM-workspace/
│
├── .meta/                    ← Workspace governance (how we work)
│   ├── CLAUDE.md             (workspace identity)
│   ├── CONTEXT.md            (routing table)
│   ├── WORKFLOW.md           (Claude ↔ Qwen protocol)
│   ├── DELIVERY-SUMMARY.md   (onboarding summary)
│   ├── YOUR-ACTION-CHECKLIST.md
│   └── specs/                (all architectural specs)
│       ├── 00-json-schema-contracts.md
│       ├── 01-item-definition-agent.md
│       └── ... (11 total)
│
├── Agents/                   ← Agent execution protocols
│   ├── claude/README.md      (points to .meta/)
│   └── Qwen/
│       ├── QWEN_PROTOCOL.md  (execution discipline)
│       ├── VERIFY.md         (post-code checklist)
│       └── simplicity.md     (golden rule)
│
├── docs/                     ← TARA project documentation
│   ├── README.md             (TARA tool overview)
│   ├── ARCHITECTURE.md       (pipeline diagrams)
│   └── references/           (Layer 3: ISO standards)
│       ├── iso-21434-risk-matrix.json
│       ├── stride-taxonomy.md
│       └── ... (static domain knowledge)
│
├── src/                      ← TARA implementation
│   ├── schemas/              (JSON schemas for 7 stages)
│   ├── stages/               (AI agents)
│   ├── engines/              (deterministic calculators)
│   ├── orchestrator/         (pipeline runner)
│   └── output-formatters/    (Excel, audit, JSON)
│
└── tests/                    ← TARA tests
    ├── unit/
    ├── integration/
    └── fixtures/
```

---

## 🚀 Quick Start

### If You're Reviewing the Foundation (This Week)
1. Read `.meta/DELIVERY-SUMMARY.md` (15 min)
2. Read `.meta/CLAUDE.md` (10 min)
3. Read `.meta/CONTEXT.md` (10 min)
4. Read `.meta/specs/00-json-schema-contracts.md` (35 min)
5. Answer the 5 critical questions in `DELIVERY-SUMMARY.md`
6. Approve or request changes

### If You're Using the TARA Tool (Week 7+)
1. Read `docs/README.md`
2. Install: `npm install`
3. Run: `npm run tara:assess`
4. Review output: `outputs/tara-report.xlsm`

---

## 🔄 Workflow Overview

```
Claude (Spec Authority)       Qwen (Implementation Engine)
    ↓                              ↓
Write spec in .meta/specs/    Read spec
    ↓                              ↓
Update .meta/CONTEXT.md       List assumptions
    ↓                              ↓
                              Confirm scope
                                   ↓
                              Write code in /src/
                                   ↓
                              Run /Agents/Qwen/VERIFY.md
                                   ↓
Review PR for spec            Submit PR
compliance                         ↓
    ↓                         Wait for approval
Approve & merge
```

---

## 📊 Current Status

| Phase | Status | Location |
|-------|--------|----------|
| Workspace governance | ✅ Complete | `.meta/` |
| JSON schema contracts | ✅ Spec complete | `.meta/specs/00-*` |
| 9 remaining specs | 📋 Pending | `.meta/specs/01-10-*` |
| Implementation | 📋 Not started | `/src/` |
| Tests | 📋 Not started | `/tests/` |

**Next:** Answer 5 critical questions → Approve foundation → Claude writes specs 1–10

---

## 🎯 The Mission

Build a production-grade TARA tool that:
- Transforms architecture diagrams → complete threat assessments
- Uses Claude for threat analysis (extended thinking)
- Uses deterministic engines for scoring (auditable)
- Generates Excel reports + audit trails (compliance-ready)
- Takes ~45 minutes per assessment (vs 3–5 days manual)

**Tech Stack:** Node.js, Claude API, ICM architecture (no frameworks)

---

## 📖 Documentation Index

### Workspace Governance (/.meta/)
- `CLAUDE.md` — Workspace identity
- `CONTEXT.md` — Module tracker
- `WORKFLOW.md` — Collaboration protocol
- `DELIVERY-SUMMARY.md` — Onboarding summary
- `YOUR-ACTION-CHECKLIST.md` — Review checklist
- `specs/` — All architectural specifications

### TARA Tool (/docs/)
- `README.md` — TARA tool overview
- `ARCHITECTURE.md` — Pipeline diagrams
- `references/` — ISO standards, STRIDE taxonomy

### Agent Protocols (/Agents/)
- `Qwen/QWEN_PROTOCOL.md` — Execution discipline
- `Qwen/VERIFY.md` — Post-code checklist
- `claude/README.md` — Points to .meta/

---

## 🔐 Design Decisions (Locked)

- ✅ JSON for all I/O (auditability)
- ✅ Extended thinking Stage 4 only (cost control)
- ✅ Filesystem-based (ICM principle)
- ✅ No frameworks (ownership)
- ✅ Tool use for AI outputs (reliability)
- ✅ Checkpoints after AI stages (human review)

---

## 📞 Get Started

**For workspace review:** Read `.meta/DELIVERY-SUMMARY.md`  
**For TARA usage:** Read `docs/README.md` (coming soon)  
**For development:** Read `.meta/WORKFLOW.md`

**Repo:** https://github.com/Unfazed7/TARA-ICM-workspace.git  
**Status:** 🟢 Foundation complete, awaiting review  
**Date:** 2026-05-09

---

**Clean separation. Clear purpose. Ready to build.**

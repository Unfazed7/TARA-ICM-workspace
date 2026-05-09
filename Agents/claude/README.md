# Claude Agent — Specification Authority

This folder previously contained workspace governance documents. They have been moved to maintain clean separation:

## Workspace Governance (How We Work)
**Location:** `/.meta/`

- **CLAUDE.md** — Workspace identity and roles
- **CONTEXT.md** — Module routing table and status tracker
- **WORKFLOW.md** — Claude ↔ Qwen collaboration protocol
- **specs/** — All architectural specifications

## TARA Project Documentation
**Location:** `/docs/`

- **ARCHITECTURE.md** — TARA pipeline diagrams
- **references/** — ISO standards, STRIDE taxonomy, risk matrices

## Claude's Current Role

**I am the specification engine.** I write architectural specs in `/.meta/specs/` that define what Qwen Coder will implement.

**To start a new spec:**
1. Read `/.meta/CLAUDE.md` (workspace identity)
2. Read `/.meta/CONTEXT.md` (module list)
3. Write spec in `/.meta/specs/{module}.md`
4. Update `/.meta/CONTEXT.md` (mark as "ready for implementation")

**All workspace rules:** See `/.meta/CLAUDE.md`

---

Last updated: 2026-05-09  
Status: ✅ Workspace reorganized for clean separation

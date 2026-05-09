# TARA ICM Workspace — Claude Architectural Spec Engine

## Identity
Claude operates as the **specification & design authority** for the TARA (Threat Analysis & Risk Assessment) ICM pipeline. Every component Qwen Coder implements must trace back to a Claude-authored specification in `/Agents/Claude/SPECIFICATIONS.md`.

## Core Responsibility
1. **Read ambiguity, write clarity.** Translate vague requirements into testable, measurable specifications.
2. **No code, only contracts.** Specifications define what the code must do; Qwen implements what the spec says.
3. **Verify before handing off.** Each spec includes success criteria and verification steps Qwen must confirm.

## Workspace Layers (ICM Model)

### Layer 0: CLAUDE.md (this file)
- Workspace identity, role, routing rules
- Always loaded; ~600 tokens
- Defines how Claude and Qwen collaborate

### Layer 1: CONTEXT.md (in /Agents/Claude/)
- Workspace routing table: "user asks X, go to Y"
- Lists all active modules and their status
- ~300 tokens

### Layer 2: SPECIFICATIONS.md (per-module)
- Located: `/Agents/Claude/SPECIFICATIONS/{module}.md`
- Format: Goal | File Ownership | Interfaces | Dependencies | Assumptions | Implementation Order
- One spec per deliverable (stage agent, deterministic engine, output formatter, etc.)
- Max 800 tokens per spec (keep it surgical)

### Layer 3: Reference Material (static, never changes)
- Located: `/Agents/Claude/references/`
- Examples: `iso-21434-risk-matrix.json`, `stride-taxonomy.md`, `feasibility-formula.md`
- These are the "rules of the game" — loaded selectively by Qwen during implementation

### Layer 4: Working Artifacts
- Located: `/src/`, `/tests/`
- Implementation code (Qwen's work)
- Test files (Qwen's validation)

## Decision Framework

### When to write a spec
- **Trigger:** A new module, stage, or feature needs building
- **Input:** Vague requirement, architecture diagram, or handoff from previous stage
- **Output:** Spec in `SPECIFICATIONS/{module}.md`
- **Time:** 15–20 minutes
- **Verification:** Qwen reads spec and can list all assumptions without asking clarification

### When NOT to write a spec
- Bug fix with clear cause and solution → Qwen handles directly (with VERIFY.md checklist)
- Code cleanup → Qwen handles (no spec needed)
- Ambiguity or multi-stage coupling → STOP, write spec first

## Qwen Protocol Integration
Qwen Coder follows:
- `QWEN_PROTOCOL.md` (execution discipline)
- `VERIFY.md` (post-implementation checklist)
- `simplicity.md` (no over-engineering)

Before Qwen writes code, they MUST:
1. State explicit assumptions about data flow
2. Identify scope boundaries (what files they WILL and WON'T touch)
3. Ask for clarification on any ambiguity in the spec

## File Ownership Map

```
/Agents/claude/
├── CLAUDE.md              (this file — workspace identity)
├── CONTEXT.md             (routing table — keep updated after each spec)
├── SPECIFICATIONS/        (all architectural specs — Claude writes, Qwen implements)
│   ├── 01-item-definition-agent.md
│   ├── 02-asset-analysis-agent.md
│   ├── 03-impact-analysis-agent.md
│   ├── 04-threat-analysis-agent.md  ← extended thinking, highest complexity
│   ├── 05-risk-determination-engine.md
│   ├── 06-risk-treatment-agent.md
│   ├── 07-residual-risk-engine.md
│   ├── orchestrator.md     (Claude Code runner)
│   ├── output-formatter-excel.md
│   └── json-schema-contracts.md  (all 7 stage schemas in one place)
└── references/            (static domain knowledge — read-only)
    ├── iso-21434-risk-matrix.json
    ├── stride-taxonomy.md
    ├── feasibility-formula.md
    ├── sfop-scale.md
    ├── rise-autoISAC-summary.md
    └── iso27001-controls.md

/Agents/Qwen/
├── QWEN_PROTOCOL.md       (execution rules — Qwen owns, Claude reviews)
├── VERIFY.md              (post-code checklist)
└── simplicity.md          (the golden rule)

/src/
├── stages/                (Agent implementations)
│   ├── 01-item-definition/
│   ├── 02-asset-analysis/
│   ├── ... (7 stages)
├── engines/               (Deterministic calculators)
│   ├── feasibility-calc.js
│   ├── impact-rating.js
│   └── risk-score.js
├── orchestrator/          (Claude Code pipeline runner)
├── output-formatters/     (Excel, UI, user-template)
└── schemas/               (JSON schema definitions)

/tests/
├── unit/                  (per-module tests)
├── integration/           (stage-to-stage handoffs)
└── fixtures/              (test data)
```

## Communication Protocol

### Claude → Qwen
1. Spec written in `/Agents/Claude/SPECIFICATIONS/{module}.md`
2. Claude adds entry to `/Agents/Claude/CONTEXT.md` (routing table)
3. Qwen reads spec and confirms: "Assumptions listed, scope clear, ready to code"

### Qwen → Claude
1. Code written in `/src/`
2. Qwen runs `/Agents/Qwen/VERIFY.md` checklist
3. Qwen submits PR with: spec reference, assumptions confirmed, verification results
4. Claude reviews: spec compliance, coverage, interface correctness

## Assumptions
- **Node.js runtime** for all code (stages, engines, orchestrator)
- **JSON I/O** for all inter-stage contracts (no XML, YAML, or CSV)
- **Filesystem-based** staging (no database, ICM architecture principle)
- **Extended thinking budget** for Stage 4 only (8000 tokens max)
- **Claude API direct** (no LangChain, no frameworks)
- **No UI yet** (Excel + audit trail in Phase 1–3, UI deferred)

## Success Criteria (for this workspace)
- ✅ All 7 stage specifications written and reviewed by Week 2
- ✅ All JSON schema contracts defined and frozen before any implementation
- ✅ Deterministic engines (3 functions) written and unit-tested by Week 3
- ✅ All 4 AI agents working end-to-end by Week 5
- ✅ Orchestrator running full pipeline with checkpoints by Week 6
- ✅ Excel output working by Week 7
- ✅ Audit trail JSON complete by Week 8

## Status Tracker
Last updated: 2026-05-09

| Phase | Status | Spec | Owner | Target |
|-------|--------|------|-------|--------|
| Foundation | 🔄 In progress | CLAUDE.md | Claude | Today |
| Specs | 🔄 In progress | CONTEXT.md + 10 specs | Claude | Week 2 |
| Engines | 📋 Pending | feasibility / impact / risk-score specs | Claude | Week 2–3 |
| Agents | 📋 Pending | 4 AI agent specs + orchestrator | Claude | Week 3–5 |
| Integration | 📋 Pending | E2E pipeline + checkpoint UX | Qwen | Week 6 |
| Output | 📋 Pending | Excel + audit trail specs | Claude | Week 7–8 |

## Rules for Claude (this engine)
1. **Specs are contracts.** Once written and approved, they don't change mid-implementation.
2. **Assumptions must be explicit.** If Qwen's implementation doesn't match your assumption, that's a spec bug, not a code bug.
3. **Keep specs under 800 tokens.** If you exceed 800, you're not being concise enough.
4. **Never assume Qwen will "just know" how something works.** Write it down.
5. **Success = verifiable.** Every spec ends with "VERIFICATION STEPS: Run test X, check output Y."

---

**FOUNDATION COMPLETE.** This workspace is now ready for specification generation.

Next step: Claude writes `/Agents/Claude/CONTEXT.md` (routing table) and begins writing module specs.

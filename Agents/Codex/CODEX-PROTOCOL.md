# CODEX PROTOCOL — Implementation Engine Rules

**Role:** You are Codex, the implementation engine for TARA Aegis.  
**You implement. Claude specifies. Never swap roles.**

---

## Core Rules (Read These First)

### Rule 1: Pull Before You Start
```bash
git pull origin claude
```
Always. No exceptions. Claude may have pushed specs since your last session.

### Rule 2: Read Spec Before Writing a Line
- Full spec is in `.meta/specs/{module}.md`
- Read completely. Stop if anything is unclear.
- List all assumptions before touching code.

### Rule 3: State Scope Before Touching Files
For every task, declare before starting:
```
Spec:                    .meta/specs/{module}.md
Files I WILL touch:      {exact list}
Files I WILL NOT touch:  .meta/, _config/, CONTEXT.md files, CLAUDE.md files
Dependencies I assume:   {list}
```

### Rule 4: Surgical Changes Only
- Touch ONLY files designated in the spec
- Never touch `.meta/`, `_config/`, or any `CONTEXT.md` / `CLAUDE.md` — Claude's domain
- If adjacent code is broken, flag it — don't silently fix it unless the spec says to

### Rule 5: Stop on Ambiguity
- If the spec is unclear → STOP
- State the ambiguity explicitly: "Spec says X but this is unclear because Y"
- Wait for Claude to update the spec
- Never guess

### Rule 6: Simplicity First
- Write minimum viable code that satisfies the spec
- No speculative features, no "just in case" logic
- No unnecessary abstractions
- See `simplicity.md` for the full rule

### Rule 7: Tests Are Not Optional
Every implementation includes:
- Unit test: valid inputs (golden path)
- Unit test: invalid inputs (error handling)
- Unit test: edge cases listed in spec
- File location: `tests/` following the path in the spec

---

## What Codex Owns

```
tara-workspace/web-based-tara/_engines/          All deterministic engines
tara-workspace/web-based-tara/stages/*/agent.js  All AI stage agents
tara-workspace/web-based-tara/orchestrator/      Pipeline runner
checkpoint-api/                                  FastAPI checkpoint service
src/schemas/                                     JSON schema files
tests/                                           All test files
```

## What Codex Does NOT Touch

```
.meta/                                           Claude's spec domain
tara-workspace/CLAUDE.md                         Layer 0 identity, read-only
tara-workspace/web-based-tara/CLAUDE.md          Layer 0 identity, read-only
tara-workspace/web-based-tara/CONTEXT.md         Layer 1 routing, read-only
tara-workspace/web-based-tara/_config/           Layer 3 domain knowledge, read-only
tara-workspace/web-based-tara/stages/*/CONTEXT.md  Layer 2, Claude writes these
Agents/Codex/BRANCH-WORKFLOW.md                  Claude writes this
Agents/Codex/CODEX-PROTOCOL.md                   Claude writes this
```

These two sets never overlap. Conflicts on `claude` branch = someone touched the wrong files.

---

## Pre-Implementation Checklist

Before writing any code:
- [ ] Ran `git pull origin claude`
- [ ] Spec exists at `.meta/specs/{module}.md`
- [ ] Read the full spec — not skimmed
- [ ] Listed all assumptions explicitly
- [ ] Declared file scope (WILL / WON'T touch)
- [ ] No outstanding ambiguities (or they're flagged)

---

## Post-Implementation Checklist (VERIFY.md)

Before pushing:
- [ ] Compilation/lint passes — no syntax errors, no missing imports
- [ ] Scope: ONLY touched designated files — `git diff --name-only` confirms
- [ ] Regression: full test suite passes — nothing adjacent broken
- [ ] Tests pass: valid inputs AND invalid inputs — zero failures
- [ ] Output matches JSON schema from spec 00 exactly

---

## Implementation Order — All Specs Ready

All 9 specs are written and waiting. Implement in this order (Wave 1 has no dependencies — all can be started):

### Wave 1 — Start immediately, no dependencies

| Module | Spec file | Files to create |
|--------|-----------|-----------------|
| JSON schemas | `00-json-schema-contracts.md` | `src/schemas/stage-0{1-6}.schema.json`, `src/schemas/tool-use-schemas.json` |
| CVSS AFR engine | `05-cvss-afr-engine.md` | `tara-workspace/web-based-tara/_engines/cvss-afr-calc.js`, `tests/engines/cvss-afr-calc.test.js` |
| Risk score engine | `06-risk-scoring-engine.md` | `tara-workspace/web-based-tara/_engines/risk-score.js`, `tests/engines/risk-score.test.js` |
| Checkpoint API | `09-checkpoint-api.md` | `checkpoint-api/main.py`, `checkpoint-api/models.py`, `checkpoint-api/schemas.py`, `checkpoint-api/routers/`, `checkpoint-api/tests/` |

### Wave 2 — After Wave 1 schemas and engines are pushed

| Module | Spec file | Files to create |
|--------|-----------|-----------------|
| Stage 01 | `01-input-normalization-agent.md` | `tara-workspace/web-based-tara/stages/01-input-normalization/agent.js` |
| Stage 02 | `02-damage-analysis-agent.md` | `tara-workspace/web-based-tara/stages/02-damage-analysis/agent.js` |
| Stage 03 | `03-threat-identification-agent.md` | `tara-workspace/web-based-tara/stages/03-threat-identification/agent.js` |
| Stage 04 | `04-attack-path-agent.md` | `tara-workspace/web-based-tara/stages/04-attack-path-modelling/agent.js` |
| Stage 05 | `05-impact-analysis-agent.md` | `tara-workspace/web-based-tara/stages/05-impact-analysis/agent.js` |
| Stage 06 | `06-risk-scoring-engine.md` | `tara-workspace/web-based-tara/stages/06-risk-scoring/agent.js` |

### Still blocked (do not start)

| Module | Blocked by |
|--------|-----------|
| Stage 07 — Risk Treatment | Controls DB schema (from Omkar) |
| Stage 08 — Residual Risk | Residual risk calculation logic (from Omkar) |
| Orchestrator | All stage agents + checkpoint API |

---

## Commit Message Convention

```
feat: Implement {module} per spec {spec-filename}.md
fix: {module} — {specific thing fixed}
test: Add tests for {module}
chore: {small non-feature change}
wip: {module} partial — {what's done, what remains}
```

---

## If You Find a Spec Bug

1. Stop coding immediately
2. State exactly: "SPEC ISSUE in {spec-filename}.md: Spec says X but this conflicts with Y because Z"
3. Wait for Claude to update the spec
4. `git pull origin claude` to get the updated spec
5. Resume only after the spec is updated

---

## If You Find a Conflict When Pushing

```bash
git pull --rebase origin claude
git push origin claude
```

A conflict means one of two things:
1. You touched a file you shouldn't have → undo that change
2. Claude pushed a spec update to a file you were also editing → this should not happen by design; flag it

---

**Read BRANCH-WORKFLOW.md for the full Git process.**  
**Read VERIFY.md before every push.**  
**Last updated: 2026-06-02**

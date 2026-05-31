# CODEX PROTOCOL — Implementation Engine Rules

**Role:** You are Codex, the implementation engine for TARA Lima.  
**You implement. Claude specifies. Never swap roles.**

---

## Core Rules (Read These First)

### Rule 1: Read Spec Before Writing a Line
- Full spec is in `.meta/specs/{module}.md`
- Read completely. Stop if anything is unclear.
- List all assumptions before touching code.

### Rule 2: State Scope Before Touching Files
For every task, declare before starting:
```
Files I WILL touch:         {list}
Files I WILL NOT touch:     {list}
Dependencies I assume exist: {list}
```

### Rule 3: Surgical Changes Only
- Touch ONLY files designated in the spec
- Never touch `.meta/`, `_config/`, or `stages/*/CONTEXT.md` — Claude's domain
- If adjacent code is broken, flag it — don't silently fix it unless the spec says to

### Rule 4: Stop on Ambiguity
- If the spec is unclear → STOP
- Post the ambiguity as a PR draft comment
- Wait for Claude to update the spec
- Never guess

### Rule 5: Simplicity First
- Write minimum viable code
- No speculative features, no "just in case" logic
- No unnecessary abstractions or wrapper classes
- If you write >200 lines for a simple function, STOP and simplify
- Three lines of explicit code > one clever abstraction

### Rule 6: Tests Are Not Optional
Every implementation includes:
- Unit test: valid inputs (golden path)
- Unit test: invalid inputs (error handling)
- File location: `tests/unit/{module}.test.js`
- Run before opening any PR

---

## What Codex Owns

```
tara-workspace/_engines/          → All 3 deterministic engines
tara-workspace/stages/*/agent.js  → All AI stage agents
tara-workspace/orchestrator/      → run-tara.js pipeline runner
output-formatters/                → Excel formatter, audit trail logger
src/schemas/                      → JSON schema files from spec 00
tests/                            → All test files
```

## What Codex Does NOT Touch

```
.meta/                            → Claude's spec domain
tara-workspace/CLAUDE.md          → Layer 0 identity, read-only
tara-workspace/_config/           → Layer 3 domain knowledge, read-only
tara-workspace/stages/*/CONTEXT.md → Layer 2, Claude writes these
```

---

## Pre-Implementation Checklist

Before writing any code:
- [ ] Spec is merged into `develop` (not just in `claude` branch)
- [ ] I have read the full spec — not skimmed
- [ ] I have listed all assumptions explicitly
- [ ] I have declared file scope (WILL / WON'T touch)
- [ ] No outstanding ambiguities (or they're flagged and awaiting Claude)

---

## Post-Implementation Checklist (VERIFY.md)

Before opening any PR:
- [ ] Compilation/lint passes — no syntax errors, no missing imports
- [ ] Scope: ONLY touched designated files — run `git diff --name-only` to confirm
- [ ] Regression: no adjacent code broken — run full test suite
- [ ] Tests pass: valid inputs AND invalid inputs — zero test failures
- [ ] Output matches JSON schema from spec 00 exactly — field names, types, enum values

---

## Commit Message Convention

```
feat: Implement {module} per spec {spec-filename}.md
fix: Address review comment — {specific thing fixed}
test: Add unit tests for {module}
wip: {module} partial — {what's done, what remains}
```

---

## PR Body Template (Copy-Paste This)

```markdown
## Spec Reference
`.meta/specs/{spec-filename}.md`

## Assumptions Confirmed
- Input: {what I receive, from which file/stage}
- Output: {what I produce, which schema it matches}
- Files touched: {exact list}

## Verification Results (VERIFY.md)
- [x] Compilation/lint: PASS
- [x] Scope: Only touched {list files}
- [x] Regression: No adjacent breakage
- [x] Tests: {N} tests passing, 0 failing

## Test Command
`npm test -- {module-name}`
```

---

## Implementation Order for MVP

Start with schemas and engines — zero dependencies on anything else:

| Priority | Module | Branch | Status |
|----------|--------|--------|--------|
| 1 | JSON schemas | `codex/schemas` | Available — spec 00 is done |
| 2 | Deterministic engines | `codex/engines` | Available — spec TBD but logic is defined |
| 3 | Stage 01 agent | `codex/stage-01` | Waiting on spec |
| 4 | Stage 02 agent | `codex/stage-02` | Waiting on spec |
| 5 | Stage 03 agent | `codex/stage-03` | Waiting on spec |
| 6 | Stage 04 agent | `codex/stage-04` | Waiting on spec |
| 7 | Stage 05 runner | `codex/stage-05` | Waiting on spec |
| 8 | Stage 06 agent | `codex/stage-06` | BLOCKED — controls DB schema |
| 9 | Stage 07 runner | `codex/stage-07` | BLOCKED — residual risk logic |
| 10 | Orchestrator | `codex/orchestrator` | Waiting on all stage specs |
| 11 | Output formatters | `codex/output-formatters` | Waiting on orchestrator |

**Start today with: `codex/schemas` (read spec 00, implement 7 schema files)**

---

## Emergency Protocol

**If blocked waiting for Claude:**
1. Continue with next available unblocked module
2. Create GitHub Issue: "BLOCKED: {module} — {exact reason}"
3. Example: "BLOCKED: codex/stage-06 — Controls DB schema not defined in spec"

**If you find a spec bug during implementation:**
1. Stop coding immediately
2. Post PR comment: "SPEC ISSUE: {description}"
3. Explain specifically: "Spec says X but this conflicts with Y because Z"
4. Wait for Claude to update spec
5. Resume only after spec is updated

**If spec and schema disagree:**
Spec always wins. Flag the discrepancy, Claude fixes the schema.

---

**Read BRANCH-WORKFLOW.md for the full Git + PR process.**  
Last updated: 2026-05-31

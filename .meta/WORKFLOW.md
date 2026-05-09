# QUICK REFERENCE: Claude ↔ Qwen Workflow

## When Claude Writes a Spec

```
1. Write spec in: /Agents/Claude/SPECIFICATIONS/{module}.md
   Format: Goal | File Ownership | Interfaces | Dependencies | Assumptions | Order | Verification

2. Update /Agents/Claude/CONTEXT.md
   Change: | Module | Spec File | Status | Owner |
   To:     | status = 📋 Pending (awaiting Qwen)    | Qwen     |
   
3. Commit to git with message:
   "spec: Add {module-name} specification"

4. Ping Qwen:
   "New spec ready: {module}.md. Please read, list assumptions, confirm scope, ready to code?"
```

---

## When Qwen Reads a Spec (Before Coding)

```
✅ Read the spec completely (stop if confused)

✅ Write inline comment (on PR or in thread):
   "Read {spec-name}. Assumptions:
   - Stage input is from {previous-stage} output
   - Schema validation happens in {deterministic-engine}
   - I will not touch files outside {/src/stage-X/}
   Ready to code."

✅ If ambiguous:
   Add to spec's "Open Questions" section via PR comment
   Wait for Claude to update spec
   Then proceed
```

---

## When Qwen Finishes Implementation

```
1. Run verification checklist (/Agents/Qwen/VERIFY.md):
   [ ] Compilation/lint passes
   [ ] No scope creep (only touched designated files)
   [ ] No regressions (adjacent code still works)
   [ ] Tests pass (valid + invalid inputs)

2. Commit to git:
   "feat: Implement {module} per spec {spec-name}.md"

3. Create PR with:
   - Title: "Implement {module}"
   - Description: 
     "Spec: /Agents/Claude/SPECIFICATIONS/{module}.md
      Verification: [copy VERIFY.md checklist results]
      Tests: Run `npm test -- {module}` to verify"

4. Ping Claude:
   "PR ready for review. Spec: {spec-name}.md. All checks passed."
```

---

## When Claude Reviews Qwen's PR

```
✅ Read the spec (what was promised)

✅ Read the code (does it match the spec?)

✅ Check:
   - Does output match schema?
   - Are all assumptions confirmed?
   - Is code in the right files?
   - Are tests comprehensive?

✅ Approve or request changes:
   - "LGTM for spec compliance"
   - Or: "Conflicts with spec assumption X, fix and re-test"

✅ Merge (Qwen can't merge; Claude has final say)

✅ Update CONTEXT.md:
   Change: | Status | Pending → Complete |
   
✅ Commit: "docs: Mark {module} as complete"
```

---

## Escalation: Ambiguity Found

**If Qwen finds a problem in the spec during implementation:**

```
1. Stop coding immediately
2. Create a GitHub Issue or PR comment:
   Title: "SPEC ISSUE: {module}"
   Description: "Spec says X, but this conflicts with Y because..."
3. Add to the spec's "Open Questions" section
4. Ping Claude: "Spec issue in {module}. See PR comment."
5. Claude updates the spec, Qwen resumes

Example:
  Qwen: "Spec says Stage 2 input comes from Stage 1 output,
         but Stage 1 output doesn't include asset_type field.
         Where does asset_type come from?"
  Claude: "Add asset_type inference rules to Stage 2 spec."
  Qwen: "Got it, proceeding."
```

---

## Schema Evolution (Mid-Build Crisis Recovery)

**If a schema needs to change after Qwen is coding:**

```
BEFORE: Never change a frozen schema mid-implementation

IF MUST CHANGE (critical bug found):

1. Claude updates spec + schema file
2. Claude updates ALL test fixtures (/tests/fixtures/)
3. Claude notifies Qwen in writing:
   "Schema changed. Updated: {spec-name}.md, {schema-file}.json, test fixtures.
    Reason: {why-it-had-to-change}
    Your code needs to handle: [list changes]"
4. Qwen updates code + tests
5. New commit: "fix: Update schema per critical issue {issue-number}"

This should be rare. Plan specs carefully.
```

---

## File Organization Quick Map

```
/Agents/Claude/
├── CLAUDE.md                    ← Workspace identity
├── CONTEXT.md                   ← Status tracker (update after each spec)
├── SPECIFICATIONS/              ← All spec files (one per module)
│   ├── 00-json-schema-contracts.md  ← Read first, most critical
│   ├── 01-item-definition-agent.md
│   ├── 02-asset-analysis-agent.md
│   ├── 03-impact-analysis-agent.md
│   ├── 04-threat-analysis-agent.md  ← Extended thinking, hardest
│   ├── 05-feasibility-engine.md
│   ├── 05-risk-engine.md
│   ├── 06-risk-treatment-agent.md
│   ├── 09-orchestrator.md
│   ├── 10-excel-formatter.md
│   └── 11-audit-trail.md
└── references/                  ← Static domain knowledge (read-only)
    ├── iso-21434-risk-matrix.json
    ├── stride-taxonomy.md
    ├── feasibility-formula.md
    ├── sfop-scale.md
    ├── rise-autoISAC-summary.md
    └── iso27001-controls.md

/Agents/Qwen/
├── QWEN_PROTOCOL.md             ← Execution rules (Qwen owns)
├── VERIFY.md                    ← Post-code checklist
└── simplicity.md                ← Golden rule

/src/
├── schemas/                     ← JSON schema files (Qwen writes after spec frozen)
├── stages/                      ← Agent implementations
├── engines/                     ← Deterministic calculators
├── orchestrator/                ← Pipeline runner
└── output-formatters/           ← Excel, UI, user-template

/tests/
├── unit/                        ← Per-module tests
├── integration/                 ← Stage-to-stage tests
└── fixtures/                    ← Test data (valid + invalid)
```

---

## Golden Rules (Both Claude & Qwen)

| Rule | Why |
|------|-----|
| **Read the spec before asking questions** | The spec is designed to answer 90% of questions |
| **State assumptions explicitly** | Prevents "I thought you meant..." later |
| **Don't guess on ambiguity** | Stop, ask for clarification |
| **Commit message = spec reference** | Future engineers need to trace code to spec |
| **Frozen specs don't change** | Stability for implementation |
| **Tests validate spec compliance** | Code matches promise |
| **One PR per module** | Easy to review, easy to revert |

---

## Communication Checklist

Before Qwen codes Stage X:
- [ ] Spec is written and published
- [ ] Spec is reviewed by Claude
- [ ] Spec is marked "ready for implementation"
- [ ] Qwen has read spec completely
- [ ] Qwen has listed all assumptions
- [ ] Qwen has confirmed scope (what they WILL and WON'T touch)
- [ ] Qwen has asked clarifying questions (if any)
- [ ] Claude has answered all questions
- [ ] Qwen says "ready to code"

---

## Example: Full Cycle (Stage 1)

```
Day 1 — Claude writes spec:
├── Create: /Agents/Claude/SPECIFICATIONS/01-item-definition-agent.md
├── Update: /Agents/Claude/CONTEXT.md (status = 📋 Pending)
└── Commit: "spec: Add item definition agent specification"

Day 1 — Qwen reads spec:
├── Read spec completely
├── List assumptions (vision input size limit, etc.)
├── Confirm scope (Stage 1 agent only, no changes to Stage 2)
└── Message: "Spec read. Assumptions listed. Ready to code."

Day 2–3 — Qwen codes:
├── Write /src/stages/01-item-definition/agent.js
├── Write /tests/unit/01-item-definition.test.js
├── Run VERIFY.md checklist (all pass)
└── Create PR with spec reference + test results

Day 3 — Claude reviews:
├── Check: Does code match spec?
├── Check: Are tests comprehensive?
├── Check: Is scope confined to Stage 1?
├── Message: "LGTM. Merging."

Day 3 — Update status:
├── Merge PR
├── Update /Agents/Claude/CONTEXT.md (status = ✅ Complete)
└── Commit: "docs: Mark item definition agent as complete"
```

---

## Emergency: Qwen Blocked (Can't Proceed)

If Qwen is blocked waiting for Claude:

```
1. Create GitHub Issue: "BLOCKED: {reason}"
2. Example: "BLOCKED: Schema for Stage 3 output not defined"
3. This halts the sprint until Claude unblocks
4. Use this to identify spec writing delays early
```

---

**Keep this reference open while working. Bookmark it.**

Last updated: 2026-05-09  
Applies to: All future work in TARA ICM workspace

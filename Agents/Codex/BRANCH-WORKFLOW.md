# BRANCH WORKFLOW — Git Hierarchy & PR Protocol

## Branch Hierarchy

```
main                        ← Production. Protected. Tagged releases only.
│
└── develop                 ← Integration. All feature work lands here.
    │
    ├── claude              ← Claude's spec branch. Specs, Layer 2-3 docs, governance.
    │
    └── codex/{module}      ← Codex's feature branches. One per module.
        ├── codex/schemas
        ├── codex/engines
        ├── codex/stage-01
        ├── codex/stage-02
        ├── codex/stage-03
        ├── codex/stage-04
        ├── codex/stage-05
        ├── codex/stage-06
        ├── codex/stage-07
        ├── codex/orchestrator
        └── codex/output-formatters
```

## Branch Protection Rules (Set in GitHub)

| Branch | Require PR | Required Approver | Direct Push |
|--------|-----------|-------------------|-------------|
| `main` | YES | Omkar (1) | NEVER |
| `develop` | YES | Omkar (1) | NEVER |
| `claude` | No | — | Claude only |
| `codex/*` | No | — | Codex only |

---

## How Claude Works (Spec Engine)

```
Step 1: Write spec → .meta/specs/{module}.md
Step 2: Commit to claude branch:
          git add .meta/specs/{module}.md
          git commit -m "spec: Add {module-name} specification"
          git push origin claude
Step 3: Open PR: claude → develop
          Title: "spec: {module-name} specification"
          Body:  "Spec complete. Codex starts after merge."
Step 4: Omkar reviews + merges PR
Step 5: Codex starts codex/{module}
```

---

## How Codex Works (Implementation Engine)

### Step 1 — Confirm Spec Is Merged

Before touching any code, confirm the spec exists in `develop`:
```bash
git checkout develop
git pull origin develop
ls .meta/specs/{module}.md      # must exist
```

### Step 2 — Create Branch FROM develop

```bash
git checkout develop
git pull origin develop
git checkout -b codex/{module}
```

Examples:
```bash
git checkout -b codex/schemas
git checkout -b codex/engines
git checkout -b codex/stage-01
```

**ALWAYS branch from `develop`. Never from `claude` or `main`.**

### Step 3 — Read Spec, State Assumptions

Read `.meta/specs/{module}.md` completely.

Before writing a single line of code, post (as PR draft comment or message):
```
Read spec: {module}.md
Assumptions:
  - Input comes from: {previous stage output / file path}
  - I will touch only: {list files}
  - I will NOT touch: {list files}
  - Schema validation via: {method}
  - Dependencies I assume exist: {list}
Ready to code.
```

If any assumption is unclear → stop and flag it. Do not guess.

### Step 4 — Implement

- Work only in files designated by the spec
- Do NOT touch `.meta/`, `_config/`, or any `CONTEXT.md` files
- Run tests continuously during implementation

### Step 5 — Run VERIFY.md Before Opening PR

All 4 checks must pass:
```
[ ] Compilation/lint passes
[ ] Scope: only touched designated files (git diff --name-only)
[ ] No regressions in adjacent code
[ ] Tests pass for valid AND invalid inputs
```

### Step 6 — Commit and Push

```bash
git add {specific files only — never git add -A}
git commit -m "feat: Implement {module} per spec {spec-filename}.md"
git push -u origin codex/{module}
```

### Step 7 — Open PR: codex/{module} → develop

PR Title: `feat: Implement {module}`

PR Body (fill this template exactly):
```markdown
## Spec Reference
`.meta/specs/{spec-filename}.md`

## Assumptions Confirmed
- Input: {what I receive and from where}
- Output: {what I produce, matches schema in spec 00}
- Files touched: {list each file}

## Verification Results (VERIFY.md)
- [x] Compilation/lint: PASS
- [x] Scope: Only touched {list files}
- [x] Regression: No adjacent breakage
- [x] Tests: {N} tests passing, 0 failing

## Test Command
`npm test -- {module-name}`
```

### Step 8 — Respond to Claude's Review

Claude reviews for spec compliance (not code style).

If Claude requests changes:
```bash
git add {fixed files}
git commit -m "fix: Address review comment — {what was fixed}"
git push origin codex/{module}
# PR auto-updates. No new PR needed.
```

### Step 9 — Omkar Merges

After Claude approves → Omkar merges `codex/{module}` → `develop`.
Delete branch after merge.

---

## PR Rules (Non-Negotiable)

| Rule | Why |
|------|-----|
| One PR per module | Easy to review, easy to revert independently |
| Branch from `develop`, not `claude` | Clean integration baseline |
| PR body = VERIFY.md results | Reviewer knows it was checked |
| Every PR references a spec | Every line traces to a spec |
| Codex never merges own PR | Claude reviews spec compliance first |
| Specific `git add` only | Prevents accidental inclusion of unrelated files |

---

## Milestone: develop → main

When all modules for a milestone pass E2E testing in `develop`:
```bash
# Omkar does this:
git checkout main
git pull origin main
git merge develop --no-ff -m "release: v0.1.0-mvp"
git tag v0.1.0-mvp
git push origin main
git push origin --tags
```

---

## Quick Reference Cheat Sheet

```bash
# Start a new Codex module
git checkout develop && git pull origin develop
git checkout -b codex/{module-name}

# Save work in progress
git add {specific files}
git commit -m "wip: {module} — {what's done so far}"
git push origin codex/{module-name}

# Final push before opening PR
git push -u origin codex/{module-name}

# After review comments — fix and push to same branch
git add {fixed files}
git commit -m "fix: {what was fixed}"
git push origin codex/{module-name}   # PR auto-updates

# If develop moved ahead while you were working
git checkout develop && git pull origin develop
git checkout codex/{module-name}
git rebase develop
git push --force-with-lease origin codex/{module-name}
```

---

**Read this before starting any implementation task.**  
Last updated: 2026-05-31

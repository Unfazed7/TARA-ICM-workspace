# BRANCH WORKFLOW — Git Protocol for TARA Aegis

## Branch Hierarchy

```
main                  ← Production. Protected. Tagged releases only.
│
└── develop           ← Integration. All reviewed work lands here.
    │
    └── claude        ← Shared working branch. Both Claude and Codex push here.
```

Claude writes specs here. Codex implements here. When a milestone is complete, `claude → develop` PR is opened and Omkar merges it.

---

## Branch Protection Rules

| Branch | Require PR | Required Approver | Direct Push |
|--------|-----------|-------------------|-------------|
| `main` | YES | Omkar (1) | NEVER |
| `develop` | YES | Omkar (1) | NEVER |
| `claude` | No | — | Claude + Codex |

---

## The Sequential Rule (Most Important)

Claude and Codex share the `claude` branch. **They never push at the same time.**

```
Claude finishes + pushes
        ↓
Codex pulls latest claude → implements → pushes
        ↓
Claude pulls latest claude → writes next spec → pushes
        ↓
(repeat until milestone complete)
```

Before starting any work: `git pull origin claude` — always.

Conflicts are prevented by file ownership. Claude and Codex never touch the same files (see CODEX-PROTOCOL.md). If a conflict ever appears, it means one of them touched a file they shouldn't have.

---

## How Claude Works

```bash
# 1. Always pull latest before writing
git pull origin claude

# 2. Write spec or ICM file, then commit
git add .meta/specs/{module}.md
git commit -m "spec: Add {module} specification"
git push origin claude
```

Claude never touches `_engines/`, `agent.js` files, `src/schemas/`, or `tests/`.

---

## How Codex Works

### Step 1 — Pull Latest

```bash
git pull origin claude
```

Confirm the spec you're about to implement exists:
```bash
ls .meta/specs/{module}.md   # must exist
```

### Step 2 — State Scope Before Coding

Before writing a single line, declare:
```
Spec: .meta/specs/{module}.md
Files I WILL touch:         {exact list}
Files I WILL NOT touch:     .meta/, _config/, CONTEXT.md files, CLAUDE.md files
Dependencies I assume exist: {list}
```

If anything in the spec is unclear → stop. Do not guess. Flag the ambiguity.

### Step 3 — Implement

Work only in files designated by the spec. Run tests continuously.

### Step 4 — Run VERIFY.md Checklist

All 4 checks must pass before committing:
```
[ ] Compilation/lint passes
[ ] Scope: only touched designated files (git diff --name-only)
[ ] No regressions (full test suite passes)
[ ] Tests pass for valid AND invalid inputs
```

### Step 5 — Commit and Push to claude

```bash
git add {specific files only — never git add -A}
git commit -m "feat: Implement {module} per spec {spec-filename}.md"
git push origin claude
```

### Step 6 — If Push Fails (Someone Pushed Ahead)

```bash
git pull --rebase origin claude
git push origin claude
```

The rebase will be clean because Claude and Codex own different files.

---

## PR: claude → develop

When a full milestone is complete (a logical set of specs + their implementations):

```
Omkar opens PR: claude → develop
Reviews the full diff
Merges when satisfied
```

Codex does NOT open PRs. Omkar decides when `claude` is ready to merge into `develop`.

---

## Commit Message Convention

```bash
# Claude
spec: Add {module} specification
spec: Update {module} — {what changed and why}

# Codex
feat: Implement {module} per spec {spec-filename}.md
fix: {module} — {specific fix}
test: Add tests for {module}
chore: {small non-feature change}
```

---

## Milestone: develop → main

When all modules for a milestone pass E2E testing in `develop`:

```bash
# Omkar does this:
git checkout main
git merge develop --no-ff -m "release: v0.1.0-mvp"
git tag v0.1.0-mvp
git push origin main
git push origin --tags
```

---

## Quick Reference

```bash
# Always start with this
git pull origin claude

# Commit specific files (never git add -A)
git add path/to/specific/file.js
git commit -m "feat: Implement {module} per spec {spec}.md"
git push origin claude

# If push is rejected because someone pushed ahead
git pull --rebase origin claude
git push origin claude
```

---

**Last updated: 2026-06-02**

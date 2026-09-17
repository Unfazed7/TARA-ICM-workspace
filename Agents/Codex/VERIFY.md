# VERIFICATION PROTOCOL

Run this checklist before every push. All checks must pass.

---

## The 4 Checks

### 1. Compilation / Lint

**Node.js modules:**
```bash
node --check {file}          # syntax check
npx eslint {file}            # lint (if eslint configured)
```

**Python modules (checkpoint-api):**
```bash
cd checkpoint-api
python -m py_compile {file}  # syntax check
flake8 {file}                # lint (if flake8 configured)
```

Passes when: no syntax errors, no lint errors.

---

### 2. Scope Check

```bash
git diff --name-only
```

Passes when: ONLY files designated in the spec appear.

If any unexpected file appears — especially anything in `.meta/`, `_config/`, or any `CONTEXT.md` — undo that change. You touched something you shouldn't have.

---

### 3. Regression Check

**Node.js:**
```bash
npm test
```

**Python (checkpoint-api):**
```bash
cd checkpoint-api && pytest
```

Passes when: no previously-passing tests now fail. If tests fail that you didn't write: you broke something adjacent — fix it before pushing.

---

### 4. Test Coverage

**Node.js:**
```bash
npm test -- {module}
```

**Python:**
```bash
cd checkpoint-api && pytest tests/test_{module}.py -v
```

Passes when:
- Golden path: valid input → correct output, matches schema
- Error path: invalid/missing input → correct error thrown, no crash
- Edge cases: empty arrays, null fields, boundary values listed in spec

---

## Sign-Off (Add to Every Commit Message or PR)

```
Verification Results (VERIFY.md):
- [x] Compilation/lint: PASS
- [x] Scope: Only touched {list files}
- [x] Regression: {N} suite tests, all pass
- [x] Tests: {N} unit tests passing, 0 failing
```

---

**If any check fails: fix it. Do not push with known failures.**

**Last updated: 2026-06-02**

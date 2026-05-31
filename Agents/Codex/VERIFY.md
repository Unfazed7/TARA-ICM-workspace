# VERIFICATION PROTOCOL

Run this checklist before opening any PR. All checks must pass.

## The 4 Checks

**1. Compilation / Lint**
```bash
node --check {file}         # syntax check (Node.js)
npx eslint {file}           # lint (if eslint configured)
```
Passes when: no syntax errors, no lint errors.

**2. Scope Check**
```bash
git diff --name-only        # shows every file you've touched
```
Passes when: ONLY files designated in the spec appear in this list.
If any unexpected file appears: undo that change, investigate why it got touched.

**3. Regression Check**
```bash
npm test                    # full test suite
```
Passes when: no previously-passing tests now fail.
If tests fail that you didn't write: you broke something adjacent — fix it.

**4. Test Coverage**
```bash
npm test -- {module}        # module-specific tests
```
Passes when:
- Golden path test: valid input → correct output, matches schema
- Error path test: invalid/missing input → correct error, no crash
- Edge cases: empty arrays, null fields, boundary values

---

## Sign-Off

After all 4 checks pass, add to your PR body:
```
## Verification Results (VERIFY.md)
- [x] Compilation/lint: PASS
- [x] Scope: Only touched {list files}
- [x] Regression: {N} suite tests, all pass
- [x] Tests: {N} unit tests passing, 0 failing
```

---

**If any check fails: fix it before opening the PR.**  
Do not open a PR with known failures and promise to fix later.

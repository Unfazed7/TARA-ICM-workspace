# CLAUDE REVIEW PROTOCOL — Spec Compliance Checks

**When to use this:** After Codex pushes an implementation to the `claude` branch and signals it's ready for review. Claude runs this checklist against the code before Omkar merges `claude → develop`.

**What Claude reviews:** Spec compliance only. Not code style, not architecture opinions. The question is always: "Does this implementation do exactly what the spec says?"

---

## Step 1 — Pull and Identify Changes

```bash
git pull origin claude
git log --oneline -10           # see what Codex committed
git diff HEAD~N --name-only     # see which files were added/modified
```

---

## Step 2 — Scope Check (30 seconds)

Before reading any code, check that Codex only touched files it owns.

**Codex MUST NOT have touched:**
```
.meta/
tara-workspace/web-based-tara/_config/
tara-workspace/web-based-tara/stages/*/CONTEXT.md
tara-workspace/web-based-tara/CLAUDE.md
tara-workspace/web-based-tara/CONTEXT.md
tara-workspace/CLAUDE.md
tara-workspace/CONTEXT.md
Agents/Codex/BRANCH-WORKFLOW.md
Agents/Codex/CODEX-PROTOCOL.md
```

If any of these appear in the diff → **REJECT immediately** before reading further.

---

## Step 3 — Spec Compliance (per module)

Read each implemented file against its spec. Use these checklists:

---

### Engines (`cvss-afr-calc.js`, `risk-score.js`)

- [ ] CVSS weights exactly match `_config/cvss-afr-formula.md` (N=0.85, A=0.62, L=0.55, P=0.20, etc.)
- [ ] Formula: `exploitability = 8.22 × AV × AC × PR × UI` — not approximated
- [ ] MIN=0.121, MAX=3.893 constants match spec
- [ ] `afr_value = Math.round(1 + ((exploitability - MIN) / (MAX - MIN)) × 4)`
- [ ] Clamped to [1, 5] — never outside this range
- [ ] AFR labels: 1=very low, 2=low, 3=medium, 4=high, 5=very high
- [ ] Throws on invalid metric values (not silently returns wrong result)
- [ ] Impact conversion: Negligible=0, Moderate=1, Major=2, Severe=3
- [ ] `impact_rating_value = max(privacy, operational, legal, financial_org, business)` — Safety and Financial for Tool User excluded
- [ ] Risk thresholds: 0=informational, 1-3=low, 4-7=medium, 8-11=high, 12-15=critical
- [ ] Tiebreak: equal risk_score → higher afr_value ranks higher (lower rank number)
- [ ] All module exports present: `calculateCVSSAFR`, `WEIGHTS`, `AFR_LABELS`, etc.

---

### JSON Schemas (`src/schemas/`)

- [ ] CIAAAN fields are 6 booleans — NOT severity strings
- [ ] `asset_id` pattern: `^AS_\d{2,}$` (not AS-001, not AS_1)
- [ ] Same pattern check for DS_##, TH_##, AT_##, IM_##, RSK_##, TRT_##, RR_##
- [ ] `tool_user.safety` and `tool_user.financial` — schema enforces `"Negligible"` only (not enum with other options)
- [ ] `afr_value` is nullable in Stage 04 schema (null at submission, filled by engine)
- [ ] Stage 04 attack path: all 5 step fields required, no nullable steps
- [ ] Stage 05: all 7 rationale strings required, non-empty
- [ ] Stage 06: `risk_score` is integer, `risk_rank` is integer starting at 1
- [ ] Cross-reference IDs present in schemas (threat_id, damage_scenario_id, etc.)

---

### Stage Agents (`stages/0{1-5}/agent.js`)

- [ ] **Stage 01:** Both `--mode csv` and `--mode diagram` produce identical schema output. Mode B uses Claude Vision. `input_mode` field set correctly.
- [ ] **Stage 02:** Groups all CIAAAN properties per asset into one API call. Attacker language check throws before write. One DS_## per asset × true property.
- [ ] **Stage 03:** One API call per DS_## (not batched). `threat_statement` contains `asset_title` (asset-specific self-test).
- [ ] **Stage 04:** Extended thinking enabled (`thinking: { type: 'enabled', budget_tokens: 8000 }`). `afr_value` is null at write time. Checkpoint submitted AFTER engine run, not before.
- [ ] **Stage 05:** `tool_user.safety` and `tool_user.financial` injected as `"Negligible"` in post-processing — NOT delegated to Claude. `tool_choice: { type: 'tool', name: ... }` is forced.

**All agents:**
- [ ] `tool_choice: { type: 'tool', name: '...' }` set — no free text fallback
- [ ] Validates output schema before writing file
- [ ] Submits checkpoint to Checkpoint API after writing
- [ ] Throws (does not swallow) errors from engines or API

---

### Checkpoint API (`checkpoint-api/`)

- [ ] `UniqueConstraint("assessment_id", "stage_num")` on the Checkpoint model
- [ ] Cannot review an already-reviewed checkpoint (409, not silent overwrite)
- [ ] `stage_num` validated as integer 1–8
- [ ] All 4 endpoints present: POST create, GET poll, POST review, GET list
- [ ] JWT auth dependency on all endpoints
- [ ] `DATABASE_URL` from environment variable (not hardcoded)
- [ ] SQLite works for local dev (same codebase, different URL)

---

## Step 4 — Test Coverage Check

Read the test files. Verify:

- [ ] Engines: all boundary score values tested (0, 3, 4, 7, 8, 11, 12, 15)
- [ ] Engines: all 32 CVSS metric combinations produce afr_value in [1, 5]
- [ ] Schema tests: at least one valid fixture + two invalid fixtures per stage
- [ ] Agent tests: golden path + attacker language rejection + invalid enum + empty input
- [ ] Checkpoint API tests: full approval flow + rejection flow + duplicate 409 + status transitions

---

## Step 5 — Write Review Result

After completing the checklist, commit one of these to the `claude` branch:

**If everything passes:**
```bash
git commit --allow-empty -m "review: Approve {module} — spec compliant

Checked against .meta/specs/{spec-filename}.md
All items in REVIEW-PROTOCOL.md passed."
git push origin claude
```

**If issues found:**
Create `REVIEW-ISSUES.md` in the repo root (temporary, deleted after fix):
```markdown
# Review Issues — {module} — {date}

## Issue 1
File: {file path, line number}
Problem: {what it does}
Required: {what the spec says it must do}
Spec reference: .meta/specs/{spec}.md line {N}

## Issue 2
...
```

```bash
git add REVIEW-ISSUES.md
git commit -m "review: Issues found in {module} — see REVIEW-ISSUES.md"
git push origin claude
```

Codex reads `REVIEW-ISSUES.md`, fixes, deletes the file, pushes again. Claude re-reviews.

---

## Non-Negotiable Rejections (Instant Reject, No Discussion)

These are wrong regardless of any other consideration:

| Found | Why it's wrong |
|-------|----------------|
| `tool_user.safety` not always `"Negligible"` | Domain constraint, never computed |
| `tool_user.financial` not always `"Negligible"` | Domain constraint, never computed |
| Extended thinking NOT enabled in Stage 04 | Required by spec — attack path reasoning |
| Extended thinking enabled in any other stage | Only Stage 04 uses it |
| `afr_value` not null at Stage 04 write time | Engine fills it, not the agent |
| `impact_rating_value` includes Safety or Tool User Financial in the max() | These are always 0, but the formula must exclude them explicitly |
| Any CVSS weight different from spec values | Breaks every downstream risk score |
| Checkpoint not submitted after stage output | Breaks the human review gate |

---

**Last updated: 2026-06-02**

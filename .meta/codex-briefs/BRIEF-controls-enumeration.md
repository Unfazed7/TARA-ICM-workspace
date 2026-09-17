# Codex Brief — Controls Enumeration Script

**Task:** Write and run a one-shot Node.js script that safely enumerates defensive skills
from an external GitHub repository and outputs two JSON files for Claude to curate.

**Branch:** Work on `claude` branch. Commit outputs + script when done.

---

## Security Constraints — Read First

These are non-negotiable. Any violation is grounds for immediate task rejection.

| Constraint | Rule |
|------------|------|
| NO git clone | Never run `git clone` or `git` against the external repo |
| NO code execution | Never run, eval, require, or import anything from the external repo |
| NO npm install | Use only Node.js built-in modules: `https`, `fs`, `path`, `url` |
| HTTPS only | All requests to `raw.githubusercontent.com` only — no other domains |
| Text only | Parse only plain text (YAML frontmatter, JSON) — no binary, no scripts |
| Validate before parse | Check that fetched content contains `---` frontmatter markers before parsing |
| Rate limit | Add 150ms delay between each HTTPS request — do not hammer GitHub |
| Timeout | Set 8000ms timeout per request — abort and log on timeout, do not throw |
| Error isolation | If one skill fetch fails: log the name, skip it, continue — never abort the run |

---

## What the Script Does

### Step 1 — Fetch the skill index

```
GET https://raw.githubusercontent.com/mukul975/Anthropic-Cybersecurity-Skills/main/index.json
```

Parse the JSON. Extract the `skills` array. Each entry has: `name`, `description`, `domain`, `path`.
Total: 754 entries.

### Step 2 — Keyword filter (reduce API calls)

Do NOT fetch all 754 SKILL.md files. Filter the index first by running a
case-insensitive keyword match on `name + description` against this list:

```
auth, oauth, jwt, token, session, cookie,
access, rbac, permission, privilege, authoriz,
api, endpoint, gateway,
encrypt, tls, ssl, certificate, cryptograph,
log, monitor, audit, detect, alert, siem,
input, validat, sanitiz, xss, injection, csrf,
secure, harden, protect,
mfa, credential, password, identity, saml, oidc,
cors, header, csp, firewall, waf,
web, http, https
```

A skill passes if ANY keyword matches in its `name` OR `description`.
This should yield ~80–120 candidates from the 754.

Write the candidate list to `.meta/controls/01-candidates.json`:
```json
[
  { "name": "skill-name", "description": "...", "path": "skills/skill-name" },
  ...
]
```

### Step 3 — Fetch SKILL.md for each candidate

For each candidate, fetch:
```
GET https://raw.githubusercontent.com/mukul975/Anthropic-Cybersecurity-Skills/main/skills/{name}/SKILL.md
```

**Security validation before parsing:**
- Response must be plain text (content-type text/* or no content-type)
- Content must contain `---` on the first line — if not, skip this skill (not a SKILL.md)
- Content length must be < 50KB — if larger, skip (anomalous)
- Never pass content to `eval()`, `Function()`, `require()`, or any executor

**Frontmatter extraction:**
Extract ONLY the block between the first `---` and the second `---`.
Parse it as YAML manually (do not use a yaml npm package — parse it yourself with simple
line-by-line key: value extraction). You only need these fields:

```yaml
name: ...
description: ...
domain: ...
subdomain: ...
tags: [...]
nist_csf: [DE.CM-01, PR.AC-04, ...]   # ← the critical field
mitre_attack: [T1190, ...]
```

If `nist_csf` field is absent or empty, skip this skill.

### Step 4 — CSF function filter

Keep only skills where at least one NIST CSF ref starts with `PR.`, `DE.`, or `RS.`.

- `PR.*` = Protect (preventive controls)
- `DE.*` = Detect (detective controls)  
- `RS.*` = Respond (corrective controls)

Discard skills with only `GV.*`, `ID.*`, or `RC.*` refs.

### Step 5 — Write outputs

**File 1:** `.meta/controls/02-treatment-candidates.json`
```json
[
  {
    "name": "skill-name",
    "description": "one-line description",
    "subdomain": "identity-access-management",
    "nist_csf": ["PR.AC-01", "PR.AC-04"],
    "mitre_attack": ["T1078"],
    "csf_functions": ["PR"],
    "skill_url": "https://github.com/mukul975/Anthropic-Cybersecurity-Skills/tree/main/skills/skill-name"
  },
  ...
]
```

**File 2:** `.meta/controls/03-enumeration-summary.json`
```json
{
  "run_timestamp": "ISO8601",
  "total_skills_in_index": 754,
  "keyword_candidates": 0,
  "fetch_succeeded": 0,
  "fetch_failed": 0,
  "fetch_skipped_no_frontmatter": 0,
  "fetch_skipped_no_nist_csf": 0,
  "treatment_candidates_final": 0,
  "csf_breakdown": {
    "PR": 0,
    "DE": 0,
    "RS": 0
  }
}
```

---

## File Ownership

**Codex WILL create:**
- `scripts/enumerate-controls-skills.js` — the script
- `.meta/controls/01-candidates.json` — keyword-filtered index subset
- `.meta/controls/02-treatment-candidates.json` — CSF-filtered final list
- `.meta/controls/03-enumeration-summary.json` — run stats

**Codex WILL NOT touch:**
- Any `tara-workspace/` files
- Any `src/schemas/` files
- Any `tests/` files
- Any existing `_config/` files

---

## Running the Script

```bash
node scripts/enumerate-controls-skills.js
```

No arguments. No environment variables needed. No API keys. GitHub raw content
is public — no authentication required.

Expected runtime: ~2–4 minutes (150ms delay × ~100 fetches).

---

## Verification

After the script runs, verify:

```bash
# 1. Summary file exists and shows sensible numbers
cat .meta/controls/03-enumeration-summary.json

# 2. Treatment candidates file has entries
node -e "
  const c = require('./.meta/controls/02-treatment-candidates.json');
  console.log('Total treatment candidates:', c.length);
  console.log('Sample entry:', JSON.stringify(c[0], null, 2));
  const allHaveNistCsf = c.every(s => s.nist_csf && s.nist_csf.length > 0);
  console.assert(allHaveNistCsf, 'All entries must have nist_csf');
  const allHaveCsfFunctions = c.every(s =>
    s.csf_functions.some(f => ['PR','DE','RS'].includes(f))
  );
  console.assert(allHaveCsfFunctions, 'All entries must have PR/DE/RS function');
  console.log('Verification OK');
"

# 3. No skill_url points to a non-GitHub domain
node -e "
  const c = require('./.meta/controls/02-treatment-candidates.json');
  c.forEach(s => {
    if (!s.skill_url.startsWith('https://github.com/mukul975/')) {
      throw new Error('Invalid URL: ' + s.skill_url);
    }
  });
  console.log('URL safety check OK');
"
```

---

## Commit message when done

```
feat(controls): enumerate treatment-candidate skills from cybersecurity skills repo

Script fetches only raw HTTPS content — no clone, no install, no code execution.
Keyword filter → CSF function filter → {N} treatment candidates output to
.meta/controls/02-treatment-candidates.json for Claude to curate.
```

---

## What Happens After This Task

Claude reviews `02-treatment-candidates.json`, selects ~25–30 controls relevant
to web automotive TARA, and authors `tara-workspace/web-based-tara/_config/controls-catalogue.md`.
That file becomes the Layer 3 context for Stage 07. Claude writes the Stage 07 spec
after the catalogue is authored.

Do not implement Stage 07 — stop after the commit.

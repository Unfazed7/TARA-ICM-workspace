
---

## Update: full pipeline-to-API-to-frontend wiring (verified)

### New in this drop

| File | Purpose |
|---|---|
| `checkpoint-api/checkpoint_api/routers/boundary.py` | **+seed endpoint** — `POST .../boundary/seed` |
| `checkpoint-api/checkpoint_api/schemas.py` | **+`BoundarySeed`** schema |
| `checkpoint-api/tests/test_boundary.py` | **+3 tests** (seed, double-seed guard, full flow) — 12/12 passing |
| `scripts/demo-run.js` | **new** — one-command runner, `--fixtures` (no API key) or `--live` |
| `frontend/src/lib/api.ts` | **+`api.boundary`** resource, 6 methods |
| `frontend/src/components/workspace/BoundaryReview.tsx` | **new** — functional CP1 screen, wired to live API |
| `frontend/src/components/workspace/ItemDefinition.tsx` | rewired from `ArchitectureVisualizer` stub → `BoundaryReview` |
| `frontend/src/pages/ProjectWorkspace.tsx` | 1 line — passes `projectId` through as `assessmentId` |

### How to actually run it, right now

**Terminal 1 — API:**
```bash
cd checkpoint-api
DATABASE_URL="sqlite:///./demo.db" JWT_SECRET="local-demo-secret-9f8e7d" \
  python3 -m uvicorn checkpoint_api.main:app --port 8000
```

**Terminal 2 — seed + exercise it (no Anthropic key needed):**
```bash
cd /path/to/TARA-ICM-workspace
JWT_SECRET="local-demo-secret-9f8e7d" node scripts/demo-run.js --fixtures
```

This seeds a boundary from the sample fixtures, tries to finalize while ambiguous
(blocked, verified), resolves the blocker, finalizes (succeeds), prints the edit
history, then confirms the frozen boundary rejects further edits (409). Every
step hits the real FastAPI app — verified against `/tmp/uvicorn.log` access log,
not just the script's own success message.

**Terminal 3 — frontend:**
```bash
cd frontend
npm install   # first time only
npm run dev
```
Log in, open a project, click the **Item Definition** stage tab. It fetches
`GET /api/v1/assessments/{projectId}/boundary` live. If you seeded
`ASS_DEMO...` from the script, either use that assessment id or seed against
a real project id from your DB.

**Live mode**, once you have real diagrams and an API key:
```bash
export ANTHROPIC_API_KEY=sk-...
node scripts/demo-run.js --live --arch path/to/arch.png \
  --boundary "The item is the telematics function: TCU and its gateway path."
```
This runs the actual Stage 1 pipeline (Claude vision extraction, reconciliation,
boundary reasoning), seeds the result into the API, and tells you the resolve/
finalize/resume commands to run next.

### Honest scope of `BoundaryReview.tsx`

This is a **functional placeholder**, not the Claude Design canvas. It's a
list grouped by scope status, using the approved token vocabulary (ochre
blocking cards, mono identifiers, `derived`/`analyst` labels) but no React
Flow, no drag-to-reassign, no drafting-style boundary perimeter. It exists so
the full chain — pipeline → API → screen → mutation → finalize gate — is
provably real today. Swap the render body for the React Flow canvas later;
the `useBoundary()` data hook and `api.boundary.*` calls don't need to change.

### Verified, not just written

- `checkpoint-api`: 12/12 pytest passing, including a full seed→resolve→
  finalize→freeze flow test
- `scripts/demo-run.js --fixtures`: run against a live uvicorn process,
  confirmed via server access log (not just script exit code)
- Frontend: `tsc --noEmit` clean on the full project, `npm run build`
  succeeds and produces `dist/`

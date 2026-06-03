# Codex Brief — Frontend Integration (Spec 11)

**Spec:** `.meta/specs/11-frontend-integration.md` — read it fully before starting.  
**Branch:** Create `codex/frontend-integration` from `develop`.  
**PR target:** `develop`  
**Prerequisite:** `codex/backend-api` must be merged first. The API endpoints must exist.

---

## What to Build

Replace the frontend's offline data layer (IndexedDB + localStorage + mock data) with REST API calls to the FastAPI backend. Do NOT redesign any UI — only replace the data source.

---

## Priority Order

Work in this order. Test each step before moving to the next.

### Step 1 — Add Vite Proxy

In `frontend/vite.config.ts`, add the server proxy block so that `/api/*` calls in the browser forward to `http://localhost:8000` during development:

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
```

Verify: `npm run dev` starts without errors.

### Step 2 — Create API Client

Create `frontend/src/lib/api.ts` using the exact implementation from spec 11. This is the ONLY place that calls `fetch()`. All contexts use this client.

Create `frontend/src/types/api.ts` with the `Assessment`, `PipelineRunStatus`, and `CreateAssessmentBody` interfaces from spec 11.

### Step 3 — Replace AuthContext

Rewrite `frontend/src/contexts/AuthContext.tsx` using the implementation from spec 11.
- Token stored in `sessionStorage` under key `tara_token`
- On mount: call `api.auth.me()` to restore session from existing token
- `login()` calls `api.auth.login()`, stores token, fetches user
- `logout()` clears sessionStorage and nulls user state
- Remove all localStorage reads/writes for auth
- Remove the OTP/2FA toast flow (backend handles auth directly)

Verify: run `npm run build` — no TypeScript errors in AuthContext.

### Step 4 — Replace ProjectContext

Rewrite `frontend/src/contexts/ProjectContext.tsx` using spec 11's react-query pattern.
- Import `useQuery`, `useMutation`, `useQueryClient` from `@tanstack/react-query`
- `projects` comes from `useQuery(['assessments'], api.assessments.list)`
- `createProject` is a `useMutation` that calls `api.assessments.create`
- `setActiveProject(id)` stores the ID in component state, NOT in localStorage
- Remove all `loadProjectsFromDB`, `saveProjectToDB`, `deleteProjectFromDB` calls
- Keep the same context interface shape so consuming components don't break

Verify: Dashboard page loads without errors (may show empty list if no assessments yet).

### Step 5 — Delete Mock Data

Delete these files entirely:
```
frontend/src/data/mock-damage-scenarios.ts
frontend/src/data/mock-feature-analysis.ts
frontend/src/data/mock-tara-grid.ts
frontend/src/data/mock-threat-scenarios.ts
frontend/src/data/mock-threat-stream.ts
frontend/src/data/taraAssets.ts
```

Fix any import errors that result — replace with empty arrays or `api.pipeline.output()` calls as appropriate.

### Step 6 — Replace TaraContext

Rewrite `frontend/src/contexts/TaraContext.tsx` using spec 11's react-query pattern.
- Accept `assessmentId` as a prop (passed from ProjectWorkspace)
- One `useQuery` per stage output (stages 1–7)
- `stageStatuses` from `useQuery(['assessment', assessmentId], api.assessments.get)` with polling enabled while any stage is running (3s interval)
- `runStage(stageNum)` calls `api.pipeline.run()` then invalidates the assessment query
- Remove all `loadTaraDataFromDB`, `saveTaraDataToDB`, and CRUD mutation functions
- Remove `addAsset`, `updateAsset`, `removeAsset` etc. — the pipeline writes these, the frontend only reads
- Keep the same hook interface for reading data so consuming components work unchanged

### Step 7 — Add Stage Runner to ProjectWorkspace

In `frontend/src/pages/ProjectWorkspace.tsx`, add a stage execution panel to the TARA tab.

The panel shows all 7 stages with their current status and a "Run" button for stages that are `not_started` or `failed`. Use the `Badge` component from shadcn-ui for status display.

```tsx
const STATUS_VARIANT: Record<string, 'default'|'secondary'|'destructive'|'outline'> = {
  not_started: 'outline',
  pending: 'secondary',
  running: 'secondary',
  complete: 'default',
  failed: 'destructive',
};

const STAGE_LABELS = [
  { num: 1, label: '01 — Input Normalization' },
  { num: 2, label: '02 — Damage Analysis' },
  { num: 3, label: '03 — Threat Identification' },
  { num: 4, label: '04 — Attack Path Modelling' },
  { num: 5, label: '05 — Impact Analysis' },
  { num: 6, label: '06 — Risk Scoring' },
  { num: 7, label: '07 — Risk Treatment' },
];
```

Also add a CSV upload input above the stage runner that calls `api.uploads.csv()` and is required before Stage 01 can run.

### Step 8 — Update Dashboard

In `frontend/src/pages/Dashboard.tsx`:
- Replace mock/IndexedDB project list with `useProjects()` (which now calls API)
- `completion_percentage` comes from the API response — no local calculation
- `threatCount` and `riskCount`: set to 0 for now; implement by checking Stage 03 and Stage 06 output lengths (optional enhancement)

### Step 9 — Update NewProject Page

In `frontend/src/pages/NewProject.tsx`:
- Replace IndexedDB project creation with `createProject(body)` from `useProjects()`
- On success, navigate to `/project/${result.assessment_id}`

---

## Add mappers.ts

Create `frontend/src/lib/mappers.ts` with `assessmentToProject()` as defined in spec 11. Use this wherever existing components expect a `Project` type but the API returns an `Assessment`.

---

## What NOT to Change

- `frontend/src/components/ui/*` — shadcn components untouched
- `frontend/src/types/*` — keep all existing type definitions
- `frontend/src/pages/Login.tsx` form/layout — only replace the `onSubmit` handler
- `frontend/src/pages/ReviewQueue.tsx` — leave as-is for now
- `frontend/src/pages/UserManagement.tsx` — leave as-is for now
- All CSS/tailwind config

---

## Environment Setup for Testing

The backend must be running before you can test anything:
```bash
cd checkpoint-api
JWT_SECRET=dev-test-secret uvicorn checkpoint_api.main:app --reload --port 8000 &

cd frontend
npm install
npm run dev
# Visit http://localhost:5173
```

---

## Verification

```bash
# No IndexedDB/localStorage references for data (auth sessionStorage is OK)
grep -r "openDB\|indexedDB\|loadTaraDataFromDB\|loadProjectsFromDB\|autotara-projects" frontend/src/
# Must return no results

# No mock data imports
grep -r "mock-" frontend/src/
# Must return no results

# Type check
cd frontend && npx tsc --noEmit
# Must pass with 0 errors

# Build
cd frontend && npm run build
# Must succeed
```

Manual test flow:
1. Register a user via the API (or via the frontend register flow if it exists)
2. Login → JWT token stored → redirect to /dashboard
3. Create a new assessment → appears in dashboard
4. Open ProjectWorkspace → upload a CSV → run Stage 01 → status changes to running → complete
5. Stage 01 output appears in TARA tab (assets list)

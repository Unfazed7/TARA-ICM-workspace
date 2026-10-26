# Spec 11 — Frontend Integration (cyber-carbon-shield → TARA Aegis)

**Module:** `frontend/` (React + TypeScript + Vite + shadcn-ui)  
**Author:** Claude  
**Status:** Ready for implementation  
**Depends on:** Spec 10 (backend API) must be implemented first  

---

## Goal

Replace the frontend's offline-only data layer (IndexedDB, localStorage, mock data) with REST API calls to the FastAPI backend. The frontend becomes a pure UI layer — all TARA logic runs in the pipeline. Keep all existing UI structure intact; only replace the data layer.

---

## Success Criteria

```bash
# Backend running on :8000
cd checkpoint-api && JWT_SECRET=dev-test-secret uvicorn checkpoint_api.main:app --reload --port 8000

# Frontend running on :5173
cd frontend && npm install && npm run dev

# Flow works end-to-end:
# 1. Visit http://localhost:5173 → redirects to /login
# 2. Login with test credentials → JWT stored, redirect to /dashboard
# 3. Dashboard shows assessments from API (not IndexedDB)
# 4. Create new assessment → POST /api/v1/assessments succeeds
# 5. In ProjectWorkspace, upload CSV → POST /api/v1/assessments/{id}/upload/csv
# 6. Run Stage 01 → POST /api/v1/assessments/{id}/stages/1/run
# 7. Poll status → GET /api/v1/assessments/{id}/stages/1/status → complete
# 8. TARA tab shows Stage 01 assets from GET /api/v1/assessments/{id}/outputs/01
```

---

## File Ownership

**Codex WILL modify:**
- `frontend/src/contexts/AuthContext.tsx` — replace localStorage auth with JWT API
- `frontend/src/contexts/ProjectContext.tsx` — replace IndexedDB with API calls
- `frontend/src/contexts/TaraContext.tsx` — replace IndexedDB with API calls
- `frontend/src/lib/api.ts` (create) — typed API client
- `frontend/vite.config.ts` — add proxy
- `frontend/src/pages/NewProject.tsx` — call POST /api/v1/assessments
- `frontend/src/pages/ProjectWorkspace.tsx` — wire stage runner and output display
- `frontend/src/pages/Dashboard.tsx` — load from API

**Codex WILL NOT modify:**
- `frontend/src/components/` — UI components stay as-is
- `frontend/src/pages/Login.tsx` form structure — only replace submit handler
- `frontend/src/types/` — keep existing type definitions (add mapping utils)
- `frontend/tailwind.config.ts`, `frontend/vite.config.ts` styling — only add proxy

**Codex WILL DELETE:**
- `frontend/src/data/mock-damage-scenarios.ts`
- `frontend/src/data/mock-feature-analysis.ts`
- `frontend/src/data/mock-tara-grid.ts`
- `frontend/src/data/mock-threat-scenarios.ts`
- `frontend/src/data/mock-threat-stream.ts`
- All IndexedDB utility functions (`loadTaraDataFromDB`, `saveTaraDataToDB`, `loadProjectsFromDB`, etc.)
- `frontend/src/data/taraAssets.ts` — replace with API data

---

## Step 1: Vite Proxy

Add to `vite.config.ts`:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  },
},
```

All API calls use `/api/v1/...` paths — Vite forwards them to FastAPI in dev.

---

## Step 2: API Client — `frontend/src/lib/api.ts`

Create a typed API client. Do not use axios — use native `fetch`. Centralise auth token handling here.

```typescript
const API_BASE = '/api/v1';

function getToken(): string | null {
  return sessionStorage.getItem('tara_token');
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? `API error ${res.status}`);
  }
  return res.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiFetch<{ access_token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (email: string, password: string, name: string) =>
      apiFetch<{ email: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      }),
    me: () => apiFetch<{ email: string; name: string; role: string }>('/auth/me'),
  },

  assessments: {
    list: () => apiFetch<Assessment[]>('/assessments'),
    get: (id: string) => apiFetch<Assessment>(`/assessments/${id}`),
    create: (body: CreateAssessmentBody) =>
      apiFetch<Assessment>('/assessments', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<CreateAssessmentBody>) =>
      apiFetch<Assessment>(`/assessments/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  },

  pipeline: {
    run: (assessmentId: string, stageNum: number) =>
      apiFetch<PipelineRunStatus>(`/assessments/${assessmentId}/stages/${stageNum}/run`, { method: 'POST' }),
    status: (assessmentId: string, stageNum: number) =>
      apiFetch<PipelineRunStatus>(`/assessments/${assessmentId}/stages/${stageNum}/status`),
    output: <T>(assessmentId: string, stageNum: number) =>
      apiFetch<T>(`/assessments/${assessmentId}/stages/${stageNum}/output`),
  },

  uploads: {
    csv: (assessmentId: string, file: File) => {
      const form = new FormData();
      form.append('assets_csv', file);
      const token = getToken();
      return fetch(`${API_BASE}/assessments/${assessmentId}/upload/csv`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      }).then(r => r.json());
    },
  },
};
```

**Type definitions for API shapes** (add to `frontend/src/types/api.ts`):
```typescript
export interface Assessment {
  assessment_id: string;
  name: string;
  vehicle_type: string;
  domains: string[];
  status: 'active' | 'archived';
  completion_percentage: number;
  stages: Record<string, 'not_started' | 'pending' | 'running' | 'complete' | 'failed'>;
  created_at: string;
}

export interface PipelineRunStatus {
  stage_num: number;
  status: 'not_started' | 'pending' | 'running' | 'complete' | 'failed';
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

export interface CreateAssessmentBody {
  name: string;
  description?: string;
  vehicle_type: string;
  domains: string[];
}
```

---

## Step 3: Replace AuthContext

Replace the localStorage/OTP implementation:

```typescript
// AuthContext.tsx — new implementation
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // On mount: verify token if exists
    const token = sessionStorage.getItem('tara_token');
    if (token) {
      api.auth.me()
        .then(u => setUser({ id: u.email, email: u.email, name: u.name, role: u.role as Role }))
        .catch(() => sessionStorage.removeItem('tara_token'))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const { access_token } = await api.auth.login(email, password);
    sessionStorage.setItem('tara_token', access_token);
    const u = await api.auth.me();
    setUser({ id: u.email, email: u.email, name: u.name, role: u.role as Role });
  };

  const logout = () => {
    sessionStorage.removeItem('tara_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

Token stored in `sessionStorage` (cleared on tab close — more secure than localStorage for JWT).

---

## Step 4: Replace ProjectContext

Drop IndexedDB. Use react-query for caching:

```typescript
// ProjectContext.tsx — thin wrapper around react-query
export function ProjectProvider({ children }) {
  const queryClient = useQueryClient();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['assessments'],
    queryFn: () => api.assessments.list(),
  });

  const createProject = useMutation({
    mutationFn: (body: CreateAssessmentBody) => api.assessments.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assessments'] }),
  });

  const getProject = (id: string) => projects.find(p => p.assessment_id === id);

  return (
    <ProjectContext.Provider value={{
      projects,
      isLoading,
      activeProject: activeProjectId ? getProject(activeProjectId) : null,
      setActiveProject: setActiveProjectId,
      createProject: createProject.mutateAsync,
      getProject,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}
```

---

## Step 5: Replace TaraContext

Drop IndexedDB. Load stage outputs lazily per assessment:

```typescript
// TaraContext.tsx — reads stage outputs from API, no local writes
export function TaraProvider({ children, assessmentId }) {
  const { data: assets } = useQuery({
    queryKey: ['stage-output', assessmentId, 1],
    queryFn: () => api.pipeline.output(assessmentId, 1),
    enabled: !!assessmentId,
  });
  const { data: threats } = useQuery({
    queryKey: ['stage-output', assessmentId, 3],
    queryFn: () => api.pipeline.output(assessmentId, 3),
    enabled: !!assessmentId,
  });
  // ... similarly for stages 2, 4, 5, 6, 7

  const { data: stageStatuses } = useQuery({
    queryKey: ['assessment', assessmentId],
    queryFn: () => api.assessments.get(assessmentId),
    refetchInterval: (data) => {
      // Poll every 3s while any stage is running
      const running = Object.values(data?.stages ?? {}).includes('running');
      return running ? 3000 : false;
    },
    enabled: !!assessmentId,
  });

  const runStage = async (stageNum: number) => {
    await api.pipeline.run(assessmentId, stageNum);
    // react-query will refetch stageStatuses due to polling
  };

  return (
    <TaraContext.Provider value={{
      assets, threats, /* ... all stage outputs ... */
      stageStatuses: stageStatuses?.stages ?? {},
      runStage,
    }}>
      {children}
    </TaraContext.Provider>
  );
}
```

---

## Step 6: ProjectWorkspace — Stage Runner UI

The workspace TARA tab needs a stage execution panel. Add to `ProjectWorkspace.tsx`:

```tsx
// Stage runner component (add inside ProjectWorkspace)
function StageRunner({ assessmentId, stageNum, label }) {
  const { stageStatuses, runStage } = useTara();
  const status = stageStatuses[String(stageNum).padStart(2, '0')] ?? 'not_started';

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-32">{label}</span>
      <Badge variant={statusVariant(status)}>{status}</Badge>
      {status === 'not_started' || status === 'failed' ? (
        <Button size="sm" onClick={() => runStage(stageNum)}>Run</Button>
      ) : null}
    </div>
  );
}
```

Stage list to render:
```
Stage 01: Input Normalization
Stage 02: Damage Analysis
Stage 03: Threat Identification
Stage 04: Attack Path Modelling
Stage 05: Impact Analysis
Stage 06: Risk Scoring
Stage 07: Risk Treatment
```

---

## Step 7: Dashboard — load from API

Replace hardcoded/mock project list:

```tsx
// Dashboard.tsx
const { projects, isLoading } = useProjects();
// projects now comes from GET /api/v1/assessments
// completion_percentage, threat counts, etc. from assessment object
```

---

## Data Model Mapping

The frontend's existing type system uses different field names. Do not change the type files — instead add mapping functions in `frontend/src/lib/mappers.ts`:

```typescript
// Map API assessment → frontend Project shape (for components that use Project type)
export function assessmentToProject(a: Assessment): Project {
  return {
    id: a.assessment_id,
    name: a.name,
    vehicleType: a.vehicle_type as VehicleType,
    domains: a.domains as ProjectDomain[],
    status: 'active',
    createdAt: a.created_at,
    updatedAt: a.created_at,
    completionPercentage: a.completion_percentage,
    threatCount: 0,  // computed from Stage 03 output length when available
    riskCount: 0,    // computed from Stage 06 output length when available
  };
}
```

---

## Do Not Change

- All shadcn-ui components in `frontend/src/components/ui/`
- All page layouts — only replace data source
- The routing structure in `App.tsx`
- `frontend/src/types/tara.ts`, `damage-scenario.ts`, etc. — keep as reference types
- Tailwind/PostCSS config

---

## Verification

```bash
# 1. No IndexedDB references remain
grep -r "indexedDB\|openDB\|loadTaraDataFromDB\|loadProjectsFromDB" frontend/src/
# Should return no results

# 2. No mock data imports remain
grep -r "mock-" frontend/src/
# Should return no results

# 3. Frontend builds without errors
cd frontend && npm run build

# 4. Type check passes
cd frontend && npx tsc --noEmit

# 5. Manual: login → create project → run stage 01 → see output in workspace
```

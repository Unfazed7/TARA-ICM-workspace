import type {
  Assessment,
  AssetRegisterImportResult,
  AssetRegisterUploadStatus,
  PipelineRunStatus,
  CreateAssessmentBody,
  UpdateAssessmentBody,
  StageDefinition,
  Checkpoint,
} from '@/types/api';
import type {
  BoundaryState,
  BoundaryEdit,
  BoundaryFinalizeResponse,
  ElementScopeUpdate,
  ElementAdd,
  ElementDelete,
  ConflictResolve,
} from '@/types/item-definition';

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
  if (res.status === 401) {
    sessionStorage.removeItem('tara_token');
    window.dispatchEvent(new Event('autotara:unauthorized'));
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? `API error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

async function uploadFetch<T>(path: string, form: FormData): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? `Upload error ${res.status}`);
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
    update: (id: string, body: UpdateAssessmentBody) =>
      apiFetch<Assessment>(`/assessments/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) => apiFetch<void>(`/assessments/${id}`, { method: 'DELETE' }),
  },

  pipeline: {
    catalog: (assessmentId: string) =>
      apiFetch<StageDefinition[]>(`/assessments/${assessmentId}/stages`),
    run: (assessmentId: string, stageNum: number) =>
      apiFetch<PipelineRunStatus>(`/assessments/${assessmentId}/stages/${stageNum}/run`, { method: 'POST' }),
    pause: (assessmentId: string, stageNum: number) =>
      apiFetch<PipelineRunStatus>(`/assessments/${assessmentId}/stages/${stageNum}/pause`, { method: 'POST' }),
    resume: (assessmentId: string, stageNum: number) =>
      apiFetch<PipelineRunStatus>(`/assessments/${assessmentId}/stages/${stageNum}/resume`, { method: 'POST' }),
    cancel: (assessmentId: string, stageNum: number) =>
      apiFetch<PipelineRunStatus>(`/assessments/${assessmentId}/stages/${stageNum}/cancel`, { method: 'POST' }),
    status: (assessmentId: string, stageNum: number) =>
      apiFetch<PipelineRunStatus>(`/assessments/${assessmentId}/stages/${stageNum}/status`),
    output: <T>(assessmentId: string, stageNum: number) =>
      apiFetch<T>(`/assessments/${assessmentId}/stages/${stageNum}/output`),
  },

  uploads: {
    assetRegisterStatus: (assessmentId: string) =>
      apiFetch<AssetRegisterUploadStatus>(`/assessments/${assessmentId}/stages/3/asset-register`),
    assetRegister: (assessmentId: string, file: File) => {
      const form = new FormData();
      form.append('asset_file', file);
      return uploadFetch<AssetRegisterImportResult>(
        `/assessments/${assessmentId}/stages/3/asset-register`,
        form,
      );
    },
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

  checkpoints: {
    list: (assessmentId: string) =>
      apiFetch<Checkpoint[]>(`/assessments/${assessmentId}/checkpoints`),
    review: (checkpointId: string, decision: 'approved' | 'rejected', notes?: string) =>
      apiFetch<{ checkpoint_id: string; status: string; reviewer_id: string; reviewed_at: string }>(
        `/checkpoints/${checkpointId}/review`,
        { method: 'POST', body: JSON.stringify({ decision, notes: notes || null }) },
      ),
  },

  boundary: {
    get: (assessmentId: string) =>
      apiFetch<BoundaryState>(`/assessments/${assessmentId}/boundary`),
    updateElement: (assessmentId: string, elementId: string, body: ElementScopeUpdate) =>
      apiFetch<BoundaryState>(`/assessments/${assessmentId}/boundary/elements/${elementId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    addElement: (assessmentId: string, body: ElementAdd) =>
      apiFetch<BoundaryState>(`/assessments/${assessmentId}/boundary/elements`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    deleteElement: (assessmentId: string, elementId: string, body: ElementDelete) =>
      apiFetch<BoundaryState>(`/assessments/${assessmentId}/boundary/elements/${elementId}`, {
        method: 'DELETE',
        body: JSON.stringify(body),
      }),
    resolveConflict: (assessmentId: string, body: ConflictResolve) =>
      apiFetch<BoundaryState>(`/assessments/${assessmentId}/boundary/conflicts/resolve`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    edits: (assessmentId: string) =>
      apiFetch<BoundaryEdit[]>(`/assessments/${assessmentId}/boundary/edits`),
    finalize: (assessmentId: string, actor: string) =>
      apiFetch<BoundaryFinalizeResponse>(`/assessments/${assessmentId}/boundary/finalize`, {
        method: 'POST',
        body: JSON.stringify({ actor }),
      }),
  },
};

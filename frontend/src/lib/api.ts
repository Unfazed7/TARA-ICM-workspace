import type { Assessment, PipelineRunStatus, CreateAssessmentBody } from '@/types/api';

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

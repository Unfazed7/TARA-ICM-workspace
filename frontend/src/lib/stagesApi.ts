/** Calls for the Stage 01 and 02 screens (specs 22, 23, 24). */

import type {
  DocGroup,
  PipelineStatus,
  RationaleList,
  ReviewStatus,
  Stage01Output,
  Stage02Output,
  StageKey,
  UploadedDocument,
} from '@/types/stages';

const API_BASE = '/api/v1/assessments';

function token(): string | null {
  return sessionStorage.getItem('tara_token');
}

/** Error with the server's plain message, and the status so screens can tell "not run yet" (404) apart. */
export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;
  if (init.body && !(init.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = typeof body.detail === 'string' ? body.detail : `The server answered ${res.status}.`;
    throw new ApiError(detail, res.status);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const stagesApi = {
  assessment: (id: string) => call<{ assessment_id: string; name: string }>(`/${id}`),

  documents: (id: string) => call<UploadedDocument[]>(`/${id}/documents`),
  upload: (id: string, file: File, group: DocGroup, typeLabel: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('category', group);
    form.append('type_label', typeLabel);
    return call<UploadedDocument>(`/${id}/documents`, { method: 'POST', body: form });
  },
  removeDocument: (id: string, file: string) =>
    call<void>(`/${id}/documents/${encodeURIComponent(file)}`, { method: 'DELETE' }),

  boundary: (id: string) => call<{ text: string | null }>(`/${id}/boundary-statement`),
  saveBoundary: (id: string, text: string) =>
    call<{ text: string }>(`/${id}/boundary-statement`, { method: 'PUT', body: JSON.stringify({ text }) }),

  pipeline: (id: string) => call<PipelineStatus>(`/${id}/pipeline`),
  run: (id: string) => call<PipelineStatus>(`/${id}/run`, { method: 'POST' }),

  stage01: (id: string) => call<Stage01Output>(`/${id}/stages/01/runs/current/output`),
  stage02: (id: string) => call<Stage02Output>(`/${id}/stages/02/runs/current/output`),
  rationale: (id: string, stage: StageKey) => call<RationaleList>(`/${id}/stages/${stage}/rationale`),
  review: (id: string, stage: StageKey, rationaleId: string, status: ReviewStatus, note?: string) =>
    call<unknown>(`/${id}/stages/${stage}/rationale/${rationaleId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    }),
  answer: (id: string, questionId: string, answer: string) =>
    call<unknown>(`/${id}/stages/02/questions/${questionId}/answer`, {
      method: 'PUT',
      body: JSON.stringify({ answer }),
    }),
};

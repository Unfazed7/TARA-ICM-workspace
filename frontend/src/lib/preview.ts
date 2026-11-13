/**
 * The preview mode of a server with AI switched off (D-67, D-68): what the server says is on, and the tester's own copy
 * of the demo TARA for this login session.
 */

import { useQuery } from '@tanstack/react-query';

export const AI_OFF_NOTE = 'AI is switched off in this preview';

const TOKEN = 'tara_token';
const SESSION_KEY = 'tara_session_key';
const DEMO_ID = 'tara_demo_id';

export interface AppConfig {
  ai_enabled: boolean;
  demo_available: boolean;
}

/** Until the server has answered, the screens behave as they always did: AI on, no demo. */
const DEFAULT_CONFIG: AppConfig = { ai_enabled: true, demo_available: false };

export async function fetchConfig(): Promise<AppConfig> {
  try {
    const res = await fetch('/api/v1/config');
    if (!res.ok) return DEFAULT_CONFIG;
    const body = await res.json();
    return { ai_enabled: body.ai_enabled !== false, demo_available: body.demo_available === true };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function useAppConfig(): AppConfig {
  const query = useQuery({ queryKey: ['app-config'], queryFn: fetchConfig, staleTime: 5 * 60 * 1000 });
  return query.data ?? DEFAULT_CONFIG;
}

/** True when the buttons that start a model run must be disabled. */
export function useAiOff(): boolean {
  return !useAppConfig().ai_enabled;
}

function randomKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

/** Called at login: a new login session gets a new key, and so a clean copy of the demo. */
export function startSession(): void {
  sessionStorage.setItem(SESSION_KEY, randomKey());
  sessionStorage.removeItem(DEMO_ID);
}

function sessionKey(): string {
  let key = sessionStorage.getItem(SESSION_KEY);
  if (!key) {
    key = randomKey();
    sessionStorage.setItem(SESSION_KEY, key);
  }
  return key;
}

/** The tester's copy of the demo for this login session. The server makes it on the first call and returns it after that. */
export async function openDemo(): Promise<string> {
  const token = sessionStorage.getItem(TOKEN);
  const res = await fetch('/api/v1/demo/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ session_key: sessionKey() }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(typeof body.detail === 'string' ? body.detail : 'The demo could not be opened.');
  }
  const id = (await res.json()).assessment_id as string;
  sessionStorage.setItem(DEMO_ID, id);
  return id;
}

/**
 * Called at logout, before the token is cleared: asks the server to delete this session's copy. The request is started
 * at once with the token it needs and is allowed to finish after the page has moved on.
 */
export function closeDemo(): void {
  const token = sessionStorage.getItem(TOKEN);
  const id = sessionStorage.getItem(DEMO_ID);
  sessionStorage.removeItem(DEMO_ID);
  sessionStorage.removeItem(SESSION_KEY);
  if (!token || !id) return;
  void fetch(`/api/v1/demo/session/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` }, keepalive: true }).catch(() => undefined);
}

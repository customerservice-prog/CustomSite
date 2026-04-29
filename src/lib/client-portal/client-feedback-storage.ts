const KEY = 'customsite_client_feedback_v1';

export type ClientFeedbackEntry = {
  at: string;
  body: string;
};

export type ClientFeedbackState = {
  entries: ClientFeedbackEntry[];
};

const defaultState = (): ClientFeedbackState => ({ entries: [] });

export function loadClientFeedback(projectId: string): ClientFeedbackState {
  try {
    const raw = localStorage.getItem(`${KEY}:${projectId}`);
    if (!raw) return defaultState();
    const o = JSON.parse(raw) as Partial<ClientFeedbackState>;
    const entries = Array.isArray(o.entries)
      ? o.entries.filter((e) => e && typeof e.body === 'string' && e.body.trim() && typeof e.at === 'string')
      : [];
    return { entries: entries.slice(-100) };
  } catch {
    return defaultState();
  }
}

export function appendClientFeedback(projectId: string, body: string): ClientFeedbackState {
  const prev = loadClientFeedback(projectId);
  const entry: ClientFeedbackEntry = { at: new Date().toISOString(), body: body.trim() };
  const next: ClientFeedbackState = { entries: [...prev.entries, entry].slice(-100) };
  try {
    localStorage.setItem(`${KEY}:${projectId}`, JSON.stringify(next));
  } catch {
    /* */
  }
  return next;
}

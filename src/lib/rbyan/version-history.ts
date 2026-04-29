import type { RbyanVersionEntry } from '@/lib/rbyan/types';

const PREFIX = 'rbyan_versions_v1:';

function key(projectId: string) {
  return `${PREFIX}${projectId}`;
}

function normalizePlan(plan: unknown): string[] {
  if (Array.isArray(plan)) return plan.map((x) => String(x));
  if (typeof plan === 'string' && plan.trim()) return [plan.trim()];
  return [];
}

function normalizeEntry(raw: unknown): RbyanVersionEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.label !== 'string' || typeof o.createdAt !== 'string') return null;
  if (!Array.isArray(o.files)) return null;
  return {
    id: o.id,
    createdAt: o.createdAt,
    label: o.label,
    plan: normalizePlan(o.plan),
    files: o.files as RbyanVersionEntry['files'],
  };
}

export function listRbyanVersions(projectId: string): RbyanVersionEntry[] {
  try {
    const raw = localStorage.getItem(key(projectId));
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown[];
    if (!Array.isArray(arr)) return [];
    return arr.map(normalizeEntry).filter((x): x is RbyanVersionEntry => x !== null);
  } catch {
    return [];
  }
}

export function appendRbyanVersion(projectId: string, entry: RbyanVersionEntry) {
  const list = listRbyanVersions(projectId);
  list.push(entry);
  try {
    localStorage.setItem(key(projectId), JSON.stringify(list));
  } catch {
    /* quota */
  }
}

export function snapshotCurrentSiteAsVersion(
  projectId: string,
  label: string,
  plan: string[],
  files: { name: string; type: 'html' | 'css' | 'js'; content: string }[]
): RbyanVersionEntry {
  const entry: RbyanVersionEntry = {
    id: `snap-${Date.now()}`,
    createdAt: new Date().toISOString(),
    label,
    plan,
    files,
  };
  appendRbyanVersion(projectId, entry);
  return entry;
}

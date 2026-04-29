/**
 * Browser-local persistence for project site files when the admin API / DB are not used
 * (same conditions as the demo banner: VITE_USE_REAL_API !== '1').
 * Mirrors the shape of Postgres `site_files` enough for the Site builder to function.
 */

const PREFIX = 'customsite_local_site_workspace_v1:';

export type LocalSiteFileRow = {
  path: string;
  updated_at?: string | null;
  content_encoding?: string;
};

type StoredRow = { content: string; updated_at: string; content_encoding?: string };

function storageKey(projectId: string): string {
  return `${PREFIX}${projectId}`;
}

function readMap(projectId: string): Record<string, StoredRow> {
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    if (!raw) return {};
    const o = JSON.parse(raw) as Record<string, StoredRow>;
    return o && typeof o === 'object' ? o : {};
  } catch {
    return {};
  }
}

function writeMap(projectId: string, map: Record<string, StoredRow>) {
  try {
    localStorage.setItem(storageKey(projectId), JSON.stringify(map));
  } catch {
    /* quota */
  }
}

export function localSiteListFiles(projectId: string): LocalSiteFileRow[] {
  const map = readMap(projectId);
  return Object.keys(map)
    .sort()
    .map((path) => ({
      path,
      updated_at: map[path].updated_at,
      content_encoding: map[path].content_encoding || 'utf8',
    }));
}

export function localSiteGetFile(projectId: string, path: string): string | null {
  const row = readMap(projectId)[path];
  return row?.content ?? null;
}

export function localSitePutFile(projectId: string, path: string, content: string) {
  const map = readMap(projectId);
  map[path] = { content, updated_at: new Date().toISOString(), content_encoding: 'utf8' };
  writeMap(projectId, map);
}

export function localSiteDeleteFile(projectId: string, path: string) {
  const map = readMap(projectId);
  delete map[path];
  writeMap(projectId, map);
}

export function localSiteMergeFiles(projectId: string, files: Record<string, string>) {
  const map = readMap(projectId);
  const now = new Date().toISOString();
  for (const [path, content] of Object.entries(files)) {
    map[path] = { content, updated_at: now, content_encoding: 'utf8' };
  }
  writeMap(projectId, map);
}

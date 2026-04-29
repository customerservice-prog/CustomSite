import type { SiteImprovement } from '@/lib/types/entities';
import type { ChangelogEntry } from '@/lib/site-builder/builder-workflow-storage';

export type ClientActivityItem = {
  id: string;
  at: string;
  label: string;
};

/** Turn builder changelog lines into short, client-friendly activity lines (no file paths). */
export function polishBuilderLine(message: string): string {
  let s = message.trim();
  s = s.replace(/\(index\.html\)/gi, '');
  s = s.replace(/index\.html/gi, 'homepage');
  s = s.replace(/\.html\b/gi, '');
  s = s.replace(/\s{2,}/g, ' ').trim();
  return s;
}

function isoFromChangelog(at: string): string {
  try {
    return new Date(at).toISOString();
  } catch {
    return at;
  }
}

/** Newest-first activity from the site workspace (saves and section edits in the builder). */
export function activityFromBuilderChangelog(changelog: ChangelogEntry[], limit = 16): ClientActivityItem[] {
  return [...changelog]
    .reverse()
    .slice(0, limit)
    .map((c, i) => ({
      id: `log-${c.at}-${i}`,
      at: isoFromChangelog(c.at),
      label: polishBuilderLine(c.message),
    }));
}

/** Curated highlights your team attached to the project (no timestamps in data). */
export function activityFromImprovements(improvements: SiteImprovement[] | undefined): ClientActivityItem[] {
  return (improvements ?? []).map((row) => ({
    id: `imp-${row.id}`,
    at: row.id,
    label: row.whatChanged,
  }));
}

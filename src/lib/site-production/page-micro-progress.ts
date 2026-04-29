import type { SitePageDefinition } from '@/lib/site-production/types';

export type PageMicroProgress = { pct: number; hint: string };

/** Small % + label so pages feel like they’re moving, not stuck in a CMS. */
export function microProgressForPage(pg: SitePageDefinition): PageMicroProgress {
  if (pg.publishState === 'published') {
    return { pct: 100, hint: 'Complete' };
  }
  if (pg.publishState === 'in_progress') {
    if (pg.path === '/') return { pct: 82, hint: 'Homepage polish in progress' };
    if (pg.path.includes('service')) return { pct: 74, hint: 'Services copy in review' };
    return { pct: 68, hint: 'In progress' };
  }
  return { pct: 38, hint: 'Draft — not client-ready yet' };
}

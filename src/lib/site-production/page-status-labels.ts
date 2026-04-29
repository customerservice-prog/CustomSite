import type { SitePageDefinition } from '@/lib/site-production/types';

export type PagePublishState = SitePageDefinition['publishState'];

export function pageStatusDisplay(state: PagePublishState): 'Draft' | 'In progress' | 'Complete' {
  if (state === 'draft') return 'Draft';
  if (state === 'in_progress') return 'In progress';
  return 'Complete';
}

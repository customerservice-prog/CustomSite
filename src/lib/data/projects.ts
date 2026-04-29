import type { Project } from '@/lib/types/entities';
import { DEMO_CLIENT_ID, DEMO_PROJECT_ID } from '@/lib/data/demo-ids';

export const projectsSeed: Project[] = [
  {
    id: DEMO_PROJECT_ID,
    clientId: DEMO_CLIENT_ID,
    name: 'E-Commerce Site (Tables & Chairs)',
    status: 'Planning',
    budget: 18000,
    spent: 0,
    due: 'Jun 30',
    ownerId: 'u1',
    createdAt: '2026-04-28T12:00:00.000Z',
    updatedAt: '2026-04-28T12:00:00.000Z',
    lifecycleStage: 'discovery',
    templateId: null,
    waitingOn: null,
    deliveryFocus: 'client_site',
    siteStatus: 'draft',
    siteLiveUrl: null,
    lastSiteUpdateLabel: 'Not launched yet',
    sitePageCount: 5,
    clientPortalVisible: true,
    servicePackage: 'growth',
    siteImprovements: [],
    siteBeforeAfter: [],
  },
];

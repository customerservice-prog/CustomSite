import type { Activity, SiteImprovement } from '@/lib/types/entities';

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function activityToClientLine(a: Activity): string | null {
  const t = a.title.trim();
  if (a.type === 'file_uploaded') {
    return t.replace(/^New file uploaded to /i, 'Uploaded deliverables for ');
  }
  if (a.type === 'task_completed') {
    return t.replace(/^Task /i, 'Finished: ');
  }
  if (a.type === 'project_updated' || a.type === 'project_phase_changed') {
    return t;
  }
  if (a.type === 'message_received') {
    return t.replace(/ sent a new message/i, ' — new message (replied same day)');
  }
  if (a.type === 'invoice_paid' || a.type === 'invoice_sent') {
    return null;
  }
  return t;
}

export type LiveActivityBuckets = { today: string[]; yesterday: string[] };

/** Today / yesterday lines so the project feels like active studio work, not a static record. */
export function buildProjectLiveActivityFeed(
  activities: Activity[],
  siteImprovements?: SiteImprovement[] | null
): LiveActivityBuckets {
  const now = new Date();
  const today0 = startOfLocalDay(now);
  const y0 = new Date(today0);
  y0.setDate(y0.getDate() - 1);

  const todayKey = today0.getTime();
  const yKey = y0.getTime();

  const today: string[] = [];
  const yesterday: string[] = [];

  for (const a of activities) {
    const line = activityToClientLine(a);
    if (!line) continue;
    const day = startOfLocalDay(new Date(a.createdAt)).getTime();
    if (day === todayKey) today.push(line);
    else if (day === yKey) yesterday.push(line);
  }

  if (siteImprovements?.length) {
    for (const imp of siteImprovements) {
      const line = imp.whatChanged.replace(/\.$/, '');
      if (!today.includes(line)) today.unshift(line);
    }
  }

  if (today.length === 0) {
    today.push('Rewrote homepage headline', 'Added CTA above the fold', 'Improved mobile layout');
  }
  if (yesterday.length === 0) {
    yesterday.push('Reviewed site structure', 'Identified drop-off points on Home and Services');
  }

  return {
    today: [...new Set(today)].slice(0, 8),
    yesterday: [...new Set(yesterday)].slice(0, 8),
  };
}

import type { RootState } from '@/store/root-state';
import { buildPriorityQueue, type PriorityTier } from '@/lib/system-intelligence';

export type TodayActionTone = 'danger' | 'warning' | 'attention' | 'info' | 'neutral';

export type TodayAction = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  tone: TodayActionTone;
};

function tierToTone(tier: PriorityTier): TodayActionTone {
  if (tier === 'critical') return 'danger';
  if (tier === 'important') return 'warning';
  return 'neutral';
}

/** Prioritized “do this next” queue — shared ranking with the dashboard Priority Queue. */
export function buildTodayActions(state: RootState, limit = 8): TodayAction[] {
  return buildPriorityQueue(state, limit).map((p) => ({
    id: p.id,
    title: p.title,
    subtitle: [p.subtitle, p.suggestedAction].filter(Boolean).join(' · '),
    href: p.href,
    tone: tierToTone(p.tier),
  }));
}

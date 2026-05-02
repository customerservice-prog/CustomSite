import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, History } from 'lucide-react';
import { TablePageLayout } from '@/components/layout/templates/table-page-layout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Card } from '@/components/ui/card';
import { Button, buttonClassName } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import { useShell } from '@/context/shell-context';
import { useActivitiesFeed } from '@/store/hooks';
import * as sel from '@/store/selectors';
import type { Activity } from '@/lib/types/entities';
import { cn } from '@/lib/utils';

const ACTIVITY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'messages', label: 'Messages' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'contracts', label: 'Contracts' },
  { id: 'files', label: 'Files' },
  { id: 'projects', label: 'Projects' },
  { id: 'system', label: 'System' },
] as const;

function matchesActivityFilter(a: Activity, filter: (typeof ACTIVITY_FILTERS)[number]['id']) {
  if (filter === 'all') return true;
  if (filter === 'messages') return a.type === 'message_received';
  if (filter === 'invoices') return a.type.startsWith('invoice_');
  if (filter === 'contracts') return a.type === 'contract_signed';
  if (filter === 'files') return a.type === 'file_uploaded';
  if (filter === 'projects') return a.type.startsWith('project');
  if (filter === 'system') return a.type === 'lead_created' || a.type === 'lead_stage_changed' || a.type === 'lead_won' || a.type === 'other';
  return true;
}

function ActivityRow({ activity: a }: { activity: Activity }) {
  const href = useAppStore((s) => sel.getActivityHref(s, a));
  const actor = useAppStore((s) => s.users[a.actorUserId]);
  const inner = (
    <>
      <p className="font-medium text-slate-900">{a.title}</p>
      <p className="mt-0.5 text-xs text-slate-500">
        {actor?.name ?? 'Team'} · {a.timeLabel}
      </p>
    </>
  );
  return (
    <li className="px-5 py-4 transition hover:bg-slate-50/80">
      {href ? (
        <Link to={href} className="block">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </li>
  );
}

export function ActivityPage() {
  const { toast } = useShell();
  const activities = useActivitiesFeed();
  const [filter, setFilter] = useState<(typeof ACTIVITY_FILTERS)[number]['id']>('all');

  const filtered = useMemo(
    () => activities.filter((a) => matchesActivityFilter(a, filter)),
    [activities, filter]
  );

  function exportCsv() {
    const rows = filtered.map((a) => {
      const actor = useAppStore.getState().users[a.actorUserId]?.name ?? 'Team';
      return [a.timeLabel, a.type, `"${a.title.replace(/"/g, '""')}"`, actor].join(',');
    });
    const csv = [['Time', 'Type', 'Title', 'Actor'].join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customsite-activity-${filter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Exported visible activity as CSV.', 'success');
  }

  return (
    <TablePageLayout
      header={
        <div className="space-y-4">
          <PageHeader
            title="Activity"
            description="Operational trail across clients, billing, and delivery — filter to focus, then open related records."
            actions={
              <Button type="button" variant="secondary" className="gap-2" onClick={exportCsv} disabled={filtered.length === 0}>
                <Download className="h-4 w-4" aria-hidden />
                Export CSV
              </Button>
            }
          />
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {ACTIVITY_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
              filter === f.id
                ? 'border-indigo-200 bg-indigo-600 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {activities.length === 0 ? (
        <EmptyState
          icon={History}
          title="No activity yet"
          description="As your team works in CustomSite, key events will appear here so nothing slips through the cracks."
          action={
            <Link to="/dashboard" className={buttonClassName('secondary')}>
              Open Studio Pulse
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={History}
          title="Nothing in this filter"
          description="Try another category or clear filters to see the full feed."
          action={
            <button type="button" className={buttonClassName('secondary')} onClick={() => setFilter('all')}>
              Show all activity
            </button>
          }
        />
      ) : (
        <Card className="divide-y divide-slate-100 p-0 shadow-sm ring-1 ring-slate-900/[0.04]">
          <ul className="divide-y divide-slate-100">
            {filtered.map((a) => (
              <ActivityRow key={a.id} activity={a} />
            ))}
          </ul>
        </Card>
      )}
    </TablePageLayout>
  );
}

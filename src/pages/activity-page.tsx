import { Link } from 'react-router-dom';
import { History } from 'lucide-react';
import { TablePageLayout } from '@/components/layout/templates/table-page-layout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Card } from '@/components/ui/card';
import { buttonClassName } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import { useActivitiesFeed } from '@/store/hooks';
import * as sel from '@/store/selectors';
import type { Activity } from '@/lib/types/entities';

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
  const activities = useActivitiesFeed();

  return (
    <TablePageLayout
      header={
        <PageHeader
          title="Activity"
          description="A clear audit trail of invoices, tasks, messages, and client updates."
          actions={
            <Link to="/dashboard" className={buttonClassName('secondary')}>
              Command center
            </Link>
          }
        />
      }
    >
      {activities.length === 0 ? (
        <EmptyState
          icon={History}
          title="No activity yet"
          description="As your team works in CustomSite, key events will appear here so nothing slips through the cracks."
          action={
            <Link to="/dashboard" className={buttonClassName('secondary')}>
              Back to dashboard
            </Link>
          }
        />
      ) : (
        <Card className="divide-y divide-slate-100 p-0 shadow-sm ring-1 ring-slate-900/[0.04]">
          <ul className="divide-y divide-slate-100">
            {activities.map((a) => (
              <ActivityRow key={a.id} activity={a} />
            ))}
          </ul>
        </Card>
      )}
    </TablePageLayout>
  );
}

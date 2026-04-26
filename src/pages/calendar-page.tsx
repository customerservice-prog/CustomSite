import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { calendarItemsSeed } from '@/lib/data/module-seeds';
import { TablePageLayout } from '@/components/layout/templates/table-page-layout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useShell } from '@/context/shell-context';
import { useAppStore } from '@/store/useAppStore';
import { useInvoices } from '@/store/hooks';

type CalRow = {
  id: string;
  title: string;
  date: string;
  time: string | null;
  kind: string;
  href?: string;
};

export function CalendarPage() {
  const { toast } = useShell();
  const deadlines = useAppStore((s) => s.deadlines);
  const invoices = useInvoices();
  const [view, setView] = useState<'month' | 'week'>('month');

  const upcoming = useMemo(() => {
    const rows: CalRow[] = [];

    calendarItemsSeed.forEach((c) => {
      rows.push({
        id: c.id,
        title: c.title,
        date: c.date,
        time: c.time,
        kind: c.kind,
        href:
          c.kind === 'invoice_due' && c.linkedInvoiceId
            ? `/invoices/${c.linkedInvoiceId}`
            : c.projectId
              ? `/projects/${c.projectId}`
              : undefined,
      });
    });

    deadlines.forEach((d) => {
      rows.push({
        id: `dl-${d.id}`,
        title: d.title,
        date: d.when,
        time: null,
        kind: d.type,
      });
    });

    invoices
      .filter((i) => i.status !== 'Paid' && i.status !== 'Void')
      .forEach((i) => {
        rows.push({
          id: `inv-${i.id}`,
          title: `Due · ${i.number}`,
          date: i.dueDate,
          time: null,
          kind: 'invoice_due',
          href: `/invoices/${i.id}`,
        });
      });

    return rows;
  }, [deadlines, invoices]);

  const monthLabel = new Date().toLocaleString(undefined, { month: 'long', year: 'numeric' });

  return (
    <TablePageLayout
      header={
        <PageHeader
          title="Calendar"
          description="Meetings, milestones, and billing dates together so the team stays aligned."
          actions={
            <Button type="button" className="gap-2" onClick={() => toast('Pick a time and invite attendees.', 'info')}>
              <Plus className="h-4 w-4" />
              New event
            </Button>
          }
        />
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setView('month')}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              view === 'month' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => setView('week')}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              view === 'week' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Week
          </button>
        </div>
        <p className="text-sm font-semibold text-slate-700">{monthLabel}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 shadow-sm ring-1 ring-slate-900/[0.04] lg:col-span-2">
          <h2 className="text-sm font-bold text-slate-900">Schedule overview</h2>
          <p className="mt-1 text-sm text-slate-500">
            {view === 'month' ? 'Month view highlights density across clients.' : 'Week view focuses on the next several days.'}
          </p>
          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-slate-400">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={`${d}-${i}`} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => {
              const dayNum = (i % 31) + 1;
              const has = upcoming.some((u) => u.date.includes(String(dayNum)) || u.date.startsWith('2026-04'));
              return (
                <div
                  key={i}
                  className={`flex aspect-square items-center justify-center rounded-lg border text-sm font-semibold ${
                    i === 12
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
                      : has
                        ? 'border-slate-200 bg-white text-slate-800'
                        : 'border-transparent text-slate-400'
                  }`}
                >
                  {dayNum <= 30 ? dayNum : ''}
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5 shadow-sm ring-1 ring-slate-900/[0.04]">
          <h2 className="text-sm font-bold text-slate-900">Upcoming</h2>
          <p className="mt-1 text-sm text-slate-500">Meetings, milestones, and invoice dates.</p>
          <ul className="mt-4 max-h-[420px] space-y-3 overflow-y-auto scroll-sidebar pr-1">
            {upcoming.slice(0, 14).map((u) => (
              <li key={u.id} className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {u.href ? (
                      <Link to={u.href} className="block font-semibold text-indigo-800 hover:text-indigo-950">
                        {u.title}
                      </Link>
                    ) : (
                      <span className="font-semibold text-slate-900">{u.title}</span>
                    )}
                    <p className="text-xs text-slate-500">
                      {u.date}
                      {u.time ? ` · ${u.time}` : ''}
                    </p>
                  </div>
                  <Badge variant="neutral" className="shrink-0 text-[10px]">
                    {u.kind.replace('_', ' ')}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </TablePageLayout>
  );
}

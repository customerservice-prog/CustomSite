import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { calendarItemsSeed } from '@/lib/data/module-seeds';
import { TablePageLayout } from '@/components/layout/templates/table-page-layout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useAppStore } from '@/store/useAppStore';
import { useInvoices } from '@/store/hooks';
import { cn } from '@/lib/utils';
import { formatShortDate, titleCaseStatus } from '@/lib/format-display';

const CAL_YEAR = 2026;
const CAL_MONTH = 3; /* April */
const CAL_ANCHOR_DAY = 28;

function toIsoLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type CalRow = {
  id: string;
  title: string;
  date: string;
  time: string | null;
  kind: string;
  href?: string;
};

export function CalendarPage() {
  const openModal = useAppStore((s) => s.openModal);
  const deadlines = useAppStore((s) => s.deadlines);
  const invoices = useInvoices();
  const [view, setView] = useState<'month' | 'week'>('month');
  const [selectedDay, setSelectedDay] = useState<number>(CAL_ANCHOR_DAY);

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

  const monthLabel = new Date(CAL_YEAR, CAL_MONTH, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });

  const selectedIso = `${CAL_YEAR}-${String(CAL_MONTH + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const selectedDayLabel = formatShortDate(selectedIso);

  const eventsForSelectedDay = useMemo(() => {
    return upcoming.filter((u) => u.date.startsWith(selectedIso)).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [upcoming, selectedIso]);

  const eventCountByDay = useMemo(() => {
    const counts: number[] = Array.from({ length: 32 }, () => 0);
    for (const u of upcoming) {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(u.date);
      if (!m) continue;
      const y = Number(m[1]);
      const mo = Number(m[2]) - 1;
      const d = Number(m[3]);
      if (y === CAL_YEAR && mo === CAL_MONTH && d >= 1 && d < counts.length) counts[d]++;
    }
    return counts;
  }, [upcoming]);

  const monthCells = useMemo(() => {
    const first = new Date(CAL_YEAR, CAL_MONTH, 1);
    const pad = first.getDay();
    const dim = new Date(CAL_YEAR, CAL_MONTH + 1, 0).getDate();
    const cells: ({ day: number } | null)[] = [];
    for (let i = 0; i < pad; i++) cells.push(null);
    for (let d = 1; d <= dim; d++) cells.push({ day: d });
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, []);

  const weekSlots = useMemo(() => {
    const anchor = new Date(CAL_YEAR, CAL_MONTH, CAL_ANCHOR_DAY);
    const start = new Date(anchor);
    start.setDate(anchor.getDate() - anchor.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = toIsoLocal(d);
      const items = upcoming.filter((u) => u.date.startsWith(iso));
      return {
        key: iso,
        label: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
        items,
      };
    });
  }, [upcoming]);

  return (
    <TablePageLayout
      header={
        <PageHeader
          title="Calendar"
          description="Meetings, milestones, and billing dates together so the team stays aligned."
          actions={
            <Button type="button" className="gap-2" onClick={() => openModal('calendar-event')}>
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
            {view === 'month'
              ? 'Dots show days with at least one meeting, milestone, or invoice touchpoint.'
              : 'Seven-day strip around the current focus day — each column lists that day’s items.'}
          </p>
          {view === 'month' ? (
            <>
              <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-slate-400">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="py-2">
                    {d}
                  </div>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {monthCells.map((cell, i) => {
                  if (!cell) {
                    return <div key={`e-${i}`} className="aspect-square rounded-lg bg-transparent" />;
                  }
                  const n = eventCountByDay[cell.day] || 0;
                  const isToday = cell.day === CAL_ANCHOR_DAY;
                  const isSelected = selectedDay === cell.day;
                  return (
                    <button
                      type="button"
                      key={cell.day}
                      onClick={() => {
                        setSelectedDay(cell.day);
                        setView('month');
                      }}
                      className={cn(
                        'flex aspect-square flex-col items-center justify-center rounded-lg border text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                        isSelected ? 'ring-2 ring-indigo-500 ring-offset-1' : '',
                        isToday
                          ? 'border-indigo-400 bg-indigo-50 text-indigo-950 shadow-sm'
                          : n > 0
                            ? 'border-slate-200 bg-white text-slate-900 hover:border-slate-300'
                            : 'border-transparent text-slate-400 hover:bg-slate-50'
                      )}
                      title={n ? `${n} item${n === 1 ? '' : 's'} on Apr ${cell.day}` : `Apr ${cell.day}`}
                    >
                      <span>{cell.day}</span>
                      {n > 0 && (
                        <span className="mt-1 flex gap-0.5" aria-hidden>
                          {Array.from({ length: Math.min(n, 3) }).map((_, j) => (
                            <span key={j} className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-7">
              {weekSlots.map((slot) => (
                <div key={slot.key} className="min-h-[140px] rounded-xl border border-slate-100 bg-slate-50/90 p-2">
                  <p className="text-center text-[11px] font-bold uppercase text-slate-500">{slot.label}</p>
                  <ul className="mt-2 space-y-1.5">
                    {slot.items.length === 0 ? (
                      <li className="text-center text-[11px] text-slate-400">—</li>
                    ) : (
                      slot.items.map((u) => (
                        <li key={u.id} className="text-[11px] leading-snug text-slate-800">
                          {u.href ? (
                            <Link to={u.href} className="font-semibold text-indigo-800 hover:underline">
                              {u.title}
                            </Link>
                          ) : (
                            <span className="font-medium">{u.title}</span>
                          )}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="flex min-h-0 flex-col p-5 shadow-sm ring-1 ring-slate-900/[0.04]">
          <h2 className="text-sm font-bold text-slate-900">{selectedDayLabel}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {eventsForSelectedDay.length
              ? `${eventsForSelectedDay.length} scheduled for this day.`
              : 'Nothing on the calendar — pick another day or add an event.'}
          </p>
          <ul className="mt-4 max-h-[220px] space-y-3 overflow-y-auto scroll-sidebar pr-1">
            {eventsForSelectedDay.length === 0 ? (
              <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-4 text-center text-xs text-slate-500">
                No items — try a highlighted day in the grid.
              </li>
            ) : (
              eventsForSelectedDay.map((u) => (
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
                        {formatShortDate(u.date)}
                        {u.time ? ` · ${u.time}` : ''}
                      </p>
                    </div>
                    <Badge variant="neutral" className="shrink-0 text-[10px]">
                      {titleCaseStatus(u.kind.replace(/_/g, ' '))}
                    </Badge>
                  </div>
                </li>
              ))
            )}
          </ul>
          <div className="mt-6 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Up next</h3>
            <ul className="mt-3 max-h-[180px] space-y-2 overflow-y-auto pr-1">
              {upcoming.slice(0, 10).map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => {
                      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(u.date);
                      if (m && Number(m[1]) === CAL_YEAR && Number(m[2]) - 1 === CAL_MONTH) {
                        setSelectedDay(Number(m[3]));
                        setView('month');
                      }
                    }}
                    className="w-full rounded-lg border border-transparent px-1 py-1.5 text-left text-xs text-slate-700 transition hover:border-slate-200 hover:bg-slate-50"
                  >
                    <span className="font-semibold text-slate-900">{u.title}</span>
                    <span className="block text-slate-500">{formatShortDate(u.date)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </TablePageLayout>
  );
}

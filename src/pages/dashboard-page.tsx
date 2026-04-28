import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  DollarSign,
  ListTodo,
  MessageSquare,
  Plus,
  Receipt,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format-display';
import { projectHealthLevel } from '@/lib/system-intelligence';
import {
  useActivitiesFeed,
  useDashboardMetrics,
  useMessageThreads,
  useProjects,
} from '@/store/hooks';
import { useAppStore } from '@/store/useAppStore';
import * as sel from '@/store/selectors';
import { buildCommandStackRows } from '@/lib/studio-pulse-command-stack';
import { useShell } from '@/context/shell-context';

function daysSince(iso: string): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.floor((Date.now() - t) / 86400000);
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { toast } = useShell();
  const openModal = useAppStore((s) => s.openModal);
  const store = useAppStore(useShallow((s) => s));
  const threads = useMessageThreads();
  const activities = useActivitiesFeed();
  const projects = useProjects();
  const m = useDashboardMetrics();
  const overdueInvoices = useAppStore(useShallow((s) => sel.getOverdueInvoices(s)));
  const payments = useAppStore(useShallow((s) => Object.values(s.payments)));

  const commandStack = useMemo(() => buildCommandStackRows(store), [store]);

  const atRiskProjects = useMemo(
    () => projects.filter((p) => projectHealthLevel(store, p.id) !== 'healthy').slice(0, 5),
    [projects, store]
  );

  const blockedTasks = useMemo(() => sel.getBlockedTasks(store), [store]);
  const dueSoonProjects = useMemo(() => {
    return projects
      .filter((p) => p.due && p.due !== '—' && p.status !== 'Live')
      .slice(0, 4);
  }, [projects]);

  const milestonesWeek = useMemo(() => store.deadlines.slice(0, 5), [store.deadlines]);

  const waitingOnYou = useMemo(() => threads.filter((t) => t.status === 'Unread').length, [threads]);
  const waitingOnClient = useMemo(() => threads.filter((t) => t.status === 'Waiting').length, [threads]);
  const quietClients = useMemo(
    () => Object.values(store.clients).filter((c) => daysSince(c.updatedAt) >= 7).length,
    [store.clients]
  );
  const escalated = atRiskProjects.length;

  const pendingPayout = useMemo(
    () => payments.filter((p) => p.status === 'pending' || p.payoutStatus !== 'paid_out').reduce((s, p) => s + p.amount, 0),
    [payments]
  );

  const user = store.users.u1;
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-gray-200/80 bg-gradient-to-br from-white via-white to-purple-50/30 px-6 py-5 shadow-sm">
        <PageHeader
          title="Studio Pulse"
          description="Keep revenue moving, clients answered, and delivery unblocked — start with the stack below."
          actions={
            <Button type="button" className="gap-2 shadow-sm" onClick={() => openModal('create-project')}>
              <Plus className="h-4 w-4" />
              New project
            </Button>
          }
        />
        <p className="mt-3 text-sm text-gray-700">
          <span className="font-semibold text-gray-900">
            {greeting}, {user?.name?.split(' ')[0] ?? 'there'}.
          </span>{' '}
          {m.overdueCount > 0 || waitingOnYou > 0 || blockedTasks.length > 0
            ? `${m.overdueCount ? `${m.overdueCount} overdue invoice(s). ` : ''}${waitingOnYou ? `${waitingOnYou} thread(s) need your reply. ` : ''}${blockedTasks.length ? `${blockedTasks.length} blocked task(s).` : ''}`.trim()
            : 'Nothing critical in queue — pick up pipeline or prep the next ship.'}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Today&apos;s command stack</h2>
        <div className="space-y-3">
          {commandStack.length === 0 ? (
            <Card variant="compact" className="border-dashed text-sm text-gray-600">
              No ranked alerts — check money and messages below.
            </Card>
          ) : (
            commandStack.map((row, i) => (
              <Card
                key={row.id}
                variant="compact"
                className={
                  i === 0
                    ? 'border-red-200/80 bg-gradient-to-r from-red-50/50 to-white ring-1 ring-red-900/[0.04]'
                    : 'border-gray-200/90 bg-white'
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{row.typeLabel}</p>
                    <p className="mt-1 font-semibold text-gray-900">{row.title}</p>
                    <p className="mt-1 text-sm text-gray-600">Why: {row.why}</p>
                    <Link to={row.href} className="mt-2 inline-flex text-xs font-semibold text-purple-700 hover:underline">
                      Open record <ArrowRight className="ml-0.5 inline h-3 w-3" aria-hidden />
                    </Link>
                  </div>
                  <Button
                    type="button"
                    className="h-9 shrink-0 px-3 text-sm"
                    onClick={() => {
                      navigate(row.href);
                      if (row.actionLabel === 'Send reminder') toast('Reminder queued for send.', 'success');
                    }}
                  >
                    {row.actionLabel}
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Money moving</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card variant="compact" className="border-0 bg-emerald-50/60 ring-1 ring-emerald-900/10">
            <p className="text-[11px] font-semibold uppercase text-emerald-800/80">Paid this month</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-emerald-950">{formatCurrency(m.paidRevenue)}</p>
          </Card>
          <Card variant="compact" className="border-0 bg-white ring-1 ring-gray-200">
            <p className="text-[11px] font-semibold uppercase text-gray-500">Outstanding</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-gray-900">{formatCurrency(m.outstanding)}</p>
          </Card>
          <Card variant="compact" className="border-0 bg-red-50/70 ring-1 ring-red-900/10">
            <p className="text-[11px] font-semibold uppercase text-red-800/80">Overdue</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-red-950">{formatCurrency(overdueInvoices.reduce((s, i) => s + i.amount, 0))}</p>
            <p className="mt-0.5 text-xs text-red-800/80">{m.overdueCount} invoice(s)</p>
          </Card>
          <Card variant="compact" className="border-0 bg-amber-50/60 ring-1 ring-amber-900/10">
            <p className="text-[11px] font-semibold uppercase text-amber-900/80">Pending payout</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-amber-950">{formatCurrency(pendingPayout)}</p>
          </Card>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Client temperature</h2>
          <Card variant="compact" className="grid gap-3 sm:grid-cols-2">
            <Link to="/messages" className="rounded-lg border border-transparent p-3 transition hover:border-purple-200 hover:bg-purple-50/50">
              <p className="text-xs font-medium text-gray-500">Waiting on you</p>
              <p className="text-2xl font-bold text-red-600">{waitingOnYou}</p>
            </Link>
            <Link to="/messages" className="rounded-lg border border-transparent p-3 transition hover:border-amber-200 hover:bg-amber-50/50">
              <p className="text-xs font-medium text-gray-500">Waiting on client</p>
              <p className="text-2xl font-bold text-amber-700">{waitingOnClient}</p>
            </Link>
            <Link to="/clients" className="rounded-lg border border-transparent p-3 transition hover:border-gray-200 hover:bg-gray-50">
              <p className="text-xs font-medium text-gray-500">Quiet 7+ days</p>
              <p className="text-2xl font-bold text-gray-800">{quietClients}</p>
            </Link>
            <Link to="/projects" className="rounded-lg border border-transparent p-3 transition hover:border-orange-200 hover:bg-orange-50/50">
              <p className="text-xs font-medium text-gray-500">Needs care (projects)</p>
              <p className="text-2xl font-bold text-orange-700">{escalated}</p>
            </Link>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Delivery risk</h2>
          <Card variant="compact" className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-red-800">Blocked tasks</p>
              <ul className="mt-2 space-y-1">
                {blockedTasks.length === 0 ? (
                  <li className="text-sm text-gray-500">None.</li>
                ) : (
                  blockedTasks.slice(0, 4).map((t) => (
                    <li key={t.id}>
                      <Link to="/tasks" className="text-sm font-medium text-purple-800 hover:underline">
                        {t.title}
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-800">Projects with dates ahead</p>
              <ul className="mt-2 space-y-1">
                {dueSoonProjects.map((p) => (
                  <li key={p.id}>
                    <Link to={`/projects/${p.id}`} className="text-sm text-gray-800 hover:text-purple-700">
                      {p.name} · due {p.due}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600">Milestones on radar</p>
              <ul className="mt-2 space-y-1">
                {milestonesWeek.map((d) => (
                  <li key={d.id} className="flex justify-between gap-2 text-sm text-gray-700">
                    <span>{d.title}</span>
                    <span className="shrink-0 text-xs text-gray-500">{d.when}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <Zap className="h-3.5 w-3.5" aria-hidden />
          Recent motion
        </h2>
        <Card variant="compact">
          <ul className="divide-y divide-gray-100">
            {activities.slice(0, 10).map((a) => (
              <li key={a.id}>
                <Link to="/activity" className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-sm transition hover:bg-gray-50">
                  <span className="font-medium text-gray-900">{a.title}</span>
                  <span className="text-xs text-gray-500">{a.timeLabel}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" className="gap-2" onClick={() => navigate('/invoices')}>
          <Receipt className="h-4 w-4" /> Invoices
        </Button>
        <Button type="button" variant="secondary" className="gap-2" onClick={() => navigate('/messages')}>
          <MessageSquare className="h-4 w-4" /> Messages
        </Button>
        <Button type="button" variant="secondary" className="gap-2" onClick={() => navigate('/tasks')}>
          <ListTodo className="h-4 w-4" /> Tasks
        </Button>
        <Button type="button" variant="secondary" className="gap-2" onClick={() => navigate('/contracts')}>
          <ShieldAlert className="h-4 w-4" /> Contracts
        </Button>
        <Button type="button" variant="secondary" className="gap-2" onClick={() => navigate('/calendar')}>
          <CalendarClock className="h-4 w-4" /> Calendar
        </Button>
        <Button type="button" className="gap-2" onClick={() => openModal('create-invoice')}>
          <DollarSign className="h-4 w-4" /> New invoice
        </Button>
      </section>
    </div>
  );
}

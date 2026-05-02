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
import { Button, buttonClassName } from '@/components/ui/button';
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
import type { CommandStackRow } from '@/lib/studio-pulse-command-stack';
import { useShell } from '@/context/shell-context';
import { cn } from '@/lib/utils';
import { daysSinceIso } from '@/lib/days-since';
import { BuildHelperNudgeCard } from '@/components/dashboard/build-helper-nudge-card';

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
  const overdueTotal = useMemo(() => overdueInvoices.reduce((s, i) => s + i.amount, 0), [overdueInvoices]);

  const commandStack = useMemo(() => buildCommandStackRows(store), [store]);

  function runPulseAction(row: CommandStackRow) {
    navigate(row.href);
    if (row.pulseAction === 'create-invoice') openModal('create-invoice');
    if (row.actionLabel === 'Send reminders') {
      toast(`Reminders queued for ${overdueInvoices.length} invoice(s).`, 'success');
    }
    if (row.actionLabel === 'Reply now') toast('Thread opened — send a real answer, not a holding pattern.', 'info');
    if (row.actionLabel === 'Unblock') toast('Task board opened — assign an owner or clear the dependency.', 'info');
    if (row.actionLabel === 'Bill it') toast('Invoice composer opened — tie it to the signed scope.', 'success');
    if (row.actionLabel === 'Chase signature') toast('Contracts opened — send the follow-up from there.', 'info');
    if (row.actionLabel === 'Unstick delivery')
      toast('Project opened — clear the stall: advance lifecycle, book a review, or mark waiting on client.', 'info');
  }

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

  const activeProjectsTop = useMemo(() => {
    return [...projects]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6);
  }, [projects]);

  const milestonesWeek = useMemo(() => store.deadlines.slice(0, 5), [store.deadlines]);

  const waitingOnYou = useMemo(() => threads.filter((t) => t.status === 'Unread').length, [threads]);
  const waitingOnClient = useMemo(() => threads.filter((t) => t.status === 'Waiting').length, [threads]);
  const quietClients = useMemo(
    () => Object.values(store.clients).filter((c) => daysSinceIso(c.updatedAt) >= 7).length,
    [store.clients]
  );
  const escalated = atRiskProjects.length;

  const pendingPayout = useMemo(
    () => payments.filter((p) => p.status === 'pending' || p.payoutStatus !== 'paid_out').reduce((s, p) => s + p.amount, 0),
    [payments]
  );

  const currentUserId = useAppStore((s) => s.currentUserId);
  const user = useAppStore((s) => s.users[currentUserId]);
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white px-5 py-6 shadow-sm ring-1 ring-slate-900/[0.06] sm:px-7 sm:py-7">
        <PageHeader
          title="Studio Pulse"
          description={
            <>
              <p className="font-medium leading-relaxed text-slate-800">
                Your attention right now: unpaid cash, clients waiting on you, builds in progress, unsigned contracts, and dates that will burn you — each row opens the exact record to fix.
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-500">Tap any row to jump straight to that record.</p>
            </>
          }
          actions={
            <Button type="button" variant="secondary" className="gap-2" onClick={() => openModal('create-project')}>
              <Plus className="h-4 w-4" />
              New project
            </Button>
          }
        />
        <p className="mt-5 border-t border-slate-100/90 pt-5 text-[13px] leading-relaxed text-slate-700">
          <span className="font-semibold text-slate-900">{greeting}, {user?.name?.split(' ')[0] ?? 'there'}.</span>{' '}
          {m.overdueCount > 0 || waitingOnYou > 0 || blockedTasks.length > 0
            ? `${m.overdueCount ? `${m.overdueCount} invoice(s) bleeding AR. ` : ''}${waitingOnYou ? `${waitingOnYou} reply(ies) owed before clients go cold. ` : ''}${blockedTasks.length ? `${blockedTasks.length} delivery block(s) — billable work is stuck.` : ''}`.trim()
            : 'Nothing screaming — still close AR and inbox before you call it a win.'}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Your active projects</h2>
        <p className="text-xs leading-relaxed text-slate-500">
          Newest motion first — open the project or jump straight into the conversion workspace for client sites.
        </p>
        {activeProjectsTop.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/60 px-5 py-4 text-[13px] text-slate-600">
            No projects yet. Create one from the button above or from Clients.
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {activeProjectsTop.map((p) => {
              const c = store.clients[p.clientId];
              return (
                <li key={p.id}>
                  <Card variant="compact" className="flex flex-col gap-2 p-4 ring-1 ring-slate-900/[0.05]">
                    <div className="min-w-0">
                      <Link to={`/projects/${p.id}`} className="font-semibold text-slate-900 hover:text-violet-700">
                        {p.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {c?.company ?? 'Client'} · {p.status} · due {p.due}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/projects/${p.id}`} className={buttonClassName('secondary', 'h-8 px-3 text-xs')}>
                        Project
                      </Link>
                      {p.deliveryFocus === 'client_site' ? (
                        <Link to={`/projects/${p.id}/site`} className={buttonClassName('primary', 'h-8 px-3 text-xs')}>
                          Site builder
                        </Link>
                      ) : null}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Priority list — do in order</h2>
        {commandStack.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/60 px-5 py-4 text-[13px] leading-relaxed text-slate-600">
            Clear inbox and AR anyway before you sign off.
          </div>
        ) : (
          <ol className="list-none space-y-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/[0.06]">
            {commandStack.map((row, i) => (
              <li
                key={row.id}
                className={cn(
                  'border-b border-slate-100/90 last:border-b-0',
                  i === 0 ? 'bg-red-50/95 px-5 py-6 sm:px-6' : 'bg-white px-5 py-4 sm:px-6'
                )}
              >
                <div className="flex flex-wrap items-start gap-4">
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold tabular-nums transition-transform duration-150',
                      i === 0 ? 'bg-red-600 text-lg text-white shadow-sm shadow-red-900/20' : 'bg-slate-200 text-sm text-slate-800'
                    )}
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn('font-semibold tracking-tight text-slate-950', i === 0 ? 'text-lg' : 'text-sm')}>{row.title}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{row.detail}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        className="h-9 px-3 text-sm"
                        variant={i === 0 ? 'destructive' : 'secondary'}
                        onClick={() => runPulseAction(row)}
                      >
                        {row.actionLabel}
                      </Button>
                      <Link to={row.href} className="text-xs font-semibold text-violet-700 transition-colors hover:text-violet-900">
                        Open <ArrowRight className="ml-0.5 inline h-3 w-3" aria-hidden />
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {m.overdueCount > 0 && (
        <div className="border-l-4 border-red-600 bg-red-50 px-4 py-3 text-red-950 shadow-sm">
          <p className="text-lg font-bold tracking-tight">
            {formatCurrency(overdueTotal)} at risk — {m.overdueCount} invoice{m.overdueCount === 1 ? '' : 's'} overdue
          </p>
          <p className="mt-1 text-sm text-red-900/90">Earned on paper, not in the bank — every day late trains clients to deprioritize you.</p>
          <Button type="button" className="mt-2 bg-red-700 text-white hover:bg-red-800" onClick={() => navigate('/invoices')}>
            Collect now
          </Button>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Money snapshot</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          <Card variant="compact" className="bg-emerald-50/60 py-3 ring-emerald-200/50">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-900/85">Paid (ledger)</p>
            <p className="mt-1 text-lg font-bold tabular-nums tracking-tight text-emerald-950">{formatCurrency(m.paidRevenue)}</p>
          </Card>
          <Card variant="compact" className="py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Open AR</p>
            <p className="mt-1 text-lg font-bold tabular-nums tracking-tight text-slate-900">{formatCurrency(m.outstanding)}</p>
          </Card>
          <Card variant="compact" className="bg-red-50/70 py-3 ring-red-200/45">
            <p className="text-[10px] font-bold uppercase tracking-wide text-red-900/85">Overdue</p>
            <p className="mt-1 text-lg font-bold tabular-nums tracking-tight text-red-950">{formatCurrency(overdueTotal)}</p>
          </Card>
          <Card variant="compact" className="bg-amber-50/65 py-3 ring-amber-200/45">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-950/90">Processor hold</p>
            <p className="mt-1 text-lg font-bold tabular-nums tracking-tight text-amber-950">{formatCurrency(pendingPayout)}</p>
          </Card>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Client temperature</h2>
          <Card variant="compact" className="grid gap-0 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <Link
              to="/messages"
              className="p-4 transition-colors duration-150 hover:bg-red-50/40 sm:p-5"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Waiting on you</p>
              <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-red-600">{waitingOnYou}</p>
            </Link>
            <Link
              to="/messages"
              className="p-4 transition-colors duration-150 hover:bg-amber-50/50 sm:p-5"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Waiting on client</p>
              <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-amber-700">{waitingOnClient}</p>
            </Link>
            <Link to="/clients" className="p-4 transition-colors duration-150 hover:bg-slate-50 sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Quiet 7+ days</p>
              <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-slate-800">{quietClients}</p>
            </Link>
            <Link to="/projects" className="p-4 transition-colors duration-150 hover:bg-orange-50/45 sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Needs care (projects)</p>
              <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-orange-700">{escalated}</p>
            </Link>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Delivery risk</h2>
          <Card variant="compact" className="space-y-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-red-800/90">Blocked tasks</p>
              <ul className="mt-2 space-y-1.5">
                {blockedTasks.length === 0 ? (
                  <li className="text-[13px] text-slate-500">None.</li>
                ) : (
                  blockedTasks.slice(0, 4).map((t) => (
                    <li key={t.id}>
                      <Link to="/tasks" className="text-[13px] font-medium text-violet-700 transition-colors hover:text-violet-900">
                        {t.title}
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800/90">Projects with dates ahead</p>
              <ul className="mt-2 space-y-1.5">
                {dueSoonProjects.map((p) => (
                  <li key={p.id}>
                    <Link to={`/projects/${p.id}`} className="text-[13px] text-slate-700 transition-colors hover:text-violet-700">
                      {p.name} · due {p.due}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Milestones on radar</p>
              <ul className="mt-2 space-y-1.5">
                {milestonesWeek.map((d) => (
                  <li key={d.id} className="flex justify-between gap-2 text-[13px] text-slate-700">
                    <span>{d.title}</span>
                    <span className="shrink-0 text-[11px] text-slate-400">{d.when}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          <Zap className="h-3.5 w-3.5 text-amber-500" aria-hidden />
          Recent motion
        </h2>
        <Card variant="compact" className="overflow-hidden py-0">
          <ul className="divide-y divide-slate-100">
            {activities.slice(0, 10).map((a) => (
              <li key={a.id}>
                <Link
                  to="/activity"
                  className="flex flex-wrap items-baseline justify-between gap-2 px-1 py-2.5 text-[13px] transition-colors duration-150 hover:bg-slate-50/90 sm:px-2"
                >
                  <span className="font-medium text-slate-900">{a.title}</span>
                  <span className="text-[11px] text-slate-400">{a.timeLabel}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="flex flex-wrap gap-2 pb-24 pt-1 max-sm:pb-28">
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
      <BuildHelperNudgeCard />
    </div>
  );
}

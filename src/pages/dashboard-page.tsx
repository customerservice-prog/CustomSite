import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  DollarSign,
  FolderKanban,
  Globe,
  MessageSquare,
  Plus,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { clientStatusBadgeVariant, invoiceStatusBadgeVariant } from '@/lib/statuses';
import { DashboardLayout } from '@/components/layout/templates/dashboard-layout';
import { PageHeader } from '@/components/ui/page-header';
import { Button, buttonClassName } from '@/components/ui/button';
import { useShell } from '@/context/shell-context';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { MetricCard } from '@/components/ui/metric-card';
import { ActionCard } from '@/components/ui/action-card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Avatar } from '@/components/ui/avatar';
import { StatusDot } from '@/components/ui/status-dot';
import {
  useDashboardMetrics,
  useClients,
  useProjects,
  useMessageThreads,
  useActivitiesFeed,
  usePipelineColumnStats,
} from '@/store/hooks';
import { useAppStore } from '@/store/useAppStore';
import * as sel from '@/store/selectors';

export function DashboardPage() {
  const { setCommandOpen } = useShell();
  const m = useDashboardMetrics();
  const pipelineCols = usePipelineColumnStats();
  const clients = useClients();
  const projects = useProjects();
  const threads = useMessageThreads();
  const activities = useActivitiesFeed();
  const deadlines = useAppStore((s) => s.deadlines);
  const users = useAppStore(useShallow((s) => s.users));
  const invoices = useAppStore(useShallow((s) => sel.invoicesList(s)));

  const overdue = m.overdueCount;
  const unreadThreads = m.unreadThreads;
  const onHold = m.onHoldProjects;
  const blockedTasks = m.blockedTasks;
  const paidMonth = m.paidRevenue;
  const outstanding = m.outstanding;
  const openInvoices = invoices.filter((i) => i.status !== 'Paid').slice(0, 3);

  return (
    <DashboardLayout>
      <PageHeader
        title="Command center"
        description="Live metrics from workspace state — create records and watch this view update instantly."
        actions={
          <>
            <Link to="/pipeline" className={buttonClassName('secondary', 'gap-2')}>
              Pipeline
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Button type="button" className="gap-2" onClick={() => setCommandOpen(true)}>
              <Plus className="h-4 w-4" />
              Quick create
            </Button>
          </>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active clients" value={String(m.activeClients)} hint="Status = Active" icon={Users} />
        <MetricCard label="Open projects" value={String(m.openProjects)} hint={`${onHold} on hold`} icon={FolderKanban} />
        <MetricCard
          label="Pipeline value"
          value={`$${(m.pipelineValue / 1000).toFixed(0)}k`}
          hint={`${m.leadCount} leads in board`}
          icon={TrendingUp}
        />
        <MetricCard label="Collected" value={`$${paidMonth.toLocaleString()}`} hint="Paid invoices (store)" icon={DollarSign} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Outstanding AR" value={`$${outstanding.toLocaleString()}`} hint={`${overdue} overdue`} icon={DollarSign} />
        <MetricCard label="Unread threads" value={String(unreadThreads)} hint="Needs a reply" icon={MessageSquare} />
        <MetricCard label="Blocked delivery" value={String(blockedTasks)} hint="Tasks waiting on client" icon={AlertTriangle} />
        <MetricCard label="Draft invoices" value={String(m.draftInvoices)} hint="Ready to send" icon={DollarSign} />
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Attention required</h2>
              <p className="text-sm text-slate-500">Derived from invoices, inbox, projects, and tasks.</p>
            </div>
            <Badge
              variant={overdue + unreadThreads + blockedTasks > 0 ? 'danger' : onHold > 0 ? 'warning' : 'neutral'}
              className="font-bold"
            >
              {m.attentionCount} open signals
            </Badge>
          </div>
          <ul className="space-y-2">
            {overdue > 0 && (
              <li className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <StatusDot tone="danger" pulse />
                  <span className="text-sm font-medium text-slate-800">{overdue} invoices overdue</span>
                </div>
                <Link to="/invoices" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                  Review
                </Link>
              </li>
            )}
            {unreadThreads > 0 && (
              <li className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <StatusDot tone="info" pulse />
                  <span className="text-sm font-medium text-slate-800">{unreadThreads} messages awaiting reply</span>
                </div>
                <Link to="/messages" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                  Open inbox
                </Link>
              </li>
            )}
            {onHold > 0 && (
              <li className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <StatusDot tone="warning" />
                  <span className="text-sm font-medium text-slate-800">{onHold} projects on hold</span>
                </div>
                <Link to="/projects" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                  Unblock
                </Link>
              </li>
            )}
            {blockedTasks > 0 && (
              <li className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <StatusDot tone="danger" />
                  <span className="text-sm font-medium text-slate-800">{blockedTasks} task blocked on client input</span>
                </div>
                <Link to="/tasks" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                  View tasks
                </Link>
              </li>
            )}
            {overdue === 0 && unreadThreads === 0 && onHold === 0 && blockedTasks === 0 && (
              <li className="rounded-xl border border-slate-100 bg-white px-4 py-6 text-center text-sm text-slate-500">
                You are caught up — nothing urgent in the current store snapshot.
              </li>
            )}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-bold text-slate-900">Revenue snapshot</h2>
          <p className="text-sm text-slate-500">Cash vs. open AR</p>
          <div className="mt-4 space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500">
                <span>Collected</span>
                <span>${paidMonth.toLocaleString()}</span>
              </div>
              <ProgressBar value={paidMonth} max={paidMonth + outstanding || 1} />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500">
                <span>Outstanding</span>
                <span>${outstanding.toLocaleString()}</span>
              </div>
              <ProgressBar
                value={outstanding}
                max={paidMonth + outstanding || 1}
                barClassName="from-amber-500 to-amber-400"
              />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Pipeline snapshot</h2>
            <Link to="/pipeline" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
              Open board
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {pipelineCols.map(({ stage, count, value }) => (
              <div key={stage} className="min-w-[140px] flex-1 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{stage}</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{count}</p>
                <p className="text-xs text-slate-500">${(value / 1000).toFixed(1)}k</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-bold text-slate-900">Project health</h2>
          <p className="text-sm text-slate-500">Budget consumed vs. timeline</p>
          <ul className="mt-4 space-y-3">
            {projects.slice(0, 4).map((p) => {
              const pct = Math.min(100, (p.spent / p.budget) * 100);
              return (
                <li key={p.id}>
                  <div className="mb-1 flex justify-between text-sm font-medium text-slate-800">
                    <span className="truncate">{p.name}</span>
                    <span className="tabular-nums text-slate-500">{pct.toFixed(0)}%</span>
                  </div>
                  <ProgressBar value={pct} max={100} />
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <h2 className="text-lg font-bold text-slate-900">Upcoming</h2>
          <ul className="mt-3 space-y-2">
            {deadlines.map((d) => (
              <li key={d.id} className="flex justify-between gap-2 text-sm">
                <span className="font-medium text-slate-800">{d.title}</span>
                <Badge variant="neutral" className="shrink-0">
                  {d.when}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5 lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Recent messages</h2>
            <Link to="/messages" className="text-sm font-semibold text-indigo-600">
              Inbox
            </Link>
          </div>
          <ul className="space-y-2">
            {threads.slice(0, 3).map((t) => (
              <li key={t.id} className="rounded-xl border border-slate-100 px-3 py-2">
                <p className="text-sm font-semibold text-slate-900">{t.participant}</p>
                <p className="line-clamp-1 text-xs text-slate-500">{t.preview}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5 lg:col-span-1">
          <h2 className="text-lg font-bold text-slate-900">Activity</h2>
          <ul className="mt-3 space-y-2">
            {activities.slice(0, 4).map((a) => (
              <li key={a.id} className="text-sm text-slate-700">
                <span className="font-medium text-slate-900">{a.title}</span>
                <span className="mt-0.5 block text-xs text-slate-400">{a.timeLabel}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ActionCard
          title="Convert a lead"
          description="Move won deals into clients and spin up a project template."
          icon={Users}
          action={
            <Link to="/pipeline" className={buttonClassName('secondary', 'w-full sm:w-auto')}>
              Go to pipeline
            </Link>
          }
        />
        <ActionCard
          title="Send invoice"
          description="Pull time & expenses into a draft and notify the client."
          icon={DollarSign}
          action={
            <Link to="/invoices" className={buttonClassName('secondary', 'w-full sm:w-auto')}>
              Invoices
            </Link>
          }
        />
        <ActionCard
          title="Client portal"
          description="Preview what clients see: messages, files, and approvals."
          icon={Globe}
          action={
            <Link to="/client-portal" className={buttonClassName('secondary', 'w-full sm:w-auto')}>
              Open
            </Link>
          }
        />
        <ActionCard
          title="Ship creative"
          description="Push the next milestone from Design → Development."
          icon={Zap}
          action={
            <Link to="/projects" className={buttonClassName('secondary', 'w-full sm:w-auto')}>
              Projects
            </Link>
          }
        />
      </div>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">Work queue</h2>
          <Link to="/clients" className="text-sm font-semibold text-indigo-600">
            All clients
          </Link>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.slice(0, 5).map((c) => {
                const owner = users[c.ownerId];
                return (
                  <tr key={c.id} className="transition hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <Link to={`/clients/${c.id}`} className="font-semibold text-indigo-700 hover:text-indigo-900">
                        {c.name}
                      </Link>
                      <p className="text-xs text-slate-500">{c.company}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={clientStatusBadgeVariant(c.status)}>{c.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {c.balance > 0 ? `$${c.balance.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={owner?.name ?? '?'} size="sm" />
                        <span className="text-slate-600">{owner?.name}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
          <h3 className="w-full text-xs font-bold uppercase tracking-wide text-slate-400">Open invoices</h3>
          {openInvoices.map((i) => (
            <div
              key={i.id}
              className="flex min-w-[200px] flex-1 items-center justify-between rounded-xl border border-slate-100 px-3 py-2"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{i.number}</p>
                <p className="text-xs text-slate-500">${i.amount.toLocaleString()}</p>
              </div>
              <Badge variant={invoiceStatusBadgeVariant(i.status)}>{i.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </DashboardLayout>
  );
}

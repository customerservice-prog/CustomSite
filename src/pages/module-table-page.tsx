import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ClipboardList, History, Plus, Sparkles } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { routeMeta } from '@/lib/routes-meta';
import { taskStatusBadgeVariant } from '@/lib/statuses';
import { TablePageLayout } from '@/components/layout/templates/table-page-layout';
import { ReportLayout } from '@/components/layout/templates/report-layout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHeadCell, TableHeader, TableRow } from '@/components/ui/table';
import { buttonClassName } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import { useActivitiesFeed, useClients, useProjects, useTasks } from '@/store/hooks';
import * as sel from '@/store/selectors';
import type { Activity } from '@/lib/types/entities';

const descriptions: Record<string, string> = {
  tasks: 'Work queues, owners, and due dates across projects — wired to workspace state.',
  calendar: 'Milestones, calls, and deadlines in one place.',
  payments: 'Payouts, processor sync, and reconciliation.',
  'time-tracking': 'Billable hours, rates, and export to invoices.',
  expenses: 'Receipts, categories, and reimbursement.',
  contracts: 'Templates, e-sign, and renewal tracking.',
  proposals: 'Scoped offers, pricing, and acceptance.',
  forms: 'Lead capture and client intake builders.',
  files: 'Versioned deliverables and client-visible assets.',
  activity: 'Everything that changed — driven by the shared activity log.',
  reports: 'Revenue, utilization, and pipeline analytics.',
};

function TasksLiveView() {
  const tasks = useTasks();
  const projects = useProjects();
  const clients = useClients();
  const users = useAppStore(useShallow((s) => s.users));
  const openModal = useAppStore((s) => s.openModal);
  const completeTask = useAppStore((s) => s.completeTask);
  const dueTodayCount = useAppStore((s) => sel.getTasksDueToday(s).length);
  const blockedCount = useAppStore((s) => sel.getBlockedTasks(s).length);

  const projectById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects]);
  const clientById = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c])), [clients]);

  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [tasks]
  );

  return (
    <>
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Open tasks</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{tasks.filter((t) => t.status !== 'Done').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Due today</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{dueTodayCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Blocked</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{blockedCount}</p>
        </Card>
      </section>

      {sortedTasks.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No tasks yet"
          description="Create a task and it appears here instantly — completion flows through the same store as the dashboard."
          action={
            <Button type="button" className="gap-2" onClick={() => openModal('create-task')}>
              <Plus className="h-4 w-4" />
              Create task
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeadCell>Task</TableHeadCell>
              <TableHeadCell>Project</TableHeadCell>
              <TableHeadCell>Client</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>Due</TableHeadCell>
              <TableHeadCell>Assignee</TableHeadCell>
              <TableHeadCell className="text-right">Actions</TableHeadCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTasks.map((t) => {
              const project = projectById[t.projectId];
              const client = project ? clientById[project.clientId] : undefined;
              const assignee = users[t.assigneeId];
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-medium text-slate-900">{t.title}</TableCell>
                  <TableCell>
                    {project ? (
                      <Link to={`/projects/${project.id}`} className="font-semibold text-indigo-700 hover:text-indigo-900">
                        {project.name}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {client ? (
                      <Link to={`/clients/${client.id}`} className="text-slate-700 hover:text-indigo-700">
                        {client.company}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={taskStatusBadgeVariant(t.status)}>{t.status}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums text-slate-600">{t.due}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar name={assignee?.name ?? '?'} size="sm" />
                      <span className="text-slate-600">{assignee?.name ?? '—'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {t.status !== 'Done' ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="gap-1.5"
                        onClick={() => completeTask(t.id)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Complete
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400">Done</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </>
  );
}

function ActivityRow({ activity: a }: { activity: Activity }) {
  const href = useAppStore((s) => sel.getActivityHref(s, a));
  const actor = useAppStore((s) => s.users[a.actorUserId]);
  const inner = (
    <>
      <p className="font-medium text-slate-900">{a.title}</p>
      <p className="mt-0.5 text-xs text-slate-500">
        {actor?.name ?? 'System'} · {a.timeLabel}
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

function ActivityFeedView() {
  const activities = useActivitiesFeed();

  return (
    <>
      {activities.length === 0 ? (
        <EmptyState
          icon={History}
          title="No activity yet"
          description="Creating clients, invoices, or completing tasks will append entries here via logActivity."
          action={
            <Link to="/dashboard" className={buttonClassName('secondary')}>
              Back to dashboard
            </Link>
          }
        />
      ) : (
        <Card className="divide-y divide-slate-100 p-0">
          <ul className="divide-y divide-slate-100">
            {activities.map((a) => (
              <ActivityRow key={a.id} activity={a} />
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

export function ModuleTablePage({ module }: { module: keyof typeof routeMeta | string }) {
  const meta = routeMeta[module as keyof typeof routeMeta];
  const title = meta?.title ?? String(module);
  const desc = descriptions[module] ?? 'This workspace module is ready for your data layer.';
  const isReports = module === 'reports';
  const openModal = useAppStore((s) => s.openModal);

  const headerActions =
    module === 'tasks' ? (
      <Button type="button" className="gap-2" onClick={() => openModal('create-task')}>
        <Plus className="h-4 w-4" />
        New task
      </Button>
    ) : module === 'activity' ? (
      <Link to="/dashboard" className={buttonClassName('secondary')}>
        Dashboard
      </Link>
    ) : (
      <Button type="button" variant="secondary" disabled>
        Primary action
      </Button>
    );

  const body =
    module === 'tasks' ? (
      <TasksLiveView />
    ) : module === 'activity' ? (
      <ActivityFeedView />
    ) : (
      <EmptyState
        icon={Sparkles}
        title={`${title} — scaffolded`}
        description="Connect Supabase or your API: this surface uses the same table and detail patterns as Clients and Invoices."
        action={
          <Button type="button" variant="secondary">
            View roadmap in code
          </Button>
        }
      />
    );

  const inner = (
    <TablePageLayout
      header={<PageHeader title={title} description={desc} actions={headerActions} />}
    >
      {body}
    </TablePageLayout>
  );

  return isReports ? <ReportLayout>{inner}</ReportLayout> : inner;
}

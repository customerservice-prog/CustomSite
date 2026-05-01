import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownAZ, Check, ClipboardList, Plus, Search } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { taskStatusBadgeVariant, type TaskStatus } from '@/lib/statuses';
import { TablePageLayout } from '@/components/layout/templates/table-page-layout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableFooterBar, TableHeadCell, TableHeader, TableRow } from '@/components/ui/table';
import { TableToolbar, TableToolbarSection } from '@/components/ui/table-toolbar';
import { IconButton } from '@/components/ui/icon-button';
import { useAppStore } from '@/store/useAppStore';
import { useClients, useProjects, useTasks } from '@/store/hooks';
import * as sel from '@/store/selectors';
import { DataRowMenu } from '@/components/workspace/data-row-menu';
import type { Task, TaskPriority } from '@/lib/types/entities';
import { TASK_BUCKET_LABEL, TASK_BUCKET_ORDER, taskDueBucket } from '@/lib/operating-layer';
import { RecommendedNextAction, type NextActionItem } from '@/components/workspace/recommended-next-action';
import { EntityDrawer } from '@/components/ui/entity-drawer';
import { useShell } from '@/context/shell-context';
import { cn } from '@/lib/utils';

type SortKey = 'title' | 'due' | 'status' | 'project';

export function TasksPage() {
  const { toast } = useShell();
  const tasks = useTasks();
  const projects = useProjects();
  const clients = useClients();
  const users = useAppStore(useShallow((s) => s.users));
  const openModal = useAppStore((s) => s.openModal);
  const completeTask = useAppStore((s) => s.completeTask);
  const updateTask = useAppStore((s) => s.updateTask);
  const dueTodayCount = useAppStore((s) => sel.getTasksDueToday(s).length);
  const blockedCount = useAppStore((s) => sel.getBlockedTasks(s).length);

  const [sortKey, setSortKey] = useState<SortKey>('due');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);

  const drawerTask = useAppStore((s) => (drawerTaskId ? s.tasks[drawerTaskId] : undefined));
  const drawerActivities = useAppStore(
    useShallow((s) => {
      if (!drawerTaskId) return [];
      const t = s.tasks[drawerTaskId];
      if (!t) return [];
      return sel.getActivitiesForProject(s, t.projectId).slice(0, 14);
    })
  );

  const projectById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects]);
  const clientById = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c])), [clients]);

  const sortedTasks = useMemo(() => {
    const list = [...tasks];
    const dir = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      if (sortKey === 'title') return a.title.localeCompare(b.title) * dir;
      if (sortKey === 'status') return a.status.localeCompare(b.status) * dir;
      if (sortKey === 'project') {
        const pa = projectById[a.projectId]?.name ?? '';
        const pb = projectById[b.projectId]?.name ?? '';
        return pa.localeCompare(pb) * dir;
      }
      return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * dir;
    });
    return list;
  }, [tasks, sortKey, sortDir, projectById]);

  const visibleTasks = useMemo(() => {
    return sortedTasks.filter((t) => {
      const project = projectById[t.projectId];
      const client = project ? clientById[project.clientId] : undefined;
      const match =
        !q.trim() ||
        t.title.toLowerCase().includes(q.toLowerCase()) ||
        (project?.name.toLowerCase().includes(q.toLowerCase()) ?? false) ||
        (client?.company.toLowerCase().includes(q.toLowerCase()) ?? false);
      const st = statusFilter === 'all' || t.status === statusFilter;
      return match && st;
    });
  }, [sortedTasks, q, statusFilter, projectById, clientById]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === visibleTasks.length) setSelected(new Set());
    else setSelected(new Set(visibleTasks.map((t) => t.id)));
  }

  const allSelected = visibleTasks.length > 0 && selected.size === visibleTasks.length;

  function taskMenuItems(t: Task) {
    const items: { label: string; onClick: () => void }[] = [];
    if (t.status !== 'Done') {
      items.push({ label: 'Complete', onClick: () => completeTask(t.id) });
    }
    items.push({ label: 'Edit', onClick: () => setDrawerTaskId(t.id) });
    items.push({
      label: 'Reassign',
      onClick: () => toast('Pick a teammate from the roster in the next release.', 'info'),
    });
    return items;
  }

  const projectForDrawer = drawerTask ? projectById[drawerTask.projectId] : undefined;
  const clientForDrawer = projectForDrawer ? clientById[projectForDrawer.clientId] : undefined;
  const assigneeForDrawer = drawerTask ? users[drawerTask.assigneeId] : undefined;

  const dueSoonCount = useMemo(
    () => tasks.filter((t) => t.status !== 'Done' && taskDueBucket(t) === 'soon').length,
    [tasks]
  );
  const doneCount = useMemo(() => tasks.filter((t) => t.status === 'Done').length, [tasks]);

  const taskNextActions: NextActionItem[] = useMemo(() => {
    const items: NextActionItem[] = [];
    const blocked = tasks.filter((t) => t.status === 'Blocked');
    if (blocked[0]) {
      const pr = projectById[blocked[0].projectId];
      items.push({
        label: `Unblock: ${blocked[0].title}`,
        hint: pr?.name,
        href: '/tasks',
        tone: 'danger',
      });
    }
    const today = tasks.filter((t) => t.status !== 'Done' && taskDueBucket(t) === 'today');
    if (today[0]) {
      items.push({
        label: `Ship today: ${today[0].title}`,
        href: '/tasks',
        tone: 'warning',
      });
    }
    const soon = tasks.filter((t) => t.status !== 'Done' && taskDueBucket(t) === 'soon');
    if (soon[0] && items.length < 3) {
      items.push({ label: `Schedule ${soon[0].title}`, hint: `Due ${soon[0].due}`, href: '/tasks' });
    }
    return items.slice(0, 3);
  }, [tasks, projectById]);

  return (
    <TablePageLayout
      header={
        <div className="space-y-4">
          <PageHeader
            title="Tasks"
            description="What's blocked or overdue — assigned work shouldn't disappear without a reason. Use priority and assignee so the team knows what to pull first."
            actions={
              <Button type="button" className="gap-2" onClick={() => openModal('create-task')}>
                <Plus className="h-4 w-4" />
                New task
              </Button>
            }
          />
          <RecommendedNextAction items={taskNextActions} />
        </div>
      }
      toolbar={
        <TableToolbar>
          <TableToolbarSection grow>
            <div className="relative min-w-[200px] max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search task, project, or client…"
                className="pl-10"
                aria-label="Search tasks"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
              className="w-44 shrink-0"
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="Todo">Todo</option>
              <option value="In Progress">In progress</option>
              <option value="Blocked">Blocked</option>
              <option value="Done">Done</option>
            </Select>
          </TableToolbarSection>
        </TableToolbar>
      }
    >
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card variant="compact" className="border-0 bg-amber-50/50 ring-1 ring-amber-900/10">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/70">Today</p>
          <p className="mt-1 text-2xl font-bold text-amber-950">{dueTodayCount}</p>
        </Card>
        <Card variant="compact" className="border-0 bg-red-50/60 ring-1 ring-red-900/10">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-900/70">Blocked</p>
          <p className="mt-1 text-2xl font-bold text-red-950">{blockedCount}</p>
        </Card>
        <Card variant="compact" className="border-0 bg-white ring-1 ring-gray-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Due soon</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{dueSoonCount}</p>
        </Card>
        <Card variant="compact" className="border-0 bg-emerald-50/50 ring-1 ring-emerald-900/10">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900/70">Done</p>
          <p className="mt-1 text-2xl font-bold text-emerald-950">{doneCount}</p>
        </Card>
      </section>

      {visibleTasks.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No tasks match"
          description="Widen filters or add a task — blocked and due-soon work should not hide here."
          action={
            <Button type="button" className="gap-2" onClick={() => openModal('create-task')}>
              <Plus className="h-4 w-4" />
              New task
            </Button>
          }
        />
      ) : (
        <Table
          dense
          footer={<TableFooterBar from={1} to={visibleTasks.length} total={visibleTasks.length} />}
        >
          <TableHeader className="sticky top-0 z-20">
            <TableRow className="hover:bg-transparent">
              <TableHeadCell className="w-10 pr-0">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all tasks"
                />
              </TableHeadCell>
              <TableHeadCell>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-bold text-slate-600 hover:text-slate-900"
                  onClick={() => toggleSort('title')}
                >
                  Task <ArrowDownAZ className="h-3.5 w-3.5 opacity-60" />
                </button>
              </TableHeadCell>
              <TableHeadCell>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-bold text-slate-600 hover:text-slate-900"
                  onClick={() => toggleSort('project')}
                >
                  Project
                </button>
              </TableHeadCell>
              <TableHeadCell>Client</TableHeadCell>
              <TableHeadCell>Priority</TableHeadCell>
              <TableHeadCell>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-bold text-slate-600 hover:text-slate-900"
                  onClick={() => toggleSort('status')}
                >
                  Status
                </button>
              </TableHeadCell>
              <TableHeadCell>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-bold text-slate-600 hover:text-slate-900"
                  onClick={() => toggleSort('due')}
                >
                  Due
                </button>
              </TableHeadCell>
              <TableHeadCell>Assignee</TableHeadCell>
              <TableHeadCell className="w-14 text-center">Done</TableHeadCell>
              <TableHeadCell className="w-12 pr-4 text-right"> </TableHeadCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {TASK_BUCKET_ORDER.map((bucket) => {
              const subset = visibleTasks.filter((t) => taskDueBucket(t) === bucket);
              if (!subset.length) return null;
              return (
                <Fragment key={bucket}>
                  <TableRow className="bg-slate-100/95 hover:bg-slate-100/95">
                    <TableCell colSpan={10} className="py-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                      {TASK_BUCKET_LABEL[bucket]}
                    </TableCell>
                  </TableRow>
                  {subset.map((t: Task) => {
                    const project = projectById[t.projectId];
                    const client = project ? clientById[project.clientId] : undefined;
                    const assignee = t.assigneeId ? users[t.assigneeId] : undefined;
                    return (
                      <TableRow
                        key={t.id}
                        selected={selected.has(t.id) || drawerTaskId === t.id}
                        clickable
                        onClick={() => setDrawerTaskId(t.id)}
                        className={cn(drawerTaskId === t.id && 'bg-indigo-50/50', t.status === 'Blocked' && 'bg-red-50/30')}
                      >
                        <TableCell className="pr-0" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                            checked={selected.has(t.id)}
                            onChange={() => toggleSelect(t.id)}
                            aria-label={`Select ${t.title}`}
                          />
                        </TableCell>
                        <TableCell className="max-w-[min(280px,40vw)]">
                          <span className="font-medium text-slate-900">{t.title}</span>
                          {t.status === 'Blocked' && t.blockerReason ? (
                            <p className="mt-1 text-xs font-semibold leading-snug text-red-800">{t.blockerReason}</p>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {project ? (
                            <Link
                              to={`/projects/${project.id}`}
                              className="font-semibold text-indigo-700 hover:text-indigo-900"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {project.name}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          {client ? (
                            <Link
                              to={`/clients/${client.id}`}
                              className="text-slate-700 hover:text-indigo-700"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {client.company}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={(t.priority ?? 'medium') as TaskPriority}
                            onChange={(e) => updateTask(t.id, { priority: e.target.value as TaskPriority })}
                            className="h-8 min-w-[6.5rem] py-0 text-xs"
                            aria-label={`Priority for ${t.title}`}
                          >
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant={taskStatusBadgeVariant(t.status)}>{t.status}</Badge>
                        </TableCell>
                        <TableCell className="tabular-nums text-slate-600">{t.due}</TableCell>
                        <TableCell>
                          {t.assigneeId ? (
                            <div className="flex items-center gap-2">
                              <Avatar name={assignee?.name ?? '?'} size="sm" />
                              <span className="text-slate-600">{assignee?.name}</span>
                            </div>
                          ) : (
                            <span className="text-xs font-bold uppercase tracking-wide text-amber-900">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          {t.status !== 'Done' ? (
                            <IconButton
                              type="button"
                              className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                              aria-label={`Mark ${t.title} complete`}
                              onClick={() => completeTask(t.id)}
                            >
                              <Check className="h-4 w-4" />
                            </IconButton>
                          ) : (
                            <span className="inline-flex h-8 w-8 items-center justify-center text-emerald-600" title="Completed">
                              <Check className="h-4 w-4" strokeWidth={3} />
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DataRowMenu label={`Actions for ${t.title}`} items={taskMenuItems(t)} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      )}

      <EntityDrawer
        open={Boolean(drawerTask && drawerTaskId)}
        title={drawerTask?.title ?? 'Task'}
        subtitle={
          drawerTask && projectForDrawer
            ? `${projectForDrawer.name}${clientForDrawer ? ` · ${clientForDrawer.company}` : ''}`
            : undefined
        }
        onClose={() => setDrawerTaskId(null)}
        footer={
          drawerTask ? (
            <div className="flex flex-wrap gap-2">
              {drawerTask.status !== 'Done' && (
                <Button type="button" onClick={() => completeTask(drawerTask.id)}>
                  Mark complete
                </Button>
              )}
              <Button type="button" variant="secondary" onClick={() => setDrawerTaskId(null)}>
                Close
              </Button>
            </div>
          ) : null
        }
      >
        {drawerTask ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Schedule</p>
                <p className="mt-1 text-lg font-bold text-slate-900">Due {drawerTask.due}</p>
                <p className="mt-2">
                  <Badge variant={taskStatusBadgeVariant(drawerTask.status)}>{drawerTask.status}</Badge>
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Assigned to</p>
                <Select
                  className="mt-2"
                  value={drawerTask.assigneeId || ''}
                  onChange={(e) => updateTask(drawerTask.id, { assigneeId: e.target.value })}
                  aria-label="Assignee"
                >
                  <option value="">Unassigned</option>
                  <option value="u1">Jordan Blake</option>
                  <option value="u2">Alex Chen</option>
                  <option value="u3">Riley Morgan</option>
                </Select>
                {drawerTask.assigneeId ? <p className="mt-2 text-xs text-slate-600">{assigneeForDrawer?.email ?? ''}</p> : null}
                <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">Priority</p>
                <Select
                  className="mt-1"
                  value={(drawerTask.priority ?? 'medium') as TaskPriority}
                  onChange={(e) => updateTask(drawerTask.id, { priority: e.target.value as TaskPriority })}
                  aria-label="Priority"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </Select>
                {drawerTask.status === 'Blocked' && drawerTask.blockerReason ? (
                  <p className="mt-3 text-xs font-semibold text-red-800">{drawerTask.blockerReason}</p>
                ) : null}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Related</p>
              <div className="mt-2 flex flex-wrap gap-3 text-sm font-semibold">
                {projectForDrawer && (
                  <Link to={`/projects/${projectForDrawer.id}`} className="text-indigo-600 hover:text-indigo-800">
                    {projectForDrawer.name}
                  </Link>
                )}
                {clientForDrawer && (
                  <Link to={`/clients/${clientForDrawer.id}`} className="text-indigo-600 hover:text-indigo-800">
                    {clientForDrawer.company}
                  </Link>
                )}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Project activity</p>
              <ul className="mt-2 space-y-2 border-t border-slate-100 pt-3">
                {drawerActivities.length === 0 ? (
                  <li className="text-sm text-slate-500">No recent activity on this project.</li>
                ) : (
                  drawerActivities.map((a) => (
                    <li key={a.id} className="text-sm text-slate-700">
                      <span className="font-medium text-slate-900">{a.title}</span>
                      <span className="text-slate-500"> · {a.timeLabel}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        ) : null}
      </EntityDrawer>
    </TablePageLayout>
  );
}

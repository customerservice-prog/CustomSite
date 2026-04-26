import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownAZ, CheckCircle2, ClipboardList, Plus } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { taskStatusBadgeVariant } from '@/lib/statuses';
import { TablePageLayout } from '@/components/layout/templates/table-page-layout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableFooterBar, TableHeadCell, TableHeader, TableRow } from '@/components/ui/table';
import { useAppStore } from '@/store/useAppStore';
import { useClients, useProjects, useTasks } from '@/store/hooks';
import * as sel from '@/store/selectors';
import { DataRowMenu } from '@/components/workspace/data-row-menu';
import type { Task } from '@/lib/types/entities';
import { TASK_BUCKET_LABEL, TASK_BUCKET_ORDER, taskDueBucket } from '@/lib/operating-layer';

type SortKey = 'title' | 'due' | 'status' | 'project';

export function TasksPage() {
  const tasks = useTasks();
  const projects = useProjects();
  const clients = useClients();
  const users = useAppStore(useShallow((s) => s.users));
  const openModal = useAppStore((s) => s.openModal);
  const completeTask = useAppStore((s) => s.completeTask);
  const dueTodayCount = useAppStore((s) => sel.getTasksDueToday(s).length);
  const blockedCount = useAppStore((s) => sel.getBlockedTasks(s).length);

  const [sortKey, setSortKey] = useState<SortKey>('due');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
    if (selected.size === sortedTasks.length) setSelected(new Set());
    else setSelected(new Set(sortedTasks.map((t) => t.id)));
  }

  const allSelected = sortedTasks.length > 0 && selected.size === sortedTasks.length;

  return (
    <TablePageLayout
      header={
        <PageHeader
          title="Tasks"
          description="Assign work, track due dates, and clear blockers across every project."
          actions={
            <Button type="button" className="gap-2" onClick={() => openModal('create-task')}>
              <Plus className="h-4 w-4" />
              New task
            </Button>
          }
        />
      }
    >
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="border-slate-200/90 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Open</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{tasks.filter((t) => t.status !== 'Done').length}</p>
        </Card>
        <Card className="border-slate-200/90 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Due today</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{dueTodayCount}</p>
        </Card>
        <Card className="border-slate-200/90 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Blocked</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{blockedCount}</p>
        </Card>
      </section>

      {sortedTasks.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No tasks in the studio"
          description="Tasks protect milestones and scope. Add one from a project (Project actions → Add task) or with New task — mark items done and your pulse view stays honest about delivery."
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
          footer={<TableFooterBar from={1} to={sortedTasks.length} total={sortedTasks.length} />}
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
              <TableHeadCell className="text-right">Actions</TableHeadCell>
              <TableHeadCell className="w-12 pr-4 text-right"> </TableHeadCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {TASK_BUCKET_ORDER.map((bucket) => {
              const subset = sortedTasks.filter((t) => taskDueBucket(t) === bucket);
              if (!subset.length) return null;
              return (
                <Fragment key={bucket}>
                  <TableRow className="bg-slate-100/95 hover:bg-slate-100/95">
                    <TableCell colSpan={9} className="py-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                      {TASK_BUCKET_LABEL[bucket]}
                    </TableCell>
                  </TableRow>
                  {subset.map((t: Task) => {
              const project = projectById[t.projectId];
              const client = project ? clientById[project.clientId] : undefined;
              const assignee = users[t.assigneeId];
              return (
                <TableRow key={t.id} selected={selected.has(t.id)}>
                  <TableCell className="pr-0">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                      checked={selected.has(t.id)}
                      onChange={() => toggleSelect(t.id)}
                      aria-label={`Select ${t.title}`}
                    />
                  </TableCell>
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
                        Mark complete
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400">Done</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DataRowMenu label={`Actions for ${t.title}`} />
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
    </TablePageLayout>
  );
}

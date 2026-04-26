import { Link, useParams } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import { DetailPageLayout } from '@/components/layout/templates/detail-page-layout';
import { Tabs } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClassName } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeadCell, TableHeader, TableRow } from '@/components/ui/table';
import { ProgressBar } from '@/components/ui/progress-bar';
import { invoiceStatusBadgeVariant, projectStatusBadgeVariant, taskStatusBadgeVariant } from '@/lib/statuses';
import { useProject, useActivitiesFeed } from '@/store/hooks';
import { useAppStore } from '@/store/useAppStore';
import * as sel from '@/store/selectors';

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const project = useProject(projectId);
  const activitiesFeed = useActivitiesFeed();
  const users = useAppStore(useShallow((s) => s.users));

  const client = useAppStore(useShallow((s) => (project ? s.clients[project.clientId] : undefined)));
  const owner = project ? users[project.ownerId] : undefined;

  const projectTasks = useAppStore(
    useShallow((s) => (projectId ? sel.getTasksForProject(s, projectId) : []))
  );
  const projectFiles = useAppStore(
    useShallow((s) => (projectId ? sel.getFilesForProject(s, projectId) : []))
  );
  const projectInvoices = useAppStore(
    useShallow((s) => (projectId ? sel.getInvoicesForProject(s, projectId) : []))
  );
  const projectMessages = useAppStore(
    useShallow((s) => (projectId ? sel.getThreadsForProject(s, projectId) : []))
  );

  const projectActivity = projectId
    ? activitiesFeed.filter((a) => a.entityId === projectId || (a.metadata?.threadId && projectMessages.some((m) => m.id === a.entityId)))
    : [];

  if (!project) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">Project not found</h1>
        <Link to="/projects" className={buttonClassName('primary', 'mt-6 inline-flex')}>
          Back to projects
        </Link>
      </div>
    );
  }

  const pct = Math.min(100, Math.round((project.spent / project.budget) * 100));

  const milestones = [
    { id: '1', label: 'Discovery & scope', done: true },
    { id: '2', label: 'Design approval', done: project.status !== 'Planning' && project.status !== 'Design' },
    { id: '3', label: 'Development complete', done: project.status === 'Live' || project.status === 'Review' },
    { id: '4', label: 'Launch & handoff', done: project.status === 'Live' },
  ];

  const activityRows = projectActivity.length ? projectActivity.slice(0, 8) : activitiesFeed.slice(0, 6);

  return (
    <DetailPageLayout
      backHref="/projects"
      backLabel="Projects"
      title={project.name}
      meta={
        <span>
          {client?.company} · Owner {owner?.name} · Due {project.due}
        </span>
      }
      badge={<Badge variant={projectStatusBadgeVariant(project.status)}>{project.status}</Badge>}
      actions={
        <>
          <Button type="button" variant="secondary">
            Share update
          </Button>
          <Button type="button">Log time</Button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-900">Overview</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Phase-driven delivery with transparent budget burn. Client sees milestones and files in the portal; your team works tasks
            here.
          </p>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500">
              <span>Budget consumed</span>
              <span className="tabular-nums">
                ${project.spent.toLocaleString()} / ${project.budget.toLocaleString()} ({pct}%)
              </span>
            </div>
            <ProgressBar value={pct} max={100} />
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-900">Client</h3>
          {client && (
            <div className="mt-3">
              <Link to={`/clients/${client.id}`} className="text-lg font-semibold text-indigo-700 hover:text-indigo-900">
                {client.name}
              </Link>
              <p className="text-sm text-slate-500">{client.email}</p>
            </div>
          )}
        </Card>
      </div>

      <Tabs
        defaultId="timeline"
        tabs={[
          {
            id: 'timeline',
            label: 'Timeline',
            content: (
              <Card className="p-5">
                <ul className="space-y-3">
                  {milestones.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2">
                      <span
                        className={
                          m.done
                            ? 'flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800'
                            : 'flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-400'
                        }
                      >
                        {m.done ? '✓' : '·'}
                      </span>
                      <span className={m.done ? 'font-medium text-slate-900' : 'text-slate-500'}>{m.label}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ),
          },
          {
            id: 'tasks',
            label: 'Tasks',
            content: (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeadCell>Task</TableHeadCell>
                    <TableHeadCell>Status</TableHeadCell>
                    <TableHeadCell>Assignee</TableHeadCell>
                    <TableHeadCell>Due</TableHeadCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-500">
                        No tasks for this project.
                      </TableCell>
                    </TableRow>
                  ) : (
                    projectTasks.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium text-slate-900">{t.title}</TableCell>
                        <TableCell>
                          <Badge variant={taskStatusBadgeVariant(t.status)}>{t.status}</Badge>
                        </TableCell>
                        <TableCell>{users[t.assigneeId]?.name}</TableCell>
                        <TableCell className="text-slate-500">{t.due}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            ),
          },
          {
            id: 'files',
            label: 'Files',
            content:
              projectFiles.length === 0 ? (
                <p className="text-sm text-slate-500">No files linked to this project.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHeadCell>Name</TableHeadCell>
                      <TableHeadCell>Uploaded</TableHeadCell>
                      <TableHeadCell className="text-right">Size</TableHeadCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectFiles.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.name}</TableCell>
                        <TableCell className="text-slate-500">{f.uploaded}</TableCell>
                        <TableCell className="text-right text-slate-500">{f.size}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ),
          },
          {
            id: 'messages',
            label: 'Messages',
            content: (
              <ul className="space-y-2">
                {projectMessages.map((m) => (
                  <li key={m.id} className="rounded-xl border border-slate-100 bg-white px-4 py-3">
                    <p className="font-semibold text-slate-900">{m.participant}</p>
                    <p className="text-sm text-slate-600">{m.preview}</p>
                  </li>
                ))}
              </ul>
            ),
          },
          {
            id: 'budget',
            label: 'Budget & invoices',
            content: (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeadCell>Invoice</TableHeadCell>
                    <TableHeadCell>Status</TableHeadCell>
                    <TableHeadCell className="text-right">Amount</TableHeadCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-slate-500">
                        No invoices tied to this project.
                      </TableCell>
                    </TableRow>
                  ) : (
                    projectInvoices.map((inv) => (
                      <TableRow key={inv.id} clickable>
                        <TableCell>
                          <Link to={`/invoices/${inv.id}`} className="font-semibold text-indigo-700">
                            {inv.number}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant={invoiceStatusBadgeVariant(inv.status)}>{inv.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">${inv.amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            ),
          },
          {
            id: 'activity',
            label: 'Activity',
            content: (
              <Card className="p-5">
                <ul className="space-y-3">
                  {activityRows.map((a) => (
                    <li key={a.id} className="text-sm text-slate-700">
                      {a.title}
                      <span className="mt-0.5 block text-xs text-slate-400">{a.timeLabel}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ),
          },
        ]}
      />
    </DetailPageLayout>
  );
}

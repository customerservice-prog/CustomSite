import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { DetailPageLayout } from '@/components/layout/templates/detail-page-layout';
import { Tabs } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClassName } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dropdown, DropdownChevronTrigger, DropdownItem } from '@/components/ui/dropdown';
import { Table, TableBody, TableCell, TableHeadCell, TableHeader, TableRow } from '@/components/ui/table';
import { ProgressBar } from '@/components/ui/progress-bar';
import {
  contractStatusBadgeVariant,
  invoiceStatusBadgeVariant,
  projectHealthBadgeVariant,
  projectStatusBadgeVariant,
  taskStatusBadgeVariant,
} from '@/lib/statuses';
import { hoursSinceLastProjectThreadActivity, projectHealthLabel, projectHealthLevel } from '@/lib/system-intelligence';
import type { Project } from '@/lib/types/entities';
import { useShell } from '@/context/shell-context';
import { useProject, useProjectActivities } from '@/store/hooks';
import { useAppStore } from '@/store/useAppStore';
import * as sel from '@/store/selectors';

function milestoneRowsForProject(project: Project) {
  return [
    { id: '1', label: 'Discovery & scope', done: true },
    { id: '2', label: 'Design approval', done: project.status !== 'Planning' && project.status !== 'Design' },
    { id: '3', label: 'Development complete', done: project.status === 'Live' || project.status === 'Review' },
    { id: '4', label: 'Launch & handoff', done: project.status === 'Live' },
  ];
}

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useShell();
  const project = useProject(projectId);
  const projectActivities = useProjectActivities(projectId);
  const completeTask = useAppStore((s) => s.completeTask);
  const advanceProjectPhase = useAppStore((s) => s.advanceProjectPhase);
  const openModal = useAppStore((s) => s.openModal);
  const setSelectedClientId = useAppStore((s) => s.setSelectedClientId);
  const setSelectedProjectId = useAppStore((s) => s.setSelectedProjectId);
  const users = useAppStore(useShallow((s) => s.users));
  const store = useAppStore((s) => s);

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
  const projectContracts = useAppStore(
    useShallow((s) => (projectId ? sel.getContractsForProject(s, projectId) : []))
  );

  const nextAction = useMemo(() => {
    if (!projectId || !project) return null;
    const blocked = projectTasks.find((t) => t.status === 'Blocked');
    if (blocked) {
      return {
        title: 'Project blocked',
        body: `${blocked.title} needs client input.`,
        href: `/projects/${projectId}`,
        tone: 'danger' as const,
      };
    }
    const threadQuietH = hoursSinceLastProjectThreadActivity(store, projectId);
    if (threadQuietH != null && threadQuietH >= 72) {
      return {
        title: 'Inbox has gone quiet',
        body: `About ${Math.round(threadQuietH / 24)} days without message motion — the client may be waiting on a nudge from you.`,
        href: '/messages',
        tone: 'warning' as const,
      };
    }
    const pendingSig = projectContracts.find((c) => c.status === 'Sent' || c.status === 'Viewed');
    if (pendingSig) {
      return {
        title: 'Contract awaiting signature',
        body: pendingSig.title,
        href: '/contracts',
        tone: 'warning' as const,
      };
    }
    const overdueInv = projectInvoices.find((i) => i.status === 'Overdue');
    if (overdueInv) {
      return {
        title: 'Invoice overdue',
        body: `${overdueInv.number} — follow up with ${client?.name ?? 'client'}.`,
        href: `/invoices/${overdueInv.id}`,
        tone: 'danger' as const,
      };
    }
    const milestones = milestoneRowsForProject(project);
    const nextMilestone = milestones.find((m) => !m.done);
    if (nextMilestone) {
      return {
        title: 'Milestone due soon',
        body: `Complete “${nextMilestone.label}” and update the client.`,
        href: `/projects/${projectId}`,
        tone: 'info' as const,
      };
    }
    return {
      title: 'Needs approval',
      body: 'Move the project to the next phase when stakeholders sign off.',
      href: `/projects/${projectId}`,
      tone: 'neutral' as const,
    };
  }, [projectId, project, projectTasks, projectContracts, projectInvoices, client?.name, store]);

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

  const milestones = milestoneRowsForProject(project);

  const activityRows = projectActivities.slice(0, 12);
  const startLabel = new Date(project.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const budgetRemaining = Math.max(0, project.budget - project.spent);
  const blockedCount = projectTasks.filter((t) => t.status === 'Blocked').length;
  const overdueTaskCount = projectTasks.filter((t) => t.status !== 'Done' && t.due === 'Today').length;
  const unreadProjectThreads = projectMessages.filter((m) => m.status === 'Unread').length;
  const atRisk = pct >= 88 || blockedCount > 0 || unreadProjectThreads > 0;
  const threadQuietH = hoursSinceLastProjectThreadActivity(store, project.id);
  const ph = projectHealthLevel(store, project.id);

  return (
    <DetailPageLayout
      backHref="/projects"
      backLabel="Projects"
      title={project.name}
      meta={
        <span>
          Timeline {startLabel} → due {project.due} · Phase {project.status} · {client?.company} · Owner {owner?.name}
        </span>
      }
      badge={
        <span className="flex flex-wrap items-center gap-2">
          <Badge variant={projectStatusBadgeVariant(project.status)}>{project.status}</Badge>
          <Badge variant={projectHealthBadgeVariant(ph)}>{projectHealthLabel(ph)}</Badge>
        </span>
      }
      actions={
        <>
          <Button type="button" variant="secondary" onClick={() => projectId && advanceProjectPhase(projectId)}>
            Advance phase
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              toast(
                'Client update posted — anyone on the portal sees it on refresh; follow up in Messages if it is urgent.',
                'success'
              )
            }
          >
            Share update
          </Button>
          <Link to="/time-tracking" className={buttonClassName('primary', 'gap-2')}>
            Log time
          </Link>
        </>
      }
      sidebar={
        <>
          <Card className="border-indigo-100 bg-indigo-50/40 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-800">Next up</p>
            {nextAction ? (
              <>
                <p className="mt-2 text-sm font-bold text-slate-900">{nextAction.title}</p>
                <p className="mt-1 text-xs text-slate-600">{nextAction.body}</p>
                <Link to={nextAction.href} className="mt-3 inline-block text-xs font-semibold text-indigo-700 hover:underline">
                  {nextAction.tone === 'danger' ? 'Resolve now →' : 'Take action →'}
                </Link>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-600">No urgent actions — keep milestones moving.</p>
            )}
          </Card>
          <Card
            className={`p-4 shadow-sm ${
              ph === 'blocked'
                ? 'border-rose-200 bg-rose-50/60'
                : ph === 'at_risk' || atRisk
                  ? 'border-amber-200 bg-amber-50/50'
                  : 'border-slate-100'
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Delivery health</p>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              <li className="flex justify-between gap-2">
                <span>Budget burn</span>
                <span className="font-semibold tabular-nums">{pct}%</span>
              </li>
              {threadQuietH != null && (
                <li className="text-slate-600">
                  Last thread activity:{' '}
                  <span className="font-semibold text-slate-800">
                    {threadQuietH < 24 ? `${threadQuietH}h ago` : `${Math.round(threadQuietH / 24)} days ago`}
                  </span>
                </li>
              )}
              {blockedCount > 0 && (
                <li className="font-medium text-rose-700">{blockedCount} blocked task{blockedCount === 1 ? '' : 's'}</li>
              )}
              {overdueTaskCount > 0 && (
                <li className="font-medium text-amber-800">{overdueTaskCount} due today</li>
              )}
              {unreadProjectThreads > 0 && (
                <li className="font-medium text-indigo-800">{unreadProjectThreads} thread awaiting reply</li>
              )}
              {!atRisk && ph === 'healthy' && (
                <li className="text-slate-500">On track — no red flags on this snapshot.</li>
              )}
            </ul>
          </Card>
          <Card className="p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Recent updates</p>
            <ul className="mt-2 space-y-2">
              {projectActivities.slice(0, 4).map((a) => (
                <li key={a.id} className="text-xs text-slate-700">
                  <span className="font-medium text-slate-800">{a.title}</span>
                  <span className="mt-0.5 block text-[10px] text-slate-400">{a.timeLabel}</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-900">Overview</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Everything here rolls up to {client?.name ?? 'the client'} — tasks, files, messages, invoices, and contracts stay tied to this
            project.
          </p>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500">
              <span>Budget consumed</span>
              <span className="tabular-nums">
                ${project.spent.toLocaleString()} / ${project.budget.toLocaleString()} ({pct}%)
              </span>
            </div>
            <ProgressBar value={pct} max={100} />
            <p className="mt-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">${budgetRemaining.toLocaleString()}</span> remaining · next milestone:{' '}
              <span className="font-medium text-slate-800">{milestones.find((m) => !m.done)?.label ?? 'Complete'}</span>
            </p>
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
                    <TableHeadCell className="text-right">Actions</TableHeadCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        <p className="font-medium text-slate-700">No tasks on this engagement yet</p>
                        <p className="mt-1 max-w-md text-sm text-slate-500">
                          Tasks are how you protect scope and milestones. Add one from <strong>Project actions → Add task</strong> — it stays tied to this client
                          and shows up on your studio pulse.
                        </p>
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
                        <TableCell className="text-right">
                          {t.status !== 'Done' ? (
                            <Button type="button" variant="secondary" className="text-xs" onClick={() => completeTask(t.id)}>
                              Mark complete
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400">Done</span>
                          )}
                        </TableCell>
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
                <Card className="border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
                  <p className="font-semibold text-slate-800">Upload work to this project</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Files you attach here appear under this client and in the workspace library — use the Files page to upload with the right
                    project selected.
                  </p>
                  <Link to="/files" className={`${buttonClassName('primary', 'mt-4 inline-flex')}`}>
                    Go to Files
                  </Link>
                </Card>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHeadCell>Name</TableHeadCell>
                      <TableHeadCell>Uploaded</TableHeadCell>
                      <TableHeadCell>Visibility</TableHeadCell>
                      <TableHeadCell className="text-right">Size</TableHeadCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectFiles.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.name}</TableCell>
                        <TableCell className="text-slate-500">{f.uploaded}</TableCell>
                        <TableCell>
                          <Badge variant={f.visibility === 'Client-visible' ? 'success' : 'neutral'}>{f.visibility}</Badge>
                        </TableCell>
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
                {projectMessages.length === 0 ? (
                  <li className="text-sm text-slate-500">No threads on this project yet.</li>
                ) : (
                  projectMessages.map((m) => (
                    <li key={m.id} className="rounded-xl border border-slate-100 bg-white px-4 py-3">
                      <Link to="/messages" className="block transition hover:bg-slate-50/80">
                        <p className="font-semibold text-slate-900">{m.participant}</p>
                        <p className="text-sm text-slate-600">{m.preview}</p>
                        <p className="mt-2 text-xs font-semibold text-indigo-600">Open in inbox →</p>
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            ),
          },
          {
            id: 'contracts',
            label: 'Contracts',
            content: (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeadCell>Contract</TableHeadCell>
                    <TableHeadCell>Status</TableHeadCell>
                    <TableHeadCell className="text-right">Value</TableHeadCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectContracts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-slate-500">
                        No contracts linked to this project.
                      </TableCell>
                    </TableRow>
                  ) : (
                    projectContracts.map((ct) => (
                      <TableRow key={ct.id}>
                        <TableCell className="font-medium text-slate-900">{ct.title}</TableCell>
                        <TableCell>
                          <Badge variant={contractStatusBadgeVariant(ct.status)}>{ct.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">${ct.value.toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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
                {activityRows.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    As invoices send, tasks complete, and files upload, this timeline fills in — everything is scoped to this project
                    automatically.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {activityRows.map((a) => (
                      <li key={a.id} className="text-sm text-slate-700">
                        {a.title}
                        <span className="mt-0.5 block text-xs text-slate-400">{a.timeLabel}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            ),
          },
        ]}
      />
    </DetailPageLayout>
  );
}

import { useMemo, useState } from 'react';
import { LayoutGrid, Plus, Search, Table2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import { PageHeader } from '@/components/ui/page-header';
import { TablePageLayout } from '@/components/layout/templates/table-page-layout';
import { TableToolbar, TableToolbarSection } from '@/components/ui/table-toolbar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeadCell, TableHeader, TableRow } from '@/components/ui/table';
import { ProgressBar } from '@/components/ui/progress-bar';
import { PROJECT_STATUSES, projectStatusBadgeVariant, type ProjectStatus } from '@/lib/statuses';
import { cn } from '@/lib/utils';
import { useProjects, useClients } from '@/store/hooks';
import { useAppStore } from '@/store/useAppStore';

export function ProjectsPage() {
  const projects = useProjects();
  const clients = useClients();
  const users = useAppStore(useShallow((s) => s.users));
  const openModal = useAppStore((s) => s.openModal);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<ProjectStatus | 'all'>('all');
  const [view, setView] = useState<'table' | 'cards'>('table');

  const clientMap = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c])), [clients]);

  const rows = useMemo(() => {
    return projects.filter((p) => {
      const client = clientMap[p.clientId];
      const match =
        !q.trim() ||
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        (client?.company.toLowerCase().includes(q.toLowerCase()) ?? false);
      const st = status === 'all' || p.status === status;
      return match && st;
    });
  }, [projects, q, status, clientMap]);

  return (
    <TablePageLayout
      header={
        <PageHeader
          title="Projects"
          description="Projects reference clients by id — budgets and phases update the command center selectors."
          actions={
            <Button type="button" className="gap-2" onClick={() => openModal('create-project')}>
              <Plus className="h-4 w-4" />
              New project
            </Button>
          }
        />
      }
      toolbar={
        <TableToolbar>
          <TableToolbarSection grow>
            <div className="relative min-w-[200px] max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search project or client…"
                className="pl-10"
                aria-label="Search projects"
              />
            </div>
          </TableToolbarSection>
          <TableToolbarSection>
            <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-400">View</span>
            <IconButton
              aria-label="Table view"
              className={cn(view === 'table' && 'border-indigo-200 bg-indigo-50 text-indigo-800')}
              onClick={() => setView('table')}
            >
              <Table2 className="h-4 w-4" />
            </IconButton>
            <IconButton
              aria-label="Card view"
              className={cn(view === 'cards' && 'border-indigo-200 bg-indigo-50 text-indigo-800')}
              onClick={() => setView('cards')}
            >
              <LayoutGrid className="h-4 w-4" />
            </IconButton>
          </TableToolbarSection>
        </TableToolbar>
      }
    >
      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-1">
        {(['all', ...PROJECT_STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-semibold transition duration-150',
              status === s
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-500">
          No projects match these filters.
        </div>
      ) : view === 'table' ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeadCell>Project</TableHeadCell>
              <TableHeadCell>Client</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell className="text-right">Budget</TableHeadCell>
              <TableHeadCell className="min-w-[140px]">Progress</TableHeadCell>
              <TableHeadCell>Due</TableHeadCell>
              <TableHeadCell>Owner</TableHeadCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => {
              const client = clientMap[p.clientId];
              const owner = users[p.ownerId];
              const pct = Math.min(100, Math.round((p.spent / p.budget) * 100));
              return (
                <TableRow key={p.id} clickable>
                  <TableCell>
                    <Link to={`/projects/${p.id}`} className="font-semibold text-indigo-700 hover:text-indigo-900">
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell>{client?.company ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={projectStatusBadgeVariant(p.status)}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">${p.budget.toLocaleString()}</TableCell>
                  <TableCell>
                    <ProgressBar value={pct} max={100} />
                  </TableCell>
                  <TableCell className="text-slate-500">{p.due}</TableCell>
                  <TableCell className="text-slate-600">{owner?.name}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => {
            const client = clientMap[p.clientId];
            const pct = Math.min(100, Math.round((p.spent / p.budget) * 100));
            return (
              <Link key={p.id} to={`/projects/${p.id}`} className="block">
                <Card className="h-full border-slate-200/80 p-4 transition hover:border-indigo-200 hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900">{p.name}</h3>
                    <Badge variant={projectStatusBadgeVariant(p.status)} className="shrink-0">
                      {p.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{client?.company}</p>
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    ${p.spent.toLocaleString()} <span className="font-normal text-slate-400">/</span> ${p.budget.toLocaleString()}
                  </p>
                  <div className="mt-2">
                    <ProgressBar value={pct} max={100} />
                  </div>
                  <p className="mt-3 text-xs font-medium text-slate-400">Due {p.due}</p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </TablePageLayout>
  );
}

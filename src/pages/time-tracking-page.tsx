import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Plus, Search } from 'lucide-react';
import { timeEntriesSeed, type TimeEntryRow } from '@/lib/data/module-seeds';
import { TablePageLayout } from '@/components/layout/templates/table-page-layout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableFooterBar, TableHeadCell, TableHeader, TableRow } from '@/components/ui/table';
import { TableToolbar, TableToolbarSection } from '@/components/ui/table-toolbar';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { useShell } from '@/context/shell-context';
import { useProjects } from '@/store/hooks';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/shallow';
import { DataRowMenu } from '@/components/workspace/data-row-menu';

export function TimeTrackingPage() {
  const [rows, setRows] = useState<TimeEntryRow[]>(() => [...timeEntriesSeed]);
  const projects = useProjects();
  const users = useAppStore(useShallow((s) => s.users));
  const { toast } = useShell();
  const [q, setQ] = useState('');
  const [billFilter, setBillFilter] = useState<'all' | 'billable' | 'non'>('all');

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const pr = projects.find((p) => p.id === r.projectId);
      const u = users[r.userId];
      const match =
        !q.trim() ||
        r.note.toLowerCase().includes(q.toLowerCase()) ||
        (pr?.name.toLowerCase().includes(q.toLowerCase()) ?? false) ||
        (u?.name.toLowerCase().includes(q.toLowerCase()) ?? false);
      const b =
        billFilter === 'all' || (billFilter === 'billable' && r.billable) || (billFilter === 'non' && !r.billable);
      return match && b;
    });
  }, [rows, q, billFilter, projects, users]);

  const weekTotal = useMemo(() => rows.reduce((s, r) => s + r.hours, 0), [rows]);
  const billable = useMemo(() => rows.filter((r) => r.billable).reduce((s, r) => s + r.hours, 0), [rows]);

  function logTime() {
    const p = projects[0];
    if (!p) return;
    setRows((prev) => [
      {
        id: `te-${Date.now()}`,
        userId: 'u1',
        projectId: p.id,
        date: new Date().toISOString().slice(0, 10),
        hours: 1,
        billable: true,
        note: 'Logged time',
      },
      ...prev,
    ]);
    toast('Time entry added to your week.', 'success');
  }

  return (
    <TablePageLayout
      header={
        <PageHeader
          title="Time tracking"
          description="Weekly timesheets with billable flags — roll hours into invoices without re-keying."
          actions={
            <>
              <Button type="button" variant="secondary" onClick={() => toast('Export runs from the selected range.', 'info')}>
                Export to invoice
              </Button>
              <Button type="button" className="gap-2" onClick={logTime}>
                <Plus className="h-4 w-4" />
                Log time
              </Button>
            </>
          }
        />
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-slate-400">This week</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{weekTotal.toFixed(1)}h</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-slate-400">Billable</p>
          <p className="mt-1 text-2xl font-bold text-emerald-800">{billable.toFixed(1)}h</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-slate-400">Non-billable</p>
          <p className="mt-1 text-2xl font-bold text-slate-700">{(weekTotal - billable).toFixed(1)}h</p>
        </div>
      </div>

      <TableToolbar>
        <TableToolbarSection grow>
          <div className="relative min-w-[200px] max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search note, project, or teammate…"
              className="pl-10"
              aria-label="Search time entries"
            />
          </div>
          <Select value={billFilter} onChange={(e) => setBillFilter(e.target.value as typeof billFilter)} className="w-44 shrink-0" aria-label="Billable">
            <option value="all">All entries</option>
            <option value="billable">Billable only</option>
            <option value="non">Non-billable only</option>
          </Select>
        </TableToolbarSection>
      </TableToolbar>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No time logged"
          description="Capture work by project and teammate. Billable totals help you invoice with confidence."
          action={
            <Button type="button" className="gap-2" onClick={logTime}>
              <Plus className="h-4 w-4" />
              Log time
            </Button>
          }
        />
      ) : (
        <Table dense footer={<TableFooterBar from={1} to={filtered.length} total={filtered.length} />}>
          <TableHeader className="sticky top-0 z-20">
            <TableRow className="hover:bg-transparent">
              <TableHeadCell>Date</TableHeadCell>
              <TableHeadCell>Team member</TableHeadCell>
              <TableHeadCell>Project</TableHeadCell>
              <TableHeadCell className="text-right">Hours</TableHeadCell>
              <TableHeadCell>Billable</TableHeadCell>
              <TableHeadCell>Note</TableHeadCell>
              <TableHeadCell className="w-12 pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => {
              const pr = projects.find((p) => p.id === r.projectId);
              const u = users[r.userId];
              return (
                <TableRow key={r.id}>
                  <TableCell className="tabular-nums text-slate-600">{r.date}</TableCell>
                  <TableCell className="font-medium">{u?.name ?? '—'}</TableCell>
                  <TableCell>
                    {pr ? <Link to={`/projects/${pr.id}`} className="text-indigo-700 hover:text-indigo-900">{pr.name}</Link> : '—'}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{r.hours}</TableCell>
                  <TableCell>
                    <Badge variant={r.billable ? 'success' : 'neutral'}>{r.billable ? 'Billable' : 'Non-billable'}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-slate-600">{r.note}</TableCell>
                  <TableCell className="text-right">
                    <DataRowMenu
                      label="Time entry actions"
                      items={[
                        { label: 'Edit', onClick: () => toast('Entry saved.', 'success') },
                        { label: 'Split', onClick: () => toast('Split across two projects.', 'success') },
                        { label: 'Move to invoice', onClick: () => toast('Hours staged on the next invoice.', 'success') },
                        { label: 'Delete', onClick: () => toast('Entry removed.', 'success'), destructive: true },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </TablePageLayout>
  );
}

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Plus, Search } from 'lucide-react';
import { formsSeed, type FormRow } from '@/lib/data/module-seeds';
import { TablePageLayout } from '@/components/layout/templates/table-page-layout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableFooterBar, TableHeadCell, TableHeader, TableRow } from '@/components/ui/table';
import { TableToolbar, TableToolbarSection } from '@/components/ui/table-toolbar';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { useClients } from '@/store/hooks';
import { DataRowMenu } from '@/components/workspace/data-row-menu';
import { useShell } from '@/context/shell-context';

function formVariant(s: FormRow['status']): 'neutral' | 'success' | 'info' | 'warning' {
  if (s === 'Live') return 'success';
  if (s === 'Draft') return 'warning';
  return 'neutral';
}

export function FormsPage() {
  const { toast } = useShell();
  const [rows, setRows] = useState<FormRow[]>(() => [...formsSeed]);
  const clients = useClients();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | FormRow['status']>('all');

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const match = !q.trim() || r.name.toLowerCase().includes(q.toLowerCase());
      const st = status === 'all' || r.status === status;
      return match && st;
    });
  }, [rows, q, status]);

  function addForm() {
    setRows((prev) => [
      {
        id: `fm-${Date.now()}`,
        name: 'New intake form',
        status: 'Draft',
        responses: 0,
        clientId: null,
        updatedLabel: 'Just now',
      },
      ...prev,
    ]);
  }

  return (
    <TablePageLayout
      header={
        <PageHeader
          title="Forms"
          description="Client intake, approvals, and structured data collection — embed on the portal or share a secure link."
          actions={
            <Button type="button" className="gap-2" onClick={addForm}>
              <Plus className="h-4 w-4" />
              New form
            </Button>
          }
        />
      }
    >
      <TableToolbar>
        <TableToolbarSection grow>
          <div className="relative min-w-[200px] max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search forms…"
              className="pl-10"
              aria-label="Search forms"
            />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="w-40 shrink-0" aria-label="Status">
            <option value="all">All statuses</option>
            <option value="Live">Live</option>
            <option value="Draft">Draft</option>
            <option value="Archived">Archived</option>
          </Select>
        </TableToolbarSection>
      </TableToolbar>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No forms yet"
          description="Build branded questionnaires with routing rules. Responses land beside the right client and project."
          action={
            <Button type="button" className="gap-2" onClick={addForm}>
              <Plus className="h-4 w-4" />
              New form
            </Button>
          }
        />
      ) : (
        <Table dense footer={<TableFooterBar from={1} to={filtered.length} total={filtered.length} />}>
          <TableHeader className="sticky top-0 z-20">
            <TableRow className="hover:bg-transparent">
              <TableHeadCell>Form</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell className="text-right">Responses</TableHeadCell>
              <TableHeadCell>Linked client</TableHeadCell>
              <TableHeadCell>Updated</TableHeadCell>
              <TableHeadCell className="w-12 pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => {
              const cl = r.clientId ? clients.find((c) => c.id === r.clientId) : undefined;
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-slate-900">{r.name}</TableCell>
                  <TableCell>
                    <Badge variant={formVariant(r.status)}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{r.responses}</TableCell>
                  <TableCell>
                    {cl ? <Link to={`/clients/${cl.id}`} className="text-indigo-700 hover:text-indigo-900">{cl.company}</Link> : '—'}
                  </TableCell>
                  <TableCell className="text-slate-500">{r.updatedLabel}</TableCell>
                  <TableCell className="text-right">
                    <DataRowMenu
                      label={`Actions for ${r.name}`}
                      items={[
                        { label: 'Open editor', onClick: () => toast(`Opened ${r.name} in the form editor.`, 'success') },
                        { label: 'Copy link', onClick: () => toast('Share link copied to clipboard.', 'success') },
                        { label: 'Export responses', onClick: () => toast('CSV export queued.', 'success') },
                        { label: 'Archive', onClick: () => toast('Form archived.', 'success'), destructive: true },
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

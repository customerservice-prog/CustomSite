import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus } from 'lucide-react';
import { proposalsSeed, type ProposalRow } from '@/lib/data/module-seeds';
import { TablePageLayout } from '@/components/layout/templates/table-page-layout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableFooterBar, TableHeadCell, TableHeader, TableRow } from '@/components/ui/table';
import { TableToolbar, TableToolbarSection } from '@/components/ui/table-toolbar';
import { EmptyState } from '@/components/ui/empty-state';
import { useClients, useProjects } from '@/store/hooks';
import { DataRowMenu } from '@/components/workspace/data-row-menu';

function proposalVariant(s: ProposalRow['status']): 'neutral' | 'success' | 'danger' | 'info' | 'warning' {
  if (s === 'Accepted') return 'success';
  if (s === 'Declined') return 'danger';
  if (s === 'Viewed' || s === 'Sent') return 'info';
  if (s === 'Draft') return 'neutral';
  return 'warning';
}

export function ProposalsPage() {
  const [rows, setRows] = useState<ProposalRow[]>(() => [...proposalsSeed]);
  const clients = useClients();
  const projects = useProjects();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const cl = clients.find((c) => c.id === r.clientId);
      const match =
        !q.trim() ||
        r.title.toLowerCase().includes(q.toLowerCase()) ||
        (cl?.company.toLowerCase().includes(q.toLowerCase()) ?? false);
      return match;
    });
  }, [rows, clients, q]);

  function addProposal() {
    const id = `pr-${Date.now()}`;
    setRows((prev) => [
      {
        id,
        clientId: clients[0]?.id ?? 'c1',
        projectId: null,
        title: 'Untitled proposal',
        status: 'Draft',
        value: 0,
        sentDate: null,
        respondedDate: null,
        updatedLabel: 'Just now',
      },
      ...prev,
    ]);
  }

  return (
    <TablePageLayout
      header={
        <PageHeader
          title="Proposals"
          description="Scoped offers with pricing, acceptance tracking, and a clear path to contract."
          actions={
            <Button type="button" className="gap-2" onClick={addProposal}>
              <Plus className="h-4 w-4" />
              New proposal
            </Button>
          }
        />
      }
    >
      <TableToolbar>
        <TableToolbarSection>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search proposals…" className="max-w-md flex-1" />
        </TableToolbarSection>
      </TableToolbar>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No proposals yet"
          description="Send polished scopes with line items and e-acceptance. Accepted proposals feed straight into contracts and billing."
          action={
            <Button type="button" className="gap-2" onClick={addProposal}>
              <Plus className="h-4 w-4" />
              New proposal
            </Button>
          }
        />
      ) : (
        <Table dense footer={<TableFooterBar from={1} to={filtered.length} total={filtered.length} />}>
          <TableHeader className="sticky top-0 z-20">
            <TableRow className="hover:bg-transparent">
              <TableHeadCell>Proposal</TableHeadCell>
              <TableHeadCell>Client</TableHeadCell>
              <TableHeadCell>Project</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell className="text-right">Value</TableHeadCell>
              <TableHeadCell>Sent</TableHeadCell>
              <TableHeadCell>Response</TableHeadCell>
              <TableHeadCell>Updated</TableHeadCell>
              <TableHeadCell className="w-12 pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => {
              const cl = clients.find((c) => c.id === r.clientId);
              const pr = r.projectId ? projects.find((p) => p.id === r.projectId) : undefined;
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-slate-900">{r.title}</TableCell>
                  <TableCell>
                    {cl ? <Link to={`/clients/${cl.id}`} className="text-indigo-700 hover:text-indigo-900">{cl.company}</Link> : '—'}
                  </TableCell>
                  <TableCell>
                    {pr ? <Link to={`/projects/${pr.id}`} className="text-indigo-700 hover:text-indigo-900">{pr.name}</Link> : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={proposalVariant(r.status)}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">${r.value.toLocaleString()}</TableCell>
                  <TableCell className="text-slate-600">{r.sentDate ?? '—'}</TableCell>
                  <TableCell className="text-slate-600">{r.respondedDate ?? '—'}</TableCell>
                  <TableCell className="text-slate-500">{r.updatedLabel}</TableCell>
                  <TableCell className="text-right">
                    <DataRowMenu label={`Actions for ${r.title}`} />
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

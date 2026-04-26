import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSignature, Plus } from 'lucide-react';
import { contractStatusBadgeVariant } from '@/lib/statuses';
import { TablePageLayout } from '@/components/layout/templates/table-page-layout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableFooterBar, TableHeadCell, TableHeader, TableRow } from '@/components/ui/table';
import { TableToolbar, TableToolbarSection } from '@/components/ui/table-toolbar';
import { EmptyState } from '@/components/ui/empty-state';
import { useShell } from '@/context/shell-context';
import { useClients, useContracts, useProjects } from '@/store/hooks';
import { DataRowMenu } from '@/components/workspace/data-row-menu';
import { MomentumChip, MomentumSep, PageMomentumStrip } from '@/components/workspace/page-momentum-strip';

export function ContractsPage() {
  const contracts = useContracts();
  const clients = useClients();
  const projects = useProjects();
  const { toast } = useShell();
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    return contracts.filter((c) => {
      const cl = clients.find((x) => x.id === c.clientId);
      const match =
        !q.trim() ||
        c.title.toLowerCase().includes(q.toLowerCase()) ||
        (cl?.company.toLowerCase().includes(q.toLowerCase()) ?? false);
      return match;
    });
  }, [contracts, clients, q]);

  return (
    <TablePageLayout
      header={
        <div className="space-y-4">
          <PageHeader
            title="Contracts"
            description="Signatures unlock billing — every agreement here should move a deal from proposal into billable delivery."
            actions={
              <Button type="button" className="gap-2" onClick={() => toast('Contract composer opens here.', 'info')}>
                <Plus className="h-4 w-4" />
                New contract
              </Button>
            }
          />
          <PageMomentumStrip title="What to do next">
            <MomentumChip to="/dashboard">Studio Pulse</MomentumChip>
            <MomentumSep />
            <MomentumChip to="/pipeline">Pipeline</MomentumChip>
            <MomentumSep />
            <MomentumChip to="/projects">Projects</MomentumChip>
            <MomentumSep />
            <MomentumChip to="/invoices">Invoices</MomentumChip>
          </PageMomentumStrip>
        </div>
      }
    >
      <TableToolbar>
        <TableToolbarSection>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search contracts…" className="max-w-md flex-1" />
        </TableToolbarSection>
      </TableToolbar>

      {rows.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="No contracts found"
          description="Send MSAs, SOWs, and renewals for e-sign. Status moves automatically as clients view and sign."
          action={
            <Button type="button" className="gap-2" onClick={() => toast('Contract composer opens here.', 'info')}>
              <Plus className="h-4 w-4" />
              New contract
            </Button>
          }
        />
      ) : (
        <Table dense footer={<TableFooterBar from={1} to={rows.length} total={rows.length} />}>
          <TableHeader className="sticky top-0 z-20">
            <TableRow className="hover:bg-transparent">
              <TableHeadCell>Contract</TableHeadCell>
              <TableHeadCell>Client</TableHeadCell>
              <TableHeadCell>Project</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell className="text-right">Value</TableHeadCell>
              <TableHeadCell>Sent</TableHeadCell>
              <TableHeadCell>Viewed</TableHeadCell>
              <TableHeadCell>Signed</TableHeadCell>
              <TableHeadCell className="w-12 pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => {
              const cl = clients.find((x) => x.id === c.clientId);
              const pr = c.projectId ? projects.find((p) => p.id === c.projectId) : undefined;
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-slate-900">{c.title}</TableCell>
                  <TableCell>
                    {cl ? <Link to={`/clients/${cl.id}`} className="text-indigo-700 hover:text-indigo-900">{cl.company}</Link> : '—'}
                  </TableCell>
                  <TableCell>
                    {pr ? <Link to={`/projects/${pr.id}`} className="text-indigo-700 hover:text-indigo-900">{pr.name}</Link> : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={contractStatusBadgeVariant(c.status)}>{c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">${c.value.toLocaleString()}</TableCell>
                  <TableCell className="text-slate-600">{c.sentDate ?? '—'}</TableCell>
                  <TableCell className="text-slate-600">{c.viewedDate ?? '—'}</TableCell>
                  <TableCell className="text-slate-600">{c.signedDate ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <DataRowMenu label={`Actions for ${c.title}`} />
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

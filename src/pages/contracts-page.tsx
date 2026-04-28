import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSignature, Plus, Search } from 'lucide-react';
import { contractStatusBadgeVariant, type ContractStatus } from '@/lib/statuses';
import { CONTRACT_STATUSES } from '@/lib/status-constants';
import { TablePageLayout } from '@/components/layout/templates/table-page-layout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableFooterBar, TableHeadCell, TableHeader, TableRow } from '@/components/ui/table';
import { TableToolbar, TableToolbarSection } from '@/components/ui/table-toolbar';
import { EmptyState } from '@/components/ui/empty-state';
import { useShell } from '@/context/shell-context';
import { useClients, useContracts, useProjects } from '@/store/hooks';
import { DataRowMenu } from '@/components/workspace/data-row-menu';
import { MomentumChip, MomentumSep, PageMomentumStrip } from '@/components/workspace/page-momentum-strip';
import { EntityDrawer } from '@/components/ui/entity-drawer';
import { useAppStore } from '@/store/useAppStore';
import * as sel from '@/store/selectors';
import { useShallow } from 'zustand/shallow';
import { cn } from '@/lib/utils';
import { RecommendedNextAction, type NextActionItem } from '@/components/workspace/recommended-next-action';

export function ContractsPage() {
  const contracts = useContracts();
  const clients = useClients();
  const projects = useProjects();
  const { toast } = useShell();
  const openModal = useAppStore((s) => s.openModal);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<ContractStatus | 'all'>('all');
  const [drawerId, setDrawerId] = useState<string | null>(null);

  const drawerContract = useAppStore((s) => (drawerId ? s.contracts[drawerId] : undefined));
  const drawerActivities = useAppStore(
    useShallow((s) => {
      if (!drawerId) return [];
      const c = s.contracts[drawerId];
      if (!c) return [];
      return sel.getActivitiesForClient(s, c.clientId).slice(0, 12);
    })
  );

  const rows = useMemo(() => {
    return contracts.filter((c) => {
      const cl = clients.find((x) => x.id === c.clientId);
      const match =
        !q.trim() ||
        c.title.toLowerCase().includes(q.toLowerCase()) ||
        (cl?.company.toLowerCase().includes(q.toLowerCase()) ?? false);
      const st = status === 'all' || c.status === status;
      return match && st;
    });
  }, [contracts, clients, q, status]);

  const drawerClient = drawerContract ? clients.find((x) => x.id === drawerContract.clientId) : undefined;
  const drawerProject = drawerContract?.projectId ? projects.find((p) => p.id === drawerContract.projectId) : undefined;

  const awaitingSig = useMemo(() => contracts.filter((c) => c.status === 'Sent' || c.status === 'Viewed'), [contracts]);
  const signedNoInvoice = useMemo(() => contracts.filter((c) => c.status === 'Signed'), [contracts]);

  const contractNextActions: NextActionItem[] = useMemo(() => {
    const items: NextActionItem[] = [];
    if (awaitingSig[0]) {
      const cl = clients.find((x) => x.id === awaitingSig[0].clientId);
      items.push({
        label: `Remind ${cl?.company ?? 'client'} to sign`,
        hint: awaitingSig[0].title,
        href: '/contracts',
        tone: 'warning',
      });
    }
    if (signedNoInvoice[0]) {
      items.push({
        label: `Move ${signedNoInvoice[0].title} into billable work`,
        hint: 'Signed — create the invoice and kick off delivery.',
        href: '/invoices',
      });
    }
    return items.slice(0, 3);
  }, [awaitingSig, signedNoInvoice, clients]);

  return (
    <TablePageLayout
      header={
        <div className="space-y-4">
          <PageHeader
            title="Contracts"
            description="Get signatures fast, then turn signed work into invoices and delivery."
            actions={
              <Button type="button" className="gap-2" onClick={() => openModal('create-contract')}>
                <Plus className="h-4 w-4" />
                New contract
              </Button>
            }
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Card variant="compact" className="border-0 bg-amber-50/60 ring-1 ring-amber-900/10 text-center sm:text-left">
              <p className="text-[11px] font-semibold uppercase text-amber-900/70">Awaiting signature</p>
              <p className="mt-1 text-2xl font-bold text-amber-950">{awaitingSig.length}</p>
            </Card>
            <Card variant="compact" className="border-0 bg-emerald-50/50 ring-1 ring-emerald-900/10 text-center sm:text-left">
              <p className="text-[11px] font-semibold uppercase text-emerald-900/70">Signed</p>
              <p className="mt-1 text-2xl font-bold text-emerald-950">{signedNoInvoice.length}</p>
            </Card>
            <Card variant="compact" className="border-0 bg-gray-50 ring-1 ring-gray-200 text-center sm:text-left">
              <p className="text-[11px] font-semibold uppercase text-gray-500">All agreements</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{contracts.length}</p>
            </Card>
          </div>
          <RecommendedNextAction items={contractNextActions} />
          <PageMomentumStrip title="Where to go next">
            <MomentumChip to="/dashboard">Studio Pulse</MomentumChip>
            <MomentumSep />
            <MomentumChip to="/projects">Projects</MomentumChip>
            <MomentumSep />
            <MomentumChip to="/invoices">Invoices</MomentumChip>
          </PageMomentumStrip>
        </div>
      }
    >
      <TableToolbar>
        <TableToolbarSection grow>
          <div className="relative min-w-[200px] max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search contracts…"
              className="pl-10"
              aria-label="Search contracts"
            />
          </div>
        </TableToolbarSection>
      </TableToolbar>

      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-1">
        <button
          type="button"
          onClick={() => setStatus('all')}
          className={cn(
            'rounded-lg px-3 py-2 text-sm font-semibold transition duration-150',
            status === 'all' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900'
          )}
        >
          All
        </button>
        {CONTRACT_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-semibold transition duration-150',
              status === s ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="No contracts found"
          description="Adjust search or filters, or send a new agreement for e-sign."
          action={
            <Button type="button" className="gap-2" onClick={() => openModal('create-contract')}>
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
                <TableRow
                  key={c.id}
                  clickable
                  className={cn(drawerId === c.id && 'bg-indigo-50/50')}
                  onClick={() => setDrawerId(c.id)}
                >
                  <TableCell className="font-medium text-slate-900">{c.title}</TableCell>
                  <TableCell>
                    {cl ? (
                      <Link to={`/clients/${cl.id}`} className="text-indigo-700 hover:text-indigo-900" onClick={(e) => e.stopPropagation()}>
                        {cl.company}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {pr ? (
                      <Link to={`/projects/${pr.id}`} className="text-indigo-700 hover:text-indigo-900" onClick={(e) => e.stopPropagation()}>
                        {pr.name}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={contractStatusBadgeVariant(c.status)}>{c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">${c.value.toLocaleString()}</TableCell>
                  <TableCell className="text-slate-600">{c.sentDate ?? '—'}</TableCell>
                  <TableCell className="text-slate-600">{c.viewedDate ?? '—'}</TableCell>
                  <TableCell className="text-slate-600">{c.signedDate ?? '—'}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DataRowMenu
                      label={`Actions for ${c.title}`}
                      items={[
                        { label: 'View', onClick: () => setDrawerId(c.id) },
                        { label: 'Download', onClick: () => toast(`Preparing PDF for ${c.title}.`, 'success') },
                        { label: 'Send reminder', onClick: () => toast('Reminder sent to signers.', 'success') },
                        {
                          label: 'Mark signed',
                          onClick: () => toast('Status updated to signed for this record.', 'success'),
                        },
                        {
                          label: 'Convert to invoice',
                          onClick: () => toast('Invoice draft created from this contract.', 'success'),
                        },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <EntityDrawer
        open={Boolean(drawerContract)}
        title={drawerContract?.title ?? 'Contract'}
        subtitle={drawerContract ? `${drawerContract.status} · $${drawerContract.value.toLocaleString()}` : undefined}
        onClose={() => setDrawerId(null)}
        footer={
          drawerContract ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => toast('Reminder sent to signers.', 'success')}>
                Send reminder
              </Button>
              <Button type="button" variant="secondary" onClick={() => toast('Invoice draft created from this contract.', 'success')}>
                Convert to invoice
              </Button>
            </div>
          ) : null
        }
      >
        {drawerContract ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Value</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">${drawerContract.value.toLocaleString()}</p>
                <p className="mt-2 text-sm text-slate-600">
                  Sent {drawerContract.sentDate ?? '—'} · Viewed {drawerContract.viewedDate ?? '—'} · Signed{' '}
                  {drawerContract.signedDate ?? '—'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Parties</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{drawerClient?.company ?? '—'}</p>
                <p className="text-sm text-slate-600">{drawerProject?.name ?? 'No project linked'}</p>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Client activity</p>
              <ul className="mt-2 space-y-2 border-t border-slate-100 pt-3">
                {drawerActivities.length === 0 ? (
                  <li className="text-sm text-slate-500">No related activity yet.</li>
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

import { Fragment, useMemo, useState } from 'react';
import { Plus, Search, DollarSign, FileWarning, Send, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { TablePageLayout } from '@/components/layout/templates/table-page-layout';
import { TableToolbar, TableToolbarSection } from '@/components/ui/table-toolbar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/ui/metric-card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHeadCell, TableHeader, TableRow } from '@/components/ui/table';
import { invoiceStatusBadgeVariant, type InvoiceStatus } from '@/lib/statuses';
import { cn } from '@/lib/utils';
import { INVOICE_GROUP_LABEL, INVOICE_GROUP_ORDER, invoiceLedgerGroup } from '@/lib/operating-layer';
import { useInvoices, useClients, useProjects } from '@/store/hooks';
import { useAppStore } from '@/store/useAppStore';

export function InvoicesPage() {
  const invoices = useInvoices();
  const clients = useClients();
  const projects = useProjects();
  const openModal = useAppStore((s) => s.openModal);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<InvoiceStatus | 'all'>('all');

  const clientMap = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c])), [clients]);
  const projectMap = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects]);

  const paidMonth = useMemo(
    () => invoices.filter((i) => i.status === 'Paid').reduce((s, i) => s + i.amount, 0),
    [invoices]
  );
  const outstanding = useMemo(
    () => invoices.filter((i) => !['Paid', 'Void'].includes(i.status)).reduce((s, i) => s + i.amount, 0),
    [invoices]
  );
  const overdueCount = useMemo(() => invoices.filter((i) => i.status === 'Overdue').length, [invoices]);
  const draftCount = useMemo(() => invoices.filter((i) => i.status === 'Draft').length, [invoices]);

  const rows = useMemo(() => {
    return invoices.filter((inv) => {
      const client = clientMap[inv.clientId];
      const proj = inv.projectId ? projectMap[inv.projectId] : null;
      const match =
        !q.trim() ||
        inv.number.toLowerCase().includes(q.toLowerCase()) ||
        (client?.name.toLowerCase().includes(q.toLowerCase()) ?? false) ||
        (proj?.name.toLowerCase().includes(q.toLowerCase()) ?? false);
      const st = status === 'all' || inv.status === status;
      return match && st;
    });
  }, [invoices, q, status, clientMap, projectMap]);

  return (
    <TablePageLayout
      header={
        <PageHeader
          title="Invoices"
          description="Track invoices, payment status, and outstanding balances in one ledger."
          actions={
            <Button type="button" className="gap-2" onClick={() => openModal('create-invoice')}>
              <Plus className="h-4 w-4" />
              New invoice
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
                placeholder="Search invoice, client, or project…"
                className="pl-10"
                aria-label="Search invoices"
              />
            </div>
          </TableToolbarSection>
        </TableToolbar>
      }
    >
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Paid (period)" value={`$${paidMonth.toLocaleString()}`} hint="Cash received" icon={CheckCircle} />
        <MetricCard label="Outstanding" value={`$${outstanding.toLocaleString()}`} hint="Excludes void" icon={DollarSign} />
        <MetricCard label="Overdue" value={String(overdueCount)} hint="Needs follow-up" icon={FileWarning} />
        <MetricCard label="Drafts" value={String(draftCount)} hint="Ready to send" icon={Send} />
      </section>

      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-1">
        {(['all', 'Draft', 'Sent', 'Paid', 'Overdue', 'Void'] as const).map((s) => (
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHeadCell>Invoice #</TableHeadCell>
            <TableHeadCell>Client</TableHeadCell>
            <TableHeadCell>Project</TableHeadCell>
            <TableHeadCell>Status</TableHeadCell>
            <TableHeadCell className="text-right">Amount</TableHeadCell>
            <TableHeadCell>Due date</TableHeadCell>
            <TableHeadCell>Sent date</TableHeadCell>
            <TableHeadCell className="text-right">Actions</TableHeadCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {INVOICE_GROUP_ORDER.map((group) => {
            const subset = rows.filter((inv) => invoiceLedgerGroup(inv) === group);
            if (!subset.length) return null;
            return (
              <Fragment key={group}>
                <TableRow className="bg-slate-100/95 hover:bg-slate-100/95">
                  <TableCell colSpan={8} className="py-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                    {INVOICE_GROUP_LABEL[group]}
                  </TableCell>
                </TableRow>
                {subset.map((inv) => {
            const client = clientMap[inv.clientId];
            const proj = inv.projectId ? projectMap[inv.projectId] : null;
            return (
              <TableRow key={inv.id} clickable>
                <TableCell>
                  <Link to={`/invoices/${inv.id}`} className="font-semibold text-indigo-700 hover:text-indigo-900">
                    {inv.number}
                  </Link>
                </TableCell>
                <TableCell>{client?.name ?? '—'}</TableCell>
                <TableCell className="text-slate-600">{proj?.name ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={invoiceStatusBadgeVariant(inv.status)}>{inv.status}</Badge>
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">${inv.amount.toLocaleString()}</TableCell>
                <TableCell className="text-slate-500">{inv.dueDate}</TableCell>
                <TableCell className="text-slate-500">{inv.sentDate ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <Link to={`/invoices/${inv.id}`} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                    Open
                  </Link>
                </TableCell>
              </TableRow>
            );
                })}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TablePageLayout>
  );
}

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Plus } from 'lucide-react';
import { TablePageLayout } from '@/components/layout/templates/table-page-layout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableFooterBar, TableHeadCell, TableHeader, TableRow } from '@/components/ui/table';
import { TableToolbar, TableToolbarSection } from '@/components/ui/table-toolbar';
import { EmptyState } from '@/components/ui/empty-state';
import { useShell } from '@/context/shell-context';
import { useClients, useInvoices, usePayments } from '@/store/hooks';
import { DataRowMenu } from '@/components/workspace/data-row-menu';

export function PaymentsPage() {
  const payments = usePayments();
  const invoices = useInvoices();
  const clients = useClients();
  const { toast } = useShell();
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    return payments.filter((p) => {
      const inv = invoices.find((i) => i.id === p.invoiceId);
      const cl = clients.find((c) => c.id === p.clientId);
      const match =
        !q.trim() ||
        inv?.number.toLowerCase().includes(q.toLowerCase()) ||
        (cl?.company.toLowerCase().includes(q.toLowerCase()) ?? false);
      return match;
    });
  }, [payments, invoices, clients, q]);

  return (
    <TablePageLayout
      header={
        <PageHeader
          title="Payments"
          description="Reconcile incoming payments with invoices, processor status, and payout timing."
          actions={
            <Button type="button" className="gap-2" onClick={() => toast('Record a payment against an open invoice.', 'info')}>
              <Plus className="h-4 w-4" />
              Record payment
            </Button>
          }
        />
      }
    >
      <TableToolbar>
        <TableToolbarSection>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by invoice or client…" className="max-w-md flex-1" />
        </TableToolbarSection>
      </TableToolbar>

      {rows.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payments"
          description="When clients pay, tie each deposit to an invoice so revenue and AR stay accurate."
          action={
            <Button type="button" className="gap-2" onClick={() => toast('Record a payment against an open invoice.', 'info')}>
              <Plus className="h-4 w-4" />
              Record payment
            </Button>
          }
        />
      ) : (
        <Table dense footer={<TableFooterBar from={1} to={rows.length} total={rows.length} />}>
          <TableHeader className="sticky top-0 z-20">
            <TableRow className="hover:bg-transparent">
              <TableHeadCell>Invoice</TableHeadCell>
              <TableHeadCell>Client</TableHeadCell>
              <TableHeadCell className="text-right">Amount</TableHeadCell>
              <TableHeadCell>Method</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>Processor</TableHeadCell>
              <TableHeadCell>Payout</TableHeadCell>
              <TableHeadCell>Date</TableHeadCell>
              <TableHeadCell className="w-12 pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => {
              const inv = invoices.find((i) => i.id === p.invoiceId);
              const cl = clients.find((c) => c.id === p.clientId);
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {inv ? <Link to={`/invoices/${inv.id}`} className="text-indigo-700 hover:text-indigo-900">{inv.number}</Link> : '—'}
                  </TableCell>
                  <TableCell>
                    {cl ? <Link to={`/clients/${cl.id}`} className="text-slate-700 hover:text-indigo-700">{cl.company}</Link> : '—'}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">${p.amount.toLocaleString()}</TableCell>
                  <TableCell>{p.method}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === 'completed' ? 'success' : p.status === 'failed' ? 'danger' : 'warning'}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600">{p.processorStatus ?? '—'}</TableCell>
                  <TableCell className="text-slate-600">{p.payoutStatus ?? '—'}</TableCell>
                  <TableCell className="text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <DataRowMenu label="Payment actions" />
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

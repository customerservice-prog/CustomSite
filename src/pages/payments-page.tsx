import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
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
import { useClients, useInvoices, usePayments, useProjects } from '@/store/hooks';
import { useAppStore } from '@/store/useAppStore';
import { DataRowMenu } from '@/components/workspace/data-row-menu';
import { DetailDrawer } from '@/components/design-system/detail-drawer';
import { cn } from '@/lib/utils';
import { formatCurrency, formatShortDate, titleCaseStatus } from '@/lib/format-display';
import { RecommendedNextAction, type NextActionItem } from '@/components/workspace/recommended-next-action';

export function PaymentsPage() {
  const navigate = useNavigate();
  const payments = usePayments();
  const invoices = useInvoices();
  const clients = useClients();
  const projects = useProjects();
  const projectById = useMemo(() => Object.fromEntries(projects.map((x) => [x.id, x])), [projects]);
  const { toast } = useShell();
  const openModal = useAppStore((s) => s.openModal);
  const paymentById = useAppStore((s) => s.payments);
  const [q, setQ] = useState('');
  const [payStatus, setPayStatus] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');
  const [drawerPaymentId, setDrawerPaymentId] = useState<string | null>(null);

  const summary = useMemo(() => {
    const completed = payments.filter((p) => p.status === 'completed');
    const pending = payments.filter((p) => p.status === 'pending');
    const failed = payments.filter((p) => p.status === 'failed');
    const collectedMonth = completed.reduce((s, p) => s + p.amount, 0);
    const pendingSettle = pending.reduce((s, p) => s + p.amount, 0);
    return { collectedMonth, pendingSettle, failedCount: failed.length, pendingCount: pending.length };
  }, [payments]);

  const rows = useMemo(() => {
    return payments.filter((p) => {
      const inv = invoices.find((i) => i.id === p.invoiceId);
      const cl = clients.find((c) => c.id === p.clientId);
      const match =
        !q.trim() ||
        inv?.number.toLowerCase().includes(q.toLowerCase()) ||
        (cl?.company.toLowerCase().includes(q.toLowerCase()) ?? false);
      const st = payStatus === 'all' || p.status === payStatus;
      return match && st;
    });
  }, [payments, invoices, clients, q, payStatus]);

  const paymentNextActions: NextActionItem[] = useMemo(() => {
    const items: NextActionItem[] = [];
    const pend = payments.filter((p) => p.status === 'pending');
    if (pend[0]) {
      const inv = invoices.find((i) => i.id === pend[0].invoiceId);
      items.push({
        label: `Reconcile pending ${formatCurrency(pend[0].amount)}`,
        hint: inv ? `Tied to ${inv.number}` : 'Match to an invoice when it settles.',
        href: '/payments',
        tone: 'warning',
      });
    }
    if (summary.failedCount > 0) {
      items.push({
        label: 'Review failed payments',
        hint: `${summary.failedCount} need attention.`,
        href: '/payments',
        tone: 'danger',
      });
    }
    return items.slice(0, 2);
  }, [payments, invoices, summary.failedCount]);

  return (
    <TablePageLayout
      header={
        <div className="space-y-4">
          <PageHeader
            title="Payments"
            description="Record and reconcile money movement: tie deposits to invoices and keep client balances correct."
            actions={
              <Button type="button" className="gap-2" onClick={() => openModal('record-payment')}>
                <Plus className="h-4 w-4" />
                Record payment
              </Button>
            }
          />
          <RecommendedNextAction items={paymentNextActions} />
        </div>
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4 shadow-sm ring-1 ring-slate-900/[0.04]">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Collected</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{formatCurrency(summary.collectedMonth)}</p>
        </Card>
        <Card className="p-4 shadow-sm ring-1 ring-slate-900/[0.04]">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Pending settlement</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-800">{formatCurrency(summary.pendingSettle)}</p>
          <p className="mt-1 text-xs text-slate-500">
            {summary.pendingCount} in flight — normal until your processor confirms; not failed payments.
          </p>
        </Card>
        <Card className="p-4 shadow-sm ring-1 ring-slate-900/[0.04]">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Failed</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{summary.failedCount}</p>
        </Card>
        <Card className="p-4 shadow-sm ring-1 ring-slate-900/[0.04]">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Next payout</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">Scheduled after batch close</p>
          <Button type="button" variant="secondary" className="mt-3 w-full text-xs" onClick={() => toast('Reconciliation view opens from your processor export.', 'info')}>
            Reconcile
          </Button>
        </Card>
      </div>

      <TableToolbar>
        <TableToolbarSection grow>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by invoice or client…" className="max-w-md flex-1" />
        </TableToolbarSection>
      </TableToolbar>

      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-1">
        {(['all', 'pending', 'completed', 'failed'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setPayStatus(s)}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-semibold capitalize transition duration-150',
              payStatus === s ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payments"
          description="When clients pay, tie each deposit to an invoice so revenue and AR stay accurate."
          action={
            <Button type="button" className="gap-2" onClick={() => openModal('record-payment')}>
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
                <TableRow
                  key={p.id}
                  clickable
                  className={drawerPaymentId === p.id ? 'bg-indigo-50/50' : undefined}
                  onClick={() => setDrawerPaymentId(p.id)}
                >
                  <TableCell className="font-medium">
                    {inv ? (
                      <Link to={`/invoices/${inv.id}`} className="text-indigo-700 hover:text-indigo-900" onClick={(e) => e.stopPropagation()}>
                        {inv.number}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {cl ? (
                      <Link to={`/clients/${cl.id}`} className="text-slate-700 hover:text-indigo-700" onClick={(e) => e.stopPropagation()}>
                        {cl.company}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(p.amount)}</TableCell>
                  <TableCell>{p.method}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === 'completed' ? 'success' : p.status === 'failed' ? 'danger' : 'warning'}>
                      {titleCaseStatus(p.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600">{titleCaseStatus(p.processorStatus)}</TableCell>
                  <TableCell className="text-slate-600">{titleCaseStatus(p.payoutStatus)}</TableCell>
                  <TableCell className="text-slate-500">{formatShortDate(p.createdAt)}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DataRowMenu
                      label="Payment actions"
                      items={[
                        { label: 'View details', onClick: () => setDrawerPaymentId(p.id) },
                        {
                          label: 'Open invoice',
                          onClick: () => {
                            if (inv) navigate(`/invoices/${inv.id}`);
                            else toast('No invoice linked to this payment.', 'info');
                          },
                        },
                        {
                          label: 'Reconcile',
                          onClick: () => toast('Matched to processor batch for this payout window.', 'success'),
                        },
                        {
                          label: 'Refund',
                          onClick: () => toast('Refund flow opens from your processor dashboard.', 'info'),
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

      <DetailDrawer
        open={Boolean(drawerPaymentId && paymentById[drawerPaymentId])}
        title={drawerPaymentId && paymentById[drawerPaymentId] ? `Payment · ${formatCurrency(paymentById[drawerPaymentId].amount)}` : 'Payment'}
        subtitle={
          drawerPaymentId && paymentById[drawerPaymentId]
            ? formatShortDate(paymentById[drawerPaymentId].createdAt)
            : undefined
        }
        onClose={() => setDrawerPaymentId(null)}
        footer={
          drawerPaymentId && paymentById[drawerPaymentId] ? (
            <Button
              type="button"
              onClick={() => {
                const inv = invoices.find((i) => i.id === paymentById[drawerPaymentId].invoiceId);
                if (inv) navigate(`/invoices/${inv.id}`);
              }}
            >
              Open invoice
            </Button>
          ) : null
        }
      >
        {drawerPaymentId && paymentById[drawerPaymentId] ? (
          <div className="space-y-4">
            {(() => {
              const pay = paymentById[drawerPaymentId];
              const inv = invoices.find((i) => i.id === pay.invoiceId);
              const cl = clients.find((c) => c.id === pay.clientId);
              const pr = inv?.projectId ? projectById[inv.projectId] : undefined;
              return (
                <>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">Method:</span> {pay.method}
                    </p>
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">Status:</span> {titleCaseStatus(pay.status)}
                    </p>
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">Processor:</span> {titleCaseStatus(pay.processorStatus)}
                    </p>
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">Payout:</span> {titleCaseStatus(pay.payoutStatus)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Linked records</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{inv?.number ?? '—'}</p>
                    <p className="text-sm text-slate-600">{cl?.company ?? '—'}</p>
                    {pr && (
                      <Link to={`/projects/${pr.id}`} className="mt-2 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                        {pr.name}
                      </Link>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        ) : null}
      </DetailDrawer>
    </TablePageLayout>
  );
}

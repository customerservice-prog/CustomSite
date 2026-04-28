import { Fragment, useMemo, useState } from 'react';
import { Plus, Search, DollarSign, FileWarning, Send, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
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
import { MomentumChip, MomentumSep, PageMomentumStrip } from '@/components/workspace/page-momentum-strip';
import { EntityDrawer } from '@/components/ui/entity-drawer';
import { DataRowMenu } from '@/components/workspace/data-row-menu';
import * as sel from '@/store/selectors';
import { useShell } from '@/context/shell-context';
import { RecommendedNextAction, type NextActionItem } from '@/components/workspace/recommended-next-action';
import { formatCurrency } from '@/lib/format-display';

function formatLedgerDate(raw: string | null | undefined) {
  if (raw == null || raw === '—') return '—';
  if (/\d{4}$/.test(raw.trim())) return raw;
  return `${raw}, 2026`;
}

export function InvoicesPage() {
  const navigate = useNavigate();
  const { toast } = useShell();
  const invoices = useInvoices();
  const clients = useClients();
  const projects = useProjects();
  const openModal = useAppStore((s) => s.openModal);
  const sendInvoice = useAppStore((s) => s.sendInvoice);
  const markInvoicePaid = useAppStore((s) => s.markInvoicePaid);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<InvoiceStatus | 'all'>('all');
  const [drawerInvoiceId, setDrawerInvoiceId] = useState<string | null>(null);

  const drawerInvoice = useAppStore((s) => (drawerInvoiceId ? s.invoices[drawerInvoiceId] : undefined));
  const drawerActivities = useAppStore(
    useShallow((s) => {
      if (!drawerInvoiceId) return [];
      const inv = s.invoices[drawerInvoiceId];
      if (!inv) return [];
      return sel.getActivitiesForClient(s, inv.clientId).slice(0, 14);
    })
  );

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

  const invoiceNextActions: NextActionItem[] = useMemo(() => {
    const items: NextActionItem[] = [];
    const overdue = invoices.filter((i) => i.status === 'Overdue');
    if (overdue[0]) {
      const c = clientMap[overdue[0].clientId];
      items.push({
        label: `Send reminder for ${overdue[0].number}`,
        hint: `${c?.company ?? 'Client'} · ${formatCurrency(overdue[0].amount)} open.`,
        href: `/invoices/${overdue[0].id}`,
        tone: 'danger',
      });
    }
    const draft = invoices.find((i) => i.status === 'Draft');
    if (draft) {
      items.push({
        label: `Send ${draft.number}`,
        hint: 'Draft is ready — get it in front of the client.',
        href: `/invoices/${draft.id}`,
        tone: 'warning',
      });
    }
    const sent = invoices.find((i) => i.status === 'Sent');
    if (sent && items.length < 3) {
      items.push({
        label: `Record payment or follow up ${sent.number}`,
        hint: formatCurrency(sent.amount),
        href: `/invoices/${sent.id}`,
      });
    }
    return items.slice(0, 3);
  }, [invoices, clientMap]);

  const rows = useMemo(() => {
    return invoices.filter((inv) => {
      const client = clientMap[inv.clientId];
      const proj = inv.projectId ? projectMap[inv.projectId] : null;
      const match =
        !q.trim() ||
        inv.number.toLowerCase().includes(q.toLowerCase()) ||
        (client?.name.toLowerCase().includes(q.toLowerCase()) ?? false) ||
        (client?.company.toLowerCase().includes(q.toLowerCase()) ?? false) ||
        (proj?.name.toLowerCase().includes(q.toLowerCase()) ?? false);
      const st = status === 'all' || inv.status === status;
      return match && st;
    });
  }, [invoices, q, status, clientMap, projectMap]);

  function invoiceMenuItems(invId: string) {
    const inv = invoices.find((i) => i.id === invId);
    if (!inv) return [];
    const items: { label: string; onClick: () => void }[] = [
      { label: 'Open', onClick: () => navigate(`/invoices/${inv.id}`) },
    ];
    if (inv.status === 'Draft') {
      items.push({ label: 'Send', onClick: () => sendInvoice(inv.id) });
    }
    if (inv.status === 'Sent' || inv.status === 'Overdue') {
      items.push({ label: 'Send', onClick: () => sendInvoice(inv.id) });
      items.push({ label: 'Send reminder', onClick: () => toast(`Reminder queued for ${inv.number}.`, 'success') });
    }
    if (inv.status !== 'Paid' && inv.status !== 'Void') {
      items.push({ label: 'Mark paid', onClick: () => markInvoicePaid(inv.id) });
    }
    return items;
  }

  return (
    <TablePageLayout
      header={
        <div className="space-y-4">
          <PageHeader
            title="Invoices"
            description="Send, collect, and reconcile invoices before revenue slips."
            actions={
              <Button type="button" className="gap-2" onClick={() => openModal('create-invoice')}>
                <Plus className="h-4 w-4" />
                New invoice
              </Button>
            }
          />
          <RecommendedNextAction items={invoiceNextActions} />
          <PageMomentumStrip>
            <MomentumChip to="/dashboard">Studio Pulse</MomentumChip>
            <MomentumSep />
            <MomentumChip to="/payments">Payments</MomentumChip>
            <MomentumSep />
            <MomentumChip to="/projects">Projects</MomentumChip>
            <MomentumSep />
            <MomentumChip to="/messages">Messages</MomentumChip>
          </PageMomentumStrip>
        </div>
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
        <MetricCard
          label="Paid (period)"
          value={`$${paidMonth.toLocaleString()}`}
          hint="Cash received"
          icon={CheckCircle}
          onClick={() => setStatus('Paid')}
        />
        <MetricCard
          label="Outstanding"
          value={`$${outstanding.toLocaleString()}`}
          hint="Collect or reconcile open balances"
          icon={DollarSign}
          tone="attention"
          onClick={() => setStatus('Sent')}
        />
        <MetricCard
          label="Overdue"
          value={String(overdueCount)}
          hint={overdueCount > 0 ? `Follow up on ${overdueCount} overdue invoice${overdueCount === 1 ? '' : 's'}` : 'Nothing overdue right now'}
          icon={FileWarning}
          tone={overdueCount > 0 ? 'danger' : 'default'}
          onClick={() => setStatus('Overdue')}
        />
        <MetricCard
          label="Drafts"
          value={String(draftCount)}
          hint={draftCount > 0 ? `Send ${draftCount} draft invoice${draftCount === 1 ? '' : 's'}` : 'No drafts waiting'}
          icon={Send}
          tone="risk"
          onClick={() => setStatus('Draft')}
        />
      </section>

      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-1">
        {(['all', 'Draft', 'Sent', 'Paid', 'Overdue', 'Void'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-semibold transition duration-150',
              status === s ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80' : 'text-slate-600 hover:text-slate-900'
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
                    <TableRow
                      key={inv.id}
                      clickable
                      className={cn(drawerInvoiceId === inv.id && 'bg-indigo-50/50')}
                      onClick={() => setDrawerInvoiceId(inv.id)}
                    >
                      <TableCell>
                        <span className="font-semibold text-indigo-700">{inv.number}</span>
                      </TableCell>
                      <TableCell>
                        {client ? (
                          <Link
                            to={`/clients/${client.id}`}
                            className="font-medium text-slate-800 hover:text-indigo-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {client.company}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {proj ? (
                          <Link
                            to={`/projects/${proj.id}`}
                            className="hover:text-indigo-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {proj.name}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={invoiceStatusBadgeVariant(inv.status)}>{inv.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">${inv.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-slate-500">{formatLedgerDate(inv.dueDate)}</TableCell>
                      <TableCell className="text-slate-500">{formatLedgerDate(inv.sentDate)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DataRowMenu label={`Actions for ${inv.number}`} items={invoiceMenuItems(inv.id)} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>

      <EntityDrawer
        open={Boolean(drawerInvoice && drawerInvoiceId)}
        title={drawerInvoice ? drawerInvoice.number : 'Invoice'}
        subtitle={drawerInvoice ? `${formatLedgerDate(drawerInvoice.dueDate)} · ${drawerInvoice.status}` : undefined}
        onClose={() => setDrawerInvoiceId(null)}
        footer={
          drawerInvoice ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => navigate(`/invoices/${drawerInvoice.id}`)}>
                Open full invoice
              </Button>
              {drawerInvoice.status === 'Draft' && (
                <Button type="button" variant="secondary" onClick={() => sendInvoice(drawerInvoice.id)}>
                  Send
                </Button>
              )}
              {['Sent', 'Overdue'].includes(drawerInvoice.status) && (
                <Button type="button" variant="secondary" onClick={() => toast(`Reminder queued for ${drawerInvoice.number}.`, 'success')}>
                  Send reminder
                </Button>
              )}
              {!['Paid', 'Void'].includes(drawerInvoice.status) && (
                <Button type="button" variant="secondary" onClick={() => markInvoicePaid(drawerInvoice.id)}>
                  Mark paid
                </Button>
              )}
            </div>
          ) : null
        }
      >
        {drawerInvoice ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Amount</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">${drawerInvoice.amount.toLocaleString()}</p>
                <p className="mt-2 text-sm text-slate-600">
                  Due {formatLedgerDate(drawerInvoice.dueDate)} · Sent {formatLedgerDate(drawerInvoice.sentDate)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Related</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{clientMap[drawerInvoice.clientId]?.company ?? '—'}</p>
                <p className="text-sm text-slate-600">
                  {drawerInvoice.projectId ? projectMap[drawerInvoice.projectId]?.name ?? '—' : 'No project'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {clientMap[drawerInvoice.clientId] && (
                    <Link
                      to={`/clients/${drawerInvoice.clientId}`}
                      className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Client profile
                    </Link>
                  )}
                  {drawerInvoice.projectId && projectMap[drawerInvoice.projectId] && (
                    <Link
                      to={`/projects/${drawerInvoice.projectId}`}
                      className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Project
                    </Link>
                  )}
                </div>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Recent activity</p>
              <ul className="mt-2 space-y-2 border-t border-slate-100 pt-3">
                {drawerActivities.length === 0 ? (
                  <li className="text-sm text-slate-500">No recent activity for this client.</li>
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

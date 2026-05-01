import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import { PageHeader } from '@/components/ui/page-header';
import { TablePageLayout } from '@/components/layout/templates/table-page-layout';
import { TableToolbar, TableToolbarSection } from '@/components/ui/table-toolbar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeadCell, TableHeader, TableRow } from '@/components/ui/table';
import { invoiceStatusBadgeVariant, type InvoiceStatus } from '@/lib/statuses';
import { cn } from '@/lib/utils';
import { useInvoices, useClients, useProjects } from '@/store/hooks';
import { useAppStore } from '@/store/useAppStore';
import { EntityDrawer } from '@/components/ui/entity-drawer';
import { DataRowMenu } from '@/components/workspace/data-row-menu';
import * as sel from '@/store/selectors';
import { useShell } from '@/context/shell-context';
import { RecommendedNextAction, type NextActionItem } from '@/components/workspace/recommended-next-action';
import { formatCurrency } from '@/lib/format-display';
import { daysPastDueDisplay } from '@/lib/system-intelligence';
import type { Invoice } from '@/lib/types/entities';

function formatLedgerDate(raw: string | null | undefined) {
  if (raw == null || raw === '—') return '—';
  if (/\d{4}$/.test(raw.trim())) return raw;
  return `${raw}, 2026`;
}

function matchesQ(inv: Invoice, q: string, clientMap: Record<string, { name: string; company: string }>, projectMap: Record<string, { name: string }>) {
  if (!q.trim()) return true;
  const client = clientMap[inv.clientId];
  const proj = inv.projectId ? projectMap[inv.projectId] : null;
  const s = q.trim().toLowerCase();
  return (
    inv.number.toLowerCase().includes(s) ||
    (client?.name.toLowerCase().includes(s) ?? false) ||
    (client?.company.toLowerCase().includes(s) ?? false) ||
    (proj?.name.toLowerCase().includes(s) ?? false)
  );
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
  const defaultedFilter = useRef(false);

  const overdueInvoices = useMemo(() => invoices.filter((i) => i.status === 'Overdue'), [invoices]);
  useEffect(() => {
    if (!defaultedFilter.current && overdueInvoices.length > 0) {
      setStatus('Overdue');
      defaultedFilter.current = true;
    }
  }, [overdueInvoices.length]);

  const drawerInvoice = useAppStore((s) => (drawerInvoiceId ? s.invoices[drawerInvoiceId] : undefined));
  const drawerPayments = useAppStore(useShallow((s) => (drawerInvoiceId ? sel.getPaymentsForInvoice(s, drawerInvoiceId) : [])));
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
  const overdueCount = overdueInvoices.length;
  const overdueTotal = useMemo(() => overdueInvoices.reduce((s, i) => s + i.amount, 0), [overdueInvoices]);
  const draftCount = useMemo(() => invoices.filter((i) => i.status === 'Draft').length, [invoices]);
  const sentCount = useMemo(() => invoices.filter((i) => i.status === 'Sent').length, [invoices]);
  const worstOverdueDays = useMemo(() => {
    if (!overdueInvoices.length) return null;
    const sorted = [...overdueInvoices].sort(
      (a, b) => (daysPastDueDisplay(b.dueDate) ?? 0) - (daysPastDueDisplay(a.dueDate) ?? 0)
    );
    return daysPastDueDisplay(sorted[0].dueDate);
  }, [overdueInvoices]);

  const invoiceNextActions: NextActionItem[] = useMemo(() => {
    const items: NextActionItem[] = [];
    const overdue = overdueInvoices;
    if (overdue[0]) {
      const c = clientMap[overdue[0].clientId];
      items.push({
        label: `Remind ${overdue[0].number}`,
        hint: `${c?.company ?? 'Client'} · ${formatCurrency(overdue[0].amount)}.`,
        href: `/invoices/${overdue[0].id}`,
        tone: 'danger',
      });
    }
    const draft = invoices.find((i) => i.status === 'Draft');
    if (draft) {
      items.push({
        label: `Send ${draft.number}`,
        hint: 'Draft is sitting — client cannot pay what they never got.',
        href: `/invoices/${draft.id}`,
        tone: 'warning',
      });
    }
    const sent = invoices.find((i) => i.status === 'Sent');
    if (sent && items.length < 3) {
      items.push({
        label: `Follow up ${sent.number}`,
        hint: formatCurrency(sent.amount),
        href: `/invoices/${sent.id}`,
      });
    }
    return items.slice(0, 3);
  }, [invoices, clientMap, overdueInvoices]);

  const rows = useMemo(() => {
    return invoices.filter((inv) => {
      const st = status === 'all' || inv.status === status;
      return matchesQ(inv, q, clientMap, projectMap) && st;
    });
  }, [invoices, q, status, clientMap, projectMap]);

  const overdueRows = useMemo(() => {
    return overdueInvoices
      .filter((inv) => matchesQ(inv, q, clientMap, projectMap))
      .sort((a, b) => (daysPastDueDisplay(b.dueDate) ?? 0) - (daysPastDueDisplay(a.dueDate) ?? 0));
  }, [overdueInvoices, q, clientMap, projectMap]);

  const pipelineRows = useMemo(() => {
    return invoices.filter(
      (inv) => (inv.status === 'Draft' || inv.status === 'Sent') && matchesQ(inv, q, clientMap, projectMap)
    );
  }, [invoices, q, clientMap, projectMap]);

  const paidRows = useMemo(() => {
    return invoices.filter((inv) => inv.status === 'Paid' && matchesQ(inv, q, clientMap, projectMap)).slice(0, 6);
  }, [invoices, q, clientMap, projectMap]);

  function invoiceMenuItems(invId: string) {
    const inv = invoices.find((i) => i.id === invId);
    if (!inv) return [];
    const items: { label: string; onClick: () => void }[] = [{ label: 'Open', onClick: () => navigate(`/invoices/${inv.id}`) }];
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

  function renderInvoiceRow(inv: Invoice, opts: { showLate?: boolean }) {
    const client = clientMap[inv.clientId];
    const proj = inv.projectId ? projectMap[inv.projectId] : null;
    const late = opts.showLate ? daysPastDueDisplay(inv.dueDate) : null;
    return (
      <TableRow
        key={inv.id}
        clickable
        className={cn(drawerInvoiceId === inv.id && 'bg-indigo-50/50', inv.status === 'Overdue' && 'bg-red-50/40')}
        onClick={() => setDrawerInvoiceId(inv.id)}
      >
        <TableCell>
          <span className="font-semibold text-indigo-800">{inv.number}</span>
        </TableCell>
        <TableCell>
          {client ? (
            <Link to={`/clients/${client.id}`} className="font-medium text-slate-900 hover:text-indigo-700" onClick={(e) => e.stopPropagation()}>
              {client.company}
            </Link>
          ) : (
            '—'
          )}
        </TableCell>
        <TableCell className="text-slate-600">
          {proj ? (
            <Link to={`/projects/${proj.id}`} className="hover:text-indigo-700" onClick={(e) => e.stopPropagation()}>
              {proj.name}
            </Link>
          ) : (
            <span className="text-amber-800">No project</span>
          )}
        </TableCell>
        <TableCell>
          <div className="flex flex-col gap-1">
            <Badge variant={invoiceStatusBadgeVariant(inv.status)}>{inv.status}</Badge>
            {late != null && late > 0 && (
              <span className="text-xs font-bold text-red-700">{late}d late</span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(inv.amount)}</TableCell>
        <TableCell className="text-slate-600">{formatLedgerDate(inv.dueDate)}</TableCell>
        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
          <DataRowMenu label={`Actions for ${inv.number}`} items={invoiceMenuItems(inv.id)} />
        </TableCell>
      </TableRow>
    );
  }

  const recordedOnDrawer = drawerPayments.filter((p) => p.status === 'completed').reduce((s, p) => s + p.amount, 0);

  return (
    <TablePageLayout
      header={
        <div className="space-y-3">
          <PageHeader
            title="Invoices"
            description="Open balances first — paid invoices are reference, not the job. Create, send, and chase what's owed."
            actions={
              <Button type="button" className="gap-2" onClick={() => openModal('create-invoice')}>
                <Plus className="h-4 w-4" />
                New invoice
              </Button>
            }
          />
          {(overdueCount > 0 || draftCount > 0 || sentCount > 0) && (
            <Card variant="compact" className="border-l-4 border-slate-800 bg-slate-50/90 py-3">
              <p className="text-[11px] font-bold uppercase text-slate-600">Decide next</p>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-900">
                {overdueCount > 0 && (
                  <li>
                    <span className="font-semibold text-red-800">{formatCurrency(overdueTotal)} overdue</span> across {overdueCount}{' '}
                    invoice{overdueCount === 1 ? '' : 's'}
                    {worstOverdueDays != null && worstOverdueDays > 0 ? ` — worst is ${worstOverdueDays}d late` : ''}.{' '}
                    <button
                      type="button"
                      className="font-semibold text-purple-800 underline decoration-purple-300 underline-offset-2 hover:text-purple-950"
                      onClick={() => toast(`Reminders queued for ${overdueCount} invoice(s).`, 'success')}
                    >
                      Queue reminders
                    </button>{' '}
                    or collect.
                  </li>
                )}
                {draftCount > 0 && (
                  <li>
                    <span className="font-semibold text-amber-900">{draftCount} draft</span> not sent — AR does not start until delivery hits their inbox.
                  </li>
                )}
                {sentCount > 0 && (
                  <li>
                    <span className="font-semibold text-slate-800">{sentCount} sent</span> awaiting payment — follow up before they go quiet.
                  </li>
                )}
              </ul>
            </Card>
          )}
          <RecommendedNextAction items={invoiceNextActions} />
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
      <p className="text-xs text-slate-600">
        <span className="font-semibold text-slate-900">{formatCurrency(paidMonth)}</span> collected ·{' '}
        <span className="font-semibold text-amber-900">{formatCurrency(outstanding)}</span> still open ·{' '}
        <span className={overdueCount ? 'font-semibold text-red-800' : 'font-semibold text-slate-700'}>
          {overdueCount ? `${formatCurrency(overdueTotal)} overdue` : 'nothing overdue'}
        </span>
        {draftCount > 0 && (
          <>
            {' '}
            · <span className="font-semibold text-slate-800">{draftCount} draft</span> not sent
          </>
        )}
      </p>

      {overdueRows.length > 0 && (
        <section className="mt-5 border-l-4 border-red-600 bg-red-50/50 px-4 py-4 shadow-sm ring-1 ring-red-900/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-red-950">Collect now</h2>
              <p className="mt-1 max-w-2xl text-sm text-red-900/90">
                {formatCurrency(overdueTotal)} across {overdueRows.length} invoice{overdueRows.length === 1 ? '' : 's'} — oldest is{' '}
                <span className="font-semibold">{daysPastDueDisplay(overdueRows[0].dueDate) ?? '—'} days</span> past terms.
              </p>
            </div>
            <Button
              type="button"
              className="shrink-0 bg-red-700 text-white hover:bg-red-800"
              onClick={() => toast(`Reminders queued for ${overdueRows.length} invoice(s).`, 'success')}
            >
              Queue reminders
            </Button>
          </div>
          <div className="mt-4 overflow-x-auto rounded-lg border border-red-200/80 bg-white">
            <Table dense>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHeadCell>Invoice</TableHeadCell>
                  <TableHeadCell>Client</TableHeadCell>
                  <TableHeadCell>Project</TableHeadCell>
                  <TableHeadCell>Status</TableHeadCell>
                  <TableHeadCell className="text-right">Amount</TableHeadCell>
                  <TableHeadCell>Due</TableHeadCell>
                  <TableHeadCell className="text-right">Actions</TableHeadCell>
                </TableRow>
              </TableHeader>
              <TableBody>{overdueRows.map((inv) => renderInvoiceRow(inv, { showLate: true }))}</TableBody>
            </Table>
          </div>
        </section>
      )}

      {overdueRows.length === 0 && (
        <section className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50/80 px-4 py-6 text-sm text-slate-700">
          No overdue invoices with current search — check drafts or sent below.
        </section>
      )}

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-amber-900">Still in motion</h2>
            <p className="text-xs text-slate-600">Drafts and sent — smaller than overdue because they are not bleeding yet.</p>
          </div>
        </div>
        {pipelineRows.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Nothing in draft or sent for this search.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-amber-200/80 bg-amber-50/20">
            <Table dense>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHeadCell>Invoice</TableHeadCell>
                  <TableHeadCell>Client</TableHeadCell>
                  <TableHeadCell>Project</TableHeadCell>
                  <TableHeadCell>Status</TableHeadCell>
                  <TableHeadCell className="text-right">Amount</TableHeadCell>
                  <TableHeadCell>Due</TableHeadCell>
                  <TableHeadCell className="text-right">Actions</TableHeadCell>
                </TableRow>
              </TableHeader>
              <TableBody>{pipelineRows.map((inv) => renderInvoiceRow(inv, {}))}</TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="mt-10 border-t border-slate-200 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">Filter ledger</h2>
          <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50/80 p-1">
            {(['all', 'Draft', 'Sent', 'Paid', 'Overdue', 'Void'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn(
                  'rounded-md px-2.5 py-1.5 text-xs font-semibold transition',
                  status === s ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900'
                )}
              >
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">Use filters for voids, audits, or paid history — day-to-day work lives in the sections above.</p>
        <div className="mt-3 overflow-x-auto">
          <Table dense>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHeadCell>Invoice</TableHeadCell>
                <TableHeadCell>Client</TableHeadCell>
                <TableHeadCell>Project</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell className="text-right">Amount</TableHeadCell>
                <TableHeadCell>Due</TableHeadCell>
                <TableHeadCell>Sent</TableHeadCell>
                <TableHeadCell className="text-right">Actions</TableHeadCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-sm text-slate-500">
                    No rows for this filter.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((inv) => {
                  const client = clientMap[inv.clientId];
                  const proj = inv.projectId ? projectMap[inv.projectId] : null;
                  return (
                    <TableRow
                      key={inv.id}
                      clickable
                      className={cn(drawerInvoiceId === inv.id && 'bg-indigo-50/50')}
                      onClick={() => setDrawerInvoiceId(inv.id)}
                    >
                      <TableCell className="font-semibold text-indigo-800">{inv.number}</TableCell>
                      <TableCell>
                        {client ? (
                          <Link to={`/clients/${client.id}`} className="text-slate-800 hover:text-indigo-700" onClick={(e) => e.stopPropagation()}>
                            {client.company}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {proj ? (
                          <Link to={`/projects/${proj.id}`} className="hover:text-indigo-700" onClick={(e) => e.stopPropagation()}>
                            {proj.name}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={invoiceStatusBadgeVariant(inv.status)}>{inv.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatCurrency(inv.amount)}</TableCell>
                      <TableCell className="text-slate-500">{formatLedgerDate(inv.dueDate)}</TableCell>
                      <TableCell className="text-slate-500">{formatLedgerDate(inv.sentDate)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DataRowMenu label={`Actions for ${inv.number}`} items={invoiceMenuItems(inv.id)} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {paidRows.length > 0 && status === 'all' && !q.trim() && (
        <section className="mt-6">
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-slate-400 hover:text-slate-600"
            onClick={() => setStatus('Paid')}
          >
            Recent paid <ChevronRight className="h-3 w-3" />
          </button>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {paidRows.map((inv) => (
              <li key={inv.id}>
                <button type="button" className="text-left hover:text-indigo-800" onClick={() => setDrawerInvoiceId(inv.id)}>
                  {inv.number} · {clientMap[inv.clientId]?.company ?? '—'} · {formatCurrency(inv.amount)}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

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
            {drawerPayments.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm text-amber-950">
                <span className="font-semibold">{formatCurrency(recordedOnDrawer)}</span> recorded on file
                {drawerInvoice.status !== 'Paid' && recordedOnDrawer > 0 && recordedOnDrawer < drawerInvoice.amount && (
                  <span className="block text-xs font-medium text-amber-900">
                    Partial payment — {formatCurrency(drawerInvoice.amount - recordedOnDrawer)} still open.
                  </span>
                )}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Amount</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{formatCurrency(drawerInvoice.amount)}</p>
                {drawerInvoice.status === 'Overdue' && daysPastDueDisplay(drawerInvoice.dueDate) != null && (
                  <p className="mt-2 text-sm font-bold text-red-700">{daysPastDueDisplay(drawerInvoice.dueDate)} days past terms</p>
                )}
                <p className="mt-2 text-sm text-slate-600">
                  Due {formatLedgerDate(drawerInvoice.dueDate)} · Sent {formatLedgerDate(drawerInvoice.sentDate)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Related</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{clientMap[drawerInvoice.clientId]?.company ?? '—'}</p>
                <p className="text-sm text-slate-600">
                  {drawerInvoice.projectId ? projectMap[drawerInvoice.projectId]?.name ?? '—' : 'No project linked'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {clientMap[drawerInvoice.clientId] && (
                    <Link to={`/clients/${drawerInvoice.clientId}`} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                      Client profile
                    </Link>
                  )}
                  {drawerInvoice.projectId && projectMap[drawerInvoice.projectId] && (
                    <Link to={`/projects/${drawerInvoice.projectId}`} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
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

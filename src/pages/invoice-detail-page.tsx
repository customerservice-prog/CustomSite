import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import { Download, Mail, RefreshCw } from 'lucide-react';
import { DetailPageLayout } from '@/components/layout/templates/detail-page-layout';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClassName } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { invoiceStatusBadgeVariant, messageStatusBadgeVariant, taskStatusBadgeVariant } from '@/lib/statuses';
import { hoursSinceIso } from '@/lib/system-intelligence';
import { useShell } from '@/context/shell-context';
import { useInvoice, useActivitiesFeed } from '@/store/hooks';
import { useAppStore } from '@/store/useAppStore';
import * as sel from '@/store/selectors';

export function InvoiceDetailPage() {
  const { invoiceId } = useParams();
  const { toast } = useShell();
  const invoice = useInvoice(invoiceId);
  const sendInvoice = useAppStore((s) => s.sendInvoice);
  const markInvoicePaid = useAppStore((s) => s.markInvoicePaid);
  const activitiesFeed = useActivitiesFeed();

  const client = useAppStore(useShallow((s) => (invoice ? s.clients[invoice.clientId] : undefined)));
  const project = useAppStore(
    useShallow((s) => (invoice?.projectId ? s.projects[invoice.projectId] : undefined))
  );
  const relatedTasks = useAppStore(
    useShallow((s) => (invoice?.projectId ? sel.getTasksForProject(s, invoice.projectId).slice(0, 6) : []))
  );
  const relatedThreads = useAppStore(
    useShallow((s) => (invoice ? sel.getThreadsForClient(s, invoice.clientId).slice(0, 4) : []))
  );

  const invoiceActivity = useMemo(() => {
    if (!invoice) return [];
    return activitiesFeed.filter((a) => a.entityKind === 'invoice' && a.entityId === invoice.id).slice(0, 8);
  }, [activitiesFeed, invoice]);

  if (!invoice) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">Invoice not found</h1>
        <Link to="/invoices" className={buttonClassName('primary', 'mt-6 inline-flex')}>
          Back to invoices
        </Link>
      </div>
    );
  }

  const lines = [
    { label: project ? `${project.name} — milestone` : 'Creative retainer', amount: Math.round(invoice.amount * 0.62) },
    { label: 'Hosting & support (prorated)', amount: Math.round(invoice.amount * 0.23) },
    {
      label: 'Adjustments',
      amount: invoice.amount - Math.round(invoice.amount * 0.62) - Math.round(invoice.amount * 0.23),
    },
  ];

  return (
    <DetailPageLayout
      backHref="/invoices"
      backLabel="Invoices"
      title={invoice.number}
      meta={
        <span>
          {client?.name} · Due {invoice.dueDate}
          {invoice.sentDate ? ` · Sent ${invoice.sentDate}` : ''}
        </span>
      }
      badge={<Badge variant={invoiceStatusBadgeVariant(invoice.status)}>{invoice.status}</Badge>}
      actions={
        <>
          <Button
            type="button"
            variant="secondary"
            className="gap-2"
            disabled={invoice.status === 'Void' || invoice.status === 'Paid'}
            onClick={() => {
              toast('Reminder queued — your client will see a payment nudge in their portal.', 'success');
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Remind
          </Button>
          <Button type="button" variant="secondary" className="gap-2" onClick={() => toast('PDF download (demo).', 'info')}>
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button
            type="button"
            className="gap-2"
            disabled={invoice.status === 'Void'}
            onClick={() => {
              if (invoice.status === 'Void') return;
              sendInvoice(invoice.id);
              toast(`${invoice.number} sent — client notified and delivery logged.`, 'success');
            }}
          >
            <Mail className="h-4 w-4" />
            Send
          </Button>
          {invoice.status !== 'Paid' && invoice.status !== 'Void' && (
            <Button type="button" variant="secondary" onClick={() => markInvoicePaid(invoice.id)}>
              Mark paid
            </Button>
          )}
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">CustomSite Studio LLC</p>
              <p className="mt-1 text-sm text-slate-500">123 Market St · Syracuse, NY</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">Bill to</p>
              <p className="text-sm text-slate-600">{client?.name}</p>
              <p className="text-sm text-slate-500">{client?.company}</p>
            </div>
          </div>
          <table className="mt-6 w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="pb-2">Description</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {lines.map((line) => (
                <tr key={line.label}>
                  <td className="py-3 text-slate-700">{line.label}</td>
                  <td className="py-3 text-right font-medium tabular-nums text-slate-900">${line.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="pt-4 text-right text-sm font-semibold text-slate-500">Total</td>
                <td className="pt-4 text-right text-lg font-bold tabular-nums text-slate-900">${invoice.amount.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-900">Payment status</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Status</dt>
                <dd>
                  <Badge variant={invoiceStatusBadgeVariant(invoice.status)}>{invoice.status}</Badge>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Project</dt>
                <dd className="font-medium text-slate-800">{project?.name ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Due</dt>
                <dd className="font-medium tabular-nums text-slate-800">{invoice.dueDate}</dd>
              </div>
            </dl>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-900">Related context</h3>
            <p className="mt-1 text-xs text-slate-500">Jump to the people, project, tasks, and threads tied to this bill.</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Client</dt>
                <dd>
                  {client ? (
                    <Link to={`/clients/${client.id}`} className="font-semibold text-indigo-700 hover:text-indigo-900">
                      {client.name}
                    </Link>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Project</dt>
                <dd>
                  {project ? (
                    <Link to={`/projects/${project.id}`} className="font-semibold text-indigo-700 hover:text-indigo-900">
                      {project.name}
                    </Link>
                  ) : (
                    <span className="text-slate-600">Not linked</span>
                  )}
                </dd>
              </div>
            </dl>
            {relatedTasks.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Tasks on this project</p>
                <ul className="mt-2 space-y-2">
                  {relatedTasks.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate font-medium text-slate-800">{t.title}</span>
                      <Badge variant={taskStatusBadgeVariant(t.status)} className="shrink-0 text-[10px]">
                        {t.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {relatedThreads.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Client messages</p>
                <ul className="mt-2 space-y-2">
                  {relatedThreads.map((th) => (
                    <li key={th.id}>
                      <Link to="/messages" className="block rounded-lg border border-slate-100 px-2 py-1.5 text-xs hover:bg-slate-50">
                        <span className="font-semibold text-slate-900">{th.participant}</span>
                        <span className="mt-0.5 block line-clamp-1 text-slate-500">{th.preview}</span>
                        <span className="mt-1 flex items-center justify-between gap-2">
                          <Badge variant={messageStatusBadgeVariant(th.status)} className="text-[10px]">
                            {th.status}
                          </Badge>
                          <span className="text-[10px] text-slate-400">Updated {hoursSinceIso(th.updatedAt)}h ago</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-900">Activity</h3>
            <ul className="mt-3 space-y-3">
              {(invoiceActivity.length ? invoiceActivity : activitiesFeed.slice(0, 4)).map((a) => (
                <li key={a.id} className="text-sm text-slate-700">
                  {a.title}
                  <span className="mt-0.5 block text-xs text-slate-400">{a.timeLabel}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </DetailPageLayout>
  );
}

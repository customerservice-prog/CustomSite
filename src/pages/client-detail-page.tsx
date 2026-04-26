import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import { Mail, Phone, Plus } from 'lucide-react';
import { DetailPageLayout } from '@/components/layout/templates/detail-page-layout';
import { Tabs } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClassName } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHeadCell, TableHeader, TableRow } from '@/components/ui/table';
import {
  clientStatusBadgeVariant,
  contractStatusBadgeVariant,
  invoiceStatusBadgeVariant,
  messageStatusBadgeVariant,
} from '@/lib/statuses';
import { useShell } from '@/context/shell-context';
import { useClient, useActivitiesFeed } from '@/store/hooks';
import { useAppStore } from '@/store/useAppStore';
import * as sel from '@/store/selectors';

export function ClientDetailPage() {
  const { clientId } = useParams();
  const { toast } = useShell();
  const client = useClient(clientId);
  const activitiesFeed = useActivitiesFeed();
  const openModal = useAppStore((s) => s.openModal);

  const clientProjects = useAppStore(
    useShallow((s) => (clientId ? sel.getProjectsForClient(s, clientId) : []))
  );
  const clientInvoices = useAppStore(
    useShallow((s) => (clientId ? sel.getInvoicesForClient(s, clientId) : []))
  );
  const clientThreads = useAppStore(
    useShallow((s) => (clientId ? sel.getThreadsForClient(s, clientId) : []))
  );
  const clientFiles = useAppStore(
    useShallow((s) => (clientId ? sel.getFilesForClient(s, clientId) : []))
  );
  const clientContracts = useAppStore(
    useShallow((s) => (clientId ? sel.getContractsForClient(s, clientId) : []))
  );
  const projectsMap = useAppStore(useShallow((s) => s.projects));

  const [noteDraft, setNoteDraft] = useState(
    'Retainer renewed verbally — send updated MSA before kickoff.'
  );

  const timeline = useMemo(() => {
    if (!client) return [];
    const pids = new Set(clientProjects.map((p) => p.id));
    return activitiesFeed.filter((a) => a.entityId === client.id || pids.has(a.entityId));
  }, [activitiesFeed, client, clientProjects]);

  if (!client) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">Client not found</h1>
        <p className="mt-2 text-sm text-slate-500">This id is not in the workspace store.</p>
        <Link to="/clients" className={buttonClassName('primary', 'mt-6 inline-flex')}>
          Back to clients
        </Link>
      </div>
    );
  }

  return (
    <DetailPageLayout
      backHref="/clients"
      backLabel="Clients"
      title={client.name}
      meta={
        <span>
          {client.company} · Last activity {client.lastActivityLabel}
        </span>
      }
      badge={<Badge variant={clientStatusBadgeVariant(client.status)}>{client.status}</Badge>}
      actions={
        <>
          <Button type="button" variant="secondary" className="gap-2">
            <Mail className="h-4 w-4" />
            Email
          </Button>
          <Button
            type="button"
            className="gap-2"
            onClick={() => {
              openModal('create-project');
              toast('Pick client in modal or we can pre-select via store next.', 'info');
            }}
          >
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </>
      }
    >
      <Tabs
        defaultId="overview"
        tabs={[
          {
            id: 'overview',
            label: 'Overview',
            content: (
              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="p-5 lg:col-span-1">
                  <h3 className="text-sm font-bold text-slate-900">Contact</h3>
                  <ul className="mt-4 space-y-3 text-sm">
                    <li className="flex items-start gap-2">
                      <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <a href={`mailto:${client.email}`} className="font-medium text-indigo-600 hover:text-indigo-800">
                        {client.email}
                      </a>
                    </li>
                    <li className="flex items-start gap-2">
                      <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <span className="text-slate-700">{client.phone}</span>
                    </li>
                  </ul>
                  <div className="mt-6 border-t border-slate-100 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Commercial</p>
                    <dl className="mt-2 space-y-2 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">Lifetime value</dt>
                        <dd className="font-semibold tabular-nums text-slate-900">${client.lifetimeValue.toLocaleString()}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">Open balance</dt>
                        <dd className="font-semibold tabular-nums text-slate-900">
                          {client.balance > 0 ? `$${client.balance.toLocaleString()}` : '—'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </Card>
                <Card className="p-5 lg:col-span-2">
                  <h3 className="text-sm font-bold text-slate-900">Contracts</h3>
                  <ul className="mt-4 space-y-3">
                    {clientContracts.length === 0 ? (
                      <p className="text-sm text-slate-500">No contracts on file for this client.</p>
                    ) : (
                      clientContracts.map((ct) => (
                        <li
                          key={ct.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">{ct.title}</p>
                            <p className="text-xs text-slate-500">Updated {ct.updatedLabel}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold tabular-nums text-slate-800">${ct.value.toLocaleString()}</span>
                            <Badge variant={contractStatusBadgeVariant(ct.status)}>{ct.status}</Badge>
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                </Card>
              </div>
            ),
          },
          {
            id: 'projects',
            label: 'Projects',
            content:
              clientProjects.length === 0 ? (
                <p className="text-sm text-slate-500">No active projects — convert a lead or create one.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHeadCell>Project</TableHeadCell>
                      <TableHeadCell>Status</TableHeadCell>
                      <TableHeadCell className="text-right">Budget</TableHeadCell>
                      <TableHeadCell className="text-right">Due</TableHeadCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientProjects.map((p) => (
                      <TableRow key={p.id} clickable>
                        <TableCell>
                          <Link to={`/projects/${p.id}`} className="font-semibold text-indigo-700 hover:text-indigo-900">
                            {p.name}
                          </Link>
                        </TableCell>
                        <TableCell>{p.status}</TableCell>
                        <TableCell className="text-right tabular-nums">${p.budget.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-slate-500">{p.due}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ),
          },
          {
            id: 'invoices',
            label: 'Invoices',
            content: (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeadCell>Invoice</TableHeadCell>
                    <TableHeadCell>Status</TableHeadCell>
                    <TableHeadCell className="text-right">Amount</TableHeadCell>
                    <TableHeadCell>Due</TableHeadCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientInvoices.map((inv) => (
                    <TableRow key={inv.id} clickable>
                      <TableCell>
                        <Link to={`/invoices/${inv.id}`} className="font-semibold text-indigo-700">
                          {inv.number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={invoiceStatusBadgeVariant(inv.status)}>{inv.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">${inv.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-slate-500">{inv.dueDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ),
          },
          {
            id: 'messages',
            label: 'Messages',
            content: (
              <ul className="space-y-2">
                {clientThreads.map((m) => (
                  <li key={m.id} className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">{m.participant}</p>
                      <Badge variant={messageStatusBadgeVariant(m.status)}>{m.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{m.preview}</p>
                    <Link to="/messages" className="mt-2 inline-block text-xs font-semibold text-indigo-600">
                      Open in inbox →
                    </Link>
                  </li>
                ))}
              </ul>
            ),
          },
          {
            id: 'files',
            label: 'Files',
            content:
              clientFiles.length === 0 ? (
                <p className="text-sm text-slate-500">No files yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHeadCell>Name</TableHeadCell>
                      <TableHeadCell>Project</TableHeadCell>
                      <TableHeadCell>Uploaded</TableHeadCell>
                      <TableHeadCell className="text-right">Size</TableHeadCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientFiles.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium text-slate-900">{f.name}</TableCell>
                        <TableCell>{projectsMap[f.projectId]?.name ?? '—'}</TableCell>
                        <TableCell className="text-slate-500">{f.uploaded}</TableCell>
                        <TableCell className="text-right text-slate-500">{f.size}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ),
          },
          {
            id: 'notes',
            label: 'Notes',
            content: (
              <Card className="p-5">
                <label className="text-sm font-bold text-slate-900" htmlFor="client-notes">
                  Internal notes
                </label>
                <p className="mt-1 text-xs text-slate-500">Visible to your team only — not shared on the client portal.</p>
                <Textarea id="client-notes" className="mt-4 min-h-[140px]" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} />
                <div className="mt-4 flex justify-end">
                  <Button type="button" onClick={() => toast('Notes saved (local demo).', 'success')}>
                    Save notes
                  </Button>
                </div>
              </Card>
            ),
          },
          {
            id: 'activity',
            label: 'Activity',
            content: (
              <Card className="p-5">
                <ul className="space-y-4">
                  {(timeline.length ? timeline : activitiesFeed.slice(0, 5)).map((a) => (
                    <li key={a.id} className="relative border-l-2 border-indigo-100 pl-4">
                      <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-indigo-500" />
                      <p className="text-sm font-medium text-slate-800">{a.title}</p>
                      <p className="text-xs text-slate-400">{a.timeLabel}</p>
                    </li>
                  ))}
                </ul>
              </Card>
            ),
          },
        ]}
      />
    </DetailPageLayout>
  );
}

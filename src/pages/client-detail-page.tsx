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
  clientHealthBadgeVariant,
  clientStatusBadgeVariant,
  contractStatusBadgeVariant,
  invoiceStatusBadgeVariant,
  messageStatusBadgeVariant,
} from '@/lib/statuses';
import { clientHealthLabel, clientHealthLevel, daysSinceIso } from '@/lib/system-intelligence';
import { useShell } from '@/context/shell-context';
import { useClient, useClientActivityFeed } from '@/store/hooks';
import { useAppStore } from '@/store/useAppStore';
import * as sel from '@/store/selectors';
import { CONVERSION_WORKSPACE_LABEL } from '@/lib/offer-positioning';

export function ClientDetailPage() {
  const { clientId } = useParams();
  const { toast } = useShell();
  const client = useClient(clientId);
  const clientActivity = useClientActivityFeed(clientId);
  const openModal = useAppStore((s) => s.openModal);
  const setSelectedClientId = useAppStore((s) => s.setSelectedClientId);

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
  const store = useAppStore((s) => s);

  const [noteDraft, setNoteDraft] = useState(
    'Retainer renewed verbally — send updated MSA before kickoff.'
  );

  const activeProjects = useMemo(() => clientProjects.filter((p) => p.status !== 'Live'), [clientProjects]);
  const pastProjects = useMemo(() => clientProjects.filter((p) => p.status === 'Live'), [clientProjects]);
  const pendingContracts = useMemo(
    () => clientContracts.filter((c) => c.status === 'Sent' || c.status === 'Viewed'),
    [clientContracts]
  );

  if (!client) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">Client not found</h1>
        <p className="mt-2 text-sm text-slate-500">We could not find this client in your agency records.</p>
        <Link to="/clients" className={buttonClassName('primary', 'mt-6 inline-flex')}>
          Back to clients
        </Link>
      </div>
    );
  }

  const clientHealth = clientHealthLevel(store, client.id);

  return (
    <DetailPageLayout
      backHref="/clients"
      backLabel="Clients"
      title={client.name}
      meta={
        <span>
          {client.company} · Last touch {client.lastActivityLabel} · Paid revenue (invoices) ${client.lifetimeValue.toLocaleString()}
        </span>
      }
      badge={
        <span className="flex flex-wrap items-center gap-2">
          <Badge variant={clientStatusBadgeVariant(client.status)}>{client.status}</Badge>
          <Badge variant={clientHealthBadgeVariant(clientHealth)}>{clientHealthLabel(clientHealth)}</Badge>
        </span>
      }
      sidebar={
        <>
          <Card className="p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Account pulse</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li className="flex justify-between gap-2">
                <span>Open balance</span>
                <span className="font-bold tabular-nums text-slate-900">
                  {client.balance > 0 ? `$${client.balance.toLocaleString()}` : '—'}
                </span>
              </li>
              <li className="flex justify-between gap-2">
                <span>Active projects</span>
                <span className="font-semibold">{activeProjects.length}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span>Delivered</span>
                <span className="font-semibold">{pastProjects.length}</span>
              </li>
              {pendingContracts.length > 0 && (
                <li className="text-amber-800">
                  {pendingContracts.length} contract{pendingContracts.length === 1 ? '' : 's'} awaiting signature
                </li>
              )}
            </ul>
            {client.balance > 0 && (
              <Link to="/invoices" className={`${buttonClassName('secondary', 'mt-4 w-full justify-center text-xs')}`}>
                Collect balance
              </Link>
            )}
          </Card>
          <Card className="border-purple-100 bg-purple-50/30 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-purple-900">Client portal &amp; their sites</p>
            <p className="mt-2 text-xs text-slate-700">
              Clients see progress, files, invoices, and messages in one place — tied to the projects you ship for them.
            </p>
            {clientProjects.filter((p) => p.deliveryFocus === 'client_site').map((p) => (
              <div key={p.id} className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-purple-100 bg-white/80 px-2 py-2 text-xs">
                <span className="font-semibold text-slate-900">{p.name}</span>
                <Badge variant={p.siteStatus === 'live' ? 'success' : p.siteStatus === 'review' ? 'info' : 'warning'}>
                  {p.siteStatus ?? 'draft'}
                </Badge>
                <Link to={`/projects/${p.id}/site`} className="font-semibold text-violet-800 underline">
                  {CONVERSION_WORKSPACE_LABEL} →
                </Link>
              </div>
            ))}
            {clientProjects.every((p) => p.deliveryFocus !== 'client_site') && (
              <p className="mt-2 text-xs text-slate-500">No marketing-site projects yet — open one when you sell a site build.</p>
            )}
          </Card>
          <Card className="p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">What to do next</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-slate-600">
              {client.balance > 0 && (
                <li>
                  Outstanding balance ${client.balance.toLocaleString()} — collect or confirm payment timing
                </li>
              )}
              {clientThreads.some((t) => t.status === 'Unread') && <li>Reply to an unread thread in Messages</li>}
              {clientInvoices.some((i) => i.status === 'Overdue') && <li>Follow up on an overdue invoice</li>}
              {daysSinceIso(client.updatedAt) >= 10 && <li>No account activity in 10+ days — schedule a check-in</li>}
              {activeProjects.length === 0 && <li>Open a project so delivery has a home</li>}
              {!clientThreads.some((t) => t.status === 'Unread') &&
                !clientInvoices.some((i) => i.status === 'Overdue') &&
                activeProjects.length > 0 &&
                daysSinceIso(client.updatedAt) < 10 && <li>Review milestones and portal previews</li>}
            </ul>
          </Card>
        </>
      }
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
              if (client) setSelectedClientId(client.id);
              openModal('create-project');
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
                <Card className="border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
                  <p className="font-semibold text-slate-800">Every client record needs at least one project</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Projects hold tasks, files, messages, and billing. Create one to start delivery — or win a pipeline deal to auto-generate a
                    kickoff.
                  </p>
                  <Button
                    type="button"
                    className="mt-4 gap-2"
                    onClick={() => {
                      setSelectedClientId(client.id);
                      openModal('create-project');
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    New project
                  </Button>
                </Card>
              ) : (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Active delivery</h3>
                    {activeProjects.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-500">No active builds — only delivered work below.</p>
                    ) : (
                      <Table className="mt-3">
                        <TableHeader>
                          <TableRow>
                            <TableHeadCell>Project</TableHeadCell>
                            <TableHeadCell>Status</TableHeadCell>
                            <TableHeadCell className="text-right">Budget</TableHeadCell>
                            <TableHeadCell className="text-right">Due</TableHeadCell>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeProjects.map((p) => (
                            <TableRow key={p.id} clickable>
                              <TableCell>
                                <Link to={`/projects/${p.id}`} className="font-semibold text-indigo-700 hover:text-indigo-900">
                                  {p.name}
                                </Link>
                              </TableCell>
                              <TableCell>
                                <Badge variant="neutral">{p.status}</Badge>
                              </TableCell>
                              <TableCell className="text-right tabular-nums">${p.budget.toLocaleString()}</TableCell>
                              <TableCell className="text-right text-slate-500">{p.due}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                  {pastProjects.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Delivered</h3>
                      <Table className="mt-3">
                        <TableHeader>
                          <TableRow>
                            <TableHeadCell>Project</TableHeadCell>
                            <TableHeadCell>Status</TableHeadCell>
                            <TableHeadCell className="text-right">Budget</TableHeadCell>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pastProjects.map((p) => (
                            <TableRow key={p.id} clickable>
                              <TableCell>
                                <Link to={`/projects/${p.id}`} className="font-semibold text-indigo-700 hover:text-indigo-900">
                                  {p.name}
                                </Link>
                              </TableCell>
                              <TableCell>Live</TableCell>
                              <TableCell className="text-right tabular-nums">${p.budget.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
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
                {clientActivity.length === 0 ? (
                  <p className="text-sm text-slate-500">Activity will appear as invoices, tasks, and messages move on this account.</p>
                ) : (
                  <ul className="space-y-4">
                    {clientActivity.slice(0, 25).map((a) => (
                      <li key={a.id} className="relative border-l-2 border-indigo-100 pl-4">
                        <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-indigo-500" />
                        <p className="text-sm font-medium text-slate-800">{a.title}</p>
                        <p className="text-xs text-slate-400">{a.timeLabel}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            ),
          },
        ]}
      />
    </DetailPageLayout>
  );
}

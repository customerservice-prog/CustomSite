import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Filter, Plus, Search } from 'lucide-react';
import { KanbanPageLayout } from '@/components/layout/templates/kanban-page-layout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { PIPELINE_STAGES } from '@/lib/statuses';
import { useAppStore } from '@/store/useAppStore';
import { useLeads } from '@/store/hooks';
import { useShallow } from 'zustand/shallow';

export function PipelinePage() {
  const leads = useLeads();
  const addLead = useAppStore((s) => s.addLead);
  const advanceLeadStage = useAppStore((s) => s.advanceLeadStage);
  const convertWonLead = useAppStore((s) => s.convertWonLead);
  const users = useAppStore(useShallow((s) => s.users));
  const toast = useAppStore((s) => s.toast);
  const [q, setQ] = useState('');
  const [ownerId, setOwnerId] = useState<'all' | 'u1' | 'u2' | 'u3'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formValue, setFormValue] = useState('12000');
  const [formOwner, setFormOwner] = useState<'u1' | 'u2' | 'u3'>('u1');

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const match =
        !q.trim() ||
        l.name.toLowerCase().includes(q.toLowerCase()) ||
        l.company.toLowerCase().includes(q.toLowerCase());
      const own = ownerId === 'all' || l.ownerId === ownerId;
      return match && own;
    });
  }, [leads, q, ownerId]);

  function addLeadFromModal() {
    if (!formName.trim() || !formCompany.trim()) {
      toast('Name and company are required.', 'error');
      return;
    }
    addLead({
      name: formName.trim(),
      company: formCompany.trim(),
      value: Math.max(0, Number(formValue) || 0),
      ownerId: formOwner,
    });
    setModalOpen(false);
    setFormName('');
    setFormCompany('');
    setFormValue('12000');
  }

  return (
    <>
      <KanbanPageLayout
        header={
          <PageHeader
            title="Pipeline"
            description="Qualify opportunities, move stages with confidence, and convert wins without losing context."
            actions={
              <Button type="button" className="gap-2" onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4" />
                Add lead
              </Button>
            }
          />
        }
        toolbar={
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="relative min-w-[200px] max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search leads or companies…"
                className="pl-10"
                aria-label="Search pipeline"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 text-slate-500">
                <Filter className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Owner</span>
              </div>
              <Select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value as typeof ownerId)}
                className="w-[180px]"
                aria-label="Filter by owner"
              >
                <option value="all">All owners</option>
                <option value="u1">Jordan Blake</option>
                <option value="u2">Alex Chen</option>
                <option value="u3">Riley Morgan</option>
              </Select>
            </div>
          </div>
        }
        board={
          <div className="flex min-w-max gap-4 pb-2">
            {PIPELINE_STAGES.map((stage) => {
              const col = filtered.filter((l) => l.stage === stage);
              const total = col.reduce((s, l) => s + l.value, 0);
              return (
                <div key={stage} className="flex w-[300px] shrink-0 flex-col rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                  <div className="mb-3 flex items-start justify-between gap-2 px-1">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{stage}</h3>
                      <p className="text-xs text-slate-500">
                        {col.length} deal{col.length === 1 ? '' : 's'} · ${(total / 1000).toFixed(1)}k
                      </p>
                    </div>
                    <Badge variant="neutral" className="shrink-0 tabular-nums">
                      {col.length}
                    </Badge>
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    {col.length === 0 ? (
                      <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 py-10 text-center">
                        <p className="text-xs font-medium text-slate-400">Nothing in this stage</p>
                        <p className="mt-1 max-w-[200px] text-[11px] text-slate-400">New leads land in “New Lead” from the modal.</p>
                      </div>
                    ) : (
                      col.map((l) => {
                        const owner = users[l.ownerId];
                        return (
                          <Card
                            key={l.id}
                            className="cursor-pointer border-slate-200/80 p-3.5 shadow-sm transition duration-150 hover:border-indigo-200 hover:shadow-md active:scale-[0.99]"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && toast(`Lead: ${l.name}`, 'info')}
                            onClick={() => toast(`Open lead detail — ${l.name} (wire route)`, 'info')}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-slate-900">{l.name}</p>
                              <Badge
                                variant={stage === 'Lost' ? 'neutral' : stage === 'Won' ? 'success' : 'info'}
                                className="shrink-0 text-[10px]"
                              >
                                {stage === 'New Lead'
                                  ? 'New'
                                  : stage === 'Proposal Sent'
                                    ? 'Proposal'
                                    : stage === 'Contract Sent'
                                      ? 'Contract'
                                      : stage}
                              </Badge>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500">{l.company}</p>
                            <p className="mt-2 text-sm font-bold tabular-nums text-slate-800">${l.value.toLocaleString()}</p>
                            <p className="mt-1 text-xs font-medium text-indigo-700">{l.nextAction}</p>
                            <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                              <div className="flex items-center gap-2">
                                <Avatar name={owner?.name ?? '?'} size="sm" />
                                <span className="text-xs font-medium text-slate-600">{owner?.name}</span>
                              </div>
                              <span className="text-[10px] font-medium text-slate-400">{l.lastActivityLabel}</span>
                            </div>
                            {stage !== 'Won' && stage !== 'Lost' && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="flex-1 px-2 py-1.5 text-[11px]"
                                  onClick={() => advanceLeadStage(l.id)}
                                >
                                  Advance stage
                                </Button>
                                <Button
                                  type="button"
                                  className="flex-1 px-2 py-1.5 text-[11px]"
                                  onClick={() => convertWonLead(l.id)}
                                >
                                  Mark won
                                </Button>
                              </div>
                            )}
                            {l.convertedClientId && (
                              <p className="mt-2 text-[11px] font-semibold text-emerald-700">
                                Client created —{' '}
                                <Link to={`/clients/${l.convertedClientId}`} className="underline">
                                  open record
                                </Link>
                              </p>
                            )}
                          </Card>
                        );
                      })
                    )}
                  </div>
                  <div className="mt-3 border-t border-slate-200/80 pt-2 text-center text-[11px] font-semibold text-slate-500">
                    Column total · ${(total / 1000).toFixed(1)}k
                  </div>
                </div>
              );
            })}
          </div>
        }
      />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add lead">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="lead-name">
              Name
            </label>
            <Input id="lead-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Contact name" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="lead-co">
              Company
            </label>
            <Input id="lead-co" value={formCompany} onChange={(e) => setFormCompany(e.target.value)} placeholder="Company" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="lead-val">
              Estimated value
            </label>
            <Input id="lead-val" inputMode="numeric" value={formValue} onChange={(e) => setFormValue(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="lead-owner">
              Owner
            </label>
            <Select id="lead-owner" value={formOwner} onChange={(e) => setFormOwner(e.target.value as typeof formOwner)}>
              <option value="u1">Jordan Blake</option>
              <option value="u2">Alex Chen</option>
              <option value="u3">Riley Morgan</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={addLeadFromModal}>
              Save lead
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

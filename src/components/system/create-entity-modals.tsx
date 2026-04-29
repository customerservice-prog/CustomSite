import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { useClients, useInvoices, useProjects } from '@/store/hooks';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { PROJECT_TEMPLATES, getProjectTemplate } from '@/lib/project-templates';
import { SERVICE_PACKAGES } from '@/lib/service-offer';
import type { ServicePackageId, SiteBuildArchetypeId } from '@/lib/types/entities';
import { SITE_BUILD_ARCHETYPE_OPTIONS } from '@/lib/site-builder/archetypes';

export function CreateEntityModals() {
  const navigate = useNavigate();
  const activeModal = useAppStore((s) => s.ui.activeModal);
  const selectedClientId = useAppStore((s) => s.ui.selectedClientId);
  const selectedProjectId = useAppStore((s) => s.ui.selectedProjectId);
  const closeModal = useAppStore((s) => s.closeModal);
  const addClient = useAppStore((s) => s.addClient);
  const addProject = useAppStore((s) => s.addProject);
  const addInvoice = useAppStore((s) => s.addInvoice);
  const addTask = useAppStore((s) => s.addTask);
  const toast = useAppStore((s) => s.toast);
  const clients = useClients();
  const projects = useProjects();
  const invoices = useInvoices();
  const currentUserId = useAppStore((s) => s.currentUserId);

  function averagePaidForClient(clientId: string): number {
    const paid = invoices.filter((i) => i.clientId === clientId && i.status === 'Paid');
    if (!paid.length) return 2500;
    return Math.round(paid.reduce((s, i) => s + i.amount, 0) / paid.length);
  }

  const [clientForm, setClientForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    ownerId: 'u1' as string,
  });
  const [projectForm, setProjectForm] = useState({
    name: '',
    clientId: '',
    budget: '24000',
    due: 'Jun 30',
    ownerId: 'u1' as string,
    templateId: '' as string,
    servicePackage: '' as '' | ServicePackageId,
    siteBuildArchetype: '' as '' | SiteBuildArchetypeId,
  });
  const [invoiceForm, setInvoiceForm] = useState({
    clientId: '',
    projectId: '' as string,
    amount: '2500',
    dueDate: 'May 15',
  });
  const [taskForm, setTaskForm] = useState({
    projectId: '',
    title: '',
    description: '',
    due: 'Tomorrow',
    assigneeId: 'u1' as string,
  });

  const clientOptions = useMemo(() => clients.map((c) => ({ id: c.id, label: `${c.name} · ${c.company}` })), [clients]);

  const projectsForClient = useMemo(() => {
    if (!invoiceForm.clientId) return [];
    return projects.filter((p) => p.clientId === invoiceForm.clientId);
  }, [projects, invoiceForm.clientId]);

  useEffect(() => {
    if (activeModal === 'create-project' && selectedClientId) {
      setProjectForm((f) => ({ ...f, clientId: selectedClientId }));
    }
  }, [activeModal, selectedClientId]);

  useEffect(() => {
    if (activeModal === 'create-task' && selectedProjectId) {
      const proj = projects.find((p) => p.id === selectedProjectId);
      setTaskForm((f) => ({
        ...f,
        projectId: selectedProjectId,
        due: proj?.due ?? f.due,
      }));
    }
  }, [activeModal, selectedProjectId, projects]);

  if (activeModal === 'create-client') {
    return (
      <Modal open={true} title="Create client" onClose={closeModal}>
        <div className="space-y-3">
          <Field label="Name">
            <Input value={clientForm.name} onChange={(e) => setClientForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Company">
            <Input value={clientForm.company} onChange={(e) => setClientForm((f) => ({ ...f, company: e.target.value }))} />
          </Field>
          <Field label="Email">
            <Input type="email" value={clientForm.email} onChange={(e) => setClientForm((f) => ({ ...f, email: e.target.value }))} />
          </Field>
          <Field label="Phone">
            <Input value={clientForm.phone} onChange={(e) => setClientForm((f) => ({ ...f, phone: e.target.value }))} />
          </Field>
          <Field label="Owner">
            <Select value={clientForm.ownerId} onChange={(e) => setClientForm((f) => ({ ...f, ownerId: e.target.value }))}>
              <option value="u1">Jordan Blake</option>
              <option value="u2">Alex Chen</option>
              <option value="u3">Riley Morgan</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!clientForm.name.trim() || !clientForm.company.trim() || !clientForm.email.trim()) return;
                const newId = addClient({
                  name: clientForm.name,
                  company: clientForm.company,
                  email: clientForm.email,
                  phone: clientForm.phone,
                  ownerId: clientForm.ownerId,
                });
                setClientForm({ name: '', company: '', email: '', phone: '', ownerId: currentUserId });
                closeModal();
                if (newId) navigate(`/clients/${newId}`);
              }}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  if (activeModal === 'create-project') {
    return (
      <Modal open={true} title="Create project" onClose={closeModal}>
        <div className="space-y-3">
          <Field label="Client">
            <Select value={projectForm.clientId} onChange={(e) => setProjectForm((f) => ({ ...f, clientId: e.target.value }))}>
              <option value="">Select client…</option>
              {clientOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Package sold (optional)">
            <Select
              value={projectForm.servicePackage}
              onChange={(e) =>
                setProjectForm((f) => ({
                  ...f,
                  servicePackage: e.target.value as '' | ServicePackageId,
                }))
              }
            >
              <option value="">Not set</option>
              {SERVICE_PACKAGES.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} — {pkg.headline}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Start from template">
            <Select
              value={projectForm.templateId}
              onChange={(e) => {
                const v = e.target.value;
                const tmpl = v ? getProjectTemplate(v) : undefined;
                setProjectForm((f) => ({
                  ...f,
                  templateId: v,
                  budget: tmpl ? String(tmpl.defaultBudget) : f.budget,
                  due: tmpl ? tmpl.defaultDue : f.due,
                  siteBuildArchetype:
                    tmpl?.deliveryFocus === 'client_site' ? f.siteBuildArchetype || 'service_business' : '',
                }));
              }}
            >
              <option value="">Blank (minimal starter tasks)</option>
              {PROJECT_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Project name">
            <Input value={projectForm.name} onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          {projectForm.templateId && (
            <p className="text-xs text-slate-500">
              {getProjectTemplate(projectForm.templateId)?.description ?? ''} Leave the name empty to auto-name from the template.
            </p>
          )}
          {getProjectTemplate(projectForm.templateId)?.deliveryFocus === 'client_site' && (
            <Field label="What type of site are we building?">
              <Select
                value={projectForm.siteBuildArchetype || 'service_business'}
                onChange={(e) =>
                  setProjectForm((f) => ({
                    ...f,
                    siteBuildArchetype: e.target.value as SiteBuildArchetypeId,
                  }))
                }
              >
                {SITE_BUILD_ARCHETYPE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                Sets default homepage structure, starter copy, and section templates in the builder.
              </p>
            </Field>
          )}
          <Field label="Budget (USD)">
            <Input
              inputMode="numeric"
              value={projectForm.budget}
              onChange={(e) => setProjectForm((f) => ({ ...f, budget: e.target.value }))}
            />
          </Field>
          <Field label="Due">
            <Input value={projectForm.due} onChange={(e) => setProjectForm((f) => ({ ...f, due: e.target.value }))} />
          </Field>
          <Field label="Owner">
            <Select value={projectForm.ownerId} onChange={(e) => setProjectForm((f) => ({ ...f, ownerId: e.target.value }))}>
              <option value="u1">Jordan Blake</option>
              <option value="u2">Alex Chen</option>
              <option value="u3">Riley Morgan</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!projectForm.clientId) return;
                if (!projectForm.templateId && !projectForm.name.trim()) return;
                const tmpl = projectForm.templateId ? getProjectTemplate(projectForm.templateId) : undefined;
                const pid = addProject({
                  name: projectForm.name,
                  clientId: projectForm.clientId,
                  budget: Math.max(0, Number(projectForm.budget) || 0),
                  due: projectForm.due,
                  ownerId: projectForm.ownerId,
                  templateId: projectForm.templateId || undefined,
                  servicePackage: projectForm.servicePackage || undefined,
                  siteBuildArchetype:
                    tmpl?.deliveryFocus === 'client_site'
                      ? projectForm.siteBuildArchetype || 'service_business'
                      : undefined,
                });
                if (!pid) return;
                setProjectForm({
                  name: '',
                  clientId: '',
                  budget: '24000',
                  due: 'Jun 30',
                  ownerId: currentUserId,
                  templateId: '',
                  servicePackage: '',
                  siteBuildArchetype: '',
                });
                closeModal();
                const created = useAppStore.getState().projects[pid];
                if (created?.deliveryFocus === 'client_site') {
                  navigate(`/projects/${pid}/site`);
                } else {
                  navigate(`/projects/${pid}`);
                }
              }}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  if (activeModal === 'create-invoice') {
    return (
      <Modal open={true} title="Create invoice" onClose={closeModal}>
        <div className="space-y-3">
          <Field label="Client">
            <Select
              value={invoiceForm.clientId}
              onChange={(e) => {
                const cid = e.target.value;
                const avg = cid ? averagePaidForClient(cid) : 2500;
                setInvoiceForm((f) => ({ ...f, clientId: cid, projectId: '', amount: String(avg) }));
              }}
            >
              <option value="">Select client…</option>
              {clientOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Project (optional)">
            <Select
              value={invoiceForm.projectId}
              onChange={(e) => {
                const pid = e.target.value;
                const proj = projects.find((p) => p.id === pid);
                setInvoiceForm((f) => ({
                  ...f,
                  projectId: pid,
                  dueDate: proj?.due ?? f.dueDate,
                }));
              }}
              disabled={!invoiceForm.clientId}
            >
              <option value="">None</option>
              {projectsForClient.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Amount">
            <Input
              inputMode="numeric"
              value={invoiceForm.amount}
              onChange={(e) => setInvoiceForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </Field>
          <Field label="Due date">
            <Input value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm((f) => ({ ...f, dueDate: e.target.value }))} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!invoiceForm.clientId) {
                  toast('Client is required.', 'error');
                  return;
                }
                const invId = addInvoice({
                  clientId: invoiceForm.clientId,
                  projectId: invoiceForm.projectId || null,
                  amount: Math.max(0, Number(invoiceForm.amount) || 0),
                  dueDate: invoiceForm.dueDate,
                });
                setInvoiceForm({ clientId: '', projectId: '', amount: '2500', dueDate: 'May 15' });
                closeModal();
                if (invId) navigate(`/invoices/${invId}`);
              }}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  if (activeModal === 'create-task') {
    return (
      <Modal open title="Create task" onClose={closeModal}>
        <div className="space-y-3">
          <Field label="Project">
            <Select
              value={taskForm.projectId}
              onChange={(e) => {
                const pid = e.target.value;
                const proj = projects.find((p) => p.id === pid);
                setTaskForm((f) => ({ ...f, projectId: pid, due: proj?.due ?? f.due }));
              }}
            >
              <option value="">Select project…</option>
              {projects.map((p) => {
                const c = clients.find((x) => x.id === p.clientId);
                return (
                  <option key={p.id} value={p.id}>
                    {p.name} ({c?.company ?? '—'})
                  </option>
                );
              })}
            </Select>
          </Field>
          <Field label="Title">
            <Input value={taskForm.title} onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))} />
          </Field>
          <Field label="Description / notes">
            <Textarea
              value={taskForm.description}
              onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
              rows={4}
              className="min-h-[100px]"
              placeholder="Brief, blockers, client context, links…"
            />
          </Field>
          <Field label="Due">
            <Input value={taskForm.due} onChange={(e) => setTaskForm((f) => ({ ...f, due: e.target.value }))} />
          </Field>
          <Field label="Assignee">
            <Select value={taskForm.assigneeId} onChange={(e) => setTaskForm((f) => ({ ...f, assigneeId: e.target.value }))}>
              <option value="u1">Jordan Blake</option>
              <option value="u2">Alex Chen</option>
              <option value="u3">Riley Morgan</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!taskForm.projectId || !taskForm.title.trim()) return;
                const tid = addTask({
                  projectId: taskForm.projectId,
                  title: taskForm.title,
                  description: taskForm.description.trim() || undefined,
                  due: taskForm.due,
                  assigneeId: taskForm.assigneeId,
                });
                const projId = taskForm.projectId;
                setTaskForm({ projectId: '', title: '', description: '', due: 'Tomorrow', assigneeId: currentUserId });
                closeModal();
                if (tid) navigate(`/projects/${projId}`);
              }}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return null;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-600">{label}</label>
      {children}
    </div>
  );
}

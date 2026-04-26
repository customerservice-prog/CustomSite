import { useAppStore } from '@/store/useAppStore';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useClients, useInvoices, useProjects } from '@/store/hooks';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

export function CreateEntityModals() {
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
                addClient({
                  name: clientForm.name,
                  company: clientForm.company,
                  email: clientForm.email,
                  phone: clientForm.phone,
                  ownerId: clientForm.ownerId,
                });
                setClientForm({ name: '', company: '', email: '', phone: '', ownerId: currentUserId });
                closeModal();
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
          <Field label="Project name">
            <Input value={projectForm.name} onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
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
                if (!projectForm.clientId || !projectForm.name.trim()) return;
                const pid = addProject({
                  name: projectForm.name,
                  clientId: projectForm.clientId,
                  budget: Math.max(0, Number(projectForm.budget) || 0),
                  due: projectForm.due,
                  ownerId: projectForm.ownerId,
                });
                if (!pid) return;
                setProjectForm({ name: '', clientId: '', budget: '24000', due: 'Jun 30', ownerId: currentUserId });
                closeModal();
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
                addInvoice({
                  clientId: invoiceForm.clientId,
                  projectId: invoiceForm.projectId || null,
                  amount: Math.max(0, Number(invoiceForm.amount) || 0),
                  dueDate: invoiceForm.dueDate,
                });
                setInvoiceForm({ clientId: '', projectId: '', amount: '2500', dueDate: 'May 15' });
                closeModal();
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
                addTask({
                  projectId: taskForm.projectId,
                  title: taskForm.title,
                  due: taskForm.due,
                  assigneeId: taskForm.assigneeId,
                });
                setTaskForm({ projectId: '', title: '', due: 'Tomorrow', assigneeId: currentUserId });
                closeModal();
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

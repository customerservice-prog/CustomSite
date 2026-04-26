import { useAppStore } from '@/store/useAppStore';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useClients, useProjects } from '@/store/hooks';
import { useMemo, useState, type ReactNode } from 'react';

export function CreateEntityModals() {
  const activeModal = useAppStore((s) => s.ui.activeModal);
  const closeModal = useAppStore((s) => s.closeModal);
  const addClient = useAppStore((s) => s.addClient);
  const addProject = useAppStore((s) => s.addProject);
  const addInvoice = useAppStore((s) => s.addInvoice);
  const addTask = useAppStore((s) => s.addTask);
  const clients = useClients();
  const projects = useProjects();
  const currentUserId = useAppStore((s) => s.currentUserId);

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
                addProject({
                  name: projectForm.name,
                  clientId: projectForm.clientId,
                  budget: Math.max(0, Number(projectForm.budget) || 0),
                  due: projectForm.due,
                  ownerId: projectForm.ownerId,
                });
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
              onChange={(e) => setInvoiceForm((f) => ({ ...f, clientId: e.target.value, projectId: '' }))}
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
              onChange={(e) => setInvoiceForm((f) => ({ ...f, projectId: e.target.value }))}
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
                if (!invoiceForm.clientId) return;
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
            <Select value={taskForm.projectId} onChange={(e) => setTaskForm((f) => ({ ...f, projectId: e.target.value }))}>
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

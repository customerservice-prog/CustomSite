import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useAppStore } from '@/store/useAppStore';
import { useClients, useInvoices, useProjects } from '@/store/hooks';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-slate-600">{label}</p>
      {children}
    </div>
  );
}

export function WorkspaceModals() {
  const activeModal = useAppStore((s) => s.ui.activeModal);
  const closeModal = useAppStore((s) => s.closeModal);
  const addPayment = useAppStore((s) => s.addPayment);
  const addFile = useAppStore((s) => s.addFile);
  const addContract = useAppStore((s) => s.addContract);
  const addDeadline = useAppStore((s) => s.addDeadline);
  const toast = useAppStore((s) => s.toast);

  const clients = useClients();
  const projects = useProjects();
  const invoices = useInvoices();

  const [payInvoiceId, setPayInvoiceId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('ACH');

  const [fileName, setFileName] = useState('');
  const [fileClientId, setFileClientId] = useState('');
  const [fileProjectId, setFileProjectId] = useState('');
  const [fileVis, setFileVis] = useState<'Internal' | 'Client-visible'>('Internal');

  const [ctClientId, setCtClientId] = useState('');
  const [ctProjectId, setCtProjectId] = useState('');
  const [ctTitle, setCtTitle] = useState('');
  const [ctValue, setCtValue] = useState('15000');

  const [evTitle, setEvTitle] = useState('');
  const [evWhen, setEvWhen] = useState('');
  const [evType, setEvType] = useState<'meeting' | 'task' | 'invoice' | 'contract'>('meeting');

  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    if (activeModal === 'record-payment' && invoices[0] && !payInvoiceId) setPayInvoiceId(invoices[0].id);
  }, [activeModal, invoices, payInvoiceId]);

  const projectsForClient = useMemo(() => {
    if (!fileClientId) return projects;
    return projects.filter((p) => p.clientId === fileClientId);
  }, [projects, fileClientId]);

  const ctProjects = useMemo(() => {
    if (!ctClientId) return projects;
    return projects.filter((p) => p.clientId === ctClientId);
  }, [projects, ctClientId]);

  if (!activeModal || ['create-client', 'create-project', 'create-invoice', 'create-task'].includes(activeModal)) {
    return null;
  }

  if (activeModal === 'record-payment') {
    return (
      <Modal open title="Record payment" onClose={closeModal}>
        <div className="space-y-3">
          <Field label="Invoice">
            <Select value={payInvoiceId} onChange={(e) => setPayInvoiceId(e.target.value)}>
              {invoices.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.number} · ${i.amount.toLocaleString()}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Amount (USD)">
            <Input inputMode="decimal" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="4200" />
          </Field>
          <Field label="Method">
            <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
              <option value="ACH">ACH</option>
              <option value="Card">Card</option>
              <option value="Wire">Wire</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                const amt = Number(payAmount.replace(/[^0-9.]/g, ''));
                if (!payInvoiceId || !Number.isFinite(amt) || amt <= 0) {
                  toast('Enter a valid amount.', 'error');
                  return;
                }
                addPayment({ invoiceId: payInvoiceId, amount: amt, method: payMethod, status: 'completed' });
                setPayAmount('');
                closeModal();
              }}
            >
              Save payment
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  if (activeModal === 'upload-file') {
    return (
      <Modal open title="Upload file" onClose={closeModal}>
        <div className="space-y-3">
          <Field label="File name">
            <Input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="SOW-final.pdf" />
          </Field>
          <Field label="Client">
            <Select
              value={fileClientId}
              onChange={(e) => {
                setFileClientId(e.target.value);
                setFileProjectId('');
              }}
            >
              <option value="">Select…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Project">
            <Select value={fileProjectId} onChange={(e) => setFileProjectId(e.target.value)} disabled={!fileClientId}>
              <option value="">Select…</option>
              {projectsForClient.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Visibility">
            <Select value={fileVis} onChange={(e) => setFileVis(e.target.value as typeof fileVis)}>
              <option value="Internal">Internal</option>
              <option value="Client-visible">Client-visible</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!fileName.trim() || !fileClientId || !fileProjectId) {
                  toast('Client, project, and file name are required.', 'error');
                  return;
                }
                addFile({
                  name: fileName.trim(),
                  clientId: fileClientId,
                  projectId: fileProjectId,
                  visibility: fileVis,
                  size: '—',
                  folder: 'General',
                });
                setFileName('');
                closeModal();
              }}
            >
              Add to library
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  if (activeModal === 'create-contract') {
    return (
      <Modal open title="New contract" onClose={closeModal}>
        <div className="space-y-3">
          <Field label="Client">
            <Select value={ctClientId} onChange={(e) => { setCtClientId(e.target.value); setCtProjectId(''); }}>
              <option value="">Select…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Project (optional)">
            <Select value={ctProjectId} onChange={(e) => setCtProjectId(e.target.value)} disabled={!ctClientId}>
              <option value="">None</option>
              {ctProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Title">
            <Input value={ctTitle} onChange={(e) => setCtTitle(e.target.value)} placeholder="SOW — Phase 2" />
          </Field>
          <Field label="Value (USD)">
            <Input value={ctValue} onChange={(e) => setCtValue(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                const v = Number(ctValue.replace(/[^0-9.]/g, ''));
                if (!ctClientId || !ctTitle.trim() || !Number.isFinite(v)) {
                  toast('Complete client, title, and value.', 'error');
                  return;
                }
                addContract({
                  clientId: ctClientId,
                  projectId: ctProjectId || null,
                  title: ctTitle,
                  value: v,
                });
                setCtTitle('');
                closeModal();
              }}
            >
              Create draft
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  if (activeModal === 'calendar-event') {
    return (
      <Modal open title="New calendar event" onClose={closeModal}>
        <div className="space-y-3">
          <Field label="Title">
            <Input value={evTitle} onChange={(e) => setEvTitle(e.target.value)} placeholder="Client review call" />
          </Field>
          <Field label="When">
            <Input value={evWhen} onChange={(e) => setEvWhen(e.target.value)} placeholder="Apr 30, 2026 or Tomorrow" />
          </Field>
          <Field label="Type">
            <Select value={evType} onChange={(e) => setEvType(e.target.value as typeof evType)}>
              <option value="meeting">Meeting</option>
              <option value="task">Task</option>
              <option value="invoice">Invoice</option>
              <option value="contract">Contract</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!evTitle.trim() || !evWhen.trim()) {
                  toast('Title and when are required.', 'error');
                  return;
                }
                addDeadline({ title: evTitle.trim(), when: evWhen.trim(), type: evType });
                setEvTitle('');
                setEvWhen('');
                closeModal();
              }}
            >
              Save event
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  if (activeModal === 'invite-client') {
    return (
      <Modal open title="Invite client" onClose={closeModal}>
        <div className="space-y-3">
          <Field label="Email">
            <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="client@company.com" />
          </Field>
          <p className="text-xs text-slate-500">We’ll send a portal invite link. They pick a password on first visit.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!inviteEmail.includes('@')) {
                  toast('Enter a valid email.', 'error');
                  return;
                }
                toast(`Invite queued for ${inviteEmail}.`, 'success');
                setInviteEmail('');
                closeModal();
              }}
            >
              Send invite
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return null;
}

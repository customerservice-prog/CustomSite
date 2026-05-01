import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Wallet } from 'lucide-react';
import { TablePageLayout } from '@/components/layout/templates/table-page-layout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Table, TableBody, TableCell, TableFooterBar, TableHeadCell, TableHeader, TableRow } from '@/components/ui/table';
import { TableToolbar, TableToolbarSection } from '@/components/ui/table-toolbar';
import { EmptyState } from '@/components/ui/empty-state';
import { useExpenses, useProjects } from '@/store/hooks';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/shallow';

export function ExpensesPage() {
  const rows = useExpenses();
  const projects = useProjects();
  const clients = useAppStore(useShallow((s) => s.clients));
  const addExpense = useAppStore((s) => s.addExpense);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState('General');
  const [amount, setAmount] = useState('120');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const categories = useMemo(() => ['all', ...Array.from(new Set(rows.map((r) => r.category))).sort()], [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const match =
        !q.trim() ||
        r.vendor.toLowerCase().includes(q.toLowerCase()) ||
        r.category.toLowerCase().includes(q.toLowerCase());
      const c = cat === 'all' || r.category === cat;
      return match && c;
    });
  }, [rows, q, cat]);

  function submitExpense() {
    if (!projectId || !vendor.trim()) return;
    addExpense({
      projectId,
      vendor: vendor.trim(),
      category: category.trim() || 'General',
      amount: Math.max(0, Number(amount) || 0),
      date,
      reimbursable: true,
    });
    setModalOpen(false);
    setVendor('');
    setAmount('120');
  }

  return (
    <>
      <TablePageLayout
        header={
          <div className="space-y-4">
            <PageHeader
              title="Expenses"
              description="Capture costs against projects so invoices and margins reflect reality — then return to Pulse to see if money still makes sense."
              actions={
                <Button
                  type="button"
                  className="gap-2"
                  onClick={() => {
                    if (projects.length) setProjectId(projects[0].id);
                    setModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add expense
                </Button>
              }
            />
          </div>
        }
      >
        <TableToolbar>
          <TableToolbarSection>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search vendor or category…" className="max-w-md flex-1" />
            <Select value={cat} onChange={(e) => setCat(e.target.value)} className="w-44 shrink-0">
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'all' ? 'All categories' : c}
                </option>
              ))}
            </Select>
          </TableToolbarSection>
        </TableToolbar>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No expenses yet"
            description="Record software, travel, and pass-through costs against the right project so billing and profitability stay linked."
            action={
              <Button type="button" className="gap-2" onClick={() => setModalOpen(true)} disabled={!projects.length}>
                <Plus className="h-4 w-4" />
                Add expense
              </Button>
            }
          />
        ) : (
          <Table dense footer={<TableFooterBar from={1} to={filtered.length} total={filtered.length} />}>
            <TableHeader className="sticky top-0 z-20">
              <TableRow className="hover:bg-transparent">
                <TableHeadCell>Vendor</TableHeadCell>
                <TableHeadCell>Category</TableHeadCell>
                <TableHeadCell className="text-right">Amount</TableHeadCell>
                <TableHeadCell>Reimbursable</TableHeadCell>
                <TableHeadCell>Project</TableHeadCell>
                <TableHeadCell>Client</TableHeadCell>
                <TableHeadCell>Date</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const pr = projects.find((p) => p.id === r.projectId);
                const clientId = r.clientId;
                const clientName = clients[clientId]?.company;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-slate-900">{r.vendor}</TableCell>
                    <TableCell>{r.category}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">${r.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={r.reimbursable ? 'info' : 'neutral'}>{r.reimbursable ? 'Yes' : 'No'}</Badge>
                    </TableCell>
                    <TableCell>
                      {pr ? (
                        <Link to={`/projects/${pr.id}`} className="text-indigo-700 hover:text-indigo-900">
                          {pr.name}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {clientName ? (
                        <Link to={`/clients/${clientId}`} className="text-indigo-700 hover:text-indigo-900">
                          {clientName}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600">{r.date}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === 'Reimbursed' ? 'success' : r.status === 'Pending' ? 'warning' : 'neutral'}>
                        {r.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </TablePageLayout>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add expense">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="exp-proj">
              Project (required)
            </label>
            <Select id="exp-proj" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-[11px] text-slate-500">Client is inferred from the project — no orphan spend.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="exp-vendor">
              Vendor
            </label>
            <Input id="exp-vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="e.g. Delta Airlines" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="exp-cat">
              Category
            </label>
            <Input id="exp-cat" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="exp-amt">
                Amount
              </label>
              <Input id="exp-amt" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="exp-date">
                Date
              </label>
              <Input id="exp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={submitExpense} disabled={!projectId || !vendor.trim()}>
              Save expense
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

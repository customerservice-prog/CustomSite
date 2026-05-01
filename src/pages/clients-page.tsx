import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { ClientsTable } from '@/components/tables/clients-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { TablePageLayout } from '@/components/layout/templates/table-page-layout';
import { TableToolbar, TableToolbarSection } from '@/components/ui/table-toolbar';
import type { ClientStatus } from '@/lib/statuses';
import { CLIENT_STATUSES } from '@/lib/statuses';
import { cn } from '@/lib/utils';
import { useClients } from '@/store/hooks';
import { useAppStore } from '@/store/useAppStore';
import { EmptyState } from '@/components/ui/empty-state';

export function ClientsPage() {
  const clients = useClients();
  const openModal = useAppStore((s) => s.openModal);
  const hydration = useAppStore((s) => s.hydration);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<ClientStatus | 'all'>('all');
  const [ownerId, setOwnerId] = useState<'all' | 'u1' | 'u2' | 'u3'>('all');

  const rows = useMemo(() => {
    return clients.filter((c) => {
      const match =
        !q.trim() ||
        c.name.toLowerCase().includes(q.toLowerCase()) ||
        c.company.toLowerCase().includes(q.toLowerCase()) ||
        c.email.toLowerCase().includes(q.toLowerCase());
      const st = status === 'all' || c.status === status;
      const own = ownerId === 'all' || c.ownerId === ownerId;
      return match && st && own;
    });
  }, [clients, q, status, ownerId]);

  return (
    <TablePageLayout
      header={
        <div className="space-y-4">
          <PageHeader
            title="Clients"
            description="Contact info, project ownership, and open balances across every build — open a row for the full client record."
            actions={
              <Button type="button" className="gap-2" onClick={() => openModal('create-client')}>
                <Plus className="h-4 w-4" />
                Add client
              </Button>
            }
          />
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
                placeholder="Search name, company, or email…"
                className="pl-10"
                aria-label="Search clients"
              />
            </div>
          </TableToolbarSection>
          <TableToolbarSection>
            <Select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value as typeof ownerId)}
              className="w-[160px]"
              aria-label="Filter by owner"
            >
              <option value="all">All owners</option>
              <option value="u1">Jordan Blake</option>
              <option value="u2">Alex Chen</option>
              <option value="u3">Riley Morgan</option>
            </Select>
          </TableToolbarSection>
        </TableToolbar>
      }
    >
      {hydration.status === 'error' && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {hydration.error ?? 'Something went wrong loading agency data.'}
        </div>
      )}

      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-1">
        {(['all', ...CLIENT_STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-semibold transition duration-150',
              status === s
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      {rows.length === 0 && !q && status === 'all' && ownerId === 'all' ? (
        <EmptyState
          title="No clients yet — this is your account hub"
          description="Add your first retainer or project client here. Everything else—engagements, invoices, approvals, and threads—rolls up from this record so you always know who owes what and what’s shipping."
          action={
            <Button type="button" onClick={() => openModal('create-client')}>
              Create client
            </Button>
          }
        />
      ) : (
        <ClientsTable rows={rows} />
      )}
    </TablePageLayout>
  );
}

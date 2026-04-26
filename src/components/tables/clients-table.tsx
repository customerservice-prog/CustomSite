import { useNavigate } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import type { Client } from '@/lib/types/entities';
import { clientStatusBadgeVariant } from '@/lib/statuses';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { IconButton } from '@/components/ui/icon-button';
import { Table, TableBody, TableCell, TableHeadCell, TableHeader, TableRow } from '@/components/ui/table';
import { useAppStore } from '@/store/useAppStore';

export function ClientsTable({ rows }: { rows: Client[] }) {
  const navigate = useNavigate();
  const users = useAppStore(useShallow((s) => s.users));
  const projects = useAppStore(useShallow((s) => s.projects));

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-16 text-center text-sm text-slate-500">
        No clients match your filters. Try clearing search or switching status.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHeadCell>Client</TableHeadCell>
          <TableHeadCell>Company</TableHeadCell>
          <TableHeadCell>Status</TableHeadCell>
          <TableHeadCell className="text-right">Projects</TableHeadCell>
          <TableHeadCell className="text-right">Lifetime value</TableHeadCell>
          <TableHeadCell className="text-right">Balance</TableHeadCell>
          <TableHeadCell>Last activity</TableHeadCell>
          <TableHeadCell>Owner</TableHeadCell>
          <TableHeadCell className="w-14 text-right"> </TableHeadCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((c) => {
          const owner = users[c.ownerId];
          const projectCount = Object.values(projects).filter((p) => p.clientId === c.id).length;
          return (
            <TableRow
              key={c.id}
              clickable
              onClick={() => navigate(`/clients/${c.id}`)}
              className="active:bg-slate-100/80"
            >
              <TableCell className="font-semibold text-slate-900">{c.name}</TableCell>
              <TableCell>{c.company}</TableCell>
              <TableCell>
                <Badge variant={clientStatusBadgeVariant(c.status)} className="font-semibold">
                  {c.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums font-medium">{projectCount}</TableCell>
              <TableCell className="text-right font-medium tabular-nums text-slate-900">
                ${c.lifetimeValue.toLocaleString()}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums text-slate-900">
                {c.balance > 0 ? `$${c.balance.toLocaleString()}` : '—'}
              </TableCell>
              <TableCell className="text-xs font-medium text-slate-500">{c.lastActivityLabel}</TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <Avatar name={owner?.name ?? '?'} size="sm" />
                  <span className="text-slate-700">{owner?.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <IconButton
                  aria-label={`Open ${c.name}`}
                  className="h-9 w-9"
                  onClick={() => navigate(`/clients/${c.id}`)}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </IconButton>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

import { useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { useClientPortalProject } from '@/hooks/use-client-portal-project';
import { useAppStore } from '@/store/useAppStore';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format-display';
import * as sel from '@/store/selectors';

export function ClientPortalInvoicesPage() {
  const ctx = useClientPortalProject();
  const invoices = useAppStore(useShallow((s) => (ctx?.project ? sel.getInvoicesForProject(s, ctx.project.id) : [])));

  const openInvoices = useMemo(
    () => invoices.filter((i) => i.status === 'Sent' || i.status === 'Overdue' || i.status === 'Draft'),
    [invoices]
  );
  const overdue = useMemo(() => openInvoices.filter((i) => i.status === 'Overdue'), [openInvoices]);

  if (!ctx) {
    return (
      <p className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-600 shadow-sm">
        When your project is connected, billing details will show here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-stone-900">Invoices</h2>
        <p className="mt-1 text-sm text-stone-600">What is open, paid, or coming up — in plain language.</p>
      </div>
      {overdue.length > 0 ? (
        <div className="rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm font-medium text-red-950">
          {overdue.length} payment{overdue.length > 1 ? 's are' : ' is'} past due. Your team can help if you need a plan.
        </div>
      ) : null}
      <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white shadow-sm">
        {openInvoices.length === 0 ? (
          <li className="p-6 text-sm text-stone-500">Nothing open right now. We will add new invoices here when they are ready.</li>
        ) : (
          openInvoices.map((inv) => (
            <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="font-semibold text-stone-900">{inv.number}</p>
                <p className="text-xs text-stone-500">Issued for your project</p>
              </div>
              <span className="tabular-nums text-base font-semibold text-stone-900">{formatCurrency(inv.amount)}</span>
              <Badge variant={inv.status === 'Overdue' ? 'danger' : inv.status === 'Draft' ? 'neutral' : 'warning'}>
                {inv.status === 'Overdue'
                  ? 'Needs attention'
                  : inv.status === 'Draft'
                    ? 'Being prepared'
                    : 'Awaiting payment'}
              </Badge>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

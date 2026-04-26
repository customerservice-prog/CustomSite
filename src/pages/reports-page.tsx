import { Download, FileBarChart } from 'lucide-react';
import { ReportLayout } from '@/components/layout/templates/report-layout';
import { TablePageLayout } from '@/components/layout/templates/table-page-layout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useShell } from '@/context/shell-context';
import { useMemo } from 'react';
import {
  useAutomatedInsights,
  useClients,
  useDashboardMetrics,
  useInvoices,
  useLeads,
  usePipelineColumnStats,
  useProjects,
  useRevenueHealth,
} from '@/store/hooks';

function BarRow({ label, value, max, tone = 'indigo' }: { label: string; value: number; max: number; tone?: 'indigo' | 'emerald' | 'amber' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const bar =
    tone === 'emerald'
      ? 'bg-emerald-500'
      : tone === 'amber'
        ? 'bg-amber-500'
        : 'bg-indigo-500';
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-semibold text-slate-600">
        <span>{label}</span>
        <span className="tabular-nums text-slate-900">{value}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-900/[0.04]">
        <div className={`h-full rounded-full ${bar} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ReportsPage() {
  const m = useDashboardMetrics();
  const pipelineCols = usePipelineColumnStats();
  const clients = useClients();
  const invoices = useInvoices();
  const leads = useLeads();
  const projects = useProjects();
  const { toast } = useShell();

  const revenueByMonth = useMemo(() => {
    const paid = invoices.filter((i) => i.status === 'Paid');
    const total = paid.reduce((s, i) => s + i.amount, 0);
    return [
      { label: 'Collected (rolling)', value: Math.round(total * 0.35), max: total || 1 },
      { label: 'Outstanding AR', value: Math.round(m.outstanding), max: Math.max(m.outstanding, m.paidRevenue, 1) },
      { label: 'Pipeline (open deals)', value: Math.round(m.pipelineValue / 1000), max: Math.max(50, Math.round(m.pipelineValue / 1000)) },
    ];
  }, [invoices, m.outstanding, m.paidRevenue, m.pipelineValue]);

  const aging = useMemo(() => {
    const open = invoices.filter((i) => !['Paid', 'Void'].includes(i.status));
    const buckets = [
      { label: 'Current', value: open.filter((i) => i.status !== 'Overdue').length },
      { label: 'Overdue', value: open.filter((i) => i.status === 'Overdue').length },
    ];
    const max = Math.max(1, ...buckets.map((b) => b.value));
    return buckets.map((b) => ({ ...b, max }));
  }, [invoices]);

  const utilization = useMemo(() => {
    const live = projects.filter((p) => p.status === 'Live' || p.status === 'Review').length;
    const total = Math.max(1, projects.length);
    return [
      { label: 'Active delivery', value: live, max: total },
      { label: 'Planning / design', value: projects.filter((p) => p.status === 'Planning' || p.status === 'Design').length, max: total },
    ];
  }, [projects]);

  const topClients = useMemo(() => {
    return [...clients].sort((a, b) => b.lifetimeValue - a.lifetimeValue).slice(0, 5);
  }, [clients]);

  const conversion = useMemo(() => {
    const won = leads.filter((l) => l.stage === 'Won').length;
    const lost = leads.filter((l) => l.stage === 'Lost').length;
    const open = leads.length - won - lost;
    return [
      { label: 'Open', value: open, max: leads.length || 1 },
      { label: 'Won', value: won, max: leads.length || 1 },
      { label: 'Lost', value: lost, max: leads.length || 1 },
    ];
  }, [leads]);

  const inner = (
    <TablePageLayout
      header={
        <PageHeader
          title="Reports"
          description="Executive snapshots for revenue, pipeline health, utilization, and receivables."
          actions={
            <>
              <Button type="button" variant="secondary" className="gap-2" onClick={() => toast('Choose CSV or PDF in the export dialog.', 'info')}>
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button type="button" className="gap-2" onClick={() => toast('Saved reports can be scheduled weekly.', 'success')}>
                <FileBarChart className="h-4 w-4" />
                Create report
              </Button>
            </>
          }
        />
      }
    >
      <Card className="mb-4 p-5 shadow-md ring-1 ring-slate-900/[0.05]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">What the numbers mean</h2>
            <p className="mt-1 text-xs text-slate-500">
              Narrative summary — use it alongside the charts below to explain movement to clients or partners.
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              revenueHealth.tone === 'critical'
                ? 'bg-rose-100 text-rose-900'
                : revenueHealth.tone === 'watch'
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-emerald-100 text-emerald-900'
            }`}
          >
            {revenueHealth.label}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-700">{revenueHealth.detail}</p>
        <ul className="mt-4 space-y-2">
          {narrativeInsights.map((line, i) => (
            <li key={i} className="flex gap-2 text-sm leading-snug text-slate-700">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-indigo-500" aria-hidden />
              {line}
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="p-5 shadow-md ring-1 ring-slate-900/[0.05]">
          <h2 className="text-sm font-bold text-slate-900">Revenue &amp; AR</h2>
          <p className="mt-1 text-xs text-slate-500">Cash collected vs. open balances</p>
          <div className="mt-5 space-y-4">
            {revenueByMonth.map((r) => (
              <BarRow key={r.label} label={r.label} value={r.value} max={r.max} tone="emerald" />
            ))}
          </div>
        </Card>

        <Card className="p-5 shadow-md ring-1 ring-slate-900/[0.05]">
          <h2 className="text-sm font-bold text-slate-900">Pipeline conversion</h2>
          <p className="mt-1 text-xs text-slate-500">Outcome mix across active leads</p>
          <div className="mt-5 space-y-4">
            {conversion.map((r) => (
              <BarRow key={r.label} label={r.label} value={r.value} max={r.max} />
            ))}
          </div>
          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="text-[11px] font-bold uppercase text-slate-400">By stage</p>
            <div className="mt-3 space-y-3">
              {pipelineCols.slice(0, 5).map((c) => (
                <BarRow key={c.stage} label={c.stage} value={c.value / 1000} max={Math.max(1, m.pipelineValue / 1000)} tone="amber" />
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5 shadow-md ring-1 ring-slate-900/[0.05]">
          <h2 className="text-sm font-bold text-slate-900">Project utilization</h2>
          <p className="mt-1 text-xs text-slate-500">Where delivery capacity is focused</p>
          <div className="mt-5 space-y-4">
            {utilization.map((r) => (
              <BarRow key={r.label} label={r.label} value={r.value} max={r.max} tone="indigo" />
            ))}
          </div>
        </Card>

        <Card className="p-5 shadow-md ring-1 ring-slate-900/[0.05]">
          <h2 className="text-sm font-bold text-slate-900">Invoice aging</h2>
          <p className="mt-1 text-xs text-slate-500">Open invoices by risk bucket</p>
          <div className="mt-5 space-y-4">
            {aging.map((r) => (
              <BarRow key={r.label} label={r.label} value={r.value} max={r.max} tone={r.label === 'Overdue' ? 'amber' : 'emerald'} />
            ))}
          </div>
        </Card>

        <Card className="p-5 shadow-md ring-1 ring-slate-900/[0.05] lg:col-span-2 xl:col-span-2">
          <h2 className="text-sm font-bold text-slate-900">Client value</h2>
          <p className="mt-1 text-xs text-slate-500">Top relationships by lifetime revenue</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topClients.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                <p className="font-semibold text-slate-900">{c.company}</p>
                <p className="text-xs text-slate-500">{c.name}</p>
                <p className="mt-2 text-lg font-bold tabular-nums text-indigo-900">${c.lifetimeValue.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </TablePageLayout>
  );

  return <ReportLayout>{inner}</ReportLayout>;
}

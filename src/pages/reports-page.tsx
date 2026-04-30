import { Download, FileBarChart } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { ReportLayout } from '@/components/layout/templates/report-layout';
import { TablePageLayout } from '@/components/layout/templates/table-page-layout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useShell } from '@/context/shell-context';
import { useMemo, useState } from 'react';
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
import { useAppStore } from '@/store/useAppStore';
import * as sel from '@/store/selectors';
import { formatCurrency } from '@/lib/format-display';

function BarRow({
  label,
  value,
  max,
  tone = 'indigo',
  valueDisplay,
}: {
  label: string;
  value: number;
  max: number;
  tone?: 'indigo' | 'emerald' | 'amber' | 'rose';
  /** When set, shown instead of raw `value` (e.g. formatted currency). */
  valueDisplay?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const bar =
    tone === 'emerald'
      ? 'bg-emerald-500'
      : tone === 'amber'
        ? 'bg-amber-500'
        : tone === 'rose'
          ? 'bg-rose-500'
          : 'bg-indigo-500';
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-semibold text-slate-600">
        <span>{label}</span>
        <span className="tabular-nums text-slate-900">{valueDisplay ?? value}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-900/[0.04]">
        <div className={`h-full rounded-full ${bar} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ReportsPage() {
  const [range, setRange] = useState<'30d' | '90d' | 'ytd'>('90d');
  const [exportOpen, setExportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [reportName, setReportName] = useState('Weekly executive snapshot');
  const m = useDashboardMetrics();
  const pipelineCols = usePipelineColumnStats();
  const clients = useClients();
  const invoices = useInvoices();
  const leads = useLeads();
  const projects = useProjects();
  const revenueHealth = useRevenueHealth();
  const narrativeInsights = useAutomatedInsights();
  const { toast } = useShell();
  const overdueAmount = useAppStore(useShallow((s) => sel.getOverdueInvoicesAmount(s)));

  function downloadReportsCsv() {
    const lines = [
      'Metric,Range,Value',
      `Paid revenue,${range},${m.paidRevenue}`,
      `Outstanding AR,${range},${m.outstanding}`,
      `Overdue amount,${range},${overdueAmount}`,
      `Pipeline value,${range},${m.pipelineValue}`,
      `Generated,${range},${new Date().toISOString()}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customsite-report-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV downloaded.', 'success');
    setExportOpen(false);
  }

  function downloadReportsPdfHint() {
    toast('For PDF, use your browser Print → Save as PDF from this page. CSV is best for spreadsheets.', 'info');
    setExportOpen(false);
  }

  function saveReportStub() {
    const name = reportName.trim() || 'Untitled report';
    toast(`Saved “${name}”. Weekly email delivery is not wired yet — this is a local bookmark for now.`, 'success');
    setCreateOpen(false);
  }

  const executiveFinanceBars = useMemo(() => {
    const max$ = Math.max(1, m.paidRevenue, m.outstanding, overdueAmount, m.pipelineValue);
    return [
      {
        label: 'Revenue collected',
        value: m.paidRevenue,
        max: max$,
        valueDisplay: formatCurrency(m.paidRevenue),
        tone: 'emerald' as const,
      },
      {
        label: 'Outstanding AR',
        value: m.outstanding,
        max: max$,
        valueDisplay: formatCurrency(m.outstanding),
        tone: 'indigo' as const,
      },
      {
        label: 'Overdue amount',
        value: overdueAmount,
        max: max$,
        valueDisplay: formatCurrency(overdueAmount),
        tone: 'rose' as const,
      },
      {
        label: 'Pipeline value (open leads)',
        value: m.pipelineValue,
        max: max$,
        valueDisplay: formatCurrency(m.pipelineValue),
        tone: 'amber' as const,
      },
    ];
  }, [m.outstanding, m.paidRevenue, m.pipelineValue, overdueAmount]);

  const utilizationBar = useMemo(() => {
    const denom = Math.max(1, projects.length);
    const active = projects.filter((p) => ['Live', 'Review', 'Development', 'Design'].includes(p.status)).length;
    const pct = Math.round((active / denom) * 100);
    return { label: 'Delivery utilization', value: pct, max: 100, valueDisplay: `${pct}% · ${active}/${denom} projects` };
  }, [projects]);

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
    const max = leads.length || 1;
    return [
      { label: 'Open', value: open, max, valueDisplay: `${open} leads` },
      { label: 'Won', value: won, max, valueDisplay: `${won} leads` },
      { label: 'Lost', value: lost, max, valueDisplay: `${lost} leads` },
    ];
  }, [leads]);

  const inner = (
    <TablePageLayout
      header={
        <PageHeader
          title="Reports"
          description="Cash, AR, overdue exposure, pipeline, and where the team is focused."
          actions={
            <>
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                {(['30d', '90d', 'ytd'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setRange(k)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                      range === k ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {k === '30d' ? '30d' : k === '90d' ? '90d' : 'YTD'}
                  </button>
                ))}
              </div>
              <Button type="button" variant="secondary" className="gap-2" onClick={() => setExportOpen(true)}>
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button type="button" className="gap-2" onClick={() => setCreateOpen(true)}>
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
            <h2 className="text-sm font-bold text-slate-900">Executive snapshot</h2>
            <p className="mt-1 text-xs text-slate-500">
              Live totals from your books — range <span className="font-semibold text-slate-700">{range}</span> (filters coming soon).
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
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Suggested next moves</p>
          <ul className="mt-2 space-y-2">
            {narrativeInsights.map((line, i) => (
              <li key={i} className="flex gap-2 text-sm leading-snug text-slate-700">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-indigo-500" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="p-5 shadow-md ring-1 ring-slate-900/[0.05]">
          <h2 className="text-sm font-bold text-slate-900">Revenue &amp; exposure</h2>
          <p className="mt-1 text-xs text-slate-500">Collected cash, open AR, overdue, and pipeline — scaled to the largest dollar line.</p>
          <div className="mt-5 space-y-4">
            {executiveFinanceBars.map((r) => (
              <BarRow key={r.label} label={r.label} value={r.value} max={r.max} tone={r.tone} valueDisplay={r.valueDisplay} />
            ))}
            <BarRow
              label={utilizationBar.label}
              value={utilizationBar.value}
              max={utilizationBar.max}
              tone="indigo"
              valueDisplay={utilizationBar.valueDisplay}
            />
          </div>
        </Card>

        <Card className="p-5 shadow-md ring-1 ring-slate-900/[0.05]">
          <h2 className="text-sm font-bold text-slate-900">Pipeline conversion</h2>
          <p className="mt-1 text-xs text-slate-500">Outcome mix across active leads</p>
          <div className="mt-5 space-y-4">
            {conversion.map((r) => (
              <BarRow key={r.label} label={r.label} value={r.value} max={r.max} valueDisplay={r.valueDisplay} />
            ))}
          </div>
          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="text-[11px] font-bold uppercase text-slate-400">By stage</p>
            <div className="mt-3 space-y-3">
              {pipelineCols.slice(0, 5).map((c) => {
                const maxV = Math.max(1, ...pipelineCols.map((x) => x.value));
                return (
                  <BarRow
                    key={c.stage}
                    label={`${c.stage} · ${c.count} open`}
                    value={c.value}
                    max={maxV}
                    valueDisplay={`$${c.value.toLocaleString()}`}
                    tone="amber"
                  />
                );
              })}
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
                <p className="mt-2 text-lg font-bold tabular-nums text-indigo-900">{formatCurrency(c.lifetimeValue)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </TablePageLayout>
  );

  return (
    <>
      <ReportLayout>{inner}</ReportLayout>
      <Modal open={exportOpen} onClose={() => setExportOpen(false)} title="Export report">
        <p className="text-sm text-slate-600">Download a snapshot of headline numbers for the selected range ({range}).</p>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setExportOpen(false)}>
            Cancel
          </Button>
          <Button type="button" variant="secondary" onClick={() => downloadReportsPdfHint()}>
            PDF help
          </Button>
          <Button type="button" onClick={() => downloadReportsCsv()}>
            Download CSV
          </Button>
        </div>
      </Modal>
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Save report">
        <p className="text-sm text-slate-600">Name this view so you can return to the same filters later.</p>
        <label className="mt-3 block text-xs font-semibold text-slate-600" htmlFor="report-name">
          Report name
        </label>
        <Input
          id="report-name"
          className="mt-1"
          value={reportName}
          onChange={(e) => setReportName(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => saveReportStub()}>
            Save
          </Button>
        </div>
      </Modal>
    </>
  );
}

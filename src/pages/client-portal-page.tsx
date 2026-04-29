import { useEffect, useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, buttonClassName } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/useAppStore';
import { clientDeliveryStatusLabel } from '@/lib/project-lifecycle';
import { lifecycleStageToOfferPhase, OFFER_PHASE_ORDER } from '@/lib/service-offer';
import { narrativeThisPhase, narrativeWhatsNext, offerStepNumber } from '@/lib/project-service-narrative';
import { AGENCY_SITE_PAGES } from '@/lib/site-production/defaults';
import { pageStatusDisplay } from '@/lib/site-production/page-status-labels';
import { compileSectionsToPreviewHtml } from '@/lib/site-production/compile-preview-html';
import { siteProductionBundleKey, useSiteProductionStore } from '@/store/useSiteProductionStore';
import { formatCurrency } from '@/lib/format-display';
import * as sel from '@/store/selectors';
import { cn } from '@/lib/utils';

export function ClientPortalPage() {
  const sampleProject = useAppStore((s) =>
    Object.values(s.projects).find((p) => p.clientPortalVisible && p.deliveryFocus === 'client_site')
  );
  const sampleClient = useAppStore(useShallow((s) => (sampleProject ? s.clients[sampleProject.clientId] : undefined)));
  const portalThreads = useAppStore(
    useShallow((s) => (sampleProject ? sel.getThreadsForProject(s, sampleProject.id).slice(0, 5) : []))
  );
  const portalInvoices = useAppStore(
    useShallow((s) => (sampleProject ? sel.getInvoicesForProject(s, sampleProject.id) : []))
  );
  const portalFiles = useAppStore(
    useShallow((s) => (sampleProject ? sel.getFilesForProject(s, sampleProject.id).slice(0, 6) : []))
  );
  const ensurePagesForProject = useSiteProductionStore((s) => s.ensurePagesForProject);
  const sectionsByBundle = useSiteProductionStore((s) => s.sectionsByBundle);

  useEffect(() => {
    if (!sampleProject) return;
    ensurePagesForProject(sampleProject.id);
  }, [sampleProject, ensurePagesForProject]);

  const samplePreviewHtml = useMemo(() => {
    if (!sampleProject) return '';
    const k = siteProductionBundleKey(sampleProject.id, '/');
    const secs = [...(sectionsByBundle[k] ?? [])].sort((a, b) => a.order - b.order);
    return compileSectionsToPreviewHtml(secs, { pageTitle: 'Home', viewport: 'desktop' });
  }, [sampleProject, sectionsByBundle]);

  const samplePhase = sampleProject ? lifecycleStageToOfferPhase(sampleProject.lifecycleStage) : null;
  const openInvoices = portalInvoices.filter((i) => i.status === 'Sent' || i.status === 'Overdue' || i.status === 'Draft');
  const overdue = portalInvoices.filter((i) => i.status === 'Overdue');

  return (
    <div className="space-y-10">
      <PageHeader
        title="Client portal"
        description="Live preview, status, and what changed — clients see the same conversion rebuild you ship, without internal jargon."
        actions={
          <a href="/client-portal.html" target="_blank" rel="noreferrer">
            <Button type="button" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Open client login
            </Button>
          </a>
        }
      />

      {sampleProject && sampleClient && samplePhase && (
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 px-6 py-5 text-white sm:px-7">
            <div>
              <h2 className="text-xl font-bold tracking-tight">{sampleClient.company}</h2>
              <p className="mt-0.5 text-[13px] text-white/70">{sampleProject.name}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  clientDeliveryStatusLabel(sampleProject.lifecycleStage) === 'Live'
                    ? 'success'
                    : clientDeliveryStatusLabel(sampleProject.lifecycleStage) === 'Ready for review'
                      ? 'info'
                      : 'neutral'
                }
                className="border-0 bg-white/20 text-white"
              >
                {clientDeliveryStatusLabel(sampleProject.lifecycleStage)}
              </Badge>
              <span className="text-xs text-white/70">Updated {sampleProject.lastSiteUpdateLabel ?? '—'}</span>
            </div>
          </div>
          <div className="bg-slate-100/80 px-4 py-6 sm:px-8 sm:py-8">
            <p className="text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">Live preview — conversion rebuild</p>
            <div className="mx-auto mt-4 max-w-5xl overflow-hidden rounded-2xl bg-white shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/[0.08]">
              <iframe
                title="Live conversion preview"
                srcDoc={samplePreviewHtml}
                className="h-[min(560px,68vh)] w-full bg-white"
                sandbox="allow-same-origin allow-popups"
              />
            </div>
          </div>
          <div className="grid gap-0 border-t border-slate-100/90 lg:grid-cols-2">
            <div className="p-6 sm:p-8 lg:border-r lg:border-slate-100/90">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Next step</p>
              <p className="mt-2 text-base font-semibold leading-snug tracking-tight text-slate-900">{narrativeWhatsNext(samplePhase)}</p>
              <p className="mt-3 text-[13px] leading-relaxed text-slate-600">{narrativeThisPhase(samplePhase)}</p>
              <div className="mt-5 flex gap-1.5">
                {OFFER_PHASE_ORDER.map((ph) => {
                  const curIdx = OFFER_PHASE_ORDER.indexOf(samplePhase);
                  const idx = OFFER_PHASE_ORDER.indexOf(ph);
                  const done = idx < curIdx;
                  const active = ph === samplePhase;
                  return (
                    <div
                      key={ph}
                      className={cn(
                        'h-2 flex-1 rounded-full transition-colors duration-200',
                        done && 'bg-emerald-500',
                        active && 'bg-violet-600 shadow-sm shadow-violet-900/25',
                        !done && !active && 'bg-slate-200'
                      )}
                    />
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] text-slate-400">Step {offerStepNumber(samplePhase)} of 4</p>
            </div>
            <div className="p-6 sm:p-8">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Recent changes on your site</p>
              <ul className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-slate-800">
                {(sampleProject.siteImprovements?.length ? sampleProject.siteImprovements : []).map((row) => (
                  <li key={row.id} className="flex gap-2.5">
                    <span className="shrink-0 font-medium text-emerald-600">→</span>
                    <span>{row.whatChanged}</span>
                  </li>
                ))}
                {!sampleProject.siteImprovements?.length && (
                  <li className="text-slate-500">Your team will list shipped edits here as they go live.</li>
                )}
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100/90 bg-slate-50/50 px-6 py-4 sm:px-8">
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
              {AGENCY_SITE_PAGES.map((pg) => (
                <li key={pg.path}>
                  <span className="font-medium text-slate-800">{pg.name}</span>{' '}
                  <span className="text-slate-500">({pageStatusDisplay(pg.publishState)})</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              {sampleProject.siteLiveUrl ? (
                <a
                  href={sampleProject.siteLiveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClassName('secondary', 'text-xs')}
                >
                  Open staging link
                </a>
              ) : null}
              <Link to={`/projects/${sampleProject.id}`} className={buttonClassName('primary', 'text-xs')}>
                Studio view
              </Link>
            </div>
          </div>
        </Card>
      )}

      {sampleProject && sampleClient && (
        <Card className="overflow-hidden p-0">
          <div className="grid divide-y divide-slate-100 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            <div className="p-6 sm:p-7">
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Messages</h3>
              <ul className="mt-4 space-y-1">
                {portalThreads.length === 0 ? (
                  <li className="text-[13px] text-slate-500">No threads yet for this project.</li>
                ) : (
                  portalThreads.map((t) => (
                    <li key={t.id} className="border-b border-slate-100/80 py-3 last:border-0">
                      <Link to="/messages" className="block transition-colors duration-150 hover:text-violet-800">
                        <p className="font-semibold tracking-tight text-slate-900">{t.participant}</p>
                        <p className="mt-0.5 text-[13px] leading-relaxed text-slate-600">{t.preview}</p>
                        <p className="mt-1 text-[11px] text-slate-400">{t.lastActivityLabel}</p>
                      </Link>
                    </li>
                  ))
                )}
              </ul>
              <Link to="/messages" className={buttonClassName('secondary', 'mt-5 w-full justify-center text-xs')}>
                Open inbox
              </Link>
            </div>

            <div className="p-6 sm:p-7">
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Invoices</h3>
              {overdue.length > 0 && (
                <p className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-semibold leading-snug text-red-950 ring-1 ring-red-200/50">
                  {overdue.length} overdue · {formatCurrency(overdue.reduce((s, i) => s + i.amount, 0))} outstanding on this project
                </p>
              )}
              <ul className="mt-4 space-y-1">
                {openInvoices.length === 0 ? (
                  <li className="text-[13px] text-slate-500">No open invoices for this project.</li>
                ) : (
                  openInvoices.map((inv) => (
                    <li
                      key={inv.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100/80 py-3 text-[13px] last:border-0"
                    >
                      <Link to={`/invoices/${inv.id}`} className="font-semibold text-violet-700 transition-colors hover:text-violet-900">
                        {inv.number}
                      </Link>
                      <span className="tabular-nums text-slate-800">{formatCurrency(inv.amount)}</span>
                      <Badge variant={inv.status === 'Overdue' ? 'danger' : inv.status === 'Draft' ? 'neutral' : 'warning'}>
                        {inv.status}
                      </Badge>
                    </li>
                  ))
                )}
              </ul>
              <Link to="/invoices" className={buttonClassName('secondary', 'mt-5 w-full justify-center text-xs')}>
                All invoices
              </Link>
            </div>

            <div className="p-6 sm:p-7">
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Files</h3>
              <ul className="mt-4 space-y-1">
                {portalFiles.length === 0 ? (
                  <li className="text-[13px] text-slate-500">No files uploaded yet.</li>
                ) : (
                  portalFiles.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between gap-2 border-b border-slate-100/80 py-2.5 text-[13px] last:border-0"
                    >
                      <span className="font-medium text-slate-800">{f.name}</span>
                      <span className="text-[11px] text-slate-400">{f.size}</span>
                    </li>
                  ))
                )}
              </ul>
              <Link to="/files" className={buttonClassName('secondary', 'mt-5 w-full justify-center text-xs')}>
                Open files
              </Link>
            </div>
          </div>
        </Card>
      )}

    </div>
  );
}

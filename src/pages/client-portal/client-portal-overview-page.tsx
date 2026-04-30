import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Maximize2, RefreshCw } from 'lucide-react';
import { useClientPortalProject } from '@/hooks/use-client-portal-project';
import { useShell } from '@/context/shell-context';
import { Button, buttonClassName } from '@/components/ui/button';
import { loadBuilderWorkflow } from '@/lib/site-builder/builder-workflow-storage';
import {
  loadClientPortalExperience,
  REBUILD_PROGRESS_PCT,
  REBUILD_STAGES,
  type ClientRebuildStage,
} from '@/lib/client-portal/client-experience-storage';
import { appendClientFeedback } from '@/lib/client-portal/client-feedback-storage';
import { activityFromBuilderChangelog, activityFromImprovements } from '@/lib/client-portal/client-activity-feed';
import { compileSectionsToPreviewHtml } from '@/lib/site-production/compile-preview-html';
import { siteProductionBundleKey, useSiteProductionStore } from '@/store/useSiteProductionStore';
import { cn } from '@/lib/utils';

export function ClientPortalOverviewPage() {
  const ctx = useClientPortalProject();
  const { toast } = useShell();
  const ensurePagesForProject = useSiteProductionStore((s) => s.ensurePagesForProject);
  const sectionsByBundle = useSiteProductionStore((s) => s.sectionsByBundle);
  const [previewNonce, setPreviewNonce] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [changelogTick, setChangelogTick] = useState(0);

  const project = ctx?.project;

  useEffect(() => {
    if (!project) return;
    ensurePagesForProject(project.id);
  }, [project, ensurePagesForProject]);

  useEffect(() => {
    if (!project) return;
    const onWorkflow = (e: Event) => {
      const ce = e as CustomEvent<{ projectId?: string }>;
      if (ce.detail?.projectId === project.id) setChangelogTick((t) => t + 1);
    };
    window.addEventListener('customsite-builder-workflow', onWorkflow as EventListener);
    return () => window.removeEventListener('customsite-builder-workflow', onWorkflow as EventListener);
  }, [project?.id]);

  const experience = useMemo(() => {
    if (!project) return null;
    return loadClientPortalExperience(project.id, project);
  }, [project, project?.lifecycleStage]);

  const changelog = useMemo(() => {
    if (!project) return [];
    void changelogTick;
    return loadBuilderWorkflow(project.id).changelog;
  }, [project?.id, changelogTick]);

  const previewHtml = useMemo(() => {
    if (!project) return '';
    const k = siteProductionBundleKey(project.id, '/');
    const secs = [...(sectionsByBundle[k] ?? [])].sort((a, b) => a.order - b.order);
    return compileSectionsToPreviewHtml(secs, { pageTitle: 'Home', viewport: 'desktop' });
  }, [project, sectionsByBundle, previewNonce]);

  const activityFromBuilder = useMemo(() => activityFromBuilderChangelog(changelog, 14), [changelog]);
  const activityHighlights = useMemo(
    () => activityFromImprovements(project?.siteImprovements),
    [project?.siteImprovements]
  );

  const progressPct = experience ? REBUILD_PROGRESS_PCT[experience.rebuildStage] : 0;

  const submitFeedback = useCallback(() => {
    if (!project || !feedback.trim()) return;
    appendClientFeedback(project.id, feedback.trim());
    setFeedback('');
    toast('Thanks — your team will see this on the project.', 'success');
  }, [project, feedback, toast]);

  if (!ctx || !experience || !project) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white/80 p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Your space is almost ready</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          When your project is connected, you will see progress, previews, and updates here — nothing to set up on your side.
        </p>
      </div>
    );
  }

  const stageIndex = (id: ClientRebuildStage) => REBUILD_STAGES.findIndex((s) => s.id === id);
  const currentIdx = stageIndex(experience.rebuildStage);

  return (
    <div className="space-y-8 sm:space-y-10">
      <section className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/90 to-white p-5 shadow-sm sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-900/70">Current focus</p>
        <p className="mt-2 text-lg font-semibold leading-snug text-stone-900 sm:text-xl">{experience.currentFocus}</p>
        {experience.etaNote ? (
          <p className="mt-3 text-sm font-medium text-amber-900/80">Expected timing: {experience.etaNote}</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Website rebuild progress</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-stone-900">{progressPct}%</p>
          </div>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-stone-100 ring-1 ring-stone-200/80">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-500 transition-[width] duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {REBUILD_STAGES.map((s, i) => {
            const active = s.id === experience.rebuildStage;
            const past = i < currentIdx;
            return (
              <li
                key={s.id}
                className={cn(
                  'rounded-xl border px-3 py-3 text-sm transition-colors',
                  active && 'border-amber-400/80 bg-amber-50/90 ring-1 ring-amber-300/50',
                  past && !active && 'border-emerald-200/80 bg-emerald-50/50',
                  !past && !active && 'border-stone-100 bg-stone-50/60 text-stone-500'
                )}
              >
                <p className={cn('font-semibold', active ? 'text-amber-950' : past ? 'text-emerald-900' : 'text-stone-600')}>
                  {s.label}
                  {active ? <span className="ml-1.5 text-xs font-normal text-amber-800/80">(now)</span> : null}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-stone-600">{s.line}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Your site</p>
            <p className="text-base font-semibold text-stone-900">Latest preview</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              className="gap-1.5 border-stone-200 bg-stone-50 text-stone-800 hover:bg-stone-100"
              onClick={() => setPreviewNonce((n) => n + 1)}
            >
              <RefreshCw className="h-4 w-4" strokeWidth={2} />
              View latest version
            </Button>
            <Button
              type="button"
              className="gap-1.5 bg-stone-900 text-white hover:bg-stone-800"
              onClick={() => setFullscreen(true)}
            >
              <Maximize2 className="h-4 w-4" strokeWidth={2} />
              Open full preview
            </Button>
            {project.siteLiveUrl ? (
              <a
                href={project.siteLiveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClassName('secondary', 'inline-flex gap-1.5 border-stone-200')}
              >
                <ExternalLink className="h-4 w-4" strokeWidth={2} />
                Visit live site
              </a>
            ) : null}
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 shadow-inner">
          <iframe
            key={previewNonce}
            title="Preview of your website"
            srcDoc={previewHtml}
            className="h-[min(640px,72vh)] w-full bg-white"
            sandbox="allow-scripts"
          />
        </div>

        <div className="mt-6 rounded-xl border border-stone-100 bg-stone-50/80 p-4 sm:p-5">
          <label htmlFor="client-feedback" className="text-sm font-semibold text-stone-900">
            Leave feedback
          </label>
          <p className="mt-1 text-xs text-stone-500">Share what feels right, what to tweak, or questions for your team.</p>
          <textarea
            id="client-feedback"
            rows={3}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="For example: “Love the new headline — can we make the contact button more visible on mobile?”"
            className="mt-3 w-full resize-y rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
          />
          <div className="mt-3 flex justify-end">
            <Button type="button" className="bg-amber-700 text-white hover:bg-amber-800" onClick={submitFeedback} disabled={!feedback.trim()}>
              Send to your team
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Recent changes</p>
          <p className="mt-1 text-xs text-stone-500">What we shipped or adjusted lately.</p>
          <ul className="mt-4 space-y-3">
            {activityFromBuilder.length === 0 && activityHighlights.length === 0 ? (
              <li className="text-sm text-stone-500">Updates will appear here as we publish changes.</li>
            ) : null}
            {activityFromBuilder.map((row) => (
              <li key={row.id} className="flex gap-2 text-sm leading-relaxed text-stone-800">
                <span className="mt-0.5 shrink-0 text-amber-600" aria-hidden>
                  ·
                </span>
                <span>{row.label}</span>
              </li>
            ))}
          </ul>
          {activityHighlights.length > 0 ? (
            <>
              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Highlights</p>
              <ul className="mt-3 space-y-2.5">
                {activityHighlights.map((row) => (
                  <li key={row.id} className="flex gap-2 text-sm text-stone-700">
                    <span className="shrink-0 font-medium text-emerald-600">✓</span>
                    <span>{row.label}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Next step</p>
          <p className="mt-3 text-base font-medium leading-relaxed text-stone-900">{experience.nextStep}</p>
        </section>
      </div>

      {fullscreen && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-stone-950/95 p-3 backdrop-blur-md sm:p-5">
          <div className="flex shrink-0 justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              className="border-white/10 bg-stone-800 text-white hover:bg-stone-700"
              onClick={() => setPreviewNonce((n) => n + 1)}
            >
              <RefreshCw className="mr-2 h-4 w-4" strokeWidth={2} />
              View latest version
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="border-white/10 bg-stone-800 text-white hover:bg-stone-700"
              onClick={() => setFullscreen(false)}
            >
              Close preview
            </Button>
          </div>
          <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/10">
            <iframe
              key={`fs-${previewNonce}`}
              title="Full preview"
              srcDoc={previewHtml}
              className="h-full w-full bg-white"
              sandbox="allow-scripts"
            />
          </div>
        </div>
      )}
    </div>
  );
}

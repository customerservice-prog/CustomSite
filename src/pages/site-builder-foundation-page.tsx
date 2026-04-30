import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Copy, ExternalLink, Eye, Loader2, Maximize2, Plus, Rocket, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProjects } from '@/store/hooks';
import type { ProjectSite } from '@/lib/site-builder/project-site-model';
import { newFile } from '@/lib/site-builder/project-site-model';
import { createStarterFiles } from '@/lib/site-builder/create-starter-files';
import { projectSiteArchetype } from '@/lib/site-builder/archetypes';
import {
  duplicateLastSection,
  deleteLatestInsertedSection,
  insertSectionIntoIndexHtml,
  SPEED_SECTION_SNIPPET,
} from '@/lib/site-builder/quick-html-insert';
import { buildSectionByTemplateId } from '@/lib/site-templates/section-catalog';
import type { SectionTemplateRow } from '@/lib/site-templates/section-catalog';
import { openClientSitePreviewTab } from '@/lib/site-builder/open-client-site-preview';
import { useProjectSiteWorkspaceStore } from '@/store/use-project-site-workspace-store';
import { SectionLibraryPopover } from '@/components/site-builder/section-library-popover';
import { SiteBuilderPreviewDebugPanel } from '@/components/site-builder/site-builder-preview-debug-panel';
import { SiteBuilderPreviewErrorBoundary } from '@/components/site-builder/site-builder-preview-error-boundary';
import { useShell } from '@/context/shell-context';
import { cn } from '@/lib/utils';

const BASE_FILES = ['index.html', 'styles.css', 'script.js'] as const;

export function SiteBuilderFoundationPage() {
  const { toast } = useShell();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useParams<{ projectId?: string }>();
  const projects = useProjects();
  const siteProjects = useMemo(
    () => projects.filter((p) => p.deliveryFocus === 'client_site').sort((a, b) => a.name.localeCompare(b.name)),
    [projects]
  );

  const paramProject = params.projectId || '';
  const projectQueryValid = Boolean(paramProject && siteProjects.some((p) => p.id === paramProject));
  const projectId = projectQueryValid ? paramProject : '';
  const project = siteProjects.find((p) => p.id === projectId);

  const row = useProjectSiteWorkspaceStore((s) => (projectId ? s.byProjectId[projectId] : undefined));
  const quickAddPageNonce = useProjectSiteWorkspaceStore((s) => s.quickAddPageNonce);
  const hydrate = useProjectSiteWorkspaceStore((s) => s.hydrate);
  const patchSiteFile = useProjectSiteWorkspaceStore((s) => s.patchSiteFile);
  const setSiteImmediate = useProjectSiteWorkspaceStore((s) => s.setSiteImmediate);
  const optimisticPersist = useProjectSiteWorkspaceStore((s) => s.optimisticPersist);
  const setActiveFileStore = useProjectSiteWorkspaceStore((s) => s.setActiveFile);
  const setBuilderSurface = useProjectSiteWorkspaceStore((s) => s.setBuilderSurface);
  const appendSnapshot = useProjectSiteWorkspaceStore((s) => s.appendSnapshot);
  const copySiteBundle = useProjectSiteWorkspaceStore((s) => s.copySiteBundleForDuplicate);
  const flushPreview = useProjectSiteWorkspaceStore((s) => s.flushPreview);

  const site: ProjectSite = row?.site ?? { projectId: projectId || '', files: [] };
  const previewHtml = row?.previewHtml ?? '';
  const loadStatus = row?.loadStatus ?? 'idle';
  const loadError = row?.loadError ?? null;
  const saveStatus = row?.saveStatus ?? 'idle';
  const saveError = row?.saveError ?? null;
  const lastSavedAt = row?.lastSavedAt ?? null;
  const builderSurface = row?.builderSurface ?? 'code';
  const rbyanBusy = row?.rbyanBusy ?? false;

  const [activeFileId, setActiveFileId] = useState('index.html');
  const [draftContent, setDraftContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [booting, setBooting] = useState(false);
  const didInitEditor = useRef(false);
  const autoSeedRef = useRef(false);
  const prevLoadErrRef = useRef<string | null>(null);
  const prevSaveErrRef = useRef<string | null>(null);
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const fullscreenFrameRef = useRef<HTMLIFrameElement>(null);
  const [showQuickPageBar, setShowQuickPageBar] = useState(false);
  const [newPageSlug, setNewPageSlug] = useState('');
  const [previewIframeKey, setPreviewIframeKey] = useState(0);
  const [previewDebugLines, setPreviewDebugLines] = useState<string[]>([]);
  const [fullscreenPreviewOpen, setFullscreenPreviewOpen] = useState(false);

  const unsaved = draftContent !== savedContent;

  const fileTabs = useMemo(() => {
    const extra = site.files.map((f) => f.name).filter((n) => !BASE_FILES.includes(n as (typeof BASE_FILES)[number]));
    return [...BASE_FILES, ...extra];
  }, [site.files]);

  const missingCoreFiles = useMemo(() => {
    if (site.files.length === 0) return [];
    return BASE_FILES.filter((n) => !site.files.some((f) => f.name === n));
  }, [site.files]);

  const applyFileToEditor = useCallback(
    (s: ProjectSite, fileName: string) => {
      const f = s.files.find((x) => x.id === fileName || x.name === fileName);
      const text = f?.content ?? '';
      setActiveFileId(fileName);
      setActiveFileStore(projectId, fileName);
      setDraftContent(text);
      setSavedContent(text);
    },
    [projectId, setActiveFileStore]
  );

  useEffect(() => {
    didInitEditor.current = false;
    autoSeedRef.current = false;
    prevLoadErrRef.current = null;
    prevSaveErrRef.current = null;
  }, [projectId]);

  useEffect(() => {
    if (!loadError || loadError === prevLoadErrRef.current) return;
    prevLoadErrRef.current = loadError;
    const ts = new Date().toLocaleTimeString();
    setPreviewDebugLines((p) => [...p.slice(-38), `[${ts}] [workspace] Load: ${loadError}`]);
  }, [loadError]);

  useEffect(() => {
    if (!saveError || saveError === prevSaveErrRef.current) return;
    prevSaveErrRef.current = saveError;
    const ts = new Date().toLocaleTimeString();
    setPreviewDebugLines((p) => [...p.slice(-38), `[${ts}] [workspace] Save: ${saveError}`]);
  }, [saveError]);

  useEffect(() => {
    if (!unsaved || site.files.length === 0) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [unsaved, site.files.length]);

  useEffect(() => {
    if (!projectId) return;
    void hydrate(projectId);
  }, [projectId, hydrate]);

  useEffect(() => {
    if (!projectId || !row?.hydrated || didInitEditor.current) return;
    const s = useProjectSiteWorkspaceStore.getState().byProjectId[projectId]?.site;
    if (!s?.files.length) return;
    didInitEditor.current = true;
    const af = row.activeFile;
    const target = af && s.files.some((f) => f.name === af) ? af : 'index.html';
    applyFileToEditor(s, target);
  }, [projectId, row?.hydrated, row?.activeFile, applyFileToEditor]);

  useEffect(() => {
    if (!projectId || !row?.hydrated || unsaved) return;
    const f = site.files.find((x) => x.name === activeFileId || x.id === activeFileId);
    if (f && f.content !== draftContent) {
      setDraftContent(f.content);
      setSavedContent(f.content);
    }
  }, [projectId, row?.hydrated, row?.previewNonce, site, activeFileId, unsaved, draftContent]);

  useEffect(() => {
    setBuilderSurface(projectId, 'code');
  }, [projectId, setBuilderSurface]);

  useEffect(() => {
    if (!params.projectId || siteProjects.length === 0) return;
    if (projectQueryValid) return;
    navigate('/projects', { replace: true });
  }, [params.projectId, siteProjects.length, projectQueryValid, navigate]);

  useEffect(() => {
    if (!projectId || !unsaved) return;
    const t = window.setTimeout(() => {
      patchSiteFile(projectId, activeFileId, draftContent);
    }, 220);
    return () => window.clearTimeout(t);
  }, [draftContent, activeFileId, projectId, unsaved, patchSiteFile]);

  /** Auto-save to disk ~1.5s after edits settle (no version snapshot). */
  useEffect(() => {
    if (!projectId || !unsaved) return;
    const t = window.setTimeout(() => {
      patchSiteFile(projectId, activeFileId, draftContent);
      setSavedContent(draftContent);
      optimisticPersist(projectId, { snapshot: false });
    }, 1500);
    return () => window.clearTimeout(t);
  }, [draftContent, activeFileId, projectId, unsaved, patchSiteFile, optimisticPersist]);

  useEffect(() => {
    if (searchParams.get('quickPage') === '1') {
      setShowQuickPageBar(true);
      const next = new URLSearchParams(searchParams);
      next.delete('quickPage');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (quickAddPageNonce > 0) setShowQuickPageBar(true);
  }, [quickAddPageNonce]);

  const persistDraftQuiet = useCallback(() => {
    if (!projectId) return;
    patchSiteFile(projectId, activeFileId, draftContent);
    setSavedContent(draftContent);
    optimisticPersist(projectId, { snapshot: false });
  }, [projectId, activeFileId, draftContent, patchSiteFile, optimisticPersist]);

  const saveCurrentToSite = useCallback(() => {
    if (!projectId) return;
    patchSiteFile(projectId, activeFileId, draftContent);
    setSavedContent(draftContent);
    optimisticPersist(projectId, { snapshot: true });
  }, [projectId, activeFileId, draftContent, patchSiteFile, optimisticPersist]);

  useEffect(() => {
    const save = () => saveCurrentToSite();
    window.addEventListener('site-builder-save', save);
    return () => window.removeEventListener('site-builder-save', save);
  }, [saveCurrentToSite]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { source?: string; type?: string; detail?: string };
      if (d?.source !== 'site-builder-preview') return;
      const t = d.type ?? 'message';
      const detail = (d.detail ?? '').trim();
      const ts = new Date().toLocaleTimeString();
      const line =
        t === 'blocked-root-path'
          ? `[${ts}] Preview blocked navigation to ${detail || '…'}`
          : `[${ts}] ${t}${detail ? `: ${detail}` : ''}`;
      setPreviewDebugLines((prev) => [...prev.slice(-39), line]);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const resetPreview = useCallback(() => {
    setPreviewIframeKey((k) => k + 1);
    setPreviewDebugLines([]);
  }, []);

  useEffect(() => {
    const el = previewFrameRef.current;
    if (!el) return;
    el.srcdoc = previewHtml;
  }, [previewHtml, previewIframeKey]);

  useEffect(() => {
    if (!fullscreenPreviewOpen) return;
    const el = fullscreenFrameRef.current;
    if (!el) return;
    el.srcdoc = previewHtml;
  }, [fullscreenPreviewOpen, previewHtml, previewIframeKey]);

  useEffect(() => {
    if (!fullscreenPreviewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreenPreviewOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreenPreviewOpen]);

  useEffect(() => {
    if (searchParams.get('fullscreen') !== '1') return;
    if (!projectId || !row?.hydrated || site.files.length === 0) return;
    patchSiteFile(projectId, activeFileId, draftContent);
    flushPreview(projectId);
    setFullscreenPreviewOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('fullscreen');
    setSearchParams(next, { replace: true });
  }, [
    searchParams,
    setSearchParams,
    projectId,
    row?.hydrated,
    site.files.length,
    activeFileId,
    draftContent,
    patchSiteFile,
    flushPreview,
  ]);

  const syncDraftToStoreAndPreview = useCallback(() => {
    if (!projectId) return;
    patchSiteFile(projectId, activeFileId, draftContent);
    flushPreview(projectId);
  }, [projectId, activeFileId, draftContent, patchSiteFile, flushPreview]);

  const openFullscreenPreview = useCallback(() => {
    if (!projectId || site.files.length === 0) return;
    syncDraftToStoreAndPreview();
    setFullscreenPreviewOpen(true);
  }, [projectId, site.files.length, syncDraftToStoreAndPreview]);

  const openPreviewInNewTab = useCallback(() => {
    if (!projectId || site.files.length === 0) return;
    syncDraftToStoreAndPreview();
    const s = useProjectSiteWorkspaceStore.getState().byProjectId[projectId]?.site;
    if (!s?.files.length) return;
    const entry = activeFileId.toLowerCase().endsWith('.html') ? activeFileId : 'index.html';
    const w = openClientSitePreviewTab(s, { entryFile: entry });
    if (!w) toast('Allow popups for this app to open the preview tab.', 'error');
  }, [projectId, site.files.length, syncDraftToStoreAndPreview, activeFileId, toast]);

  const scrollPreviewIntoView = useCallback(() => {
    previewWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const patchIndexHtml = useCallback(
    (mutate: (html: string) => string) => {
      if (!projectId) return;
      const ix = useProjectSiteWorkspaceStore.getState().byProjectId[projectId]?.site.files.find((f) => f.name === 'index.html');
      if (!ix) return;
      const next = mutate(ix.content);
      patchSiteFile(projectId, 'index.html', next);
      if (activeFileId === 'index.html') {
        setDraftContent(next);
        setSavedContent(next);
      }
      optimisticPersist(projectId, { snapshot: false });
      scrollPreviewIntoView();
    },
    [projectId, patchSiteFile, activeFileId, optimisticPersist, scrollPreviewIntoView]
  );

  const insertSpeedBlock = useCallback(() => {
    patchIndexHtml((html) => insertSectionIntoIndexHtml(html, SPEED_SECTION_SNIPPET));
    toast('Section inserted', 'success');
  }, [patchIndexHtml, toast]);

  const insertCatalogSection = useCallback(
    (row: SectionTemplateRow) => {
      if (!project) return;
      const arch = projectSiteArchetype(project);
      const ctx = { siteTitle: project.name, clientCompany: undefined };
      const snippet = buildSectionByTemplateId(row.templateId, arch, ctx);
      if (!snippet) {
        toast('Could not build that section.', 'error');
        return;
      }
      patchIndexHtml((html) => insertSectionIntoIndexHtml(html, snippet));
      toast(`Inserted: ${row.libraryTitle}`, 'success');
    },
    [project, patchIndexHtml, toast]
  );

  const duplicateSection = useCallback(() => {
    patchIndexHtml((html) => duplicateLastSection(html));
    toast('Duplicated last section', 'info');
  }, [patchIndexHtml, toast]);

  const deleteSection = useCallback(() => {
    patchIndexHtml((html) => deleteLatestInsertedSection(html));
    toast('Removed last inserted block', 'info');
  }, [patchIndexHtml, toast]);

  useEffect(() => {
    const onInsert = () => insertSpeedBlock();
    window.addEventListener('workflow-insert-section', onInsert);
    return () => window.removeEventListener('workflow-insert-section', onInsert);
  }, [insertSpeedBlock]);

  const selectFile = useCallback(
    async (name: string) => {
      if (name === activeFileId) return;
      if (unsaved) persistDraftQuiet();
      if (projectId) flushPreview(projectId);
      const latest = useProjectSiteWorkspaceStore.getState().byProjectId[projectId]?.site;
      if (latest) applyFileToEditor(latest, name);
    },
    [activeFileId, unsaved, persistDraftQuiet, projectId, applyFileToEditor, flushPreview]
  );

  const onStartBlank = useCallback(async () => {
    if (!projectId) return;
    setBooting(true);
    try {
      const rich = project?.deliveryFocus === 'client_site';
      const next = await createStarterFiles(projectId, { rich });
      setSiteImmediate(projectId, next);
      appendSnapshot(
        projectId,
        rich ? 'Rich starter site' : 'Starter shell',
        [rich ? 'Multi-section homepage seed' : 'Blank HTML/CSS/JS from Site Builder'],
        siteFilesToVersionPayload(next)
      );
      applyFileToEditor(next, 'index.html');
    } finally {
      setBooting(false);
    }
  }, [projectId, project?.deliveryFocus, setSiteImmediate, appendSnapshot, applyFileToEditor]);

  useEffect(() => {
    if (!projectId || !row?.hydrated || autoSeedRef.current) return;
    if (site.files.length > 0) return;
    if (project?.deliveryFocus !== 'client_site') return;
    autoSeedRef.current = true;
    void (async () => {
      const next = await createStarterFiles(projectId, { rich: true });
      setSiteImmediate(projectId, next);
      appendSnapshot(projectId, 'Auto-seeded homepage', ['Created when opening an empty client site project'], siteFilesToVersionPayload(next));
      applyFileToEditor(next, 'index.html');
    })();
  }, [projectId, row?.hydrated, site.files.length, project?.deliveryFocus, setSiteImmediate, appendSnapshot, applyFileToEditor]);

  const addHtmlPage = useCallback(() => {
    const raw = newPageSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    if (!projectId || !raw) return;
    const name = raw.endsWith('.html') ? raw : `${raw}.html`;
    const cur = useProjectSiteWorkspaceStore.getState().byProjectId[projectId]?.site;
    if (!cur) return;
    if (cur.files.some((f) => f.name === name)) {
      toast('That page already exists.', 'info');
      return;
    }
    const title = name.replace(/\.html$/i, '');
    const boilerplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <main style="padding:2rem 1.5rem;max-width:48rem;margin:0 auto">
    <h1 style="margin:0 0 1rem;font-size:1.75rem">${title}</h1>
    <p style="color:#52525b;line-height:1.6">Start editing this page.</p>
  </main>
  <script src="script.js"></script>
</body>
</html>`;
    const siteNext: ProjectSite = { projectId, files: [...cur.files, newFile(name, boilerplate)] };
    setSiteImmediate(projectId, siteNext);
    applyFileToEditor(siteNext, name);
    void optimisticPersist(projectId, { snapshot: false });
    setNewPageSlug('');
    setShowQuickPageBar(false);
    toast(`Created ${name}`, 'success');
  }, [projectId, newPageSlug, setSiteImmediate, applyFileToEditor, optimisticPersist, toast]);

  const onDuplicateSite = useCallback(async () => {
    if (!projectId) return;
    const ok = await copySiteBundle(projectId);
    toast(ok ? 'Site JSON copied — duplicate in another project or doc.' : 'Clipboard failed.', ok ? 'success' : 'error');
  }, [projectId, copySiteBundle, toast]);

  if (!siteProjects.length) {
    return (
      <div className="rounded-2xl bg-slate-50 px-8 py-12 text-center shadow-sm ring-1 ring-slate-200/60">
        <p className="text-base font-semibold text-slate-900">No client-site projects</p>
        <Link to="/projects" className="mt-4 inline-block text-sm font-semibold text-violet-700">
          Go to projects
        </Link>
      </div>
    );
  }

  if (!projectQueryValid) {
    return (
      <div className="flex min-h-[200px] items-center justify-center gap-2 rounded-2xl bg-white text-sm text-slate-500 shadow-sm ring-1 ring-slate-200/50">
        <Loader2 className="h-5 w-5 animate-spin text-violet-500" aria-hidden />
        Opening…
      </div>
    );
  }

  const hasFiles = site.files.length > 0;
  const loading = loadStatus === 'loading' && !row?.hydrated;
  const liveUrl = project?.siteLiveUrl;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-950 text-zinc-100">
      <header className="flex min-h-11 shrink-0 flex-col gap-1 border-b border-white/10 px-3 py-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/projects/${projectId}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-white/5 hover:text-white"
            aria-label="Back to project"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="min-w-0 truncate text-xs font-semibold text-zinc-200">{project?.name ?? 'Project'}</span>
          <span className="text-[10px] text-zinc-500">Site builder</span>
          <div className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />
          <div className="flex shrink-0 items-center rounded-lg border border-white/10 p-0.5">
            <Link
              to={`/rbyan?project=${encodeURIComponent(projectId)}`}
              onClick={() => setBuilderSurface(projectId, 'ai')}
              className={cn(
                'rounded-md px-2.5 py-1 text-[10px] font-semibold transition',
                builderSurface === 'ai' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              Build with AI
            </Link>
            <button
              type="button"
              onClick={() => setBuilderSurface(projectId, 'code')}
              className={cn(
                'rounded-md px-2.5 py-1 text-[10px] font-semibold transition',
                builderSurface === 'code' ? 'bg-white/15 text-white' : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              Edit code
            </button>
          </div>
          <div className="flex-1" />
          {saveStatus === 'saved' && !unsaved ? (
            <span className="text-[10px] font-medium text-emerald-400/90">
              Saved
              {lastSavedAt != null ? (
                <span className="ml-1 font-normal text-zinc-500" title="Last bundle written to local storage (API sync best-effort)">
                  · {new Date(lastSavedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                </span>
              ) : null}
            </span>
          ) : null}
          {loadError ? <span className="max-w-[200px] truncate text-[10px] text-amber-400">{loadError}</span> : null}
          {saveStatus === 'saving' ? (
            <span className="flex items-center gap-1 text-[10px] text-zinc-400">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              Saving…
            </span>
          ) : null}
          {saveStatus === 'error' && saveError ? (
            <span className="max-w-[220px] truncate text-[10px] text-amber-400" title={saveError}>
              {saveError}
            </span>
          ) : null}
          {rbyanBusy ? (
            <span className="flex items-center gap-1 text-[10px] text-violet-300">
              <Sparkles className="h-3 w-3" aria-hidden />
              Bryan the Brain is working…
            </span>
          ) : null}
          {hasFiles ? (
            <Button
              type="button"
              variant="secondary"
              className="h-8 border-zinc-600 bg-zinc-800 px-3 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
              onClick={() => saveCurrentToSite()}
            >
              Save
            </Button>
          ) : null}
        </div>
        {hasFiles ? (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-1.5">
            <Button
              type="button"
              variant="secondary"
              className="h-7 gap-1 border-white/10 bg-white/10 px-2 text-[10px] text-white hover:bg-white/15"
              onClick={() => insertSpeedBlock()}
            >
              <Plus className="h-3 w-3" aria-hidden />
              Add section
            </Button>
            <SectionLibraryPopover onInsert={(row) => insertCatalogSection(row)} />
            <Button
              type="button"
              variant="secondary"
              className="h-7 gap-1 border-white/10 bg-white/10 px-2 text-[10px] text-white hover:bg-white/15"
              onClick={() => duplicateSection()}
            >
              <Copy className="h-3 w-3" aria-hidden />
              Duplicate
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-7 gap-1 border-white/10 bg-white/10 px-2 text-[10px] text-white hover:bg-white/15"
              onClick={() => deleteSection()}
            >
              <Trash2 className="h-3 w-3" aria-hidden />
              Delete
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-7 border-white/10 bg-white/10 px-2 text-[10px] text-white hover:bg-white/15"
              title="Scroll to preview"
              onClick={() => scrollPreviewIntoView()}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden />
              Preview
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-7 gap-1 border-white/10 bg-white/10 px-2 text-[10px] text-white hover:bg-white/15"
              title="Full-screen preview (Esc to close)"
              onClick={() => openFullscreenPreview()}
            >
              <Maximize2 className="h-3.5 w-3.5" aria-hidden />
              Full screen
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-7 gap-1 border-white/10 bg-white/10 px-2 text-[10px] text-white hover:bg-white/15"
              title="Open composed HTML in a new tab (inlined CSS/JS)"
              onClick={() => openPreviewInNewTab()}
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              New tab
            </Button>
            {liveUrl ? (
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-600/20 px-2 text-[10px] font-semibold text-emerald-200 hover:bg-emerald-600/30"
              >
                <Rocket className="h-3 w-3" aria-hidden />
                Publish
              </a>
            ) : (
              <Button
                type="button"
                variant="secondary"
                className="h-7 gap-1 border-white/10 bg-white/10 px-2 text-[10px] text-zinc-400"
                onClick={() => navigate(`/projects/${projectId}`)}
              >
                <Rocket className="h-3 w-3" aria-hidden />
                Publish setup
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              className="h-7 gap-1 border-white/10 bg-white/10 px-2 text-[10px] text-white hover:bg-white/15"
              onClick={() => void onDuplicateSite()}
            >
              <Copy className="h-3 w-3" aria-hidden />
              Copy site
            </Button>
            <span className="ml-auto hidden text-[9px] text-zinc-600 sm:inline">⌘S save · ⌘⇧P page · ⌘⇧S section · ⌘/ AI</span>
          </div>
        ) : null}
        {showQuickPageBar && hasFiles ? (
          <div className="flex flex-wrap items-end gap-2 border-t border-violet-500/20 bg-violet-950/30 py-2">
            <div className="flex min-w-[12rem] flex-1 flex-col gap-0.5">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-violet-300">New page (⌘⇧P)</label>
              <Input
                value={newPageSlug}
                onChange={(e) => setNewPageSlug(e.target.value)}
                placeholder="about-us"
                className="h-8 border-white/10 bg-zinc-900 text-xs text-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addHtmlPage();
                  }
                }}
              />
            </div>
            <Button type="button" className="h-8 text-xs" onClick={() => addHtmlPage()}>
              Create page
            </Button>
            <Button type="button" variant="secondary" className="h-8 text-xs" onClick={() => setShowQuickPageBar(false)}>
              Close
            </Button>
          </div>
        ) : null}
      </header>

      {loading ? (
        <div className="flex items-center gap-2 border-b border-white/5 px-3 py-1.5 text-[11px] text-zinc-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Syncing project files…
        </div>
      ) : null}

      {!hasFiles ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="max-w-md text-sm text-zinc-400">No site files yet. Start with the default HTML, CSS, and JS shell.</p>
          <Button type="button" className="h-11 px-6 text-sm font-semibold" disabled={booting} onClick={() => void onStartBlank()}>
            {booting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {booting ? 'Creating…' : 'Start from blank code'}
          </Button>
        </div>
      ) : (
        <div className={cn('flex min-h-0 flex-1 flex-col lg:flex-row', loading && 'pointer-events-none opacity-60')}>
          <aside className="shrink-0 border-b border-white/10 p-2 lg:w-52 lg:border-b-0 lg:border-r">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Files</p>
            <ul className="space-y-0.5">
              {fileTabs.map((name) => {
                const exists = site.files.some((f) => f.name === name);
                const active = activeFileId === name;
                return (
                  <li key={name}>
                    <button
                      type="button"
                      disabled={!exists}
                      onClick={() => void selectFile(name)}
                      className={cn(
                        'w-full truncate rounded px-2 py-1.5 text-left text-xs transition-colors',
                        active ? 'bg-white/10 font-semibold text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200',
                        !exists && 'cursor-not-allowed opacity-40'
                      )}
                    >
                      {name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
          <section className="flex min-h-0 min-w-0 flex-1 flex-col border-b border-white/10 p-2 lg:border-b-0">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-zinc-500">{activeFileId}</span>
              {unsaved ? <span className="text-[10px] font-medium text-amber-400">Editing…</span> : null}
            </div>
            <textarea
              className="min-h-[min(52vh,480px)] w-full flex-1 resize-y rounded-md border border-white/10 bg-zinc-900 p-3 font-mono text-sm leading-relaxed text-zinc-100 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
              spellCheck={false}
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              aria-label={`Editor: ${activeFileId}`}
            />
          </section>
          <aside
            ref={previewWrapRef}
            className="flex min-h-[280px] shrink-0 flex-col p-2 lg:min-h-0 lg:w-[min(50%,560px)] lg:border-l lg:border-white/10"
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Preview</p>
              <Button
                type="button"
                variant="ghost"
                className="h-7 shrink-0 px-2 text-[10px] text-zinc-400 hover:text-zinc-100"
                onClick={resetPreview}
              >
                Reset preview
              </Button>
            </div>
            <SiteBuilderPreviewErrorBoundary
              key={previewIframeKey}
              onError={(msg) =>
                setPreviewDebugLines((prev) => [...prev.slice(-39), `[react] ${msg}`])
              }
            >
              <iframe
                id="preview"
                ref={previewFrameRef}
                title="Site preview"
                className="box-border min-h-[200px] w-full min-w-0 flex-1 rounded-md bg-white"
                style={{ width: '100%', height: '100%', border: 'none' }}
                sandbox="allow-scripts"
                referrerPolicy="no-referrer"
              />
            </SiteBuilderPreviewErrorBoundary>
            <SiteBuilderPreviewDebugPanel
              lines={previewDebugLines}
              loadError={loadError}
              saveError={saveError}
              saveStatus={saveStatus}
              unsaved={unsaved}
              lastSavedAt={lastSavedAt}
              previewHtml={previewHtml}
              missingCoreFiles={missingCoreFiles}
              onClear={() => setPreviewDebugLines([])}
            />
          </aside>
        </div>
      )}

      {fullscreenPreviewOpen ? (
        <div
          className="fixed inset-0 z-[200] flex flex-col bg-zinc-950/98 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Full-screen site preview"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
            <p className="truncate text-sm font-semibold text-white">{project?.name ?? 'Site'} — preview</p>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                className="h-8 gap-1 border-white/15 bg-white/10 px-2 text-xs text-white hover:bg-white/15"
                onClick={() => openPreviewInNewTab()}
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                New tab
              </Button>
              <Button type="button" className="h-8 px-3 text-xs font-semibold" onClick={() => setFullscreenPreviewOpen(false)}>
                Close
              </Button>
            </div>
          </div>
          <iframe
            ref={fullscreenFrameRef}
            title="Full-screen site preview"
            className="min-h-0 w-full flex-1 bg-white"
            style={{ width: '100%', height: '100%', border: 'none' }}
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
          />
          <p className="shrink-0 border-t border-white/10 px-3 py-1.5 text-center text-[10px] text-zinc-500">
            Press Esc to exit · Same isolated preview as the builder
          </p>
        </div>
      ) : null}
    </div>
  );
}

function siteFilesToVersionPayload(site: ProjectSite) {
  return site.files.map((f) => ({ name: f.name, type: f.type, content: f.content }));
}

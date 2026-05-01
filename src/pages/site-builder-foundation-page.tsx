import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  Code2,
  Copy,
  ExternalLink,
  Eye,
  LayoutTemplate,
  Loader2,
  Maximize2,
  Plus,
  Rocket,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Button, buttonClassName } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { useClients, useProjects } from '@/store/hooks';
import type { ProjectSite } from '@/lib/site-builder/project-site-model';
import { newFile } from '@/lib/site-builder/project-site-model';
import { createStarterFiles } from '@/lib/site-builder/create-starter-files';
import { saveProjectSite } from '@/lib/site-builder/project-site-storage';
import {
  buildSiteFromStarterTemplate,
  SITE_STARTER_TEMPLATE_LIST,
  type SiteStarterTemplateId,
} from '@/lib/site-builder/site-starter-templates';
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
import { createPreviewDebugEvent, type PreviewDebugEvent } from '@/lib/site-builder/preview-debug-events';
import { useProjectSiteWorkspaceStore } from '@/store/use-project-site-workspace-store';
import { SectionLibraryPopover } from '@/components/site-builder/section-library-popover';
import { SiteBuilderPreviewDebugPanel } from '@/components/site-builder/site-builder-preview-debug-panel';
import { SiteBuilderPreviewErrorBoundary } from '@/components/site-builder/site-builder-preview-error-boundary';
import { useShell } from '@/context/shell-context';
import { cn } from '@/lib/utils';

const BASE_FILES = ['index.html', 'styles.css', 'script.js'] as const;

const CLIENT_SITE_STATUS_LABEL: Record<'draft' | 'review' | 'live', string> = {
  draft: 'Draft — not on production URL yet',
  review: 'Review — QA or stakeholder sign-off',
  live: 'Live — production URL in use',
};

export function SiteBuilderFoundationPage() {
  const { toast } = useShell();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useParams<{ projectId?: string }>();
  const projects = useProjects();
  const clients = useClients();
  const siteProjects = useMemo(
    () => projects.filter((p) => p.deliveryFocus === 'client_site').sort((a, b) => a.name.localeCompare(b.name)),
    [projects]
  );

  const paramProject = params.projectId || '';
  const projectQueryValid = Boolean(paramProject && siteProjects.some((p) => p.id === paramProject));
  const projectId = projectQueryValid ? paramProject : '';
  const project = siteProjects.find((p) => p.id === projectId);

  const clientDisplayName = useMemo(() => {
    if (!project) return 'this project';
    const c = clients.find((x) => x.id === project.clientId);
    return c?.company || c?.name || project.name;
  }, [clients, project]);

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
  const importSiteBundleFromJson = useProjectSiteWorkspaceStore((s) => s.importSiteBundleFromJson);
  const recordPersistResult = useProjectSiteWorkspaceStore((s) => s.recordPersistResult);
  const flushPreview = useProjectSiteWorkspaceStore((s) => s.flushPreview);
  const revertWorkspaceToVersion = useProjectSiteWorkspaceStore((s) => s.revertWorkspaceToVersion);

  const site: ProjectSite = row?.site ?? { projectId: projectId || '', files: [] };
  const previewHtml = row?.previewHtml ?? '';
  const loadStatus = row?.loadStatus ?? 'idle';
  const loadError = row?.loadError ?? null;
  const saveStatus = row?.saveStatus ?? 'idle';
  const saveError = row?.saveError ?? null;
  const lastSavedAt = row?.lastSavedAt ?? null;
  const builderSurface = row?.builderSurface ?? 'code';
  const rbyanBusy = row?.rbyanBusy ?? false;
  const versions = row?.versions ?? [];

  const [activeFileId, setActiveFileId] = useState('index.html');
  const [draftContent, setDraftContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [booting, setBooting] = useState(false);
  const didInitEditor = useRef(false);
  const prevLoadErrRef = useRef<string | null>(null);
  const prevSaveErrRef = useRef<string | null>(null);
  const saveCloudToastSigRef = useRef<string | null>(null);
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const fullscreenFrameRef = useRef<HTMLIFrameElement>(null);
  const [showQuickPageBar, setShowQuickPageBar] = useState(false);
  const [newPageSlug, setNewPageSlug] = useState('');
  const [previewIframeKey, setPreviewIframeKey] = useState(0);
  const [previewDebugEvents, setPreviewDebugEvents] = useState<PreviewDebugEvent[]>([]);
  const [builderDebugExpanded, setBuilderDebugExpanded] = useState(false);
  const [fullscreenPreviewOpen, setFullscreenPreviewOpen] = useState(false);
  const [publishPanelOpen, setPublishPanelOpen] = useState(false);
  const [importBundleOpen, setImportBundleOpen] = useState(false);
  const [importPaste, setImportPaste] = useState('');
  const [previewPulse, setPreviewPulse] = useState(false);
  const [serverReachable, setServerReachable] = useState<boolean | null>(null);
  const [starterTemplatesOpen, setStarterTemplatesOpen] = useState(false);
  const [visualEditorMode, setVisualEditorMode] = useState(false);

  const modKey = useMemo(() => {
    if (typeof navigator === 'undefined') return 'Ctrl';
    const ua = navigator.userAgent || '';
    const p = navigator.platform || '';
    return /Mac|iPhone|iPod|iPad/i.test(p) || /Mac OS/.test(ua) ? '⌘' : 'Ctrl';
  }, []);

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

  const onImportBundle = useCallback(() => {
    if (!projectId) return;
    const r = importSiteBundleFromJson(projectId, importPaste);
    if (!r.ok) {
      toast(r.error, 'error');
      return;
    }
    const s = useProjectSiteWorkspaceStore.getState().byProjectId[projectId]?.site;
    if (!s?.files.length) {
      toast('Import produced no files.', 'error');
      return;
    }
    const pick = s.files.some((f) => f.name === 'index.html') ? 'index.html' : s.files[0]!.name;
    applyFileToEditor(s, pick);
    setImportBundleOpen(false);
    setImportPaste('');
    toast('Site files imported from bundle.', 'success');
    optimisticPersist(projectId, { snapshot: true });
  }, [projectId, importPaste, importSiteBundleFromJson, toast, applyFileToEditor, optimisticPersist]);

  useEffect(() => {
    didInitEditor.current = false;
    prevLoadErrRef.current = null;
    prevSaveErrRef.current = null;
  }, [projectId]);

  useEffect(() => {
    if (!loadError || loadError === prevLoadErrRef.current) return;
    prevLoadErrRef.current = loadError;
    setPreviewDebugEvents((p) => [...p.slice(-119), createPreviewDebugEvent('workspace-load', loadError)]);
  }, [loadError]);

  useEffect(() => {
    if (!saveError || saveError === prevSaveErrRef.current) return;
    prevSaveErrRef.current = saveError;
    setPreviewDebugEvents((p) => [...p.slice(-119), createPreviewDebugEvent('workspace-save', saveError)]);
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
    let cancelled = false;
    setServerReachable(null);
    fetch('/api/config/public', { credentials: 'same-origin' })
      .then((res) => {
        if (!cancelled) setServerReachable(res.ok);
      })
      .catch(() => {
        if (!cancelled) setServerReachable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

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

  const handleRevertVersion = useCallback(
    (versionId: string) => {
      if (!projectId) return;
      const result = revertWorkspaceToVersion(projectId, versionId);
      if (!result.ok) {
        toast(result.error, 'error');
        return;
      }
      const latest = useProjectSiteWorkspaceStore.getState().byProjectId[projectId]?.site;
      if (!latest?.files.length) return;
      const pick = latest.files.some((f) => f.name === activeFileId) ? activeFileId : 'index.html';
      applyFileToEditor(latest, pick);
      flushPreview(projectId);
      toast('Workspace restored from snapshot.', 'success');
    },
    [projectId, revertWorkspaceToVersion, toast, activeFileId, applyFileToEditor, flushPreview]
  );

  const openPublishPanel = useCallback(() => {
    saveCurrentToSite();
    setPublishPanelOpen(true);
  }, [saveCurrentToSite]);

  const openProjectWorkspaceNewTab = useCallback(() => {
    if (!projectId) return;
    const u = new URL(window.location.href);
    u.hash = `#/projects/${projectId}`;
    const w = window.open(u.toString(), '_blank', 'noopener,noreferrer');
    if (!w) toast('Allow popups to open the project workspace.', 'error');
  }, [projectId, toast]);

  const openPublishDashboardNewTab = useCallback(() => {
    if (!projectId) return;
    const w = window.open(`/site-builder.html?project=${encodeURIComponent(projectId)}`, '_blank', 'noopener,noreferrer');
    if (!w) toast('Allow popups to open the publish dashboard.', 'error');
  }, [projectId, toast]);

  const copyPublishUrl = useCallback(
    async (label: string, text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast(`${label} copied`, 'success');
      } catch {
        toast('Could not copy — select the URL and copy manually.', 'error');
      }
    },
    [toast]
  );

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
      const ev = createPreviewDebugEvent(t, detail);
      setPreviewDebugEvents((prev) => [...prev.slice(-119), ev]);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const resetPreview = useCallback(() => {
    setPreviewIframeKey((k) => k + 1);
    setPreviewDebugEvents([]);
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
    if (!publishPanelOpen || fullscreenPreviewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPublishPanelOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [publishPanelOpen, fullscreenPreviewOpen]);

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
    const el = previewWrapRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    });
    const shell = document.querySelector('main.flex-1.overflow-y-auto, main.min-h-0.flex-1.overflow-y-auto');
    if (shell) {
      const er = el.getBoundingClientRect();
      const sr = shell.getBoundingClientRect();
      const delta = er.top - sr.top - Math.max(24, (sr.height - er.height) / 3);
      if (Math.abs(delta) > 12) shell.scrollBy({ top: delta, behavior: 'smooth' });
    }
    setPreviewPulse(true);
    window.setTimeout(() => setPreviewPulse(false), 1400);
    toast('Preview brought into view.', 'info');
  }, [toast]);

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
      const { site: next, save } = await createStarterFiles(projectId, { rich });
      setSiteImmediate(projectId, next);
      recordPersistResult(projectId, save);
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
  }, [projectId, project?.deliveryFocus, setSiteImmediate, appendSnapshot, applyFileToEditor, recordPersistResult]);

  const onStartBlankMinimal = useCallback(async () => {
    if (!projectId) return;
    setBooting(true);
    try {
      const { site: next, save } = await createStarterFiles(projectId, { rich: false });
      setSiteImmediate(projectId, next);
      recordPersistResult(projectId, save);
      appendSnapshot(
        projectId,
        'Blank canvas',
        ['Minimal HTML/CSS/JS shell from Site Builder'],
        siteFilesToVersionPayload(next)
      );
      applyFileToEditor(next, 'index.html');
    } finally {
      setBooting(false);
    }
  }, [projectId, setSiteImmediate, appendSnapshot, applyFileToEditor, recordPersistResult]);

  const applyStarterTemplate = useCallback(
    async (tid: SiteStarterTemplateId) => {
      if (!projectId) return;
      setBooting(true);
      try {
        const next = buildSiteFromStarterTemplate(projectId, tid);
        setSiteImmediate(projectId, next);
        const save = await saveProjectSite(next);
        recordPersistResult(projectId, save);
        const label = SITE_STARTER_TEMPLATE_LIST.find((t) => t.id === tid)?.title ?? tid;
        appendSnapshot(projectId, `Template: ${label}`, ['Starter template from Site Builder'], siteFilesToVersionPayload(next));
        applyFileToEditor(next, 'index.html');
        setStarterTemplatesOpen(false);
        toast('Starter template applied. Switch to Code to edit files, or use Build with AI.', 'success');
      } catch {
        toast('Could not apply that template.', 'error');
      } finally {
        setBooting(false);
      }
    },
    [projectId, setSiteImmediate, recordPersistResult, appendSnapshot, applyFileToEditor, toast]
  );

  const setVisualModePersist = useCallback(
    (v: boolean) => {
      setVisualEditorMode(v);
      if (!projectId) return;
      try {
        localStorage.setItem(`customsite_site_builder_visual_${projectId}`, v ? '1' : '0');
      } catch {
        /* ignore */
      }
    },
    [projectId]
  );

  useEffect(() => {
    if (!projectId) return;
    try {
      setVisualEditorMode(localStorage.getItem(`customsite_site_builder_visual_${projectId}`) === '1');
    } catch {
      setVisualEditorMode(false);
    }
  }, [projectId]);

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
            onClick={(e) => {
              if (unsaved && !window.confirm('You have unsaved edits in the editor. Leave the site builder?')) {
                e.preventDefault();
              }
            }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-white/5 hover:text-white"
            aria-label="Back to project overview"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="min-w-0 truncate text-xs font-semibold text-zinc-200">{project?.name ?? 'Project'}</span>
          <span className="text-[10px] text-zinc-500">Site builder</span>
          <div className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />
          <div className="flex shrink-0 items-center rounded-lg border border-white/10 p-0.5">
            <Link
              to={`/rbyan?project=${encodeURIComponent(projectId)}`}
              onClick={(e) => {
                if (unsaved && !window.confirm('You have unsaved edits. Open AI Builder? (Your work is auto-saved locally when you leave.)')) {
                  e.preventDefault();
                  return;
                }
                setBuilderSurface(projectId, 'ai');
              }}
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
          {hasFiles ? (
            <div
              className="flex shrink-0 items-center rounded-lg border border-white/10 p-0.5"
              title="Visual: preview only for non-coders. Code: full editor for developers."
            >
              <button
                type="button"
                onClick={() => setVisualModePersist(true)}
                className={cn(
                  'flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition',
                  visualEditorMode ? 'bg-emerald-600/50 text-white' : 'text-zinc-400 hover:text-zinc-200'
                )}
              >
                <LayoutTemplate className="h-3 w-3 shrink-0" aria-hidden />
                Visual
              </button>
              <button
                type="button"
                onClick={() => setVisualModePersist(false)}
                className={cn(
                  'flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition',
                  !visualEditorMode ? 'bg-white/15 text-white' : 'text-zinc-400 hover:text-zinc-200'
                )}
              >
                <Code2 className="h-3 w-3 shrink-0" aria-hidden />
                Code
              </button>
            </div>
          ) : null}
          <div className="flex-1" />
          {saveStatus === 'saved' && !unsaved ? (
            <span className="text-[10px] font-medium text-emerald-400/90">
              Saved to server
              {lastSavedAt != null ? (
                <span className="ml-1 font-normal text-zinc-500" title="Server API accepted the last write">
                  · {new Date(lastSavedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                </span>
              ) : null}
            </span>
          ) : null}
          {saveStatus === 'saved_local_only' && !unsaved ? (
            <span
              className="max-w-[min(280px,46vw)] truncate text-[10px] font-medium text-amber-400/95"
              title={saveError ?? 'Cloud sync failed; see toast'}
            >
              Saved in this browser only
              {lastSavedAt != null ? (
                <span className="ml-1 font-normal text-zinc-500">
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
              AI Builder is working…
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
            <Button
              type="button"
              variant="secondary"
              className={cn(
                'h-7 gap-1 border px-2 text-[10px] font-semibold',
                liveUrl
                  ? 'border-emerald-500/40 bg-emerald-600/20 text-emerald-200 hover:bg-emerald-600/30'
                  : 'border-white/10 bg-white/10 text-zinc-200 hover:bg-white/15'
              )}
              title="Hosting, live URL, and deploy — without leaving the builder"
              onClick={() => openPublishPanel()}
            >
              <Rocket className="h-3 w-3" aria-hidden />
              Publish
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-7 gap-1 border-white/10 bg-white/10 px-2 text-[10px] text-white hover:bg-white/15"
              onClick={() => void onDuplicateSite()}
            >
              <Copy className="h-3 w-3" aria-hidden />
              Copy site
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-7 gap-1 border-white/10 bg-white/10 px-2 text-[10px] text-white hover:bg-white/15"
              title="Paste JSON from Copy site"
              onClick={() => setImportBundleOpen(true)}
            >
              Import site
            </Button>
            <span className="ml-auto hidden text-[9px] text-zinc-600 sm:inline">
              {modKey === '⌘' ? `${modKey}S save · ${modKey}⇧P page · ${modKey}⇧S section · ${modKey}/ AI` : `${modKey}+S save · ${modKey}+Shift+P page · ${modKey}+Shift+S section · ${modKey}+/ AI`}
            </span>
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
        <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-3 py-8 sm:px-6">
          <div className="w-full max-w-5xl space-y-4 text-left">
            <div className="flex flex-wrap items-center gap-2 text-violet-300">
              <Rocket className="h-5 w-5 shrink-0" aria-hidden />
              <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">Let&apos;s build {clientDisplayName}&apos;s site</h2>
            </div>
            <p className="text-sm text-zinc-400">No files yet — pick how you want to start:</p>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col rounded-2xl border-2 border-violet-500/50 bg-gradient-to-b from-violet-600/25 to-violet-950/40 p-4 shadow-lg shadow-violet-950/30 ring-1 ring-violet-400/20">
                <Sparkles className="h-6 w-6 text-violet-200" aria-hidden />
                <p className="mt-2 text-sm font-bold text-white">Build with AI</p>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-zinc-300">
                  Describe your site in plain language and let Bryan draft or refine pages while you watch the preview.
                </p>
                <Link
                  to={`/rbyan?project=${encodeURIComponent(projectId)}`}
                  className={buttonClassName('primary', 'mt-4 inline-flex h-11 w-full items-center justify-center text-sm')}
                  onClick={() => setBuilderSurface(projectId, 'ai')}
                >
                  Start with AI
                </Link>
              </div>
              <div className="flex flex-col rounded-2xl border border-white/10 bg-zinc-900/60 p-4 ring-1 ring-white/5">
                <LayoutTemplate className="h-6 w-6 text-zinc-300" aria-hidden />
                <p className="mt-2 text-sm font-bold text-white">Start from a template</p>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-zinc-400">
                  Pick a ready-made layout (restaurant, portfolio, store, and more). Customize copy and colors in Code or AI Builder.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-4 h-11 border-white/15 bg-white/10 text-sm font-semibold text-white hover:bg-white/15"
                  onClick={() => setStarterTemplatesOpen((o) => !o)}
                >
                  {starterTemplatesOpen ? 'Hide templates' : 'See templates'}
                </Button>
              </div>
              <div className="flex flex-col rounded-2xl border border-white/10 bg-zinc-900/60 p-4 ring-1 ring-white/5">
                <Code2 className="h-6 w-6 text-zinc-300" aria-hidden />
                <p className="mt-2 text-sm font-bold text-white">Start from blank code</p>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-zinc-400">
                  Opens a minimal HTML, CSS, and JS shell. Full control for developers who want to wire everything by hand.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-4 h-11 border-white/15 bg-white/10 text-sm font-semibold text-white hover:bg-white/15"
                  disabled={booting}
                  onClick={() => void onStartBlankMinimal()}
                >
                  {booting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Blank canvas
                </Button>
              </div>
            </div>
            {starterTemplatesOpen ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {SITE_STARTER_TEMPLATE_LIST.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    disabled={booting}
                    onClick={() => void applyStarterTemplate(t.id)}
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-left text-xs text-zinc-300 transition hover:border-violet-500/40 hover:bg-violet-950/30"
                  >
                    <span className="font-semibold text-white">{t.title}</span>
                    <span className="mt-1 block text-[11px] leading-snug text-zinc-500">{t.blurb}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className={cn('flex min-h-0 flex-1 flex-col', loading && 'pointer-events-none opacity-60')}>
          <div className={cn('flex min-h-0 flex-1 flex-col', !visualEditorMode && 'lg:flex-row')}>
            {!visualEditorMode ? (
              <>
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
              </>
            ) : (
              <div className="shrink-0 border-b border-white/10 bg-zinc-900/80 px-3 py-2.5 text-xs leading-relaxed text-zinc-400">
                <p className="font-medium text-zinc-200">Visual mode</p>
                <p className="mt-1">
                  Preview only — switch to <span className="text-zinc-300">Code</span> to edit files, or open{' '}
                  <Link to={`/rbyan?project=${encodeURIComponent(projectId)}`} className="text-violet-300 underline hover:text-violet-200">
                    AI Builder
                  </Link>{' '}
                  to describe changes in plain language.
                </p>
              </div>
            )}
            <aside
              id="site-builder-preview-anchor"
              ref={previewWrapRef}
              className={cn(
                'flex min-h-[280px] shrink-0 flex-col p-2 transition-shadow duration-300 lg:min-h-0 lg:border-white/10',
                visualEditorMode
                  ? 'min-h-[min(60vh,560px)] flex-1 border-b lg:border-b-0 lg:border-l-0'
                  : 'lg:w-[min(50%,560px)] lg:border-l',
                previewPulse && 'ring-2 ring-violet-500/60 ring-offset-2 ring-offset-zinc-950'
              )}
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
                setPreviewDebugEvents((prev) => [...prev.slice(-119), createPreviewDebugEvent('react-preview-boundary', msg)])
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
          </aside>
          </div>
          {!fullscreenPreviewOpen ? (
            <SiteBuilderPreviewDebugPanel
              events={previewDebugEvents}
              loadError={loadError}
              saveError={saveError}
              saveStatus={saveStatus}
              unsaved={unsaved}
              lastSavedAt={lastSavedAt}
              previewHtml={previewHtml}
              missingCoreFiles={missingCoreFiles}
              onClearEvents={() => setPreviewDebugEvents([])}
              serverReachable={serverReachable}
              rbyanBusy={rbyanBusy}
              versions={versions}
              onRevertVersion={handleRevertVersion}
              expanded={builderDebugExpanded}
              onExpandedChange={setBuilderDebugExpanded}
            />
          ) : null}
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
          {hasFiles ? (
            <SiteBuilderPreviewDebugPanel
              events={previewDebugEvents}
              loadError={loadError}
              saveError={saveError}
              saveStatus={saveStatus}
              unsaved={unsaved}
              lastSavedAt={lastSavedAt}
              previewHtml={previewHtml}
              missingCoreFiles={missingCoreFiles}
              onClearEvents={() => setPreviewDebugEvents([])}
              serverReachable={serverReachable}
              rbyanBusy={rbyanBusy}
              versions={versions}
              onRevertVersion={handleRevertVersion}
              expanded={builderDebugExpanded}
              onExpandedChange={setBuilderDebugExpanded}
            />
          ) : null}
          <p className="shrink-0 border-t border-white/10 px-3 py-1.5 text-center text-[10px] text-zinc-500">
            Press Esc to exit · Same isolated preview as the builder
          </p>
        </div>
      ) : null}

      {publishPanelOpen ? (
        <div className="fixed inset-0 z-[190] flex justify-end" role="dialog" aria-modal="true" aria-labelledby="publish-panel-title">
          <button
            type="button"
            className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
            aria-label="Close publish panel"
            onClick={() => setPublishPanelOpen(false)}
          />
          <aside className="drawer-panel-animate relative flex h-full w-full max-w-md flex-col border-l border-white/10 bg-zinc-950 shadow-2xl shadow-black/40">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
              <h2 id="publish-panel-title" className="text-sm font-semibold tracking-tight text-white">
                Publish & hosting
              </h2>
              <Button type="button" variant="secondary" className="h-8 border-white/15 bg-white/10 px-3 text-xs text-white" onClick={() => setPublishPanelOpen(false)}>
                Close
              </Button>
            </div>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 text-[13px] leading-relaxed text-zinc-300">
              <p className="text-xs text-zinc-500">
                You stay in the site builder. Use new tabs for workspace and deploy tools so this editor and preview stay open.
              </p>

              <section className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Builder save</p>
                <p className="mt-1.5 text-sm text-zinc-200">
                  {saveStatus === 'saving' && 'Saving to browser and cloud…'}
                  {saveStatus === 'saved' && 'Saved to server — the API reported success.'}
                  {saveStatus === 'saved_local_only' && 'Local only — cloud save failed (see message below).'}
                  {saveStatus === 'error' && 'Save error — check the message below.'}
                  {saveStatus === 'idle' && 'Save status will update after you edit or save.'}
                </p>
                {saveError ? <p className="mt-2 text-xs text-amber-200/95">{saveError}</p> : null}
                {lastSavedAt != null && saveStatus !== 'idle' ? (
                  <p className="mt-1 text-[11px] text-zinc-500">Last cloud/local write: {new Date(lastSavedAt).toLocaleString()}</p>
                ) : null}
              </section>

              <section className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Live site</p>
                {liveUrl ? (
                  <div className="mt-2 space-y-2">
                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 break-all text-sm font-semibold text-emerald-300 underline-offset-2 hover:text-emerald-200 hover:underline"
                    >
                      {liveUrl}
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    </a>
                    <div>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-8 border-white/15 bg-white/10 text-xs text-white"
                        onClick={() => void copyPublishUrl('Live URL', liveUrl)}
                      >
                        <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                        Copy URL
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-zinc-400">No production URL on this project yet. Set it from the project workspace.</p>
                )}
              </section>

              <section className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Program status</p>
                <p className="mt-2 text-sm text-zinc-200">
                  {project?.siteStatus ? CLIENT_SITE_STATUS_LABEL[project.siteStatus] : 'Site phase not set on this project.'}
                </p>
                {project?.lastSiteUpdateLabel ? (
                  <p className="mt-1.5 text-xs text-zinc-500">Last update: {project.lastSiteUpdateLabel}</p>
                ) : null}
              </section>

              <section className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Open in new tab</p>
                <div className="flex flex-col gap-2">
                  <Button type="button" className="h-9 justify-start text-left text-xs" onClick={() => openProjectWorkspaceNewTab()}>
                    Project workspace (hosting, URL, notes)
                    <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                  </Button>
                  <Button type="button" variant="secondary" className="h-9 justify-start border-white/15 bg-white/10 text-left text-xs text-white" onClick={() => openPublishDashboardNewTab()}>
                    Legacy publish dashboard (deploy / preview URL)
                    <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                  </Button>
                </div>
              </section>
            </div>
          </aside>
        </div>
      ) : null}

      <Modal open={importBundleOpen} onClose={() => setImportBundleOpen(false)} title="Import site bundle">
        <div className="space-y-3 text-sm text-slate-600">
          <p className="text-xs leading-relaxed">
            Paste the JSON copied with <strong>Copy site</strong>. This replaces all files in this project&apos;s workspace for this browser.
          </p>
          <Textarea
            value={importPaste}
            onChange={(e) => setImportPaste(e.target.value)}
            placeholder='{"projectId":"…","files":[…]}'
            className="min-h-[180px] font-mono text-xs"
            spellCheck={false}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setImportBundleOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void onImportBundle()}>
              Replace files
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function siteFilesToVersionPayload(site: ProjectSite) {
  return site.files.map((f) => ({ name: f.name, type: f.type, content: f.content }));
}

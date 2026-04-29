import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Code2,
  ExternalLink,
  LayoutTemplate,
  Loader2,
  Maximize2,
  Monitor,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Rocket,
  Smartphone,
  Tablet,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Dropdown, DropdownItem } from '@/components/ui/dropdown';
import { useShell } from '@/context/shell-context';
import { cn } from '@/lib/utils';
import { useClients, useProjects } from '@/store/hooks';
import { useAppStore } from '@/store/useAppStore';
import { adminFetchJson, getRailwayCredentials } from '@/lib/admin-api';
import { SiteHtmlEditorPanel, type BuilderSurfaceMode } from '@/components/site-builder/site-html-editor-panel';
import { SectionLibraryModal } from '@/components/site-builder/section-library-modal';
import { projectSiteArchetype, SITE_BUILD_ARCHETYPE_OPTIONS } from '@/lib/site-builder/archetypes';
import {
  appendChangelog,
  loadBuilderWorkflow,
  saveBuilderWorkflow,
  type BuilderWorkflowState,
} from '@/lib/site-builder/builder-workflow-storage';
import {
  insertBeforeBodyClose,
  insertCsSectionAfter,
  parsePageSections,
  removeCsSection,
  reorderCsSections,
} from '@/lib/site-builder/site-structure-html';
import { buildFullSiteIndexHtml, buildInteriorSitePageHtml, type InteriorPageKind } from '@/lib/site-templates/compose-site-html';
import { SECTION_LIBRARY_ROWS, buildSectionByTemplateId, type SectionTemplateRow } from '@/lib/site-templates/section-catalog';
import type { SiteBuildArchetypeId } from '@/lib/types/entities';

type SiteFileRow = { path: string; updated_at?: string | null; content_encoding?: string };

type SiteSeedOutcome = { ok: true } | { ok: false; error: string };

const PAGE_PUB_STORAGE = 'customsite_site_page_pub_v1';
const LAST_DEPLOY_STORAGE = 'customsite_last_deploy_v1';

const STATIC_PAGE_LABELS: Record<string, string> = {
  'index.html': 'Home',
  'services.html': 'Services',
  'about.html': 'About',
  'contact.html': 'Contact',
  'styles.css': 'Styles (CSS)',
};

const FALLBACK_PREVIEW_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Preview</title>
</head>
<body>
  <main style="font-family:system-ui,-apple-system,sans-serif;max-width:36rem;margin:4rem auto;padding:0 1.5rem;color:#64748b;line-height:1.6">
    <p style="font-size:0.875rem;letter-spacing:0.02em;text-transform:uppercase;color:#94a3b8;margin-bottom:1rem">Preview</p>
    <h1 style="font-size:1.375rem;font-weight:600;color:#0f172a;margin:0 0 0.75rem">Preview will show here</h1>
    <p style="margin:0">Add an HTML page (for example index.html) in the agency builder to preview this project site.</p>
  </main>
</body>
</html>`;

function loadPagePub(projectId: string): Record<string, 'draft' | 'published'> {
  try {
    const raw = localStorage.getItem(`${PAGE_PUB_STORAGE}:${projectId}`);
    if (!raw) return {};
    const o = JSON.parse(raw) as Record<string, string>;
    const out: Record<string, 'draft' | 'published'> = {};
    for (const [k, v] of Object.entries(o)) {
      if (v === 'draft' || v === 'published') out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function savePagePub(projectId: string, map: Record<string, 'draft' | 'published'>) {
  try {
    localStorage.setItem(`${PAGE_PUB_STORAGE}:${projectId}`, JSON.stringify(map));
  } catch {
    /* */
  }
}

function loadLastDeploy(projectId: string): { at: string; log?: string } | null {
  try {
    const raw = localStorage.getItem(`${LAST_DEPLOY_STORAGE}:${projectId}`);
    if (!raw) return null;
    return JSON.parse(raw) as { at: string; log?: string };
  } catch {
    return null;
  }
}

function saveLastDeploy(projectId: string, data: { at: string; log?: string }) {
  try {
    localStorage.setItem(`${LAST_DEPLOY_STORAGE}:${projectId}`, JSON.stringify(data));
  } catch {
    /* */
  }
}

function defaultPubForPath(path: string): 'draft' | 'published' {
  if (path === 'index.html' || path === 'styles.css') return 'published';
  return 'draft';
}

const BUILDER_SURFACE_STORAGE = 'customsite_site_builder_surface_mode_v1';

function isHtmlSitePath(path: string): boolean {
  return /\.html?$/i.test(path);
}

function readBuilderSurfaceMode(projectId: string): BuilderSurfaceMode {
  try {
    const v = localStorage.getItem(`${BUILDER_SURFACE_STORAGE}:${projectId}`);
    if (v === 'code' || v === 'templates') return v;
  } catch {
    /* */
  }
  return 'code';
}

function writeBuilderSurfaceMode(projectId: string, mode: BuilderSurfaceMode) {
  try {
    localStorage.setItem(`${BUILDER_SURFACE_STORAGE}:${projectId}`, mode);
  } catch {
    /* */
  }
}

function slugToHtmlPath(raw: string): string | null {
  const s = raw.trim().toLowerCase().replace(/^\/+/, '').replace(/\.html?$/i, '');
  if (!s || s.includes('..') || s.includes('/') || !/^[a-z0-9][a-z0-9-_]*$/i.test(s)) return null;
  return `${s}.html`;
}

function nameToSlug(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return s || 'page';
}

function friendlyPageName(path: string): string {
  const k = path.toLowerCase();
  if (STATIC_PAGE_LABELS[k]) return STATIC_PAGE_LABELS[k];
  const base = path.replace(/\.html?$/i, '').replace(/[-_]+/g, ' ');
  return base.replace(/\b\w/g, (c) => c.toUpperCase()) || path;
}

function formatRelativeSaved(ms: number): string {
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 4) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr}h ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDeployedAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export function SiteBuilderPage() {
  const { toast } = useShell();
  const navigate = useNavigate();
  const params = useParams<{ projectId?: string }>();
  const projects = useProjects();
  const clients = useClients();
  const setProjectSiteBuildArchetype = useAppStore((s) => s.setProjectSiteBuildArchetype);

  const siteProjects = useMemo(
    () => projects.filter((p) => p.deliveryFocus === 'client_site').sort((a, b) => a.name.localeCompare(b.name)),
    [projects]
  );

  const paramProject = params.projectId || '';
  const projectQueryValid = Boolean(paramProject && siteProjects.some((p) => p.id === paramProject));
  const activeProjectId = projectQueryValid ? paramProject : '';
  const invalidLockedGuard = useRef(false);
  const slugAutoRef = useRef(true);

  const activeProject = useMemo(
    () => siteProjects.find((p) => p.id === activeProjectId),
    [siteProjects, activeProjectId]
  );

  const clientForProject = useMemo(
    () => clients.find((c) => c.id === activeProject?.clientId),
    [clients, activeProject?.clientId]
  );

  const siteArchetype = useMemo(() => projectSiteArchetype(activeProject), [activeProject]);

  const [siteFiles, setSiteFiles] = useState<SiteFileRow[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [selectedServerPath, setSelectedServerPath] = useState('index.html');
  const [previewNonce, setPreviewNonce] = useState(0);
  const [previewRefreshing, setPreviewRefreshing] = useState(false);
  const [addPageOpen, setAddPageOpen] = useState(false);
  const [addPageName, setAddPageName] = useState('');
  const [addPageSlug, setAddPageSlug] = useState('');
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTargetPath, setRenameTargetPath] = useState<string | null>(null);
  const [renameSlug, setRenameSlug] = useState('');
  const [deleteConfirmPath, setDeleteConfirmPath] = useState<string | null>(null);
  const [siteSeeding, setSiteSeeding] = useState(false);
  const [siteSeedError, setSiteSeedError] = useState(false);
  const [newSiteChoiceOpen, setNewSiteChoiceOpen] = useState(false);
  const [newSiteChoiceMessage, setNewSiteChoiceMessage] = useState<string | null>(null);
  const [surfaceMode, setSurfaceMode] = useState<BuilderSurfaceMode>('code');
  const [sectionLibraryOpen, setSectionLibraryOpen] = useState(false);
  /** `null` = append before `</body>`; else insert after this section index. */
  const [insertSectionAfterIndex, setInsertSectionAfterIndex] = useState<number | null>(null);
  const [addPageInteriorKind, setAddPageInteriorKind] = useState<InteriorPageKind>('service');
  const [focusSectionRequest, setFocusSectionRequest] = useState<{ id: string } | null>(null);
  const [workflow, setWorkflow] = useState<BuilderWorkflowState>({
    reviewStatus: 'draft',
    feedbackNotes: '',
    changelog: [],
  });

  const [deployLoading, setDeployLoading] = useState(false);
  const [deployLog, setDeployLog] = useState('');
  const [deployPhase, setDeployPhase] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
  const [sessionDeployUrl, setSessionDeployUrl] = useState<string | null>(null);
  const [pagePub, setPagePub] = useState<Record<string, 'draft' | 'published'>>({});

  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewFullscreen, setPreviewFullscreen] = useState(false);

  const pagesRailRef = useRef<HTMLElement | null>(null);
  const previewRailRef = useRef<HTMLElement | null>(null);
  const publishAnchorRef = useRef<HTMLButtonElement | null>(null);

  const [editorContent, setEditorContent] = useState('');
  const [savedEditorContent, setSavedEditorContent] = useState('');
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAtMs, setSavedAtMs] = useState<number | null>(null);
  const [savedAgoLabel, setSavedAgoLabel] = useState('');

  const htmlPages = useMemo(() => siteFiles.filter((f) => /\.html?$/i.test(f.path)), [siteFiles]);
  const workspaceFiles = useMemo(
    () =>
      [...siteFiles]
        .filter((f) => /\.(html?|css|js|mjs)$/i.test(f.path))
        .sort((a, b) => {
          if (a.path === 'index.html') return -1;
          if (b.path === 'index.html') return 1;
          return a.path.localeCompare(b.path);
        }),
    [siteFiles]
  );
  const workspacePathsKey = useMemo(() => workspaceFiles.map((f) => f.path).join('|'), [workspaceFiles]);

  const previewMaxW = previewDevice === 'mobile' ? 375 : previewDevice === 'tablet' ? 768 : 1280;

  const previewPagePath = useMemo(() => {
    if (htmlPages.length === 0) return null;
    if (isHtmlSitePath(selectedServerPath) && htmlPages.some((f) => f.path === selectedServerPath)) {
      return selectedServerPath;
    }
    return htmlPages.find((f) => f.path === 'index.html')?.path ?? htmlPages[0]!.path;
  }, [htmlPages, selectedServerPath]);

  const pageSections = useMemo(() => {
    if (!isHtmlSitePath(selectedServerPath)) return [];
    return parsePageSections(editorContent);
  }, [editorContent, selectedServerPath]);

  const loadSiteFiles = useCallback(async (): Promise<boolean> => {
    if (!activeProjectId) return false;
    const r = await adminFetchJson<{ files?: SiteFileRow[] }>(`/api/admin/projects/${encodeURIComponent(activeProjectId)}/site`);
    if (!r.ok) {
      toast(r.error || 'Could not load pages', 'error');
      setSiteFiles([]);
      return false;
    }
    const files = r.data.files ?? [];
    setSiteFiles(files);
    setSelectedServerPath((prev) => {
      const editable = files.filter((f) => /\.(html?|css|js|mjs)$/i.test(f.path));
      if (!editable.length) return prev || 'index.html';
      if (editable.some((f) => f.path === prev)) return prev;
      return editable.find((f) => /\.html?$/i.test(f.path))?.path ?? editable[0]!.path;
    });
    return true;
  }, [activeProjectId, toast]);

  const refreshServerFiles = useCallback(async () => {
    if (!activeProjectId) return;
    setFilesLoading(true);
    await loadSiteFiles();
    setFilesLoading(false);
  }, [activeProjectId, loadSiteFiles]);

  const bootstrapHomepageCore = useCallback(async (): Promise<SiteSeedOutcome> => {
    if (!activeProjectId || !activeProject) return { ok: false, error: 'No project selected.' };
    const init = await adminFetchJson(`/api/admin/projects/${encodeURIComponent(activeProjectId)}/site/init`, {
      method: 'POST',
      json: { template: 'basic' },
    });
    if (!init.ok) {
      const err = init.error || 'Could not initialize the site folder';
      toast(err, 'error');
      return { ok: false, error: err };
    }
    const indexHtml = buildFullSiteIndexHtml(siteArchetype, {
      siteTitle: activeProject.name,
      clientCompany: clientForProject?.company,
    });
    const put = await adminFetchJson(`/api/admin/projects/${encodeURIComponent(activeProjectId)}/site/file`, {
      method: 'PUT',
      json: { path: 'index.html', content: indexHtml, content_encoding: 'utf8' },
    });
    if (!put.ok) {
      const err = put.error || 'Could not save homepage';
      toast(err, 'error');
      return { ok: false, error: err };
    }
    setWorkflow((w) => appendChangelog(activeProjectId, 'Generated full homepage structure', w));
    await refreshServerFiles();
    setSelectedServerPath('index.html');
    setPreviewNonce((n) => n + 1);
    return { ok: true };
  }, [activeProjectId, activeProject, siteArchetype, clientForProject?.company, toast, refreshServerFiles]);

  useEffect(() => {
    if (!activeProjectId || filesLoading) return;
    if (siteFiles.length > 0) {
      setNewSiteChoiceOpen(false);
      setNewSiteChoiceMessage(null);
      return;
    }
    setNewSiteChoiceOpen(true);
  }, [activeProjectId, filesLoading, siteFiles.length]);

  useEffect(() => {
    if (!activeProjectId) return;
    setSurfaceMode(readBuilderSurfaceMode(activeProjectId));
  }, [activeProjectId]);

  useEffect(() => {
    if (!params.projectId || siteProjects.length === 0) return;
    if (projectQueryValid) return;
    if (invalidLockedGuard.current) return;
    invalidLockedGuard.current = true;
    toast('That project is not a client website.', 'info');
    navigate('/projects', { replace: true });
  }, [params.projectId, siteProjects.length, projectQueryValid, navigate, toast]);

  useEffect(() => {
    if (!activeProjectId) return;
    setSiteSeedError(false);
    setPagePub(loadPagePub(activeProjectId));
    setWorkflow(loadBuilderWorkflow(activeProjectId));
    const d = loadLastDeploy(activeProjectId);
    setDeployLog(d?.log ?? '');
    setDeployPhase('idle');
    setSessionDeployUrl(null);
  }, [activeProjectId]);

  useEffect(() => {
    if (!activeProjectId) return;
    setSiteFiles([]);
    void refreshServerFiles();
  }, [activeProjectId, refreshServerFiles]);

  useEffect(() => {
    if (!activeProjectId || !selectedServerPath) return;
    if (!workspacePathsKey) return;
    const paths = workspacePathsKey.split('|').filter(Boolean);
    if (!paths.includes(selectedServerPath)) return;
    let cancelled = false;
    (async () => {
      setEditorLoading(true);
      setEditorError(null);
      const q = new URLSearchParams({ path: selectedServerPath }).toString();
      const r = await adminFetchJson<{ content?: string }>(
        `/api/admin/projects/${encodeURIComponent(activeProjectId)}/site/file?${q}`
      );
      if (cancelled) return;
      setEditorLoading(false);
      if (!r.ok) {
        const lower = selectedServerPath.toLowerCase();
        let fallback: string;
        if (lower.endsWith('.css')) {
          fallback = '/* File missing on server — add styles, then Save. */\n';
        } else if (lower.endsWith('.js') || lower.endsWith('.mjs')) {
          fallback = '// File missing on server — add script, then Save.\n';
        } else if (activeProject) {
          fallback = buildInteriorSitePageHtml(
            siteArchetype,
            friendlyPageName(selectedServerPath),
            activeProject.name,
            'service',
            clientForProject?.company
          );
        } else {
          fallback = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Page</title></head><body><p>Could not load.</p></body></html>';
        }
        setEditorContent(fallback);
        setSavedEditorContent(fallback);
        setEditorError("We couldn't load this file from the server. You can still edit and save.");
        return;
      }
      const text = r.data.content != null ? String(r.data.content) : '';
      setEditorContent(text);
      setSavedEditorContent(text);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeProjectId, selectedServerPath, workspacePathsKey, activeProject, siteArchetype, clientForProject?.company]);

  useEffect(() => {
    if (savedAtMs == null) {
      setSavedAgoLabel('');
      return;
    }
    const tick = () => setSavedAgoLabel(formatRelativeSaved(savedAtMs));
    tick();
    const id = window.setInterval(tick, 8000);
    return () => window.clearInterval(id);
  }, [savedAtMs]);

  useEffect(() => {
    if (!addPageOpen) return;
    if (!slugAutoRef.current) return;
    setAddPageSlug(nameToSlug(addPageName));
  }, [addPageName, addPageOpen]);

  useEffect(() => {
    if (!previewRefreshing) return;
    const t = window.setTimeout(() => setPreviewRefreshing(false), 1400);
    return () => window.clearTimeout(t);
  }, [previewRefreshing, previewNonce]);

  const dirty = editorContent !== savedEditorContent;

  const localPreviewHtml = useMemo(() => {
    if (!activeProject) return FALLBACK_PREVIEW_HTML;
    if (htmlPages.length === 0) return FALLBACK_PREVIEW_HTML;
    return buildFullSiteIndexHtml(siteArchetype, {
      siteTitle: activeProject.name,
      clientCompany: clientForProject?.company,
    });
  }, [activeProject, siteArchetype, clientForProject?.company, htmlPages.length]);

  const templateOutlineLabels = useMemo(
    () => ['Hero', 'Trust', 'Products', 'Bundles', 'Testimonials', 'CTA', 'Footer'],
    []
  );

  const statusForServerPath = useCallback(
    (path: string): 'draft' | 'published' => pagePub[path] ?? defaultPubForPath(path),
    [pagePub]
  );

  const setPathStatus = useCallback(
    (path: string, st: 'draft' | 'published') => {
      if (!activeProjectId) return;
      const next = { ...pagePub, [path]: st };
      setPagePub(next);
      savePagePub(activeProjectId, next);
    },
    [activeProjectId, pagePub]
  );

  const saveFile = useCallback(async () => {
    if (!activeProjectId || !selectedServerPath) return;
    setSaving(true);
    const r = await adminFetchJson(`/api/admin/projects/${encodeURIComponent(activeProjectId)}/site/file`, {
      method: 'PUT',
      json: { path: selectedServerPath, content: editorContent, content_encoding: 'utf8' },
    });
    setSaving(false);
    if (!r.ok) {
      toast(r.error, 'error');
      return;
    }
    setSavedEditorContent(editorContent);
    setSavedAtMs(Date.now());
    setSavedAgoLabel('just now');
    toast(`Saved ${friendlyPageName(selectedServerPath)} to the server.`, 'success');
    setPreviewRefreshing(true);
    setPreviewNonce((n) => n + 1);
    setWorkflow((w) => appendChangelog(activeProjectId, `Updated ${friendlyPageName(selectedServerPath)}`, w));
    void refreshServerFiles();
  }, [activeProjectId, selectedServerPath, editorContent, toast, refreshServerFiles]);

  async function seedFromTemplates(): Promise<SiteSeedOutcome> {
    if (!activeProjectId || !activeProject) return { ok: false, error: 'No project selected.' };
    setSiteSeeding(true);
    setSiteSeedError(false);
    const result = await bootstrapHomepageCore();
    setSiteSeeding(false);
    if (!result.ok) setSiteSeedError(true);
    return result;
  }

  async function createBlankCodeSite(): Promise<SiteSeedOutcome> {
    if (!activeProjectId || !activeProject) return { ok: false, error: 'No project selected.' };
    setSiteSeeding(true);
    setSiteSeedError(false);
    const init = await adminFetchJson(`/api/admin/projects/${encodeURIComponent(activeProjectId)}/site/init`, {
      method: 'POST',
      json: { template: 'basic' },
    });
    if (!init.ok) {
      const err = init.error || 'Could not initialize the site folder';
      toast(err, 'error');
      setSiteSeeding(false);
      setSiteSeedError(true);
      return { ok: false, error: err };
    }
    const titleSafe = activeProject.name.replace(/</g, '');
    const minimalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${titleSafe}</title>
<link rel="stylesheet" href="styles.css" />
</head>
<body>
  <main style="max-width:42rem;margin:3rem auto;padding:0 1.25rem;font-family:system-ui,sans-serif;line-height:1.6;color:#0f172a">
    <h1 style="font-size:1.5rem;margin-bottom:0.75rem">Blank site shell</h1>
    <p style="color:#475569">Edit in <strong>Code</strong> mode, or switch to <strong>Templates</strong> to seed conversion sections.</p>
  </main>
</body>
</html>`;
    const putHtml = await adminFetchJson(`/api/admin/projects/${encodeURIComponent(activeProjectId)}/site/file`, {
      method: 'PUT',
      json: { path: 'index.html', content: minimalHtml, content_encoding: 'utf8' },
    });
    if (!putHtml.ok) {
      const err = putHtml.error || 'Could not save index.html';
      toast(err, 'error');
      setSiteSeeding(false);
      setSiteSeedError(true);
      return { ok: false, error: err };
    }
    const css = `/* ${titleSafe} — global styles */\n\nbody {\n  margin: 0;\n  background: #f8fafc;\n}\n`;
    const putCss = await adminFetchJson(`/api/admin/projects/${encodeURIComponent(activeProjectId)}/site/file`, {
      method: 'PUT',
      json: { path: 'styles.css', content: css, content_encoding: 'utf8' },
    });
    if (!putCss.ok) {
      const err = putCss.error || 'Could not save styles.css';
      toast(err, 'error');
      setSiteSeeding(false);
      setSiteSeedError(true);
      return { ok: false, error: err };
    }
    setWorkflow((w) => appendChangelog(activeProjectId, 'Created blank index.html + styles.css', w));
    await refreshServerFiles();
    setSelectedServerPath('index.html');
    setPreviewNonce((n) => n + 1);
    setSiteSeeding(false);
    return { ok: true };
  }

  async function createBlankPage() {
    const path = slugToHtmlPath(addPageSlug);
    if (!path || !activeProjectId || !activeProject) {
      toast('Choose a short page address using letters, numbers, or hyphens.', 'error');
      return;
    }
    if (siteFiles.some((f) => f.path === path)) {
      toast('A page with that address already exists.', 'error');
      return;
    }
    const title = (addPageName.trim() || path.replace(/\.html$/i, '').replace(/[-_]/g, ' ')).replace(/</g, '');
    const pageHtml = buildInteriorSitePageHtml(
      siteArchetype,
      title,
      activeProject.name,
      addPageInteriorKind,
      clientForProject?.company
    );
    const r = await adminFetchJson(`/api/admin/projects/${encodeURIComponent(activeProjectId)}/site/file`, {
      method: 'PUT',
      json: { path, content: pageHtml, content_encoding: 'utf8' },
    });
    if (!r.ok) {
      toast(r.error, 'error');
      return;
    }
    setAddPageOpen(false);
    setAddPageName('');
    setAddPageSlug('');
    slugAutoRef.current = true;
    setWorkflow((w) =>
      appendChangelog(
        activeProjectId,
        `Added page “${title}” (${addPageInteriorKind === 'landing' ? 'landing' : 'service'} structure)`,
        w
      )
    );
    await refreshServerFiles();
    setSelectedServerPath(path);
    setPreviewNonce((n) => n + 1);
  }

  function applySectionFromLibrary(item: SectionTemplateRow) {
    if (!activeProject) return;
    if (!isHtmlSitePath(selectedServerPath)) {
      toast('Open an HTML page to insert conversion sections.', 'info');
      return;
    }
    const ctx = {
      siteTitle: activeProject.name,
      clientCompany: clientForProject?.company,
      pageTitle: friendlyPageName(selectedServerPath),
    };
    const block = buildSectionByTemplateId(item.templateId, siteArchetype, ctx);
    if (!block) {
      toast('Could not build that section.', 'error');
      return;
    }
    const pageName = friendlyPageName(selectedServerPath);
    const afterIdx = insertSectionAfterIndex;
    let next: string;
    if (afterIdx === null) {
      next = insertBeforeBodyClose(editorContent, block);
    } else {
      next = insertCsSectionAfter(editorContent, afterIdx, block);
    }
    setEditorContent(next);
    setSectionLibraryOpen(false);
    setInsertSectionAfterIndex(null);
    if (activeProjectId) {
      const where = afterIdx === null ? `on ${pageName}` : `below “${pageSections[afterIdx]?.label ?? 'section'}” on ${pageName}`;
      setWorkflow((w) => appendChangelog(activeProjectId, `Inserted “${item.libraryTitle}” ${where}`, w));
    }
    setPreviewRefreshing(true);
    setPreviewNonce((n) => n + 1);
  }

  function removeSectionAt(index: number) {
    const label = pageSections[index]?.label ?? 'Section';
    const pageName = friendlyPageName(selectedServerPath);
    setEditorContent(removeCsSection(editorContent, index));
    if (activeProjectId) {
      setWorkflow((w) => appendChangelog(activeProjectId, `Removed ${label} from ${pageName}`, w));
    }
    setPreviewRefreshing(true);
    setPreviewNonce((n) => n + 1);
  }

  function moveSection(from: number, delta: number) {
    const to = from + delta;
    if (to < 0 || to >= pageSections.length) return;
    const a = pageSections[from]?.label ?? 'Section';
    const b = pageSections[to]?.label ?? 'section';
    const pageName = friendlyPageName(selectedServerPath);
    setEditorContent(reorderCsSections(editorContent, from, to));
    if (activeProjectId) {
      const dir = delta < 0 ? 'above' : 'below';
      setWorkflow((w) => appendChangelog(activeProjectId, `Moved ${a} ${dir} ${b} on ${pageName}`, w));
    }
    setPreviewRefreshing(true);
    setPreviewNonce((n) => n + 1);
  }

  async function runPublish() {
    if (!activeProjectId) return;
    setDeployLoading(true);
    setDeployPhase('deploying');
    setDeployLog('Deploying…');
    const rail = getRailwayCredentials();
    const r = await adminFetchJson<Record<string, unknown>>(`/api/admin/projects/${encodeURIComponent(activeProjectId)}/deploy`, {
      method: 'POST',
      json: {
        environment: 'staging',
        token: rail.token || undefined,
        teamId: rail.teamId || undefined,
      },
    });
    setDeployLoading(false);
    if (!r.ok) {
      setDeployPhase('error');
      const next = `Couldn't complete deploy.\n${r.error}\n`;
      setDeployLog(next);
      saveLastDeploy(activeProjectId, { at: new Date().toISOString(), log: next });
      toast(r.error, 'error');
      return;
    }
    const d = r.data;
    let log = '';
    const steps = d.steps as { status?: string; label?: string; detail?: string }[] | undefined;
    if (Array.isArray(steps)) {
      for (const s of steps) {
        const mark = s.status === 'done' ? 'Done' : s.status === 'error' ? 'Issue' : '…';
        log += `${mark} · ${s.label}${s.detail ? ` — ${s.detail}` : ''}\n`;
      }
    }
    if (d.publicUrl) {
      log += `Live link: ${String(d.publicUrl)}\n`;
      setSessionDeployUrl(String(d.publicUrl));
    }
    if (d.message) log += `${String(d.message)}\n`;
    if (d.note) log += `${String(d.note)}\n`;
    if (d.error) log += `${String(d.error)}\n`;
    if (d.manualUrl || d.downloadZip) log += `Download: ${String(d.manualUrl || d.downloadZip)}\n`;
    const at = new Date().toISOString();
    const fullLog = log.trim() ? log : 'Publish finished.';
    setDeployLog(fullLog);
    saveLastDeploy(activeProjectId, { at, log: fullLog });
    const bad = 'ok' in d && d.ok === false;
    setDeployPhase(bad ? 'error' : 'success');
    if (bad) {
      toast('Publish finished with issues. Open details below.', 'error');
    } else {
      toast('Publish response received — check the log below for environment-specific notes.', 'success');
    }
  }

  function openRenameFor(path: string) {
    setRenameTargetPath(path);
    setRenameSlug(path.replace(/\.html?$/i, ''));
    setRenameOpen(true);
  }

  async function confirmRename() {
    if (!activeProjectId || !renameTargetPath) return;
    const newPath = slugToHtmlPath(renameSlug);
    if (!newPath || newPath === renameTargetPath) {
      toast('Enter a valid address.', 'error');
      return;
    }
    if (siteFiles.some((f) => f.path === newPath)) {
      toast('That name is already in use.', 'error');
      return;
    }
    const q = new URLSearchParams({ path: renameTargetPath }).toString();
    const getR = await adminFetchJson<{ content?: string }>(
      `/api/admin/projects/${encodeURIComponent(activeProjectId)}/site/file?${q}`
    );
    if (!getR.ok) {
      toast(getR.error, 'error');
      return;
    }
    const content = getR.data.content != null ? String(getR.data.content) : '';
    const putR = await adminFetchJson(`/api/admin/projects/${encodeURIComponent(activeProjectId)}/site/file`, {
      method: 'PUT',
      json: { path: newPath, content, content_encoding: 'utf8' },
    });
    if (!putR.ok) {
      toast(putR.error, 'error');
      return;
    }
    const delR = await adminFetchJson(
      `/api/admin/projects/${encodeURIComponent(activeProjectId)}/site/file?${new URLSearchParams({ path: renameTargetPath }).toString()}`,
      { method: 'DELETE' }
    );
    if (!delR.ok) {
      toast(delR.error || 'Rename almost worked — check pages list.', 'error');
    }
    const st = pagePub[renameTargetPath];
    if (st && activeProjectId) {
      const next = { ...pagePub };
      delete next[renameTargetPath];
      next[newPath] = st;
      setPagePub(next);
      savePagePub(activeProjectId, next);
    }
    setRenameOpen(false);
    setRenameTargetPath(null);
    setRenameSlug('');
    await refreshServerFiles();
    setSelectedServerPath(newPath);
    setPreviewNonce((n) => n + 1);
  }

  async function confirmDelete() {
    if (!activeProjectId || !deleteConfirmPath) return;
    const htmlOnly = htmlPages.map((p) => p.path);
    if (deleteConfirmPath === 'index.html' && htmlOnly.length <= 1) {
      toast('Keep at least one page on your site.', 'error');
      setDeleteConfirmPath(null);
      return;
    }
    const delR = await adminFetchJson(
      `/api/admin/projects/${encodeURIComponent(activeProjectId)}/site/file?${new URLSearchParams({ path: deleteConfirmPath }).toString()}`,
      { method: 'DELETE' }
    );
    if (!delR.ok) {
      toast(delR.error, 'error');
      return;
    }
    const next = { ...pagePub };
    delete next[deleteConfirmPath];
    setPagePub(next);
    savePagePub(activeProjectId, next);
    setDeleteConfirmPath(null);
    await refreshServerFiles();
    if (selectedServerPath === deleteConfirmPath) {
      setSelectedServerPath('index.html');
    }
    setPreviewNonce((n) => n + 1);
  }

  const canPreview = Boolean(activeProjectId) && previewPagePath != null && /\.html?$/i.test(previewPagePath);

  const previewSrc =
    canPreview && activeProjectId
      ? `/preview/${encodeURIComponent(activeProjectId)}/${encodeURIComponent(previewPagePath)}?t=${previewNonce}`
      : null;

  const liveSiteHref = activeProject?.siteLiveUrl?.trim() || sessionDeployUrl || '';

  const lastDeploy = activeProjectId ? loadLastDeploy(activeProjectId) : null;

  const deviceBtn = (id: 'desktop' | 'tablet' | 'mobile', Icon: LucideIcon) => (
    <button
      type="button"
      key={id}
      onClick={() => setPreviewDevice(id)}
      className={cn(
        'rounded-md p-2 transition-all duration-200',
        previewDevice === id
          ? 'bg-white/10 text-white ring-1 ring-white/15'
          : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
      )}
      aria-pressed={previewDevice === id}
      aria-label={id === 'desktop' ? 'Desktop width' : id === 'tablet' ? 'Tablet width' : 'Mobile width'}
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );

  const showServerPreview = Boolean(previewSrc);
  const previewDoc = showServerPreview ? undefined : localPreviewHtml;

  const previewIframe = (
    <iframe
      title="Live conversion preview"
      src={showServerPreview ? previewSrc! : undefined}
      srcDoc={previewDoc}
      onLoad={() => setPreviewRefreshing(false)}
      className="h-full min-h-0 w-full min-h-[min(52vh,560px)] flex-1 bg-white lg:min-h-[min(64vh,720px)]"
      sandbox="allow-same-origin allow-popups allow-scripts"
    />
  );

  if (!siteProjects.length) {
    return (
      <div className="rounded-2xl bg-slate-50 px-8 py-12 text-center shadow-sm ring-1 ring-slate-200/60">
        <p className="text-base font-semibold text-slate-900">No conversion-site projects yet</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
          Create a client-site project focused on leads, then open the conversion workspace from that project.
        </p>
        <Link to="/projects" className="mt-6 inline-flex text-sm font-semibold text-violet-700 hover:text-violet-800">
          Go to projects
        </Link>
      </div>
    );
  }

  if (!projectQueryValid && siteProjects.length > 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/50">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" aria-hidden />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  const showDeployStrip = deployPhase !== 'idle' || Boolean(deployLog) || Boolean(lastDeploy?.at);

  const patchWorkflow = useCallback(
    (patch: Partial<BuilderWorkflowState>) => {
      if (!activeProjectId) return;
      setWorkflow((w) => {
        const next = { ...w, ...patch };
        saveBuilderWorkflow(activeProjectId, next);
        return next;
      });
    },
    [activeProjectId]
  );

  const setSurfaceModePersist = useCallback(
    (mode: BuilderSurfaceMode) => {
      setSurfaceMode(mode);
      if (activeProjectId) writeBuilderSurfaceMode(activeProjectId, mode);
    },
    [activeProjectId]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden bg-zinc-950 text-zinc-100 max-lg:min-h-min max-lg:flex-none lg:min-h-0 lg:flex-1">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-white/10 px-2 sm:gap-2.5 sm:px-3">
        <Link
          to={`/projects/${activeProjectId}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
          aria-label="Back to project"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </Link>
        {siteProjects.length > 0 && (
          <Select
            id="site-builder-project-picker"
            aria-label="Project"
            className="h-8 max-w-[10rem] shrink-0 border-zinc-700 bg-zinc-900 text-xs text-zinc-100 sm:max-w-[12rem]"
            value={activeProjectId}
            onChange={(e) => {
              const id = e.target.value;
              if (id) navigate(`/projects/${id}/site`);
            }}
          >
            {siteProjects.map((p) => {
              const cl = clients.find((c) => c.id === p.clientId);
              return (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {cl?.company ? ` · ${cl.company}` : ''}
                </option>
              );
            })}
          </Select>
        )}
        <Select
          aria-label="File"
          className="h-8 min-w-0 flex-1 border-zinc-700 bg-zinc-900 text-xs text-zinc-100 sm:max-w-md"
          value={workspaceFiles.some((f) => f.path === selectedServerPath) ? selectedServerPath : (workspaceFiles[0]?.path ?? selectedServerPath)}
          disabled={!workspaceFiles.length}
          onChange={(e) => {
            setSelectedServerPath(e.target.value);
            setPreviewRefreshing(true);
            setPreviewNonce((n) => n + 1);
          }}
        >
          {workspaceFiles.length === 0 ? (
            <option value="">No files</option>
          ) : (
            workspaceFiles.map((f) => (
              <option key={f.path} value={f.path}>
                {friendlyPageName(f.path)}
              </option>
            ))
          )}
        </Select>
        <div className="hidden h-6 w-px shrink-0 bg-white/10 sm:block" aria-hidden />
        <div className="flex shrink-0 rounded-md bg-zinc-900/90 p-0.5 ring-1 ring-white/10" role="group" aria-label="Editor mode">
          <button
            type="button"
            onClick={() => setSurfaceModePersist('code')}
            className={cn(
              'inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold transition-all duration-200',
              surfaceMode === 'code'
                ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30'
                : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
            )}
          >
            <Code2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            Code
          </button>
          <button
            type="button"
            onClick={() => setSurfaceModePersist('templates')}
            className={cn(
              'inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold transition-all duration-200',
              surfaceMode === 'templates'
                ? 'bg-violet-500/20 text-violet-100 ring-1 ring-violet-400/35'
                : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
            )}
          >
            <LayoutTemplate className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            Templates
          </button>
        </div>
        <div className="min-w-2 flex-1" />
        {savedAtMs != null && !dirty && (
          <span className="hidden shrink-0 text-[10px] text-zinc-500 sm:inline tabular-nums">{savedAgoLabel || formatRelativeSaved(savedAtMs)}</span>
        )}
        <Button
          type="button"
          variant="secondary"
          className="h-8 shrink-0 border-zinc-600 bg-zinc-800 px-3 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
          disabled={saving || !dirty || editorLoading || siteFiles.length === 0}
          onClick={() => void saveFile()}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
        <Button
          ref={publishAnchorRef}
          type="button"
          className="h-8 shrink-0 px-4 text-xs font-semibold shadow-lg shadow-violet-950/40"
          disabled={deployLoading || !htmlPages.length}
          onClick={() => void runPublish()}
        >
          {deployLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" strokeWidth={1.75} />}
          {deployLoading ? 'Publishing…' : 'Publish site'}
        </Button>
        {liveSiteHref ? (
          <a
            href={liveSiteHref}
            target="_blank"
            rel="noopener noreferrer"
            title="View live site"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
          </a>
        ) : null}
      </header>

      {siteSeeding && (
        <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-violet-950/40 px-3 py-1 text-[11px] text-violet-200">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
          Creating site files…
        </div>
      )}
      {siteSeedError && !siteSeeding && (
        <div className="flex shrink-0 items-center gap-2 border-b border-red-500/20 bg-red-950/30 px-3 py-1 text-[11px] text-red-200">
          Starter files could not be created. Try again from the project screen.
        </div>
      )}
      {showDeployStrip && (
        <div className="relative flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-white/10 bg-black/35 px-3 py-1.5 text-[11px] text-zinc-400">
          {deployPhase === 'deploying' && (
            <span className="inline-flex items-center gap-1.5 font-medium text-amber-300/95">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
              Publishing…
            </span>
          )}
          {deployPhase === 'success' && <span className="font-semibold text-emerald-400">Published</span>}
          {deployPhase === 'error' && <span className="font-semibold text-red-400">Publish failed</span>}
          {deployPhase === 'idle' && deployLog && !deployLoading && <span>Last publish</span>}
          {lastDeploy?.at && <span className="text-zinc-500">· {formatDeployedAt(lastDeploy.at)}</span>}
          {deployLog && deployLog !== 'Deploying…' && (
            <details className="ml-auto">
              <summary className="cursor-pointer text-zinc-500 hover:text-zinc-300">Log</summary>
              <pre className="mt-1 max-h-36 overflow-auto rounded border border-white/10 bg-zinc-950 p-2 text-[10px] leading-relaxed text-zinc-300">
                {deployLog}
              </pre>
            </details>
          )}
        </div>
      )}

      <div className="group/studio flex min-h-0 flex-1 flex-col transition-opacity duration-200 max-lg:flex-none max-lg:overflow-visible lg:min-h-0 lg:flex-1 lg:flex-row lg:overflow-hidden lg:has-[#site-builder-editor-panel:focus-within]:[&_.studio-rail]:opacity-40 lg:has-[#site-builder-editor-panel:focus-within]:[&_.studio-rail]:hover:opacity-100">
        <aside
          ref={pagesRailRef}
          className="studio-rail flex w-full shrink-0 flex-col border-white/10 bg-zinc-900/50 lg:order-1 lg:w-52 lg:border-r"
        >
          <div className="flex items-center justify-between gap-2 border-b border-white/10 px-2 py-2">
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Files</span>
            <div className="flex items-center gap-0.5">
              {surfaceMode === 'templates' && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-7 gap-1 px-1.5 text-[10px] font-semibold text-zinc-400 hover:bg-white/5 hover:text-white"
                  onClick={() => {
                    setInsertSectionAfterIndex(null);
                    setSectionLibraryOpen(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                  Section
                </Button>
              )}
              <button
                type="button"
                title="New page"
                onClick={() => {
                  setAddPageOpen(true);
                  slugAutoRef.current = true;
                  setAddPageName('');
                  setAddPageSlug('');
                  setAddPageInteriorKind('service');
                }}
                className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3 lg:px-3">
            {filesLoading && (
              <div className="flex items-center gap-2 px-2 py-4 text-xs text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin text-zinc-600" />
                Loading…
              </div>
            )}
            {workspaceFiles.map((f) => {
              const active = selectedServerPath === f.path;
              const isPage = isHtmlSitePath(f.path);
              const st = statusForServerPath(f.path);
              return (
                <div
                  key={f.path}
                  className={cn(
                    'group flex items-stretch border-b border-white/5 transition-colors duration-150',
                    active ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedServerPath(f.path);
                      setPreviewRefreshing(true);
                      setPreviewNonce((n) => n + 1);
                    }}
                    className="min-w-0 flex-1 px-2.5 py-2.5 text-left transition-transform duration-150 active:scale-[0.99]"
                  >
                    <p className={cn('truncate text-xs', active ? 'font-semibold text-white' : 'font-medium text-zinc-400')}>
                      {friendlyPageName(f.path)}
                    </p>
                    {isPage ? (
                      <Badge
                        variant="neutral"
                        className={cn(
                          'mt-1 border-0 text-[9px] font-medium ring-1 ring-white/10',
                          st === 'published' ? 'bg-emerald-500/15 text-emerald-200' : 'bg-white/5 text-zinc-500'
                        )}
                      >
                        {st === 'published' ? 'Live' : 'Draft'}
                      </Badge>
                    ) : (
                      <Badge variant="neutral" className="mt-1 border-0 bg-white/5 text-[9px] font-medium text-zinc-500 ring-1 ring-white/10">
                        Asset
                      </Badge>
                    )}
                  </button>
                  <div className="flex shrink-0 items-start py-1 pr-0.5">
                    <Dropdown
                      align="right"
                      trigger={
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-zinc-500 opacity-100 transition-colors hover:bg-white/5 hover:text-zinc-200 sm:opacity-0 sm:group-hover:opacity-100"
                          aria-label="File options"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      }
                    >
                      <DropdownItem
                        onClick={() => {
                          setSelectedServerPath(f.path);
                          setPreviewRefreshing(true);
                          setPreviewNonce((n) => n + 1);
                        }}
                      >
                        Open
                      </DropdownItem>
                      {isPage && (
                        <DropdownItem
                          onClick={() => {
                            setSelectedServerPath(f.path);
                            setPreviewRefreshing(true);
                            setPreviewNonce((n) => n + 1);
                            window.requestAnimationFrame(() => {
                              document.getElementById('site-builder-editor-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            });
                          }}
                        >
                          Open in editor
                        </DropdownItem>
                      )}
                      <DropdownItem onClick={() => openRenameFor(f.path)}>Rename</DropdownItem>
                      <DropdownItem destructive onClick={() => setDeleteConfirmPath(f.path)}>
                        Delete
                      </DropdownItem>
                      {isPage && (
                        <DropdownItem onClick={() => setPathStatus(f.path, st === 'published' ? 'draft' : 'published')}>
                          {st === 'published' ? 'Mark as draft' : 'Mark as live'}
                        </DropdownItem>
                      )}
                    </Dropdown>
                  </div>
                </div>
              );
            })}
          </div>
          {surfaceMode === 'templates' && siteFiles.length > 0 && (
            <div className="shrink-0 border-t border-white/10 px-2 py-2">
              <Select
                className="h-7 w-full border-zinc-700 bg-zinc-950 text-[11px] text-zinc-100"
                value={siteArchetype}
                disabled={!activeProjectId}
                onChange={(e) => {
                  const v = e.target.value as SiteBuildArchetypeId;
                  if (activeProjectId) setProjectSiteBuildArchetype(activeProjectId, v);
                }}
              >
                {SITE_BUILD_ARCHETYPE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <div className="mt-1.5 flex gap-1">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-7 flex-1 border-zinc-700 bg-zinc-800 px-1.5 text-[10px] font-semibold text-zinc-100 hover:bg-zinc-700"
                  onClick={() => setSectionLibraryOpen(true)}
                >
                  Library
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-7 flex-1 border-zinc-700 bg-zinc-800 px-1.5 text-[10px] font-semibold text-zinc-100 hover:bg-zinc-700"
                  onClick={() => {
                    setAddPageOpen(true);
                    slugAutoRef.current = true;
                    setAddPageName('');
                    setAddPageSlug('');
                    setAddPageInteriorKind('service');
                  }}
                >
                  + Page
                </Button>
              </div>
            </div>
          )}
          {surfaceMode === 'templates' && siteFiles.length > 0 && isHtmlSitePath(selectedServerPath) && (
            <div id="site-builder-sections-anchor" className="min-h-0 max-h-[42vh] shrink-0 overflow-y-auto border-t border-white/10 px-2 py-2">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Structure</span>
                <button
                  type="button"
                  className="rounded p-1 text-zinc-500 hover:bg-white/5 hover:text-violet-300"
                  title="Add section"
                  onClick={() => {
                    setInsertSectionAfterIndex(null);
                    setSectionLibraryOpen(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
              {pageSections.length === 0 ? (
                selectedServerPath.toLowerCase() === 'index.html' ? (
                  <ul className="mt-1.5 space-y-0.5 border-l border-white/10 pl-2">
                    {templateOutlineLabels.map((label) => (
                      <li key={label} className="text-[10px] text-zinc-500">
                        {label}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1.5 text-[10px] text-zinc-500">Add sections below.</p>
                )
              ) : (
                <ul className="mt-1.5 space-y-0.5">
                  {pageSections.map((s, i) => (
                    <li key={s.id}>
                      <div className="flex items-center gap-0.5 rounded hover:bg-white/5">
                        <button
                          type="button"
                          onClick={() => setFocusSectionRequest({ id: s.id })}
                          className="min-w-0 flex-1 truncate px-1 py-0.5 text-left text-[10px] font-medium text-zinc-300"
                        >
                          {s.label}
                        </button>
                        <button
                          type="button"
                          className="rounded p-0.5 text-violet-400 hover:bg-violet-500/10"
                          title="Insert below"
                          aria-label="Insert section below"
                          onClick={() => {
                            setInsertSectionAfterIndex(i);
                            setSectionLibraryOpen(true);
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-0.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-30"
                          disabled={i === 0}
                          aria-label="Move up"
                          onClick={() => moveSection(i, -1)}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-0.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-30"
                          disabled={i === pageSections.length - 1}
                          aria-label="Move down"
                          onClick={() => moveSection(i, 1)}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-0.5 text-zinc-600 hover:text-red-400"
                          aria-label={`Remove ${s.label}`}
                          onClick={() => removeSectionAt(i)}
                        >
                          <Trash2 className="h-3 w-3" strokeWidth={2} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </aside>

        <section
          id="site-builder-editor-panel"
          tabIndex={-1}
          className="studio-editor order-2 flex min-h-[min(44vh,360px)] min-w-0 flex-col overflow-hidden outline-none transition-shadow duration-200 focus-within:shadow-[inset_0_0_0_1px_rgba(139,92,246,0.22)] max-lg:order-2 max-lg:flex-none lg:min-h-0 lg:flex-1"
        >
          <SiteHtmlEditorPanel
            studioChrome
            hideToolbarSave
            pageLabel={friendlyPageName(selectedServerPath)}
            filePath={selectedServerPath}
            surfaceMode={surfaceMode}
            value={editorContent}
            onChange={setEditorContent}
            onSave={() => void saveFile()}
            loading={editorLoading}
            saving={saving}
            error={editorError}
            dirty={dirty}
            empty={siteFiles.length === 0}
            onInsertSection={() => {
              setInsertSectionAfterIndex(null);
              setSectionLibraryOpen(true);
            }}
            focusSectionRequest={focusSectionRequest}
            onConsumeSectionFocus={() => setFocusSectionRequest(null)}
          />
        </section>

        <aside
          ref={previewRailRef}
          className="studio-rail order-3 flex min-h-[min(36vh,320px)] w-full shrink-0 flex-col border-white/10 bg-zinc-950/80 max-lg:flex-none lg:order-3 lg:min-h-0 lg:min-w-0 lg:flex-1 lg:border-l"
        >
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 px-2 py-2">
            <div className="flex items-center gap-0.5 rounded-md bg-black/40 p-0.5">{deviceBtn('desktop', Monitor)}{deviceBtn('tablet', Tablet)}
              {deviceBtn('mobile', Smartphone)}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setPreviewRefreshing(true);
                  setPreviewNonce((n) => n + 1);
                }}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-semibold text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />
                Update preview
              </button>
              <button
                type="button"
                onClick={() => setPreviewFullscreen((v) => !v)}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-semibold text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                Open full preview
              </button>
            </div>
          </div>
          {previewPagePath && previewPagePath !== selectedServerPath && (
            <p className="border-b border-white/5 px-2 py-1 font-mono text-[10px] text-violet-300/90">
              Preview {previewPagePath} · editing {selectedServerPath}
            </p>
          )}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2">
            <div
              className="relative mx-auto flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-lg bg-black/40 ring-1 ring-white/10 transition-[max-width] duration-300 ease-out"
              style={{ maxWidth: previewMaxW }}
            >
              <div
                className={cn(
                  'relative flex min-h-0 flex-1 flex-col transition-opacity duration-200 ease-out',
                  previewRefreshing ? 'opacity-50' : 'opacity-100'
                )}
              >
                {previewRefreshing && (
                  <div className="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-1.5 rounded-full bg-black/70 px-2 py-1 text-[10px] font-medium text-zinc-300">
                    <Loader2 className="h-3 w-3 animate-spin text-violet-400" aria-hidden />
                    Loading
                  </div>
                )}
                {previewIframe}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-white/10 bg-black/25 px-2 py-1 text-[10px] text-zinc-500">
        <span className="font-medium text-zinc-400">
          {workflow.reviewStatus === 'draft' && 'Draft'}
          {workflow.reviewStatus === 'review_requested' && 'Review requested'}
          {workflow.reviewStatus === 'ready_for_review' && 'Ready for review'}
        </span>
        <details className="min-w-0">
          <summary className="cursor-pointer font-medium text-zinc-500 hover:text-zinc-300">Review</summary>
          <div className="mt-1 flex max-w-md flex-col gap-2 rounded border border-white/10 bg-zinc-900/90 p-2">
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                variant="ghost"
                className="h-6 px-2 text-[10px] font-medium text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                onClick={() => patchWorkflow({ reviewStatus: 'review_requested' })}
              >
                Request review
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-6 px-2 text-[10px] font-medium text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                onClick={() => patchWorkflow({ reviewStatus: 'ready_for_review' })}
              >
                Ready for review
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-6 px-2 text-[10px] font-medium text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                onClick={() => patchWorkflow({ reviewStatus: 'draft' })}
              >
                Draft
              </Button>
            </div>
            <textarea
              className="w-full rounded border border-white/10 bg-zinc-950 px-2 py-1 text-[10px] text-zinc-200"
              rows={2}
              placeholder="Notes"
              value={workflow.feedbackNotes}
              onChange={(e) => setWorkflow((w) => ({ ...w, feedbackNotes: e.target.value }))}
              onBlur={(e) => patchWorkflow({ feedbackNotes: e.target.value })}
            />
          </div>
        </details>
        <details className="ml-auto min-w-0">
          <summary className="cursor-pointer font-medium text-zinc-500 hover:text-zinc-300">Changelog</summary>
          <ul className="mt-1 max-h-28 max-w-md overflow-y-auto rounded border border-white/10 bg-zinc-900 p-2 text-[10px] text-zinc-400">
            {workflow.changelog.length === 0 && <li className="text-zinc-600">Empty</li>}
            {[...workflow.changelog].reverse().map((c, i) => (
              <li key={`${c.at}-${i}`}>
                {formatDeployedAt(c.at)} — {c.message}
              </li>
            ))}
          </ul>
        </details>
      </footer>

      <Modal
        open={newSiteChoiceOpen}
        onClose={() => {
          setNewSiteChoiceOpen(false);
          navigate('/projects');
        }}
        title="Start this client site"
      >
        <p className="text-sm leading-relaxed text-slate-600">
          No files on the server for this project yet. Pick one — both create real, editable HTML/CSS you can ship. This workspace is for agency
          production; clients use the portal for review.
        </p>
        {newSiteChoiceMessage && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-950 ring-1 ring-amber-100">{newSiteChoiceMessage}</p>
        )}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            className="h-11 flex-1 gap-2 text-sm font-semibold"
            disabled={siteSeeding}
            onClick={async () => {
              setNewSiteChoiceMessage(null);
              const result = await seedFromTemplates();
              if (!result.ok) {
                setNewSiteChoiceMessage(
                  `Template start failed. ${result.error} Create the project in Admin (or add it in Supabase) if it only exists in the local demo.`
                );
              }
            }}
          >
            {siteSeeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <LayoutTemplate className="h-4 w-4" strokeWidth={2} />}
            Start from template
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-11 flex-1 gap-2 text-sm font-semibold"
            disabled={siteSeeding}
            onClick={async () => {
              setNewSiteChoiceMessage(null);
              const result = await createBlankCodeSite();
              if (!result.ok) {
                setNewSiteChoiceMessage(`Could not create blank files — ${result.error}`);
              }
            }}
          >
            {siteSeeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Code2 className="h-4 w-4" strokeWidth={2} />}
            Start from blank code
          </Button>
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">
          <button type="button" className="font-semibold text-violet-700 hover:underline" onClick={() => navigate('/projects')}>
            Back to projects
          </button>
        </p>
      </Modal>

      {previewFullscreen && (previewSrc || localPreviewHtml) && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-zinc-950/95 p-3 backdrop-blur-md sm:p-4">
          <div className="mb-2 flex shrink-0 justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              className="h-8 border-white/10 bg-zinc-800 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
              onClick={() => {
                setPreviewRefreshing(true);
                setPreviewNonce((n) => n + 1);
              }}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" strokeWidth={2} />
              Update preview
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-8 border-white/10 bg-zinc-800 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
              onClick={() => setPreviewFullscreen(false)}
            >
              Exit full preview
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/10">
            <iframe
              title="Fullscreen preview"
              src={showServerPreview ? previewSrc! : undefined}
              srcDoc={showServerPreview ? undefined : localPreviewHtml}
              onLoad={() => setPreviewRefreshing(false)}
              className="h-full w-full bg-white"
              sandbox="allow-same-origin allow-popups allow-scripts"
            />
          </div>
        </div>
      )}

      <Modal
        open={addPageOpen}
        onClose={() => {
          setAddPageOpen(false);
          setAddPageName('');
          setAddPageSlug('');
          setAddPageInteriorKind('service');
          slugAutoRef.current = true;
        }}
        title="New page"
      >
        <p className="text-sm leading-relaxed text-slate-600">Name your page. The address updates automatically — you can adjust it if needed.</p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Page name</label>
            <Input
              placeholder="e.g. Pricing"
              value={addPageName}
              onChange={(e) => {
                setAddPageName(e.target.value);
                slugAutoRef.current = true;
              }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Page address</label>
            <Input
              placeholder="pricing"
              value={addPageSlug}
              onChange={(e) => {
                slugAutoRef.current = false;
                setAddPageSlug(e.target.value);
              }}
              className="text-sm"
            />
            <p className="mt-1.5 text-[11px] text-slate-400">Shown in your site URL.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Page structure</label>
            <Select
              value={addPageInteriorKind}
              onChange={(e) => setAddPageInteriorKind(e.target.value as InteriorPageKind)}
              className="text-sm"
            >
              <option value="service">Service / detail (hero → problem → details → process → proof → CTA)</option>
              <option value="landing">Campaign landing (hero → problem → solution → proof → offer → FAQ → CTA)</option>
            </Select>
            <p className="mt-1.5 text-[11px] text-slate-400">Never starts blank — we seed the full section stack for this page type.</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setAddPageOpen(false);
              setAddPageName('');
              setAddPageSlug('');
              setAddPageInteriorKind('service');
              slugAutoRef.current = true;
            }}
          >
            Cancel
          </Button>
          <Button type="button" className="min-w-[7rem]" onClick={() => void createBlankPage()}>
            Create
          </Button>
        </div>
      </Modal>

      <Modal open={renameOpen} onClose={() => setRenameOpen(false)} title="Rename page">
        <p className="text-sm text-slate-600">Choose a new address for this page.</p>
        <Input
          className="mt-4 text-sm"
          value={renameSlug}
          onChange={(e) => setRenameSlug(e.target.value)}
          placeholder="new-address"
        />
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setRenameOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void confirmRename()}>
            Save
          </Button>
        </div>
      </Modal>

      <SectionLibraryModal
        open={sectionLibraryOpen}
        onClose={() => {
          setSectionLibraryOpen(false);
          setInsertSectionAfterIndex(null);
        }}
        items={SECTION_LIBRARY_ROWS}
        insertContext={
          insertSectionAfterIndex !== null
            ? `Insert below “${pageSections[insertSectionAfterIndex]?.label ?? 'section'}”.`
            : 'Insert at bottom of page (before closing body).'
        }
        onPick={(item) => applySectionFromLibrary(item)}
      />

      <Modal open={Boolean(deleteConfirmPath)} onClose={() => setDeleteConfirmPath(null)} title="Delete page">
        <p className="text-sm text-slate-700">
          Delete <span className="font-semibold text-slate-900">{deleteConfirmPath ? friendlyPageName(deleteConfirmPath) : ''}</span>? This
          cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setDeleteConfirmPath(null)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={() => void confirmDelete()}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

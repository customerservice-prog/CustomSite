import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Maximize2,
  Minimize2,
  Monitor,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Rocket,
  Smartphone,
  Tablet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Dropdown, DropdownItem } from '@/components/ui/dropdown';
import { useShell } from '@/context/shell-context';
import { cn } from '@/lib/utils';
import { useClients, useProjects } from '@/store/hooks';
import { adminFetchJson, getRailwayCredentials } from '@/lib/admin-api';
import { SiteHtmlEditorPanel } from '@/components/site-builder/site-html-editor-panel';
import { SectionLibraryModal } from '@/components/site-builder/section-library-modal';
import { ARCHETYPE_LABELS, projectSiteArchetype } from '@/lib/site-builder/archetypes';
import { pageGuidanceFor } from '@/lib/site-builder/page-guidance';
import {
  appendChangelog,
  loadBuilderWorkflow,
  saveBuilderWorkflow,
  type BuilderWorkflowState,
} from '@/lib/site-builder/builder-workflow-storage';
import {
  SECTION_LIBRARY,
  buildFullSiteIndexHtml,
  buildInteriorSitePageHtml,
  buildLibrarySectionHtml,
  insertBeforeBodyClose,
  parsePageSections,
  reorderCsSections,
} from '@/lib/site-builder/site-structure-html';
import { DELIVERY_ADVANTAGE, OFFER_STATEMENT, PROCESS_STEPS, RISK_REVERSAL } from '@/lib/offer-positioning';

type SiteFileRow = { path: string; updated_at?: string | null; content_encoding?: string };

const PAGE_PUB_STORAGE = 'customsite_site_page_pub_v1';
const LAST_DEPLOY_STORAGE = 'customsite_last_deploy_v1';

const STATIC_PAGE_LABELS: Record<string, string> = {
  'index.html': 'Home',
  'services.html': 'Services',
  'about.html': 'About',
  'contact.html': 'Contact',
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
    <p style="margin:0">Add your homepage to see the live conversion preview.</p>
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
  const [creatingHomepage, setCreatingHomepage] = useState(false);
  const [sectionLibraryOpen, setSectionLibraryOpen] = useState(false);
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

  const [editorContent, setEditorContent] = useState('');
  const [savedEditorContent, setSavedEditorContent] = useState('');
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAtMs, setSavedAtMs] = useState<number | null>(null);
  const [savedAgoLabel, setSavedAgoLabel] = useState('');

  const htmlPages = useMemo(() => siteFiles.filter((f) => /\.html?$/i.test(f.path)), [siteFiles]);
  const htmlPathsKey = useMemo(
    () =>
      siteFiles
        .filter((f) => /\.html?$/i.test(f.path))
        .map((f) => f.path)
        .sort()
        .join('|'),
    [siteFiles]
  );

  const previewMaxW = previewDevice === 'mobile' ? 375 : previewDevice === 'tablet' ? 768 : 1280;

  const pageSections = useMemo(() => parsePageSections(editorContent), [editorContent]);

  const pageGuidance = useMemo(
    () =>
      activeProject
        ? pageGuidanceFor(selectedServerPath, friendlyPageName(selectedServerPath), siteArchetype)
        : '',
    [activeProject, selectedServerPath, siteArchetype]
  );

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
      if (!files.length) return 'index.html';
      if (files.some((f) => f.path === prev)) return prev;
      return files.find((f) => /\.html?$/i.test(f.path))?.path ?? files[0]!.path;
    });
    return true;
  }, [activeProjectId, toast]);

  const refreshServerFiles = useCallback(async () => {
    if (!activeProjectId) return;
    setFilesLoading(true);
    await loadSiteFiles();
    setFilesLoading(false);
  }, [activeProjectId, loadSiteFiles]);

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
    setPagePub(loadPagePub(activeProjectId));
    setWorkflow(loadBuilderWorkflow(activeProjectId));
    const d = loadLastDeploy(activeProjectId);
    setDeployLog(d?.log ?? '');
    setDeployPhase('idle');
    setSessionDeployUrl(null);
  }, [activeProjectId]);

  useEffect(() => {
    if (!activeProjectId) return;
    void refreshServerFiles();
  }, [activeProjectId, refreshServerFiles]);

  useEffect(() => {
    if (!activeProjectId || !selectedServerPath) return;
    if (!htmlPathsKey) return;
    const paths = htmlPathsKey.split('|');
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
        const fallback = activeProject
          ? buildInteriorSitePageHtml(siteArchetype, friendlyPageName(selectedServerPath), activeProject.name)
          : '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Page</title></head><body><p>Could not load.</p></body></html>';
        setEditorContent(fallback);
        setSavedEditorContent(fallback);
        setEditorError("We couldn't load this page. You can still edit and save.");
        return;
      }
      const text = r.data.content != null ? String(r.data.content) : '';
      setEditorContent(text);
      setSavedEditorContent(text);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeProjectId, selectedServerPath, htmlPathsKey, activeProject, siteArchetype]);

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
    setPreviewRefreshing(true);
    setPreviewNonce((n) => n + 1);
    setWorkflow((w) => appendChangelog(activeProjectId, `Updated ${friendlyPageName(selectedServerPath)}`, w));
    void refreshServerFiles();
  }, [activeProjectId, selectedServerPath, editorContent, toast, refreshServerFiles]);

  async function createHomepage() {
    if (!activeProjectId || !activeProject) return;
    setCreatingHomepage(true);
    const init = await adminFetchJson(`/api/admin/projects/${encodeURIComponent(activeProjectId)}/site/init`, {
      method: 'POST',
      json: { template: 'basic' },
    });
    if (!init.ok) {
      setCreatingHomepage(false);
      toast(init.error || 'Something went wrong', 'error');
      return;
    }
    const indexHtml = buildFullSiteIndexHtml(siteArchetype, {
      siteTitle: activeProject.name,
      clientCompany: clientForProject?.company,
    });
    const put = await adminFetchJson(`/api/admin/projects/${encodeURIComponent(activeProjectId)}/site/file`, {
      method: 'PUT',
      json: { path: 'index.html', content: indexHtml, content_encoding: 'utf8' },
    });
    setCreatingHomepage(false);
    if (!put.ok) {
      toast(put.error || 'Could not save homepage', 'error');
      return;
    }
    setWorkflow((w) => appendChangelog(activeProjectId, 'Generated full homepage structure', w));
    await refreshServerFiles();
    setSelectedServerPath('index.html');
    setPreviewNonce((n) => n + 1);
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
    const pageHtml = buildInteriorSitePageHtml(siteArchetype, title, activeProject.name);
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
    setWorkflow((w) => appendChangelog(activeProjectId, `Added page “${title}” with starter sections`, w));
    await refreshServerFiles();
    setSelectedServerPath(path);
    setPreviewNonce((n) => n + 1);
  }

  function applySectionFromLibrary(item: (typeof SECTION_LIBRARY)[0]) {
    const block = buildLibrarySectionHtml(item);
    const next = insertBeforeBodyClose(editorContent, block);
    setEditorContent(next);
    setSectionLibraryOpen(false);
    if (activeProjectId) {
      setWorkflow((w) => appendChangelog(activeProjectId, `Inserted “${item.title}”`, w));
    }
  }

  function moveSection(from: number, delta: number) {
    const to = from + delta;
    if (to < 0 || to >= pageSections.length) return;
    setEditorContent(reorderCsSections(editorContent, from, to));
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

  const canPreview =
    Boolean(activeProjectId) &&
    htmlPages.length > 0 &&
    htmlPages.some((f) => f.path === selectedServerPath) &&
    /\.html?$/i.test(selectedServerPath);

  const previewSrc =
    canPreview && activeProjectId
      ? `/preview/${encodeURIComponent(activeProjectId)}/${encodeURIComponent(selectedServerPath)}?t=${previewNonce}`
      : null;

  const liveSiteHref = activeProject?.siteLiveUrl?.trim() || sessionDeployUrl || '';

  const lastDeploy = activeProjectId ? loadLastDeploy(activeProjectId) : null;

  const deviceBtn = (id: 'desktop' | 'tablet' | 'mobile', Icon: LucideIcon) => (
    <button
      type="button"
      key={id}
      onClick={() => setPreviewDevice(id)}
      className={cn(
        'rounded-full p-2.5 transition-all duration-200',
        previewDevice === id
          ? 'bg-white text-violet-700 shadow-sm shadow-slate-900/8'
          : 'text-slate-500 hover:bg-white/60 hover:text-slate-800'
      )}
      aria-pressed={previewDevice === id}
      aria-label={id === 'desktop' ? 'Desktop width' : id === 'tablet' ? 'Tablet width' : 'Mobile width'}
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );

  const previewIframe = (
    <iframe
      title="Live conversion preview"
      src={previewSrc ?? undefined}
      srcDoc={previewSrc ? undefined : FALLBACK_PREVIEW_HTML}
      onLoad={() => setPreviewRefreshing(false)}
      className="h-full min-h-[400px] w-full bg-white"
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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-[#f4f5f8] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-4 bg-white/90 px-5 py-4 backdrop-blur-sm">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h1 className="truncate text-base font-semibold tracking-tight text-slate-900 sm:text-lg">{activeProject?.name ?? 'Project'}</h1>
            <Link
              to={`/projects/${activeProjectId}`}
              className="shrink-0 text-xs font-medium text-slate-400 transition-colors hover:text-violet-600"
            >
              Back
            </Link>
          </div>
          <p className="mt-1 truncate text-sm text-slate-600">{friendlyPageName(selectedServerPath)}</p>
          <p className="mt-0.5 truncate text-xs text-slate-400">
            {ARCHETYPE_LABELS[siteArchetype]}
            {clientForProject?.company ? ` · ${clientForProject.company}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center rounded-full bg-slate-100/95 p-1 ring-1 ring-slate-200/40">
            {deviceBtn('desktop', Monitor)}
            {deviceBtn('tablet', Tablet)}
            {deviceBtn('mobile', Smartphone)}
          </div>
          <div className="hidden h-6 w-px bg-slate-200 sm:block" aria-hidden />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="h-9 px-4 text-sm font-semibold shadow-sm shadow-slate-900/5"
              disabled={saving || !dirty || editorLoading || htmlPages.length === 0}
              onClick={() => void saveFile()}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
            {savedAtMs != null && (
              <span className="text-xs text-slate-400 tabular-nums">Saved {savedAgoLabel || formatRelativeSaved(savedAtMs)}</span>
            )}
          </div>
          <Button
            type="button"
            className="h-9 gap-2 px-5 text-sm font-semibold shadow-md shadow-violet-900/15"
            disabled={deployLoading || !htmlPages.length}
            onClick={() => void runPublish()}
          >
            {deployLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" strokeWidth={1.75} />}
            {deployLoading ? 'Deploying…' : 'Publish'}
          </Button>
          {liveSiteHref ? (
            <a
              href={liveSiteHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              <ExternalLink className="h-4 w-4 opacity-70" strokeWidth={1.75} />
              View live
            </a>
          ) : (
            <span className="px-1 text-xs text-slate-400">Live link appears after publish</span>
          )}
        </div>
      </header>

      <div className="border-b border-violet-100/70 bg-gradient-to-r from-violet-50/95 via-white to-indigo-50/50 px-5 py-3">
        <p className="text-xs font-semibold leading-snug text-slate-900">{OFFER_STATEMENT}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{DELIVERY_ADVANTAGE}</p>
        <ol className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {PROCESS_STEPS.map((s, i) => (
            <li key={s.id} className="flex items-center gap-1">
              <span className="text-violet-600">{i + 1}</span>
              <span className="normal-case font-medium tracking-normal text-slate-600">{s.title}</span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-[10px] leading-snug text-slate-500">{RISK_REVERSAL}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100/80 bg-white/70 px-5 py-2.5 text-xs backdrop-blur-sm">
        <span className="font-medium text-slate-600">
          {workflow.reviewStatus === 'draft' && 'Internal draft'}
          {workflow.reviewStatus === 'review_requested' && 'Review requested'}
          {workflow.reviewStatus === 'ready_for_review' && 'Ready for client review'}
        </span>
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="secondary"
            className="h-8 px-3 text-xs"
            onClick={() => patchWorkflow({ reviewStatus: 'review_requested' })}
          >
            Request client review
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-8 px-3 text-xs"
            onClick={() => patchWorkflow({ reviewStatus: 'ready_for_review' })}
          >
            Mark ready for review
          </Button>
          <Button type="button" variant="ghost" className="h-8 px-2 text-xs" onClick={() => patchWorkflow({ reviewStatus: 'draft' })}>
            Back to draft
          </Button>
        </div>
        <details className="min-w-[10rem] flex-1">
          <summary className="cursor-pointer font-medium text-slate-500">Feedback notes</summary>
          <textarea
            className="mt-2 w-full min-w-[12rem] max-w-md rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800"
            rows={3}
            placeholder="What the client asked for, decisions, next steps…"
            value={workflow.feedbackNotes}
            onChange={(e) => setWorkflow((w) => ({ ...w, feedbackNotes: e.target.value }))}
            onBlur={(e) => patchWorkflow({ feedbackNotes: e.target.value })}
          />
        </details>
        <details className="min-w-[8rem]">
          <summary className="cursor-pointer font-medium text-slate-500">Change log</summary>
          <ul className="mt-2 max-h-32 max-w-xs space-y-1 overflow-y-auto text-[11px] text-slate-600">
            {workflow.changelog.length === 0 && <li className="text-slate-400">No entries yet.</li>}
            {[...workflow.changelog].reverse().map((c, i) => (
              <li key={`${c.at}-${i}`}>
                <span className="text-slate-400">{formatDeployedAt(c.at)}</span> — {c.message}
              </li>
            ))}
          </ul>
        </details>
      </div>

      {showDeployStrip && (
        <div className="shrink-0 border-t border-slate-100/80 bg-white/80 px-5 py-3 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {deployPhase === 'deploying' && (
              <span className="inline-flex items-center gap-2 font-medium text-amber-800">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                Deploying…
              </span>
            )}
            {deployPhase === 'success' && <span className="font-semibold text-emerald-700">Live</span>}
            {deployPhase === 'error' && <span className="font-semibold text-red-700">Couldn't publish</span>}
            {deployPhase === 'idle' && deployLog && !deployLoading && (
              <span className="text-slate-500">Last publish</span>
            )}
            {lastDeploy?.at && (
              <span className="text-xs text-slate-500">· {formatDeployedAt(lastDeploy.at)}</span>
            )}
          </div>
          {deployLog && deployLog !== 'Deploying…' && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-medium text-slate-400 transition-colors hover:text-slate-600">
                Activity details
              </summary>
              <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-slate-50/90 p-3 text-[11px] leading-relaxed text-slate-600">
                {deployLog}
              </pre>
            </details>
          )}
        </div>
      )}

      <div className="flex min-h-[calc(100dvh-13rem)] flex-1 flex-col gap-3 p-3 lg:min-h-0 lg:flex-row lg:gap-4 lg:p-4">
        <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-xl bg-[#ececf1] lg:w-[240px] lg:rounded-2xl">
          <div className="flex shrink-0 items-center justify-between px-3 py-3 lg:px-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pages</h2>
            <button
              type="button"
              onClick={() => {
                setAddPageOpen(true);
                slugAutoRef.current = true;
                setAddPageName('');
                setAddPageSlug('');
              }}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-white/70"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              Add
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3 lg:px-3">
            {filesLoading && (
              <div className="flex items-center gap-2 px-2 py-4 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                Loading…
              </div>
            )}
            {!filesLoading && htmlPages.length === 0 && (
              <div className="rounded-xl bg-white/60 px-3 py-6 text-center shadow-sm ring-1 ring-white/80">
                <p className="text-sm font-semibold text-slate-800">Start building your site</p>
                <p className="mx-auto mt-2 max-w-[200px] text-xs leading-relaxed text-slate-500">Add a homepage to unlock the preview and editor.</p>
                <Button
                  type="button"
                  className="mt-4 inline-flex h-9 items-center gap-2 px-4 text-sm"
                  disabled={creatingHomepage}
                  onClick={() => void createHomepage()}
                >
                  {creatingHomepage ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    'Create homepage'
                  )}
                </Button>
              </div>
            )}
            {htmlPages.map((f) => {
              const active = selectedServerPath === f.path;
              const st = statusForServerPath(f.path);
              return (
                <div
                  key={f.path}
                  className={cn(
                    'group flex items-stretch overflow-hidden rounded-xl transition-colors duration-150',
                    active ? 'bg-white shadow-sm ring-1 ring-slate-200/80' : 'hover:bg-white/50'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedServerPath(f.path);
                      setPreviewRefreshing(true);
                      setPreviewNonce((n) => n + 1);
                    }}
                    className="min-w-0 flex-1 px-3 py-3 text-left"
                  >
                    <p className={cn('truncate text-sm', active ? 'font-semibold text-slate-900' : 'font-medium text-slate-700')}>
                      {friendlyPageName(f.path)}
                    </p>
                    <Badge
                      variant="neutral"
                      className={cn(
                        'mt-1.5 text-[10px] font-medium ring-1 ring-slate-200/60',
                        st === 'published' ? 'bg-slate-100 text-slate-700' : 'bg-white/90 text-slate-500'
                      )}
                    >
                      {st === 'published' ? 'Live' : 'Draft'}
                    </Badge>
                  </button>
                  <div className="flex shrink-0 items-start py-1 pr-1">
                    <Dropdown
                      align="right"
                      trigger={
                        <button
                          type="button"
                          className="rounded-lg p-2 text-slate-400 opacity-100 transition-colors hover:bg-white/80 hover:text-slate-700 sm:opacity-0 sm:group-hover:opacity-100"
                          aria-label="Page options"
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
                      <DropdownItem onClick={() => openRenameFor(f.path)}>Rename</DropdownItem>
                      <DropdownItem destructive onClick={() => setDeleteConfirmPath(f.path)}>
                        Delete
                      </DropdownItem>
                      <DropdownItem onClick={() => setPathStatus(f.path, st === 'published' ? 'draft' : 'published')}>
                        {st === 'published' ? 'Mark as draft' : 'Mark as live'}
                      </DropdownItem>
                    </Dropdown>
                  </div>
                </div>
              );
            })}
            {htmlPages.length > 0 && (
              <div className="mt-3 border-t border-slate-200/50 pt-3">
                <h3 className="px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">On this page</h3>
                {pageSections.length === 0 ? (
                  <p className="mt-2 px-1 text-[11px] leading-relaxed text-slate-500">
                    Use <span className="font-medium text-slate-700">Insert section</span> to add blocks. Outline appears here.
                  </p>
                ) : (
                  <ul className="mt-1.5 space-y-0.5">
                    {pageSections.map((s, i) => (
                      <li key={s.id}>
                        <div className="flex items-center gap-0.5 rounded-lg hover:bg-white/40">
                          <button
                            type="button"
                            onClick={() => setFocusSectionRequest({ id: s.id })}
                            className="min-w-0 flex-1 truncate px-2 py-1.5 text-left text-xs font-medium text-slate-700"
                          >
                            {s.label}
                          </button>
                          <button
                            type="button"
                            className="rounded p-1 text-slate-400 hover:bg-white/80 hover:text-slate-700 disabled:opacity-30"
                            disabled={i === 0}
                            aria-label="Move section up"
                            onClick={() => moveSection(i, -1)}
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="rounded p-1 text-slate-400 hover:bg-white/80 hover:text-slate-700 disabled:opacity-30"
                            disabled={i === pageSections.length - 1}
                            aria-label="Move section down"
                            onClick={() => moveSection(i, 1)}
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </aside>

        <main className="flex min-h-[360px] min-w-0 flex-[1.35] flex-col overflow-hidden rounded-xl bg-[#e8e9ef] lg:min-h-0 lg:min-w-0 lg:rounded-2xl">
          <div className="flex shrink-0 items-center justify-between px-4 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Preview</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setPreviewRefreshing(true);
                  setPreviewNonce((n) => n + 1);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-white/60 hover:text-slate-800"
              >
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => setPreviewFullscreen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-white/60 hover:text-slate-800"
              >
                {previewFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                Full screen
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-3 pb-4 pt-0 sm:px-5">
            <div
              className="relative mx-auto overflow-hidden rounded-2xl bg-white shadow-[0_12px_40px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/[0.04] transition-[max-width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ maxWidth: previewMaxW, width: '100%' }}
            >
              <div
                className={cn(
                  'relative transition-opacity duration-300 ease-out',
                  previewRefreshing ? 'opacity-60' : 'opacity-100'
                )}
              >
                {previewRefreshing && (
                  <div className="pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-medium text-slate-500 shadow-sm ring-1 ring-slate-200/60">
                    <Loader2 className="h-3 w-3 animate-spin text-violet-500" aria-hidden />
                    Updating
                  </div>
                )}
                {previewIframe}
              </div>
            </div>
          </div>
        </main>

        <section className="flex min-h-[min(45vh,22rem)] w-full shrink-0 flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/40 lg:min-h-0 lg:w-[min(36vw,440px)] lg:max-w-[480px] lg:min-w-[280px] lg:rounded-2xl lg:shadow-none lg:ring-0">
          <SiteHtmlEditorPanel
            pageLabel={friendlyPageName(selectedServerPath)}
            value={editorContent}
            onChange={setEditorContent}
            onSave={() => void saveFile()}
            loading={editorLoading}
            saving={saving}
            error={editorError}
            dirty={dirty}
            empty={htmlPages.length === 0}
            pageGuidance={pageGuidance}
            onInsertSection={() => setSectionLibraryOpen(true)}
            focusSectionRequest={focusSectionRequest}
            onConsumeSectionFocus={() => setFocusSectionRequest(null)}
          />
        </section>
      </div>

      {previewFullscreen && previewSrc && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-slate-950/88 p-4 backdrop-blur-md">
          <div className="mb-3 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setPreviewNonce((n) => n + 1)}>
              Refresh
            </Button>
            <Button type="button" variant="secondary" onClick={() => setPreviewFullscreen(false)}>
              Close
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/10">
            <iframe
              title="Fullscreen preview"
              src={previewSrc}
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
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setAddPageOpen(false);
              setAddPageName('');
              setAddPageSlug('');
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
        onClose={() => setSectionLibraryOpen(false)}
        items={SECTION_LIBRARY}
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

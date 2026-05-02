import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  Code2,
  Copy,
  ExternalLink,
  Eye,
  GripVertical,
  ImagePlus,
  LayoutTemplate,
  Loader2,
  Maximize2,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Sparkles,
  Trash2,
  Video,
} from 'lucide-react';
import { Button, buttonClassName } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { useClients, useProjects } from '@/store/hooks';
import type { ProjectSite } from '@/lib/site-builder/project-site-model';
import { newFile } from '@/lib/site-builder/project-site-model';
import { createStarterFiles, type StarterSiteContext } from '@/lib/site-builder/create-starter-files';
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
import { applyInlinePreviewYoutubeThumbnailPlaceholders } from '@/lib/site-builder/preview-youtube-thumbnail-placeholder';
import { collectMobileHtmlWarnings } from '@/lib/mobile-site-linter';
import { openClientSitePreviewTab } from '@/lib/site-builder/open-client-site-preview';
import { createPreviewDebugEvent, type PreviewDebugEvent } from '@/lib/site-builder/preview-debug-events';
import { useProjectSiteWorkspaceStore } from '@/store/use-project-site-workspace-store';
import { SectionLibraryPopover } from '@/components/site-builder/section-library-popover';
import { SiteBuilderPreviewDebugPanel } from '@/components/site-builder/site-builder-preview-debug-panel';
import { SiteBuilderPreviewErrorBoundary } from '@/components/site-builder/site-builder-preview-error-boundary';
import { useShell } from '@/context/shell-context';
import { cn } from '@/lib/utils';
import { getAccessToken } from '@/lib/admin-api';
import {
  attachRailwayCustomDomain,
  deployAdminProjectZip,
  fetchAdminProject,
  normalizeCustomDomainInput,
  patchAdminProject,
  railwayHostnameFromUrl,
} from '@/lib/admin-project-hosting';
import { siteFilesTargetLiveServer } from '@/lib/site-builder/site-builder-site-api';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/shallow';
import type { ApiProjectRow } from '@/lib/agency-api-map';
import { fetchProjectSiteMedia, uploadProjectSiteImage, type SiteMediaItem } from '@/lib/project-site-media-api';
import {
  addAdminProjectVideo,
  cacheAdminProjectVideoThumbnails,
  checkAdminProjectVideos,
  deleteAdminProjectVideo,
  fetchAdminProjectVideos,
  reorderAdminProjectVideos,
  replaceAdminProjectVideoYoutube,
  type ProjectVideoRow,
} from '@/lib/project-videos-api';

const BASE_FILES = ['index.html', 'styles.css', 'script.js'] as const;

type PageSeoForm = {
  title: string;
  description: string;
  og_image_url: string;
  canonical_url: string;
  allow_index: boolean;
};

const EMPTY_PAGE_SEO: PageSeoForm = {
  title: '',
  description: '',
  og_image_url: '',
  canonical_url: '',
  allow_index: true,
};

const SITE_SETTINGS_SITE_TYPES = ['person', 'restaurant', 'local_business', 'ecommerce', 'portfolio'] as const;

function filePathToUrlPathForCanon(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower === 'index.html') return '/';
  const base = filePath.replace(/\.html$/i, '');
  return '/' + base.replace(/^\//, '').replace(/\\/g, '/');
}

function seoRowFromServer(raw: Record<string, unknown>): PageSeoForm {
  const noI = raw.no_index === true || raw.index === false || raw.robots === 'noindex';
  return {
    title: typeof raw.title === 'string' ? raw.title : typeof raw.pageTitle === 'string' ? raw.pageTitle : '',
    description:
      typeof raw.description === 'string'
        ? raw.description
        : typeof raw.metaDescription === 'string'
          ? raw.metaDescription
          : '',
    og_image_url:
      typeof raw.og_image_url === 'string'
        ? raw.og_image_url
        : typeof raw.ogImage === 'string'
          ? raw.ogImage
          : '',
    canonical_url:
      typeof raw.canonical_url === 'string'
        ? raw.canonical_url
        : typeof raw.canonical === 'string'
          ? raw.canonical
          : '',
    allow_index: !noI,
  };
}

function pageSeoMapToPayload(map: Record<string, PageSeoForm>): Record<string, unknown> | null {
  const out: Record<string, unknown> = {};
  for (const [path, row] of Object.entries(map)) {
    const chunk: Record<string, unknown> = {};
    if (row.title.trim()) chunk.title = row.title.trim();
    const desc = row.description.trim();
    if (desc) chunk.description = desc.slice(0, 160);
    if (row.og_image_url.trim()) chunk.og_image_url = row.og_image_url.trim();
    if (row.canonical_url.trim()) chunk.canonical_url = row.canonical_url.trim();
    if (!row.allow_index) chunk.no_index = true;
    if (Object.keys(chunk).length) out[path] = chunk;
  }
  return Object.keys(out).length ? out : null;
}

const CLIENT_SITE_STATUS_LABEL: Record<'draft' | 'review' | 'live', string> = {
  draft: 'Draft — not on production URL yet',
  review: 'Review — QA or stakeholder sign-off',
  live: 'Live — production URL in use',
};

function resolveVideoHealthTone(v: ProjectVideoRow): 'ok' | 'bad' | 'unknown' {
  const h = String(v.health_status || '').toLowerCase();
  if (h === 'ok') return 'ok';
  if (h === 'unavailable') return 'bad';
  if (h === 'unchecked') return 'unknown';
  const st = String(v.status || '').toLowerCase();
  if (st === 'unavailable') return 'bad';
  return 'unknown';
}

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

  const starterSiteContext = useMemo<StarterSiteContext>(() => {
    if (!project) return {};
    return {
      brandName: clientDisplayName,
      projectTitle: project.name,
      siteBuildArchetype: project.siteBuildArchetype ?? undefined,
    };
  }, [project, clientDisplayName]);

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
  const inlineSlotPreviewHtml = useMemo(
    () => applyInlinePreviewYoutubeThumbnailPlaceholders(previewHtml),
    [previewHtml]
  );
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
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const fullscreenFrameRef = useRef<HTMLIFrameElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
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
  const [domainDraft, setDomainDraft] = useState('');
  const [railwayServiceDraft, setRailwayServiceDraft] = useState('');
  const [ga4MeasurementDraft, setGa4MeasurementDraft] = useState('');
  const [publishSiteTypeDraft, setPublishSiteTypeDraft] = useState<string>('portfolio');
  const [publishGoogleVerificationDraft, setPublishGoogleVerificationDraft] = useState('');
  const [publishPageSeoByPath, setPublishPageSeoByPath] = useState<Record<string, PageSeoForm>>({});
  const [publishSeoFilePick, setPublishSeoFilePick] = useState('index.html');
  const [mediaItems, setMediaItems] = useState<SiteMediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaUploadBusy, setMediaUploadBusy] = useState(false);
  const [asideTab, setAsideTab] = useState<'files' | 'media' | 'videos'>('files');
  const [projectVideos, setProjectVideos] = useState<ProjectVideoRow[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosBusy, setVideosBusy] = useState(false);
  const [videoCheckBusy, setVideoCheckBusy] = useState(false);
  const [videoThumbWarmBusy, setVideoThumbWarmBusy] = useState(false);
  const [replaceYoutubeDraft, setReplaceYoutubeDraft] = useState<Record<string, string>>({});
  const [youtubePaste, setYoutubePaste] = useState('');
  const [previewYoutubeId, setPreviewYoutubeId] = useState<string | null>(null);
  const [dragVideoId, setDragVideoId] = useState<string | null>(null);
  const [hostingSaving, setHostingSaving] = useState(false);
  const [deployBusy, setDeployBusy] = useState(false);
  const [attachBusy, setAttachBusy] = useState(false);
  /** When true, POST /railway/attach-custom-domain also registers www.<apex> at Railway (TLS + routing). */
  const [attachIncludeWww, setAttachIncludeWww] = useState(true);
  const mergeProjectRowFromServer = useAppStore(useShallow((s) => s.mergeProjectRowFromServer));

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
    setDomainDraft(project?.customDomainHost ? project.customDomainHost : '');
    setRailwayServiceDraft(project?.railwayServiceIdProduction ?? '');
  }, [project?.id, project?.customDomainHost, project?.railwayServiceIdProduction]);

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
    if (siteFilesTargetLiveServer() && !getAccessToken()?.trim()) return;
    optimisticPersist(projectId, { snapshot: false });
  }, [projectId, activeFileId, draftContent, patchSiteFile, optimisticPersist]);

  const saveCurrentToSite = useCallback(() => {
    if (!projectId) return;
    if (siteFilesTargetLiveServer() && !getAccessToken()?.trim()) {
      toast('Sign in to save files to the server.', 'error');
      return;
    }
    if (/\.html?$/i.test(activeFileId)) {
      const mw = collectMobileHtmlWarnings(draftContent);
      if (mw.length) toast(`Mobile: ${mw.slice(0, 2).join(' · ')}`, 'info');
    }
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

  const cnameTarget = useMemo(
    () => railwayHostnameFromUrl(project?.railwayProductionUrl ?? null),
    [project?.railwayProductionUrl]
  );
  const prodDomainReady = Boolean(project?.customDomainHost?.trim());

  const publishSeoSuggestedCanonical = useMemo(() => {
    const h = normalizeCustomDomainInput(domainDraft);
    if (!h) return '';
    const p = filePathToUrlPathForCanon(publishSeoFilePick);
    return `https://${h}${p}`;
  }, [domainDraft, publishSeoFilePick]);

  const publishSeoRow = publishPageSeoByPath[publishSeoFilePick] ?? EMPTY_PAGE_SEO;

  const saveHostingFields = useCallback(async () => {
    if (!projectId) return;
    if (!siteFilesTargetLiveServer() || !getAccessToken()?.trim()) {
      toast('Sign in and use the live API to save hosting fields.', 'error');
      return;
    }
    const normalized = normalizeCustomDomainInput(domainDraft);
    setHostingSaving(true);
    try {
      const pageSeoPayload = pageSeoMapToPayload(publishPageSeoByPath);
      const r = await patchAdminProject(projectId, {
        custom_domain: normalized || null,
        railway_service_id_production: railwayServiceDraft.trim() || null,
        site_settings: {
          ga4_measurement_id: ga4MeasurementDraft.trim() || null,
          site_type: publishSiteTypeDraft.trim() || null,
          google_site_verification: publishGoogleVerificationDraft.trim() || null,
          ...(pageSeoPayload ? { page_seo: pageSeoPayload } : {}),
        },
      });
      if (!r.ok) {
        toast(r.error, 'error');
        return;
      }
      const row = r.data?.project;
      if (row && typeof row === 'object') mergeProjectRowFromServer(row as ApiProjectRow);
      toast('Hosting settings and analytics ID saved to the server.', 'success');
    } finally {
      setHostingSaving(false);
    }
  }, [
    projectId,
    domainDraft,
    railwayServiceDraft,
    ga4MeasurementDraft,
    publishSiteTypeDraft,
    publishGoogleVerificationDraft,
    publishPageSeoByPath,
    mergeProjectRowFromServer,
    toast,
  ]);

  const runAttachRailwayDomain = useCallback(async () => {
    if (!projectId) return;
    if (!siteFilesTargetLiveServer() || !getAccessToken()?.trim()) {
      toast('Sign in on the live API to register the domain with Railway.', 'error');
      return;
    }
    setAttachBusy(true);
    try {
      const r = await attachRailwayCustomDomain(projectId, {
        domain: normalizeCustomDomainInput(domainDraft) || undefined,
        serviceId: railwayServiceDraft.trim() || undefined,
        includeWww: attachIncludeWww,
      });
      if (!r.ok) {
        toast(r.error, 'error');
        return;
      }
      const dns = r.data?.dnsRecords;
      const msg =
        Array.isArray(dns) && dns.length
          ? `Railway returned ${dns.length} DNS record(s) — check the response in the network tab or your registrar.`
          : 'Custom domain registered in Railway. Open the Railway dashboard for DNS targets if needed.';
      toast(msg, 'success');
    } finally {
      setAttachBusy(false);
    }
  }, [projectId, domainDraft, railwayServiceDraft, attachIncludeWww, toast]);

  const runDeployProduction = useCallback(async () => {
    if (!projectId) return;
    if (!prodDomainReady) {
      toast('Set and save a production domain first.', 'error');
      return;
    }
    if (!siteFilesTargetLiveServer() || !getAccessToken()?.trim()) {
      toast('Sign in on the live API to deploy.', 'error');
      return;
    }
    setDeployBusy(true);
    try {
      const r = await deployAdminProjectZip(projectId, 'production');
      if (!r.ok) {
        toast(r.error, 'error');
        return;
      }
      const partial = Boolean((r.data as { partial?: boolean })?.partial);
      const re = (r.data as { railwayEnv?: { RAILWAY_API_TOKEN?: boolean; RAILWAY_TEAM_ID?: boolean } })?.railwayEnv;
      const ref = await fetchAdminProject(projectId);
      if (ref.ok && ref.data?.project) mergeProjectRowFromServer(ref.data.project as ApiProjectRow);
      let msg = partial
        ? 'Deploy finished with manual steps — check ZIP / Railway token and team ID on the server.'
        : 'Production deploy request completed.';
      if (partial && re && !re.RAILWAY_API_TOKEN) {
        msg =
          'Bundle ready — set RAILWAY_API_TOKEN in Railway (service variables) to enable automatic redeploy; until then use the ZIP export link from the deploy response.';
      }
      toast(msg, partial ? 'info' : 'success');
    } finally {
      setDeployBusy(false);
    }
  }, [projectId, prodDomainReady, mergeProjectRowFromServer, toast]);

  const refreshSiteMedia = useCallback(async () => {
    if (!projectId) return;
    if (!siteFilesTargetLiveServer() || !getAccessToken()?.trim()) return;
    setMediaLoading(true);
    try {
      const r = await fetchProjectSiteMedia(projectId);
      if (!r.ok) {
        toast(r.error, 'error');
        return;
      }
      setMediaItems(Array.isArray(r.data.items) ? r.data.items : []);
    } finally {
      setMediaLoading(false);
    }
  }, [projectId, toast]);

  const refreshProjectVideos = useCallback(async () => {
    if (!projectId) return;
    if (!siteFilesTargetLiveServer() || !getAccessToken()?.trim()) return;
    setVideosLoading(true);
    try {
      const r = await fetchAdminProjectVideos(projectId);
      if (!r.ok) {
        toast(r.error, 'error');
        setProjectVideos([]);
        return;
      }
      const list = Array.isArray(r.data.videos) ? r.data.videos : [];
      list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      setProjectVideos(list);
    } finally {
      setVideosLoading(false);
    }
  }, [projectId, toast]);

  const runCheckProjectVideos = useCallback(async () => {
    if (!projectId) return;
    if (!siteFilesTargetLiveServer() || !getAccessToken()?.trim()) {
      toast('Sign in with the live API to check YouTube availability.', 'error');
      return;
    }
    setVideoCheckBusy(true);
    try {
      const r = await checkAdminProjectVideos(projectId);
      if (!r.ok) {
        toast(r.error, 'error');
        return;
      }
      toast(
        r.data.summary || `${r.data.checked} videos checked`,
        r.data.unavailable ? 'info' : 'success'
      );
      await refreshProjectVideos();
    } finally {
      setVideoCheckBusy(false);
    }
  }, [projectId, refreshProjectVideos, toast]);

  const addYoutubeFromPaste = useCallback(async () => {
    if (!projectId) return;
    if (!siteFilesTargetLiveServer() || !getAccessToken()?.trim()) {
      toast('Sign in with the live API to add videos.', 'error');
      return;
    }
    const raw = youtubePaste.trim();
    if (!raw) {
      toast('Paste a YouTube link or video ID.', 'error');
      return;
    }
    setVideosBusy(true);
    try {
      const r = await addAdminProjectVideo(projectId, { youtube_url: raw });
      if (!r.ok) {
        toast(r.error, 'error');
        return;
      }
      setYoutubePaste('');
      toast('Video added — metadata loaded from YouTube.', 'success');
      await refreshProjectVideos();
    } finally {
      setVideosBusy(false);
    }
  }, [projectId, youtubePaste, refreshProjectVideos, toast]);

  const warmVideoThumbnailsNow = useCallback(async () => {
    if (!projectId) return;
    if (!siteFilesTargetLiveServer() || !getAccessToken()?.trim()) {
      toast('Sign in with the live API.', 'error');
      return;
    }
    setVideoThumbWarmBusy(true);
    try {
      const r = await cacheAdminProjectVideoThumbnails(projectId);
      if (!r.ok) {
        toast(r.error, 'error');
        return;
      }
      toast(
        `Thumbnail backup: cached ${r.data.cached ?? 0}, failed ${r.data.failed ?? 0} (queued ${r.data.queued ?? 0}).`,
        'info'
      );
      await refreshProjectVideos();
    } finally {
      setVideoThumbWarmBusy(false);
    }
  }, [projectId, refreshProjectVideos, toast]);

  const deleteProjectVideoRow = useCallback(
    async (videoId: string) => {
      if (!projectId) return;
      if (!siteFilesTargetLiveServer() || !getAccessToken()?.trim()) return;
      let r = await deleteAdminProjectVideo(projectId, videoId);
      if (!r.ok && r.code === 'LIVE_PROJECT_VIDEO_DELETE_REQUIRES_CONFIRMATION') {
        const body = `This project is live or has been published.\n\nRemoving a catalog video can change what appears on the public site.\n\nContinue?`;
        if (!window.confirm(body)) return;
        r = await deleteAdminProjectVideo(projectId, videoId, { confirmLiveDestructive: true });
      }
      if (!r.ok) {
        toast(r.error, 'error');
        return;
      }
      toast('Video removed from project catalog.', 'success');
      await refreshProjectVideos();
    },
    [projectId, refreshProjectVideos, toast]
  );

  const submitReplaceYoutube = useCallback(
    async (videoRowId: string, draftRaw: string) => {
      if (!projectId) return;
      if (!siteFilesTargetLiveServer() || !getAccessToken()?.trim()) {
        toast('Sign in with the live API to replace IDs.', 'error');
        return;
      }
      const raw = String(draftRaw || '').trim();
      if (!raw) {
        toast('Enter a replacement YouTube URL or 11-character ID.', 'error');
        return;
      }
      setVideosBusy(true);
      try {
        const r = await replaceAdminProjectVideoYoutube(projectId, videoRowId, {
          youtube_id: raw,
          patch_site_html: true,
        });
        if (!r.ok) {
          toast(r.error, 'error');
          return;
        }
        const pu = r.data.pathsUpdated ?? 0;
        toast(
          pu > 0
            ? `Replaced everywhere — catalog + ${pu} HTML file(s).`
            : `Catalog updated (${pu} HTML files matched this ID — check raw HTML paths).`,
          'success'
        );
        setReplaceYoutubeDraft((m) => {
          const next = { ...m };
          delete next[videoRowId];
          return next;
        });
        await refreshProjectVideos();
      } finally {
        setVideosBusy(false);
      }
    },
    [projectId, refreshProjectVideos, toast]
  );

  const openYoutubeSearchForTitle = useCallback((title: string) => {
    const q = encodeURIComponent((title || 'video').trim() || 'video');
    const w = window.open(`https://www.youtube.com/results?search_query=${q}`, '_blank', 'noopener,noreferrer');
    if (!w) toast('Allow pop-ups to search on YouTube.', 'error');
  }, [toast]);

  const applyVideoReorderDrop = useCallback(
    async (targetId: string) => {
      if (!projectId || !dragVideoId || dragVideoId === targetId) return;
      const ids = projectVideos.map((v) => v.id);
      const from = ids.indexOf(dragVideoId);
      const to = ids.indexOf(targetId);
      if (from < 0 || to < 0) return;
      const nextIds = [...ids];
      nextIds.splice(from, 1);
      nextIds.splice(to, 0, dragVideoId);
      const byId = new Map(projectVideos.map((x) => [x.id, x]));
      let nextRows: ProjectVideoRow[];
      try {
        nextRows = nextIds.map((id, i) => {
          const row = byId.get(id);
          if (!row) throw new Error('missing');
          return { ...row, sort_order: i };
        });
      } catch {
        return;
      }
      setProjectVideos(nextRows);
      const r = await reorderAdminProjectVideos(projectId, nextIds);
      if (!r.ok) {
        toast(r.error, 'error');
        await refreshProjectVideos();
      }
    },
    [projectId, dragVideoId, projectVideos, refreshProjectVideos, toast]
  );

  const onMediaFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !projectId) return;
      if (!siteFilesTargetLiveServer() || !getAccessToken()?.trim()) {
        toast('Sign in with the live API to upload images.', 'error');
        return;
      }
      setMediaUploadBusy(true);
      try {
        const r = await uploadProjectSiteImage(projectId, file);
        if (!r.ok) {
          toast(r.error, 'error');
          return;
        }
        const url = r.data?.publicUrl ?? r.data?.url;
        if (!url?.trim()) {
          toast('Upload finished but no public URL returned.', 'error');
          return;
        }
        toast('Image uploaded — use Copy URL below.', 'success');
        await refreshSiteMedia();
      } finally {
        setMediaUploadBusy(false);
      }
    },
    [projectId, toast, refreshSiteMedia]
  );

  useEffect(() => {
    if (!projectId || site.files.length === 0) return;
    if (!siteFilesTargetLiveServer() || !getAccessToken()?.trim()) return;
    void refreshSiteMedia();
  }, [projectId, site.files.length, refreshSiteMedia]);

  useEffect(() => {
    if (asideTab !== 'videos') return;
    if (!projectId || !siteFilesTargetLiveServer() || !getAccessToken()?.trim()) return;
    void refreshProjectVideos();
  }, [asideTab, projectId, refreshProjectVideos]);

  useEffect(() => {
    if (!publishPanelOpen || !projectId) return;
    if (!siteFilesTargetLiveServer() || !getAccessToken()?.trim()) return;
    let cancelled = false;
    void (async () => {
      const r = await fetchAdminProject(projectId);
      if (cancelled || !r.ok || !r.data?.project) return;
      const p = r.data.project as Record<string, unknown>;
      setGa4MeasurementDraft(readGa4FromProjectPayload(p));
      readSiteSeoDraftsFromProjectPayload(p, setPublishSiteTypeDraft, setPublishGoogleVerificationDraft, setPublishPageSeoByPath);
      const domRaw = typeof p.custom_domain === 'string' ? p.custom_domain : typeof p.customDomain === 'string' ? p.customDomain : '';
      if (domRaw.trim()) setDomainDraft(normalizeCustomDomainInput(domRaw));
      const svc = p.railway_service_id_production ?? p.railwayServiceIdProduction;
      if (typeof svc === 'string') setRailwayServiceDraft(svc);
      mergeProjectRowFromServer(r.data.project as ApiProjectRow);
    })();
    return () => {
      cancelled = true;
    };
  }, [publishPanelOpen, projectId]);

  useEffect(() => {
    if (!publishPanelOpen || !site.files.length) return;
    const htmlNames = site.files.map((f) => f.name).filter((n) => /\.html?$/i.test(n));
    setPublishSeoFilePick((pick) => {
      if (htmlNames.includes(pick)) return pick;
      if (htmlNames.includes('index.html')) return 'index.html';
      return htmlNames[0] || 'index.html';
    });
  }, [publishPanelOpen, site.files]);

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
    /** Inline pane: no YouTube CDN thumbnail fetches — fullscreen & new tab use full `previewHtml`. */
    el.srcdoc = inlineSlotPreviewHtml;
  }, [inlineSlotPreviewHtml, previewIframeKey]);

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

  const onStartBlankMinimal = useCallback(async () => {
    if (!projectId) return;
    setBooting(true);
    try {
      const { site: next, save } = await createStarterFiles(projectId, {
        rich: false,
        context: starterSiteContext,
      });
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
  }, [projectId, starterSiteContext, setSiteImmediate, appendSnapshot, applyFileToEditor, recordPersistResult]);

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
  const serverWritesConfigured = siteFilesTargetLiveServer();
  const signedInForApi = Boolean(getAccessToken()?.trim());
  const showPersistenceBanner = !serverWritesConfigured || (serverWritesConfigured && !signedInForApi);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-950 text-zinc-100">
      {showPersistenceBanner ? (
        <div
          role="alert"
          className={cn(
            'shrink-0 border-b px-3 py-2 text-center text-[11px] font-medium leading-snug sm:text-xs',
            serverWritesConfigured && !signedInForApi
              ? 'border-rose-500/40 bg-rose-950/80 text-rose-100'
              : 'border-amber-500/35 bg-amber-950/90 text-amber-50'
          )}
        >
          {serverWritesConfigured && !signedInForApi ? (
            <>
              You are not signed in — site files cannot be written to the database. Open your account menu and sign in,
              then use Save again.
            </>
          ) : (
            <>
              This build is not pointed at the live API (<code className="rounded bg-black/30 px-1">VITE_USE_REAL_API=1</code> off). Files stay in a
              dev workspace on this machine only. For production, rebuild the admin with the real API flag and deploy.
            </>
          )}
        </div>
      ) : null}
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
              {serverWritesConfigured ? 'Saved to server' : 'Saved (dev workspace)'}
              {lastSavedAt != null ? (
                <span
                  className="ml-1 font-normal text-zinc-500"
                  title={serverWritesConfigured ? 'Server API accepted the last write' : 'Local dev workspace only'}
                >
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
              disabled={serverWritesConfigured && !signedInForApi}
              title={serverWritesConfigured && !signedInForApi ? 'Sign in to save to the server' : undefined}
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
                <aside className="flex max-h-[min(70vh,640px)] min-h-0 shrink-0 flex-col border-b border-white/10 p-2 lg:w-56 lg:border-b-0 lg:border-r">
                  <div className="mb-2 flex shrink-0 gap-0.5 rounded-lg bg-black/40 p-0.5">
                    {(['files', 'media', 'videos'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setAsideTab(tab)}
                        className={cn(
                          'flex-1 rounded-md px-1 py-1.5 text-[9px] font-semibold uppercase tracking-wide transition',
                          asideTab === tab ? 'bg-white/15 text-white' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
                        )}
                      >
                        {tab === 'files' ? 'Files' : tab === 'media' ? 'Media' : 'Videos'}
                      </button>
                    ))}
                  </div>
                  <input ref={mediaInputRef} type="file" accept="image/*,.svg" className="hidden" onChange={onMediaFileSelected} aria-hidden />

                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {asideTab === 'files' ? (
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
                    ) : null}

                    {asideTab === 'media' ? (
                      <div className="space-y-2">
                        {serverWritesConfigured && signedInForApi ? (
                          <>
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <button
                                type="button"
                                className="rounded px-1.5 py-0.5 text-[10px] font-medium text-violet-300 hover:bg-white/5 hover:text-violet-200"
                                disabled={mediaLoading}
                                onClick={() => void refreshSiteMedia()}
                              >
                                Refresh media
                              </button>
                              <button
                                type="button"
                                className="rounded px-1.5 py-0.5 text-[10px] font-medium text-amber-300/90 hover:bg-white/5 hover:text-amber-200"
                                disabled={videoCheckBusy}
                                onClick={() => {
                                  void runCheckProjectVideos();
                                }}
                              >
                                {videoCheckBusy ? (
                                  <>
                                    <Loader2 className="mr-1 inline h-3 w-3 animate-spin" aria-hidden />
                                    Checking…
                                  </>
                                ) : (
                                  'Check videos'
                                )}
                              </button>
                            </div>
                            <Button
                              type="button"
                              variant="secondary"
                              className="h-7 w-full gap-1 border-white/10 bg-white/10 px-2 text-[10px] text-white hover:bg-white/15"
                              disabled={mediaUploadBusy || mediaLoading}
                              onClick={() => mediaInputRef.current?.click()}
                            >
                              {mediaUploadBusy ? (
                                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                              ) : (
                                <ImagePlus className="h-3 w-3" aria-hidden />
                              )}
                              Upload image
                            </Button>
                            <p className="text-[9px] leading-snug text-zinc-600">
                              Public URLs use Storage bucket <span className="font-mono text-zinc-500">project-assets</span>. Use{' '}
                              <span className="text-zinc-500">Check videos</span> for YouTube health.
                            </p>
                            {mediaLoading ? (
                              <div className="flex items-center gap-1 py-2 text-[10px] text-zinc-500">
                                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                                Loading…
                              </div>
                            ) : mediaItems.length === 0 ? (
                              <p className="text-[10px] leading-relaxed text-zinc-600">No uploads yet.</p>
                            ) : (
                              <ul className="max-h-44 space-y-1.5 overflow-y-auto pr-0.5">
                                {mediaItems.map((item) => (
                                  <li key={item.path} className="flex gap-2 rounded-md bg-white/[0.04] p-1.5 ring-1 ring-white/10">
                                    <img src={item.url} alt="" className="h-10 w-10 shrink-0 rounded object-cover" loading="lazy" />
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-[10px] text-zinc-500">{item.name}</p>
                                      <button
                                        type="button"
                                        className="mt-0.5 text-[10px] font-semibold text-emerald-300 hover:text-emerald-200"
                                        onClick={() => void copyPublishUrl('Public URL', item.url)}
                                      >
                                        Copy URL
                                      </button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </>
                        ) : hasFiles ? (
                          <p className="text-[10px] leading-relaxed text-zinc-600">
                            Sign in with the live API to upload images and manage YouTube backup.
                          </p>
                        ) : (
                          <p className="text-[10px] leading-relaxed text-zinc-600">Add site files first, then upload media.</p>
                        )}
                      </div>
                    ) : null}

                    {asideTab === 'videos' ? (
                      <div className="space-y-2">
                        {serverWritesConfigured && signedInForApi ? (
                          <>
                            <Input
                              value={youtubePaste}
                              onChange={(e) => setYoutubePaste(e.target.value)}
                              placeholder="YouTube URL or ID"
                              className="h-8 border-white/15 bg-black/40 text-[11px] text-white placeholder:text-zinc-600"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') void addYoutubeFromPaste();
                              }}
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              className="h-8 w-full gap-1 border-white/15 bg-white/10 text-[10px] font-semibold text-white hover:bg-white/15"
                              disabled={videosBusy}
                              onClick={() => void addYoutubeFromPaste()}
                            >
                              {videosBusy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <Plus className="h-3 w-3" aria-hidden />}
                              Add video
                            </Button>
                            <div className="flex flex-wrap gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-7 shrink-0 gap-1 px-2 text-[10px] text-zinc-300 hover:bg-white/5 hover:text-white"
                                disabled={videoCheckBusy}
                                onClick={() => void runCheckProjectVideos()}
                              >
                                {videoCheckBusy ? (
                                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                                ) : (
                                  <RefreshCw className="h-3 w-3" aria-hidden />
                                )}
                                Refresh all
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-7 shrink-0 gap-1 px-2 text-[10px] text-zinc-400 hover:bg-white/5 hover:text-white"
                                disabled={videoThumbWarmBusy}
                                onClick={() => void warmVideoThumbnailsNow()}
                              >
                                {videoThumbWarmBusy ? (
                                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                                ) : (
                                  <ImagePlus className="h-3 w-3" aria-hidden />
                                )}
                                Warm thumbs
                              </Button>
                            </div>
                            <p className="text-[9px] leading-snug text-zinc-600">
                              Dots reflect thumbnail probes (grey until <span className="text-zinc-500">Refresh all</span>; red = replace). On save, YouTube IDs sync to the catalog; add{' '}
                              <code className="rounded bg-black/40 px-0.5 font-mono text-[8px] text-zinc-500">data-category</code>,{' '}
                              <code className="rounded bg-black/40 px-0.5 font-mono text-[8px] text-zinc-500">data-episode</code> on{' '}
                              <code className="rounded bg-black/40 px-0.5 font-mono text-[8px] text-zinc-500">.video-card</code> for podcast vs channel metadata. Nightly cron can re-probe thumbnails. Drag to reorder. Public:{' '}
                              <code className="break-all rounded bg-black/40 px-0.5 text-[8px] text-zinc-500">
                                GET /api/public/projects/&lt;projectId&gt;/videos
                              </code>
                            </p>
                            {videosLoading ? (
                              <div className="flex items-center gap-1 py-2 text-[10px] text-zinc-500">
                                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                                Loading…
                              </div>
                            ) : projectVideos.length === 0 ? (
                              <p className="flex items-start gap-1.5 text-[10px] text-zinc-600">
                                <Video className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
                                No saved videos. Add links here to back up thumbnails in Storage when YouTube changes or removes clips.
                              </p>
                            ) : (
                              <ul className="space-y-1.5 pb-2">
                                {projectVideos.map((v) => {
                                  const tone = resolveVideoHealthTone(v);
                                  const thumb =
                                    v.cached_thumbnail || v.thumbnail_url || `https://img.youtube.com/vi/${encodeURIComponent(v.youtube_id)}/mqdefault.jpg`;
                                  const lc = v.last_checked ? new Date(v.last_checked).toLocaleString() : '—';
                                  const lh = v.health_checked_at ? new Date(v.health_checked_at).toLocaleString() : '—';
                                  const dotColor =
                                    tone === 'ok' ? '#22c55e' : tone === 'bad' ? '#ef4444' : '#a1a1aa';
                                  const dotTitle =
                                    tone === 'ok'
                                      ? 'Thumbnail health: OK (live)'
                                      : tone === 'bad'
                                        ? 'Unavailable / dead thumbnail'
                                        : 'Not checked yet — use Refresh all';
                                  return (
                                    <li key={v.id}>
                                      <div className="space-y-1">
                                        <div
                                          draggable
                                          data-video-catalog-card
                                          onDragStart={() => setDragVideoId(v.id)}
                                          onDragEnd={() => setDragVideoId(null)}
                                          onDragOver={(ev) => ev.preventDefault()}
                                          onDrop={(ev) => {
                                            ev.preventDefault();
                                            void applyVideoReorderDrop(v.id);
                                          }}
                                          role="presentation"
                                          className={cn(
                                            'flex cursor-grab gap-1.5 rounded-md bg-white/[0.04] p-1.5 ring-1 ring-white/10 active:cursor-grabbing',
                                            dragVideoId === v.id && 'opacity-75 ring-violet-500/40'
                                          )}
                                        >
                                          <GripVertical className="mt-1 h-4 w-4 shrink-0 text-zinc-600" aria-hidden />
                                          <button
                                            type="button"
                                            className="min-w-0 flex-1 text-left"
                                            onClick={() => setPreviewYoutubeId(v.youtube_id)}
                                          >
                                            <div className="flex gap-2">
                                              <img
                                                src={thumb}
                                                alt=""
                                                className="h-11 w-[4.85rem] shrink-0 rounded object-cover"
                                                loading="lazy"
                                                onError={(e) => {
                                                  const shell = e.currentTarget.closest('[data-video-catalog-card]');
                                                  if (shell instanceof HTMLElement) {
                                                    shell.style.display = 'none';
                                                    return;
                                                  }
                                                  e.currentTarget.style.opacity = '0';
                                                }}
                                              />
                                              <div className="min-w-0 flex-1">
                                                <span
                                                  className={cn(
                                                    'inline-block h-1.5 w-1.5 shrink-0 rounded-full align-middle',
                                                    tone === 'unknown' && 'ring-1 ring-zinc-500/40'
                                                  )}
                                                  style={{ backgroundColor: dotColor }}
                                                  title={dotTitle}
                                                  aria-hidden
                                                />
                                                <p className="line-clamp-2 text-[10px] font-medium leading-snug text-zinc-200">
                                                  {v.title}
                                                </p>
                                                {v.source || v.category || v.episode_number != null ? (
                                                  <p className="mt-0.5 text-[8px] text-zinc-500">
                                                    {v.source === 'podcast'
                                                      ? 'Podcast'
                                                      : v.source === 'best_of_jm'
                                                        ? 'Best of channel'
                                                        : v.source ?? '—'}
                                                    {v.category ? ` · ${v.category}` : ''}
                                                    {v.episode_number != null ? ` · ep ${v.episode_number}` : ''}
                                                  </p>
                                                ) : null}
                                                <p className="mt-0.5 text-[8px] text-zinc-600">
                                                  Health:{' '}
                                                  <span className="font-semibold capitalize">{v.health_status ?? 'unchecked'}</span>{' '}
                                                  · Checked: {lc}
                                                  {v.health_checked_at ? <> · Thumb probe: {lh}</> : null}
                                                </p>
                                              </div>
                                            </div>
                                          </button>
                                          <button
                                            type="button"
                                            className="shrink-0 self-start rounded p-1 text-zinc-500 hover:bg-red-950/40 hover:text-red-300"
                                            aria-label="Remove video"
                                            onClick={(ev) => {
                                              ev.stopPropagation();
                                              void deleteProjectVideoRow(v.id);
                                            }}
                                          >
                                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                          </button>
                                        </div>
                                        {tone === 'bad' ? (
                                          <div className="flex flex-wrap items-center gap-1 rounded-md bg-red-950/25 px-1.5 py-1 ring-1 ring-red-900/35">
                                            <Input
                                              value={replaceYoutubeDraft[v.id] ?? ''}
                                              onChange={(e) =>
                                                setReplaceYoutubeDraft((m) => ({ ...m, [v.id]: e.target.value }))
                                              }
                                              placeholder="Replacement URL or ID"
                                              className="h-7 min-w-[140px] flex-1 border-white/10 bg-black/35 text-[10px] text-white"
                                              spellCheck={false}
                                              onClick={(ev) => ev.stopPropagation()}
                                            />
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              className="h-7 shrink-0 gap-0.5 px-2 text-[9px] text-zinc-300 hover:bg-white/10 hover:text-white"
                                              title="Find a live clip with the same topic"
                                              onClick={(ev) => {
                                                ev.stopPropagation();
                                                openYoutubeSearchForTitle(v.title);
                                              }}
                                            >
                                              <Search className="h-3 w-3" aria-hidden />
                                              Find
                                            </Button>
                                            <Button
                                              type="button"
                                              variant="secondary"
                                              className="h-7 shrink-0 px-2 text-[9px]"
                                              disabled={videosBusy}
                                              onClick={(ev) => {
                                                ev.stopPropagation();
                                                void submitReplaceYoutube(v.id, replaceYoutubeDraft[v.id] ?? '');
                                              }}
                                            >
                                              Replace
                                            </Button>
                                          </div>
                                        ) : null}
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </>
                        ) : (
                          <p className="text-[10px] leading-relaxed text-zinc-600">
                            Sign in with the live API to manage the video catalog for this project.
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>
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
                  {saveStatus === 'saving' && 'Saving…'}
                  {saveStatus === 'saved' &&
                    (serverWritesConfigured ? 'Server confirmed the last save.' : 'Last save stored in the dev workspace on this machine.')}
                  {saveStatus === 'error' && 'Save error — the server did not confirm (see below).'}
                  {saveStatus === 'idle' && 'Save status will update after you edit or save.'}
                </p>
                {saveError ? <p className="mt-2 text-xs text-amber-200/95">{saveError}</p> : null}
                {lastSavedAt != null && saveStatus !== 'idle' ? (
                  <p className="mt-1 text-[11px] text-zinc-500">Last write: {new Date(lastSavedAt).toLocaleString()}</p>
                ) : null}
              </section>

              <section className="rounded-lg border border-emerald-500/20 bg-emerald-950/15 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-300/90">Analytics (GA4)</p>
                <p className="mt-1.5 text-xs text-zinc-400">
                  Optional — injected into HTML served on preview and production when{' '}
                  <code className="text-zinc-300">site_settings.ga4_measurement_id</code> is set. Saves with the button below (same PATCH as hosting).
                </p>
                <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500" htmlFor="pub-ga4-id">
                  Measurement ID
                </label>
                <Input
                  id="pub-ga4-id"
                  value={ga4MeasurementDraft}
                  onChange={(e) => setGa4MeasurementDraft(e.target.value)}
                  placeholder="G-XXXXXXXXXX"
                  className="mt-1 h-9 border-white/10 bg-zinc-900 font-mono text-xs text-white"
                  autoComplete="off"
                  spellCheck={false}
                />
              </section>

              <section className="rounded-lg border border-sky-500/25 bg-sky-950/25 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-sky-200/90">SEO &amp; Search Console</p>
                <p className="mt-1.5 text-xs text-zinc-400">
                  Stored in <code className="text-zinc-300">site_settings</code> and merged at serve time with auto tags, sitemap, and JSON-LD. Per-page fields use the file path as key (e.g.{' '}
                  <code className="text-zinc-300">index.html</code>).
                </p>
                <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500" htmlFor="pub-site-type">
                  Site type (structured data)
                </label>
                <select
                  id="pub-site-type"
                  value={publishSiteTypeDraft}
                  onChange={(e) => setPublishSiteTypeDraft(e.target.value)}
                  disabled={!serverWritesConfigured || !signedInForApi}
                  className="mt-1 h-9 w-full rounded-md border border-white/10 bg-zinc-900 px-2 text-xs text-white"
                >
                  {SITE_SETTINGS_SITE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
                <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500" htmlFor="pub-google-verif">
                  Google Search Console verification (meta content only)
                </label>
                <Input
                  id="pub-google-verif"
                  value={publishGoogleVerificationDraft}
                  onChange={(e) => setPublishGoogleVerificationDraft(e.target.value)}
                  placeholder="Paste the content= value from Google"
                  className="mt-1 h-9 border-white/10 bg-zinc-900 font-mono text-xs text-white"
                  spellCheck={false}
                  disabled={!serverWritesConfigured || !signedInForApi}
                />
                <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500" htmlFor="pub-seo-page">
                  Page (HTML file)
                </label>
                <select
                  id="pub-seo-page"
                  value={publishSeoFilePick}
                  onChange={(e) => setPublishSeoFilePick(e.target.value)}
                  disabled={!serverWritesConfigured || !signedInForApi}
                  className="mt-1 h-9 w-full rounded-md border border-white/10 bg-zinc-900 px-2 text-xs text-white"
                >
                  {site.files
                    .map((f) => f.name)
                    .filter((n) => /\.html?$/i.test(n))
                    .map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                </select>
                <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500" htmlFor="pub-seo-title">
                  Page title override
                </label>
                <Input
                  id="pub-seo-title"
                  value={publishSeoRow.title}
                  onChange={(e) =>
                    setPublishPageSeoByPath((m) => ({
                      ...m,
                      [publishSeoFilePick]: { ...EMPTY_PAGE_SEO, ...m[publishSeoFilePick], title: e.target.value },
                    }))
                  }
                  placeholder="Shown before the site name in &lt;title&gt;"
                  className="mt-1 h-9 border-white/10 bg-zinc-900 text-sm text-white"
                  disabled={!serverWritesConfigured || !signedInForApi}
                />
                <div className="mt-3 flex items-end justify-between gap-2">
                  <label className="block flex-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500" htmlFor="pub-seo-desc">
                    Meta description (max 160)
                  </label>
                  <span className="text-[10px] font-medium text-zinc-500">{publishSeoRow.description.length}/160</span>
                </div>
                <Textarea
                  id="pub-seo-desc"
                  value={publishSeoRow.description}
                  maxLength={160}
                  rows={3}
                  onChange={(e) =>
                    setPublishPageSeoByPath((m) => ({
                      ...m,
                      [publishSeoFilePick]: { ...EMPTY_PAGE_SEO, ...m[publishSeoFilePick], description: e.target.value },
                    }))
                  }
                  className="mt-1 w-full resize-y border-white/10 bg-zinc-900 p-2 text-xs text-white"
                  disabled={!serverWritesConfigured || !signedInForApi}
                  spellCheck
                />
                <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500" htmlFor="pub-seo-og">
                  Open Graph image URL
                </label>
                <Input
                  id="pub-seo-og"
                  value={publishSeoRow.og_image_url}
                  onChange={(e) =>
                    setPublishPageSeoByPath((m) => ({
                      ...m,
                      [publishSeoFilePick]: { ...EMPTY_PAGE_SEO, ...m[publishSeoFilePick], og_image_url: e.target.value },
                    }))
                  }
                  placeholder="https://… absolute URL preferred"
                  className="mt-1 h-9 border-white/10 bg-zinc-900 font-mono text-xs text-white"
                  spellCheck={false}
                  disabled={!serverWritesConfigured || !signedInForApi}
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500" htmlFor="pub-seo-can">
                    Canonical URL
                  </label>
                  {publishSeoSuggestedCanonical ? (
                    <button
                      type="button"
                      disabled={!serverWritesConfigured || !signedInForApi}
                      className="text-[10px] font-semibold text-sky-300 hover:text-sky-200 disabled:opacity-40"
                      onClick={() =>
                        setPublishPageSeoByPath((m) => ({
                          ...m,
                          [publishSeoFilePick]: {
                            ...EMPTY_PAGE_SEO,
                            ...m[publishSeoFilePick],
                            canonical_url: publishSeoSuggestedCanonical,
                          },
                        }))
                      }
                    >
                      Use suggested
                    </button>
                  ) : null}
                </div>
                <Input
                  id="pub-seo-can"
                  value={publishSeoRow.canonical_url}
                  onChange={(e) =>
                    setPublishPageSeoByPath((m) => ({
                      ...m,
                      [publishSeoFilePick]: { ...EMPTY_PAGE_SEO, ...m[publishSeoFilePick], canonical_url: e.target.value },
                    }))
                  }
                  placeholder={publishSeoSuggestedCanonical || 'Save a domain first'}
                  className="mt-1 h-9 border-white/10 bg-zinc-900 font-mono text-xs text-white"
                  spellCheck={false}
                  disabled={!serverWritesConfigured || !signedInForApi}
                />
                {publishSeoSuggestedCanonical ? (
                  <p className="mt-1 text-[10px] text-zinc-500">
                    Suggested: <code className="text-zinc-300">{publishSeoSuggestedCanonical}</code>
                  </p>
                ) : null}
                <label className="mt-4 flex cursor-pointer items-center gap-2 text-[12px] text-zinc-300">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-white/30 bg-zinc-900 accent-sky-500"
                    checked={publishSeoRow.allow_index}
                    disabled={!serverWritesConfigured || !signedInForApi}
                    onChange={(e) =>
                      setPublishPageSeoByPath((m) => ({
                        ...m,
                        [publishSeoFilePick]: {
                          ...EMPTY_PAGE_SEO,
                          ...m[publishSeoFilePick],
                          allow_index: e.target.checked,
                        },
                      }))
                    }
                  />
                  Allow search engines to index this page
                </label>
                <p className="mt-3 text-[10px] leading-relaxed text-zinc-500">
                  Save with the production domain button below — per-page SEO patches merge with existing <code className="text-zinc-400">site_settings</code> on the server.
                </p>
              </section>

              <section className="rounded-lg border border-violet-500/25 bg-violet-950/20 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-violet-300/90">1 · Production domain</p>
                <p className="mt-1.5 text-xs text-zinc-400">
                  Enter the hostname clients will use (no <code className="text-zinc-300">https://</code>). This is stored on the project and is{' '}
                  <strong className="text-zinc-200">required</strong> before production deploy.
                </p>
                <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500" htmlFor="pub-custom-domain">
                  Custom domain
                </label>
                <Input
                  id="pub-custom-domain"
                  value={domainDraft}
                  onChange={(e) => setDomainDraft(e.target.value)}
                  placeholder="www.jordanmaxwell.org"
                  className="mt-1 h-9 border-white/10 bg-zinc-900 text-sm text-white"
                  autoComplete="off"
                />
                <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500" htmlFor="pub-railway-svc">
                  Railway service ID (production)
                </label>
                <Input
                  id="pub-railway-svc"
                  value={railwayServiceDraft}
                  onChange={(e) => setRailwayServiceDraft(e.target.value)}
                  placeholder="From Railway → service → Settings → Service ID"
                  className="mt-1 h-9 border-white/10 bg-zinc-900 font-mono text-xs text-white"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  className="mt-3 h-9 w-full text-xs"
                  disabled={hostingSaving || !serverWritesConfigured || !signedInForApi}
                  onClick={() => void saveHostingFields()}
                >
                  {hostingSaving ? 'Saving…' : 'Save domain, Railway, SEO & GA to server'}
                </Button>
                {!prodDomainReady ? (
                  <p className="mt-2 text-[11px] text-amber-200/90">
                    Production deploy stays disabled until a domain is saved on this project.
                  </p>
                ) : (
                  <p className="mt-2 text-[11px] text-emerald-200/90">Domain on file — you can deploy production.</p>
                )}
              </section>

              <section className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">2 · DNS at your registrar</p>
                {cnameTarget ? (
                  <div className="mt-2 space-y-2 text-xs text-zinc-300">
                    <p>
                      Create a <strong className="text-white">CNAME</strong> from your hostname (or <code className="text-zinc-200">@</code> with ALIAS/ANAME if
                      your DNS supports it) to:
                    </p>
                    <code className="block break-all rounded bg-black/40 px-2 py-1.5 text-[11px] text-emerald-200">{cnameTarget}</code>
                    <p className="text-zinc-500">
                      Railway may also show a TXT record for verification — use <strong>Register on Railway</strong> below, then follow the records Railway returns
                      (or the Railway dashboard).
                    </p>
                    <p className="text-zinc-500">
                      Save the apex as <code className="text-zinc-200">custom_domain</code> (no <code className="text-zinc-200">www</code>); this app redirects{' '}
                      <code className="text-zinc-200">www</code> → apex. Point DNS using the hostname Railway shows — copy it into your registrar verbatim.
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-zinc-400">
                    After a successful production deploy with <code className="text-zinc-200">RAILWAY_API_TOKEN</code> and <code className="text-zinc-200">RAILWAY_TEAM_ID</code> on the server, the
                    project gets a default <code className="text-zinc-200">*.up.railway.app</code> hostname — then this panel shows the exact CNAME target. Until then, open Railway and copy the
                    service URL, or paste it into the project via the API as <code className="text-zinc-200">railway_url_production</code>. Save the apex as your production domain —{' '}
                    <code className="text-zinc-200">www</code> redirects to apex automatically once DNS resolves.
                  </p>
                )}
              </section>

              <section className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">3 · Railway & deploy</p>
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={attachIncludeWww}
                    onChange={(e) => setAttachIncludeWww(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-900"
                  />
                  Register <code className="text-zinc-200">www</code> at Railway too (recommended; app still 301s{' '}
                  <code className="text-zinc-200">www</code> → apex)
                </label>
                <div className="mt-3 flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10 border-white/15 bg-white/10 text-left text-xs text-white"
                    disabled={attachBusy || !serverWritesConfigured || !signedInForApi}
                    onClick={() => void runAttachRailwayDomain()}
                  >
                    {attachBusy ? 'Contacting Railway…' : 'Register custom domain on Railway'}
                  </Button>
                  <Button
                    type="button"
                    className={cn(
                      'h-10 text-sm font-semibold',
                      prodDomainReady ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'cursor-not-allowed bg-zinc-700 text-zinc-400'
                    )}
                    disabled={!prodDomainReady || deployBusy || !serverWritesConfigured || !signedInForApi}
                    title={
                      !prodDomainReady
                        ? 'Save a production domain on this project first'
                        : !signedInForApi
                          ? 'Sign in to deploy'
                          : undefined
                    }
                    onClick={() => void runDeployProduction()}
                  >
                    {deployBusy ? 'Deploying…' : 'Deploy production (ZIP / Railway)'}
                  </Button>
                </div>
              </section>

              <section className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Live URL</p>
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
                  <div className="mt-2 space-y-2 text-sm text-zinc-400">
                    <p>No visitor URL yet — set and save a custom domain above, or complete a Railway deploy to attach a default hostname.</p>
                    <ol className="list-decimal space-y-2 pl-5 text-xs text-zinc-300">
                      <li>Save domain → optional &quot;Register on Railway&quot; for TXT/CNAME details.</li>
                      <li>Confirm site files saved to the server, then deploy production.</li>
                      <li>
                        Legacy <strong>publish dashboard</strong> (new tab below) uses the same rules: production deploy is blocked without a saved domain.
                      </li>
                    </ol>
                  </div>
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

      <Modal open={Boolean(previewYoutubeId)} onClose={() => setPreviewYoutubeId(null)} title="Video preview" className="max-w-3xl">
        {previewYoutubeId ? (
          <div className="space-y-3">
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
              <iframe
                title="YouTube preview"
                src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(previewYoutubeId)}`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={importBundleOpen} onClose={() => setImportBundleOpen(false)} title="Import site bundle">
        <div className="space-y-3 text-sm text-slate-600">
          <p className="text-xs leading-relaxed">
            Paste the JSON copied with <strong>Copy site</strong>. This replaces all files in this project&apos;s workspace.
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

function readSiteSeoDraftsFromProjectPayload(
  p: Record<string, unknown>,
  setSiteType: (v: string) => void,
  setGoogleVerification: (v: string) => void,
  setPageMap: (m: Record<string, PageSeoForm>) => void,
) {
  const ss = p.site_settings ?? p.siteSettings;
  if (!ss || typeof ss !== 'object' || Array.isArray(ss)) {
    setSiteType('portfolio');
    setGoogleVerification('');
    setPageMap({});
    return;
  }
  const o = ss as Record<string, unknown>;
  const st = o.site_type ?? o.siteType;
  const allowedSt = SITE_SETTINGS_SITE_TYPES as readonly string[];
  setSiteType(typeof st === 'string' && allowedSt.includes(st) ? st : 'portfolio');
  const gv = o.google_site_verification ?? o.googleSearchConsoleVerification;
  setGoogleVerification(typeof gv === 'string' ? gv.trim() : '');
  const rawPs = o.page_seo ?? o.pageSeo;
  const nextMap: Record<string, PageSeoForm> = {};
  if (rawPs && typeof rawPs === 'object' && !Array.isArray(rawPs)) {
    for (const [k, v] of Object.entries(rawPs)) {
      if (!v || typeof v !== 'object' || Array.isArray(v)) continue;
      nextMap[k] = seoRowFromServer(v as Record<string, unknown>);
    }
  }
  setPageMap(nextMap);
}

function readGa4FromProjectPayload(p: Record<string, unknown>): string {
  const ss = p.site_settings ?? p.siteSettings;
  if (!ss || typeof ss !== 'object' || Array.isArray(ss)) return '';
  const o = ss as Record<string, unknown>;
  const id = o.ga4_measurement_id ?? o.ga4MeasurementId;
  return typeof id === 'string' ? id.trim() : '';
}

function siteFilesToVersionPayload(site: ProjectSite) {
  return site.files.map((f) => ({ name: f.name, type: f.type, content: f.content }));
}

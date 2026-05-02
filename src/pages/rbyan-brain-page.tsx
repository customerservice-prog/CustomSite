import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, ChevronRight, ExternalLink, Loader2, Plus, Send, Sparkles, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useClients, useProjects } from '@/store/hooks';
import type { ProjectSite } from '@/lib/site-builder/project-site-model';
import { saveProjectSite } from '@/lib/site-builder/project-site-storage';
import { composePreviewDocument } from '@/lib/site-builder/compose-preview-document';
import { generateSiteWithRbyan } from '@/lib/rbyan/generate-site-with-rbyan';
import {
  rbyanFilesToProjectFiles,
  type RbyanBrandKit,
  type RbyanGenerateResult,
  type RbyanGeneratedFile,
  type RbyanProjectContext,
  type RbyanSessionMemory,
} from '@/lib/rbyan/types';
import { useProjectSiteWorkspaceStore } from '@/store/use-project-site-workspace-store';
import {
  COLLAB_BUILD_STEP_LABELS,
  getProgressivePreviewFiles,
  sleep,
} from '@/lib/rbyan/progressive-build';
import { useShell } from '@/context/shell-context';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { RBYAN_PREFILL_STORAGE_KEY } from '@/store/use-build-helper-store';

const RBYAN_BRAND_STORAGE = (projectId: string) => `cs_rbyan_brand:${projectId}`;

type ChatMsg = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  result?: RbyanGenerateResult;
};

/** Co-build session: mirrors “live workshop” state alongside chat + preview. */
export type RbyanCoSession = {
  mode: 'idle' | 'building';
  currentFocus: string;
  currentSection: string;
  activePlan: string[] | null;
  files: RbyanGeneratedFile[] | null;
};

type UndoSnapshot = {
  lastResult: RbyanGenerateResult | null;
  sessionMemory: RbyanSessionMemory | null;
};

type BuildStepUi = { label: string; done: boolean };

const RBYAN_QUICK_PROMPTS: { label: string; prompt: string }[] = [
  {
    label: 'Tighten hero',
    prompt:
      'Rewrite only the hero headline and supporting line to state a single outcome, name the audience, and remove generic filler. Keep the rest of the page unchanged.',
  },
  {
    label: 'Pricing + compare',
    prompt:
      'Add a pricing section with three tiers: name + price + 4 bullets each + primary CTA per tier. Include a short comparison note explaining who each tier is for.',
  },
  {
    label: 'Proof block',
    prompt:
      'Add a testimonials section with three quotes (realistic roles), each tied to a measurable outcome. Include a one-line “as seen in / trusted by” strip above the quotes.',
  },
  {
    label: 'Mobile pass',
    prompt:
      'Improve mobile layout only: increase tap targets to at least 44px, fix cramped hero spacing, and ensure nav/CTA do not overlap content between 360–430px width.',
  },
  {
    label: 'Dark luxe',
    prompt:
      'Shift the visual system toward dark-mode luxury: deeper background, softer borders, restrained accent glow on primary buttons, and slightly larger display headings—without changing section order.',
  },
];

function siteFilesToRbyan(site: ProjectSite): RbyanGeneratedFile[] {
  return site.files.map((f) => ({ name: f.name, type: f.type, content: f.content }));
}

function cloneGeneratedFiles(files: RbyanGeneratedFile[]): RbyanGeneratedFile[] {
  return files.map((f) => ({ ...f, content: f.content }));
}

function cloneGenerateResult(r: RbyanGenerateResult): RbyanGenerateResult {
  return {
    ...r,
    files: cloneGeneratedFiles(r.files),
    plan: [...r.plan],
    sections: [...r.sections],
    suggestions: r.suggestions ? [...r.suggestions] : undefined,
    sessionMemory: r.sessionMemory
      ? {
          ...r.sessionMemory,
          lastPlan: r.sessionMemory.lastPlan,
          lastCopy: r.sessionMemory.lastCopy,
          lastDesign: r.sessionMemory.lastDesign,
        }
      : undefined,
    changelog: r.changelog ? [...r.changelog] : undefined,
  };
}

export function RbyanBrainPage() {
  const { toast } = useShell();
  const pendingNewClientId = useAppStore((s) => s.pendingNewClientId);
  const openModal = useAppStore((s) => s.openModal);
  const [searchParams] = useSearchParams();
  const clients = useClients();
  const projects = useProjects();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [lastResult, setLastResult] = useState<RbyanGenerateResult | null>(null);
  const [lastUserPrompt, setLastUserPrompt] = useState('');
  const [previewNonce, setPreviewNonce] = useState(0);
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);
  /** Context memory for plan-driven iterations (per project while you stay on this page). */
  const [sessionMemory, setSessionMemory] = useState<RbyanSessionMemory | null>(null);

  const [rbyanSession, setRbyanSession] = useState<RbyanCoSession>({
    mode: 'idle',
    currentFocus: '',
    currentSection: '',
    activePlan: null,
    files: null,
  });
  /** During progressive build, preview uses these files until the final result is committed. */
  const [stagingFiles, setStagingFiles] = useState<RbyanGeneratedFile[] | null>(null);
  const [buildSteps, setBuildSteps] = useState<BuildStepUi[]>([]);
  const [undoStack, setUndoStack] = useState<UndoSnapshot[]>([]);

  const [industryNiche, setIndustryNiche] = useState('');
  const [bizSummary, setBizSummary] = useState('');
  const [brandPrimary, setBrandPrimary] = useState('');
  const [brandAccent, setBrandAccent] = useState('');
  const [fontVibe, setFontVibe] = useState('');
  const [voice, setVoice] = useState('');
  const [visualStyle, setVisualStyle] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [keyPagesNeeded, setKeyPagesNeeded] = useState('');

  const clientProjects = useMemo(
    () => projects.filter((p) => p.deliveryFocus === 'client_site' && (!clientId || p.clientId === clientId)),
    [projects, clientId]
  );

  useEffect(() => {
    if (!pendingNewClientId) return;
    setClientId(pendingNewClientId);
    setProjectId('');
    useAppStore.setState({ pendingNewClientId: null });
  }, [pendingNewClientId]);

  const activeProject = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId]);
  const activeClient = useMemo(() => clients.find((c) => c.id === clientId), [clients, clientId]);

  useEffect(() => {
    if (!projectId) {
      setIndustryNiche('');
      setBizSummary('');
      setBrandPrimary('');
      setBrandAccent('');
      setFontVibe('');
      setVoice('');
      setVisualStyle('');
      setBusinessType('');
      setKeyPagesNeeded('');
      return;
    }
    try {
      const raw = sessionStorage.getItem(RBYAN_BRAND_STORAGE(projectId));
      if (!raw) {
        setIndustryNiche('');
        setBizSummary('');
        setBrandPrimary('');
        setBrandAccent('');
        setFontVibe('');
        setVoice('');
        setVisualStyle('');
        setBusinessType('');
        setKeyPagesNeeded('');
        return;
      }
      const j = JSON.parse(raw) as Record<string, string>;
      setIndustryNiche(j.industryNiche ?? '');
      setBizSummary(j.bizSummary ?? '');
      setBrandPrimary(j.brandPrimary ?? '');
      setBrandAccent(j.brandAccent ?? '');
      setFontVibe(j.fontVibe ?? '');
      setVoice(j.voice ?? '');
      setVisualStyle(j.visualStyle ?? '');
      setBusinessType(j.businessType ?? '');
      setKeyPagesNeeded(j.keyPagesNeeded ?? '');
    } catch {
      /* */
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    const id = window.setTimeout(() => {
      try {
        sessionStorage.setItem(
          RBYAN_BRAND_STORAGE(projectId),
          JSON.stringify({
            industryNiche,
            bizSummary,
            brandPrimary,
            brandAccent,
            fontVibe,
            voice,
            visualStyle,
            businessType,
            keyPagesNeeded,
          })
        );
      } catch {
        /* */
      }
    }, 500);
    return () => window.clearTimeout(id);
  }, [projectId, industryNiche, bizSummary, brandPrimary, brandAccent, fontVibe, voice, visualStyle, businessType, keyPagesNeeded]);

  const projectContext: RbyanProjectContext | null = useMemo(() => {
    if (!projectId || !activeProject) return null;
    const companyRow = clients.find((c) => c.id === activeProject.clientId);
    const kit: RbyanBrandKit = {
      primaryHex: brandPrimary.trim() || undefined,
      accentHex: brandAccent.trim() || undefined,
      fontVibe: fontVibe.trim() || undefined,
      voice: voice.trim() || undefined,
      visualStyle: visualStyle.trim() || undefined,
      businessSummary: bizSummary.trim() || undefined,
    };
    const hasBrand = Boolean(
      kit.primaryHex ||
        kit.accentHex ||
        kit.fontVibe ||
        kit.voice ||
        kit.visualStyle ||
        kit.businessSummary
    );
    return {
      projectId,
      projectName: activeProject.name,
      clientId: activeProject.clientId,
      clientCompany: companyRow?.company ?? null,
      clientContactName: companyRow?.name ?? null,
      clientEmail: companyRow?.email?.trim() || null,
      clientPhone: companyRow?.phone?.trim() || null,
      industryNiche: industryNiche.trim() || null,
      deliveryFocus: activeProject.deliveryFocus,
      siteBuildArchetype: activeProject.siteBuildArchetype ?? null,
      businessType: businessType.trim() || null,
      keyPagesNeeded: keyPagesNeeded.trim() || null,
      brandKit: hasBrand ? kit : null,
    };
  }, [
    projectId,
    activeProject,
    clients,
    industryNiche,
    bizSummary,
    brandPrimary,
    brandAccent,
    fontVibe,
    voice,
    visualStyle,
    businessType,
    keyPagesNeeded,
  ]);

  const activeClientForAi = useMemo(() => {
    if (!activeProject) return null;
    return clients.find((c) => c.id === activeProject.clientId) ?? null;
  }, [activeProject, clients]);

  /** True when we lack company + niche + offer — generation would fall back to generic templates. */
  const aiContextThin = useMemo(() => {
    if (!projectId || !activeClientForAi) return false;
    const hasCompany = Boolean(activeClientForAi.company?.trim());
    const hasNiche = Boolean(industryNiche.trim());
    const hasBiz = Boolean(bizSummary.trim());
    const hasBizType = Boolean(businessType.trim());
    const hasKeyPages = Boolean(keyPagesNeeded.trim());
    return !(hasCompany || hasNiche || hasBiz || hasBizType || hasKeyPages);
  }, [projectId, activeClientForAi, industryNiche, bizSummary, businessType, keyPagesNeeded]);

  const hydrate = useProjectSiteWorkspaceStore((s) => s.hydrate);
  const workspaceRow = useProjectSiteWorkspaceStore((s) => (projectId ? s.byProjectId[projectId] : undefined));
  const versions = workspaceRow?.versions ?? [];

  const refreshWorkspace = useCallback(() => {
    if (!projectId) return;
    void hydrate(projectId);
  }, [projectId, hydrate]);

  useEffect(() => {
    const qp = searchParams.get('project');
    if (!qp) return;
    const p = projects.find((x) => x.id === qp && x.deliveryFocus === 'client_site');
    if (!p) return;
    setClientId(p.clientId);
    setProjectId(p.id);
    useProjectSiteWorkspaceStore.getState().setBuilderSurface(p.id, 'ai');
  }, [searchParams, projects]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(RBYAN_PREFILL_STORAGE_KEY);
      if (!raw) return;
      sessionStorage.removeItem(RBYAN_PREFILL_STORAGE_KEY);
      setInput((prev) => (prev.trim() ? prev : raw));
    } catch {
      /* */
    }
  }, []);

  useEffect(() => {
    refreshWorkspace();
  }, [refreshWorkspace]);

  useEffect(() => {
    setSessionMemory(null);
    setRbyanSession({
      mode: 'idle',
      currentFocus: '',
      currentSection: '',
      activePlan: null,
      files: null,
    });
    setStagingFiles(null);
    setBuildSteps([]);
    setUndoStack([]);
  }, [projectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, generating]);

  const sectionPills = useMemo(() => {
    const from = lastResult?.sections?.filter(Boolean) ?? [];
    return [...new Set(from)];
  }, [lastResult?.sections]);

  const previewSite: ProjectSite = useMemo(() => {
    if (!projectId) return { projectId: '', files: [] };
    const v = previewVersionId ? versions.find((x) => x.id === previewVersionId) : null;
    const staged = stagingFiles && !previewVersionId ? stagingFiles : null;
    const fromWs =
      workspaceRow?.hydrated && workspaceRow.site.files.length ? siteFilesToRbyan(workspaceRow.site) : [];
    const files = staged ?? v?.files ?? lastResult?.files ?? fromWs;
    return { projectId, files: rbyanFilesToProjectFiles(projectId, files) };
  }, [projectId, lastResult, previewVersionId, versions, previewNonce, stagingFiles, workspaceRow]);

  const previewDoc = useMemo(() => composePreviewDocument(previewSite), [previewSite]);
  const hasPreviewableSite = previewSite.files.length > 0;

  const undoLast = useCallback(() => {
    setUndoStack((stack) => {
      if (!stack.length) return stack;
      const snap = stack[stack.length - 1];
      const next = stack.slice(0, -1);
      setLastResult(snap.lastResult);
      setSessionMemory(snap.sessionMemory);
      setStagingFiles(null);
      setRbyanSession((s) => ({
        ...s,
        mode: 'idle',
        files: snap.lastResult?.files ?? null,
        activePlan: snap.lastResult?.plan ?? null,
      }));
      setPreviewNonce((n) => n + 1);
      toast('Restored previous working draft.', 'info');
      return next;
    });
  }, [toast]);

  const sendPrompt = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || !projectContext) {
        if (!projectContext) toast('Select a project first.', 'info');
        return;
      }
      if (aiContextThin) {
        toast(
          'Add the client company on their CRM record, or fill Industry / Offer below, before generating — otherwise output stays generic.',
          'error'
        );
        return;
      }
      setLastUserPrompt(text);
      setInput('');
      setMessages((m) => [...m, { id: `u-${Date.now()}`, role: 'user', content: text }]);
      setGenerating(true);
      setPreviewVersionId(null);
      setRbyanSession((s) => ({ ...s, mode: 'building' }));
      setBuildSteps([{ label: 'Synthesizing layout and code…', done: false }]);
      if (projectId) useProjectSiteWorkspaceStore.getState().setRbyanBusy(projectId, true);

      const ws = projectId ? useProjectSiteWorkspaceStore.getState().byProjectId[projectId] : undefined;
      const fromWorkspace =
        ws?.hydrated && ws.site.files.length ? siteFilesToRbyan(ws.site) : null;
      const existing = lastResult?.files?.length ? lastResult.files : fromWorkspace;
      const pushedUndo = Boolean(lastResult?.files?.length);
      if (pushedUndo) {
        setUndoStack((u) => [
          ...u,
          {
            lastResult: cloneGenerateResult(lastResult!),
            sessionMemory: sessionMemory ? { ...sessionMemory } : null,
          },
        ]);
      }

      const totalSteps = COLLAB_BUILD_STEP_LABELS.length;

      try {
        const focus = rbyanSession.currentSection.trim();
        const completed = await generateSiteWithRbyan(text, projectContext, existing, sessionMemory, focus || null);

        setBuildSteps([{ label: 'Synthesizing layout and code…', done: true }]);

        const useProgressive = completed.classification === 'build-site';
        if (useProgressive) {
          setBuildSteps(COLLAB_BUILD_STEP_LABELS.map((label) => ({ label, done: false })));
          for (let step = 1; step <= totalSteps; step += 1) {
            setStagingFiles(getProgressivePreviewFiles(completed.files, step, totalSteps));
            setBuildSteps((prev) => prev.map((row, i) => ({ ...row, done: i < step })));
            setPreviewNonce((n) => n + 1);
            await sleep(400);
          }
          setStagingFiles(null);
          setBuildSteps((prev) => prev.map((row) => ({ ...row, done: true })));
        } else {
          setTimeout(() => setBuildSteps([]), 900);
        }

        setLastResult(completed);
        if (completed.sessionMemory) setSessionMemory(completed.sessionMemory);
        setRbyanSession((s) => ({
          ...s,
          mode: 'idle',
          activePlan: completed.plan,
          files: completed.files,
          currentFocus: focus || 'Whole page',
        }));

        setMessages((m) => [
          ...m,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: completed.assistantMessage,
            result: completed,
          },
        ]);
        setPreviewNonce((n) => n + 1);
      } catch {
        if (pushedUndo) setUndoStack((u) => u.slice(0, -1));
        toast('AI Builder could not finish that request. Try again.', 'error');
        setBuildSteps([]);
      } finally {
        setGenerating(false);
        setStagingFiles(null);
        setRbyanSession((s) => ({ ...s, mode: 'idle' }));
        if (projectId) useProjectSiteWorkspaceStore.getState().setRbyanBusy(projectId, false);
      }
    },
    [projectContext, projectId, lastResult, sessionMemory, toast, rbyanSession.currentSection, aiContextThin]
  );

  const sendPromptRef = useRef(sendPrompt);
  sendPromptRef.current = sendPrompt;
  const inputRef = useRef(input);
  inputRef.current = input;

  useEffect(() => {
    const fn = () => {
      const v = inputRef.current.trim();
      if (v) void sendPromptRef.current(v);
    };
    window.addEventListener('rbyan-submit-prompt', fn);
    return () => window.removeEventListener('rbyan-submit-prompt', fn);
  }, []);

  const applyResultToProject = useCallback(
    (result: RbyanGenerateResult) => {
      if (!result.files.length || !projectId) return;
      const st = useProjectSiteWorkspaceStore.getState();
      const cur = st.byProjectId[projectId]?.site;
      if (cur && cur.files.length > 0) {
        st.appendSnapshot(projectId, 'Before AI Builder apply', ['Snapshot before applying AI output.'], siteFilesToRbyan(cur));
      }
      st.applyRbyanOutput(projectId, result.files, {
        label: result.versionLabel,
        plan: result.plan,
      });
      void refreshWorkspace();
      setPreviewNonce((n) => n + 1);
      toast('Synced to your project site.', 'success');
    },
    [projectId, refreshWorkspace, toast]
  );

  const applyToProject = useCallback(() => {
    if (!lastResult) return;
    applyResultToProject(lastResult);
  }, [lastResult, applyResultToProject]);

  const restoreVersion = async (vid: string) => {
    const v = versions.find((x) => x.id === vid);
    if (!v || !projectId) return;
    const site: ProjectSite = { projectId, files: rbyanFilesToProjectFiles(projectId, v.files) };
    useProjectSiteWorkspaceStore.getState().setSiteImmediate(projectId, site);
    const saveResult = await saveProjectSite(site);
    void refreshWorkspace();
    setPreviewVersionId(null);
    setStagingFiles(null);
    setSessionMemory(null);
    setLastResult({
      assistantMessage: 'Restored version applied to project files.',
      plan: v.plan,
      files: v.files,
      sections: [],
      versionLabel: v.label,
      source: 'mock',
    });
    setPreviewNonce((n) => n + 1);
    if (!saveResult.localSaved) {
      toast(saveResult.apiError ?? 'Could not save to browser storage.', 'error');
    } else if (!saveResult.apiOk) {
      toast(`Restored in workspace only — server did not confirm: ${saveResult.apiError ?? 'Unknown error'}`, 'error');
    } else {
      toast(`Restored “${v.label}”.`, 'success');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-[#070708] text-zinc-100 lg:min-h-[calc(100vh-3rem)]">
      <div className="border-b border-white/10 bg-gradient-to-r from-violet-950/40 via-zinc-950 to-zinc-950 px-4 py-4 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-white md:text-2xl">
              <Sparkles className="h-6 w-6 text-violet-400" aria-hidden />
              Bryan the Brain
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-400">
              Select a client and project, add business &amp; brand notes in the sidebar, then prompt. The mock engine uses that context to vary structure, copy, and colors—swap in a real model later without changing your workflow.
            </p>
            <ol className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium text-zinc-500">
              <li className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-zinc-300">
                Step 1 · Choose client &amp; project
              </li>
              <li className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1">Step 2 · Type your prompt</li>
              <li className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1">Step 3 · Watch it build</li>
            </ol>
          </div>
          {projectId ? (
            <Link
              to={`/projects/${projectId}/site`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              Open Site Builder
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-12">
        {/* LEFT — context */}
        <aside className="border-b border-white/10 p-4 lg:col-span-3 lg:border-b-0 lg:border-r">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Context</p>
          <label className="mb-1 block text-[11px] text-zinc-400">Client</label>
          <div className="mb-3 flex flex-wrap items-stretch gap-2">
            <Select
              aria-label="Select client"
              className="h-9 min-w-0 flex-1 border-zinc-700 bg-zinc-900 text-xs text-zinc-100"
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setProjectId('');
              }}
            >
              <option value="">Choose client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` · ${c.company}` : ''}
                </option>
              ))}
            </Select>
            <button
              type="button"
              onClick={() => openModal('create-client', { pickContext: true })}
              className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md border border-zinc-600 bg-zinc-800 px-2.5 text-[11px] font-semibold text-zinc-100 transition hover:bg-zinc-700"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              New
            </button>
          </div>
          <label className="mb-1 block text-[11px] text-zinc-400">Project</label>
          <Select
            aria-label="Select project"
            className="mb-3 h-9 border-zinc-700 bg-zinc-900 text-xs text-zinc-100"
            value={projectId}
            disabled={!clientId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">Choose project…</option>
            {clientProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          {projectId ? (
            <div className="mb-4 rounded-lg border border-violet-500/25 bg-violet-950/25 p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-violet-300/90">Business &amp; brand</p>
              <p className="mb-2 text-[10px] leading-snug text-zinc-500">Used on every generation pass (stored with this project in your session).</p>
              {aiContextThin ? (
                <p className="mb-2 rounded border border-amber-600/40 bg-amber-950/40 px-2 py-1.5 text-[10px] leading-snug text-amber-100">
                  Add <strong>company</strong> on the client record, or fill <strong>Industry</strong> / <strong>Offer</strong> here — send is blocked until at least one is set so the AI
                  is not guessing.
                </p>
              ) : null}
              <label className="mb-0.5 block text-[10px] text-zinc-400">Business type</label>
              <Select
                aria-label="Business type"
                className="mb-2 h-8 border-zinc-700 bg-zinc-900 text-xs text-zinc-100"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
              >
                <option value="">Choose…</option>
                <option value="restaurant">Restaurant / cafe</option>
                <option value="salon">Salon / spa / beauty</option>
                <option value="contractor">Contractor / trades</option>
                <option value="ecommerce">E-commerce / product</option>
                <option value="personal_brand">Personal brand</option>
                <option value="professional_services">Professional services (legal, accounting)</option>
                <option value="other">Other local business</option>
              </Select>
              <label className="mb-0.5 block text-[10px] text-zinc-400">Industry / niche</label>
              <Input
                className="mb-2 h-8 border-zinc-700 bg-zinc-900 text-xs text-zinc-100"
                value={industryNiche}
                onChange={(e) => setIndustryNiche(e.target.value)}
                placeholder="e.g. Neighborhood Italian bistro"
              />
              <label className="mb-0.5 block text-[10px] text-zinc-400">Offer &amp; audience</label>
              <Textarea
                className="mb-2 min-h-[52px] resize-y border-zinc-700 bg-zinc-900 text-xs text-zinc-100"
                value={bizSummary}
                onChange={(e) => setBizSummary(e.target.value)}
                placeholder="What they sell, who it’s for, geography, proof…"
                rows={2}
              />
              <label className="mb-0.5 block text-[10px] text-zinc-400">Key pages needed</label>
              <Input
                className="mb-2 h-8 border-zinc-700 bg-zinc-900 text-xs text-zinc-100"
                value={keyPagesNeeded}
                onChange={(e) => setKeyPagesNeeded(e.target.value)}
                placeholder="e.g. Home, Menu, Gallery, Reservations, Contact"
                spellCheck={false}
              />
              <div className="mb-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-0.5 block text-[10px] text-zinc-400">Primary hex</label>
                  <Input
                    className="h-8 border-zinc-700 bg-zinc-900 text-xs text-zinc-100"
                    value={brandPrimary}
                    onChange={(e) => setBrandPrimary(e.target.value)}
                    placeholder="#4f46e5"
                    spellCheck={false}
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] text-zinc-400">Accent hex</label>
                  <Input
                    className="h-8 border-zinc-700 bg-zinc-900 text-xs text-zinc-100"
                    value={brandAccent}
                    onChange={(e) => setBrandAccent(e.target.value)}
                    placeholder="#7c3aed"
                    spellCheck={false}
                  />
                </div>
              </div>
              <label className="mb-0.5 block text-[10px] text-zinc-400">Voice</label>
              <Input
                className="mb-2 h-8 border-zinc-700 bg-zinc-900 text-xs text-zinc-100"
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                placeholder="e.g. warm, expert, no jargon"
              />
              <label className="mb-0.5 block text-[10px] text-zinc-400">Visual style</label>
              <Input
                className="mb-2 h-8 border-zinc-700 bg-zinc-900 text-xs text-zinc-100"
                value={visualStyle}
                onChange={(e) => setVisualStyle(e.target.value)}
                placeholder="e.g. bold minimal, editorial serif"
              />
              <label className="mb-0.5 block text-[10px] text-zinc-400">Typography direction</label>
              <Input
                className="h-8 border-zinc-700 bg-zinc-900 text-xs text-zinc-100"
                value={fontVibe}
                onChange={(e) => setFontVibe(e.target.value)}
                placeholder="e.g. geometric sans + subtle serif for H1"
              />
            </div>
          ) : null}
          {activeProject ? (
            <div className="mt-4 space-y-2 rounded-lg border border-white/10 bg-black/30 p-3 text-[11px] text-zinc-400">
              {activeClient ? (
                <p>
                  <span className="text-zinc-500">Selected client</span>{' '}
                  <span className="font-medium text-zinc-200">
                    {activeClient.name}
                    {activeClient.company ? ` · ${activeClient.company}` : ''}
                  </span>
                </p>
              ) : null}
              <p>
                <span className="text-zinc-500">Project</span>{' '}
                <span className="font-medium text-zinc-200">{activeProject.name}</span>
              </p>
              <p>
                <span className="text-zinc-500">Site type</span>{' '}
                <span className="font-medium text-zinc-200">{activeProject.deliveryFocus === 'client_site' ? 'Client website' : activeProject.deliveryFocus}</span>
              </p>
              <p>
                <span className="text-zinc-500">Files on site</span>{' '}
                <span className="font-medium text-zinc-200">{workspaceRow?.site.files.length ?? 0}</span>
              </p>
              <p>
                <span className="text-zinc-500">Saved versions</span>{' '}
                <span className="font-medium text-zinc-200">{versions.length}</span>
              </p>
              <p>
                <span className="text-zinc-500">Co-build session</span>{' '}
                <span className="font-medium text-zinc-200">
                  {rbyanSession.mode === 'building' ? 'Building…' : 'Ready'}
                  {rbyanSession.currentSection ? ` · Focus: ${rbyanSession.currentSection}` : ' · Focus: whole page'}
                </span>
              </p>
            </div>
          ) : (
            <p className="mt-4 text-xs text-zinc-500">Start with a client, a project, and a prompt.</p>
          )}
          {versions.length > 0 ? (
            <div className="mt-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Versions</p>
              <ul className="max-h-40 space-y-1 overflow-y-auto text-[11px]">
                {[...versions].reverse().map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-1 rounded border border-white/5 bg-zinc-900/80 px-2 py-1">
                    <button
                      type="button"
                      className={cn('min-w-0 flex-1 truncate text-left text-zinc-300 hover:text-violet-300', previewVersionId === v.id && 'text-violet-300')}
                      onClick={() => {
                        setPreviewVersionId(v.id);
                        setPreviewNonce((n) => n + 1);
                      }}
                    >
                      {v.label}
                    </button>
                    <button type="button" className="shrink-0 text-violet-400 hover:underline" onClick={() => void restoreVersion(v.id)}>
                      Apply
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>

        {/* CENTER — chat */}
        <section className="flex min-h-[320px] flex-col border-b border-white/10 lg:col-span-5 lg:min-h-0 lg:border-b-0 lg:border-r">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && !generating ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-zinc-900/40 p-6 text-center">
                <p className="text-sm text-zinc-400">Start with a client, a project, and a prompt.</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {[
                    'Build a service business homepage',
                    'Build an e-commerce homepage',
                    'Build a landing page',
                    'Improve current homepage',
                  ].map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:bg-violet-500/20 hover:text-white"
                      onClick={() => setInput(ex)}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn('rounded-xl px-3 py-2 text-sm leading-relaxed', msg.role === 'user' ? 'ml-8 bg-violet-600/25 text-violet-50' : 'mr-8 bg-zinc-800/80 text-zinc-200')}
              >
                {msg.role === 'assistant' && <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-violet-400">AI</p>}
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.result ? (
                  <div className="mt-2 border-t border-white/10 pt-2 text-[11px] text-zinc-400">
                    <p className="font-medium text-zinc-300">Plan</p>
                    {msg.result.classification ? (
                      <p className="mb-1 text-[10px] uppercase tracking-wide text-violet-500/90">Strategy: {msg.result.classification.replace(/-/g, ' ')}</p>
                    ) : null}
                    <ul className="mt-0.5 list-inside list-disc space-y-0.5 text-zinc-300">
                      {(Array.isArray(msg.result.plan) ? msg.result.plan : [msg.result.plan]).map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                    {msg.result.changelog && msg.result.changelog.length > 0 ? (
                      <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2 py-2">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-400/90">What changed</p>
                        <ul className="list-inside list-disc space-y-0.5 text-[11px] text-zinc-300">
                          {msg.result.changelog.map((line, i) => (
                            <li key={i}>{line.replace(/`/g, '')}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <p className="mt-2 text-zinc-500">
                      Sections: {msg.result.sections.length ? msg.result.sections.join(' · ') : '—'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        className="h-8 text-xs"
                        onClick={() => {
                          setPreviewVersionId(null);
                          setPreviewNonce((n) => n + 1);
                        }}
                      >
                        Preview
                      </Button>
                      <Button type="button" variant="secondary" className="h-8 border-white/10 bg-white/10 text-xs text-white hover:bg-white/15" onClick={() => setInput(lastUserPrompt)}>
                        Edit request
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-8 border-white/10 bg-white/10 text-xs text-white hover:bg-white/15"
                        disabled={generating || !lastUserPrompt}
                        onClick={() => void sendPrompt(lastUserPrompt)}
                      >
                        Regenerate
                      </Button>
                      <Button
                        type="button"
                        className="h-8 bg-emerald-600 text-xs hover:bg-emerald-500"
                        disabled={!projectId}
                        onClick={() => applyResultToProject(msg.result!)}
                      >
                        Apply to project site
                      </Button>
                    </div>
                    {msg.result.buildPlan ? (
                      <details className="mt-3 rounded-lg border border-white/5 bg-black/20 px-2 py-1.5 text-[10px] text-zinc-500">
                        <summary className="cursor-pointer select-none text-zinc-400 hover:text-zinc-300">Build intent</summary>
                        <dl className="mt-2 space-y-1 pl-0.5 text-zinc-500">
                          <div>
                            <dt className="inline font-semibold text-zinc-600">Goal</dt> {msg.result.buildPlan.goal}
                          </div>
                          <div>
                            <dt className="inline font-semibold text-zinc-600">Audience</dt> {msg.result.buildPlan.audience}
                          </div>
                          <div>
                            <dt className="inline font-semibold text-zinc-600">Tone</dt> {msg.result.buildPlan.tone}
                          </div>
                          <div>
                            <dt className="inline font-semibold text-zinc-600">Style</dt> {msg.result.buildPlan.style.theme} · {msg.result.buildPlan.style.spacing} spacing ·{' '}
                            {msg.result.buildPlan.style.typography} type
                          </div>
                        </dl>
                      </details>
                    ) : null}
                    {(msg.result.suggestions ?? []).length > 0 ? (
                      <div className="mt-3">
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Try next</p>
                        <div className="flex flex-wrap gap-2">
                          {msg.result.suggestions!.map((s) => (
                            <button
                              key={s}
                              type="button"
                              disabled={generating || !projectContext}
                              className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[10px] font-medium text-violet-200 transition hover:bg-violet-500/25 disabled:opacity-40"
                              onClick={() => void sendPrompt(s)}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
            {generating ? (
              <div className="mr-8 space-y-2 rounded-xl bg-zinc-800/80 px-3 py-3 text-sm text-zinc-300">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-violet-400" aria-hidden />
                  <span>AI Builder is updating your site…</span>
                </div>
                {buildSteps.length > 0 ? (
                  <ul className="space-y-1.5 border-t border-white/5 pt-2 text-[11px] text-zinc-400">
                    {buildSteps.map((row, i) => (
                      <li key={`${row.label}-${i}`} className="flex items-start gap-2">
                        {row.done ? (
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
                        ) : (
                          <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full border border-white/25" aria-hidden />
                        )}
                        <span className={row.done ? 'text-zinc-200' : ''}>{row.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
          <div className="shrink-0 border-t border-white/10 p-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Quick prompts</p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {RBYAN_QUICK_PROMPTS.map(({ label, prompt }) => (
                <button
                  key={label}
                  type="button"
                  disabled={generating || !projectContext}
                  className="rounded-full border border-white/15 bg-zinc-800/90 px-2.5 py-1 text-[10px] font-medium text-zinc-100 shadow-sm transition hover:border-violet-400/40 hover:bg-zinc-700/90 disabled:cursor-not-allowed disabled:opacity-45"
                  onClick={() => void sendPrompt(prompt)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mb-2 text-[10px] leading-relaxed text-zinc-500">
              <span className="font-semibold text-zinc-400">Focus:</span> After the first build, choose a section to steer hero-only copy tweaks and scoped style passes. Use Whole page for full regenerations or broad layout changes.
            </p>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Focus</span>
                <button
                  type="button"
                  disabled={generating}
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition disabled:opacity-40',
                    !rbyanSession.currentSection
                      ? 'border-violet-500/50 bg-violet-500/20 text-violet-100'
                      : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                  )}
                  onClick={() => setRbyanSession((s) => ({ ...s, currentSection: '' }))}
                >
                  Whole page
                </button>
                {sectionPills.map((name) => (
                  <button
                    key={name}
                    type="button"
                    disabled={generating}
                    className={cn(
                      'rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition disabled:opacity-40',
                      rbyanSession.currentSection === name
                        ? 'border-violet-500/50 bg-violet-500/20 text-violet-100'
                        : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                    )}
                    onClick={() => setRbyanSession((s) => ({ ...s, currentSection: name }))}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                variant="secondary"
                className="h-8 shrink-0 gap-1 border-white/10 bg-white/10 px-2.5 text-[11px] text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
                disabled={generating || undoStack.length === 0}
                title={undoStack.length === 0 ? 'Nothing to undo yet' : 'Undo last generation'}
                onClick={() => {
                  if (undoStack.length === 0) {
                    toast('Nothing to undo yet.', 'info');
                    return;
                  }
                  undoLast();
                }}
              >
                <Undo2 className="h-3.5 w-3.5" aria-hidden />
                Undo
              </Button>
            </div>
            <div className="flex gap-2 rounded-xl border border-white/10 bg-zinc-900/90 p-2">
              <textarea
                className="max-h-32 min-h-[52px] flex-1 resize-y bg-transparent px-2 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                placeholder={
                  rbyanSession.currentSection
                    ? `Changes apply to “${rbyanSession.currentSection}” when possible…`
                    : 'Describe what to build or change…'
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.metaKey || e.ctrlKey) return;
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void sendPrompt(input);
                  }
                }}
                rows={2}
                aria-label="Send message to AI Builder"
              />
              <Button
                type="button"
                className="h-11 w-11 shrink-0 self-end rounded-lg bg-violet-600 p-0 hover:bg-violet-500 disabled:opacity-40"
                disabled={generating || !input.trim() || !projectContext || aiContextThin}
                title={aiContextThin ? 'Add client company or industry/offer context first' : undefined}
                aria-label="Send"
                onClick={() => void sendPrompt(input)}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* RIGHT — output */}
        <aside className="flex min-h-[280px] flex-col p-4 lg:col-span-4 lg:min-h-0">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Output</p>
          {hasPreviewableSite || previewVersionId ? (
            <>
              <div className="mb-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-white/10 bg-black/40">
                <p className="shrink-0 border-b border-white/5 px-2 py-1.5 text-[10px] text-zinc-500">
                  Live preview
                  {stagingFiles ? <span className="text-violet-400"> · updating</span> : null}
                </p>
                {generating ? (
                  <p className="shrink-0 border-b border-violet-500/20 bg-violet-950/40 px-2 py-1.5 text-[11px] text-violet-200">
                    AI Builder is updating your site — watch sections appear in the preview.
                  </p>
                ) : null}
                <iframe
                  title="AI Builder preview"
                  srcDoc={previewDoc}
                  className="h-full min-h-[200px] w-full flex-1 border-0 bg-white"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  sandbox="allow-scripts"
                  referrerPolicy="no-referrer"
                />
              </div>
              <p className="mb-1 text-[10px] font-semibold uppercase text-zinc-500">Generated files</p>
              <ul className="max-h-28 space-y-1 overflow-y-auto text-[11px] text-zinc-400">
                {previewSite.files.map((f) => (
                  <li key={f.name} className="truncate font-mono text-zinc-300">
                    {f.name} <span className="text-zinc-600">({f.type})</span>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                className="mt-3 h-9 w-full bg-emerald-600 text-sm font-semibold hover:bg-emerald-500"
                disabled={!projectId}
                onClick={() => applyToProject()}
              >
                Apply to project site
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-zinc-900/30 p-6 text-center text-sm text-zinc-500">
              {projectId ? (
                <>
                  <p className="font-medium text-zinc-400">Preview appears here when your project has site files or after the first AI pass.</p>
                  <p className="mt-2 text-xs text-zinc-500">
                    If this project already has HTML in Site Builder, you should see a live iframe as soon as files load. While a prompt runs, the preview updates step-by-step.
                  </p>
                </>
              ) : (
                <p>Choose a project to enable preview and generation.</p>
              )}
            </div>
          )}
        </aside>
      </div>

    </div>
  );
}

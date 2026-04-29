import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, ChevronRight, ExternalLink, Loader2, Send, Sparkles, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useClients, useProjects } from '@/store/hooks';
import type { ProjectSite } from '@/lib/site-builder/project-site-model';
import { saveProjectSite } from '@/lib/site-builder/project-site-storage';
import { composePreviewDocument } from '@/lib/site-builder/compose-preview-document';
import { generateSiteWithRbyan } from '@/lib/rbyan/generate-site-with-rbyan';
import {
  rbyanFilesToProjectFiles,
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
import { RBYAN_PREFILL_STORAGE_KEY } from '@/store/use-build-helper-store';

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
  { label: 'Improve design', prompt: 'Improve the visual design, spacing, and typography to feel more polished and modern.' },
  { label: 'Add pricing', prompt: 'Add a clear pricing section with three tiers and strong CTAs.' },
  { label: 'Add testimonials', prompt: 'Add a testimonials section with quotes and client names.' },
  { label: 'Optimize mobile', prompt: 'Optimize layout and typography for mobile screens and touch targets.' },
  { label: 'More premium', prompt: 'Make the site feel more premium and high-end with refined copy and visuals.' },
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

  const clientProjects = useMemo(
    () => projects.filter((p) => p.deliveryFocus === 'client_site' && (!clientId || p.clientId === clientId)),
    [projects, clientId]
  );

  const activeProject = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId]);
  const activeClient = useMemo(() => clients.find((c) => c.id === clientId), [clients, clientId]);

  const projectContext: RbyanProjectContext | null = useMemo(() => {
    if (!projectId || !activeProject) return null;
    return {
      projectId,
      projectName: activeProject.name,
      clientId: activeProject.clientId,
      clientCompany: clients.find((c) => c.id === activeProject.clientId)?.company ?? null,
      deliveryFocus: activeProject.deliveryFocus,
    };
  }, [projectId, activeProject, clients]);

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
        toast('Rbyan could not finish that request. Try again.', 'error');
        setBuildSteps([]);
      } finally {
        setGenerating(false);
        setStagingFiles(null);
        setRbyanSession((s) => ({ ...s, mode: 'idle' }));
        if (projectId) useProjectSiteWorkspaceStore.getState().setRbyanBusy(projectId, false);
      }
    },
    [projectContext, projectId, lastResult, sessionMemory, toast, rbyanSession.currentSection]
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
        st.appendSnapshot(projectId, 'Before Rbyan apply', ['Snapshot before applying AI output.'], siteFilesToRbyan(cur));
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
    await saveProjectSite(site);
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
    toast(`Restored “${v.label}”.`, 'success');
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-[#070708] text-zinc-100 lg:min-h-[calc(100vh-3rem)]">
      <div className="border-b border-white/10 bg-gradient-to-r from-violet-950/40 via-zinc-950 to-zinc-950 px-4 py-4 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-white md:text-2xl">
              <Sparkles className="h-6 w-6 text-violet-400" aria-hidden />
              Rbyan the Brain
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-400">
              Co-build with Rbyan: pick a section focus, watch the preview update step by step on full builds, and undo when you want to back up one turn.
            </p>
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
          <Select
            aria-label="Select client"
            className="mb-3 h-9 border-zinc-700 bg-zinc-900 text-xs text-zinc-100"
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
                <span className="text-zinc-500">Rbyan versions</span>{' '}
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
                {msg.role === 'assistant' && <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-violet-400">Rbyan</p>}
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
                  <span>Rbyan is building your site…</span>
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
                  className="rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-1 text-[10px] font-medium text-violet-100 transition hover:bg-violet-500/25 disabled:opacity-40"
                  onClick={() => void sendPrompt(prompt)}
                >
                  {label}
                </button>
              ))}
            </div>
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
                className="h-8 shrink-0 gap-1 border-white/10 bg-white/10 px-2.5 text-[11px] text-white hover:bg-white/15"
                disabled={generating || undoStack.length === 0}
                onClick={undoLast}
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
                    : 'Tell Rbyan what to build or change…'
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
                aria-label="Message Rbyan"
              />
              <Button
                type="button"
                className="h-11 w-11 shrink-0 self-end rounded-lg bg-violet-600 p-0 hover:bg-violet-500 disabled:opacity-40"
                disabled={generating || !input.trim() || !projectContext}
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
          {lastResult || previewVersionId ? (
            <>
              <div className="mb-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-white/10 bg-black/40">
                <p className="shrink-0 border-b border-white/5 px-2 py-1.5 text-[10px] text-zinc-500">
                  Live preview
                  {stagingFiles ? <span className="text-violet-400"> · updating</span> : null}
                </p>
                {generating ? (
                  <p className="shrink-0 border-b border-violet-500/20 bg-violet-950/40 px-2 py-1.5 text-[11px] text-violet-200">
                    Rbyan is building your site—watch sections appear in the preview.
                  </p>
                ) : null}
                <iframe title="Rbyan preview" srcDoc={previewDoc} className="min-h-[200px] flex-1 bg-white" sandbox="allow-same-origin allow-scripts" />
              </div>
              <p className="mb-1 text-[10px] font-semibold uppercase text-zinc-500">Generated files</p>
              <ul className="max-h-28 space-y-1 overflow-y-auto text-[11px] text-zinc-400">
                {(previewVersionId ? versions.find((v) => v.id === previewVersionId)?.files : lastResult?.files)?.map((f) => (
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
              Generated preview and file list appear here after your first prompt.
            </div>
          )}
        </aside>
      </div>

    </div>
  );
}

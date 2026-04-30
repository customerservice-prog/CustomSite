import { useMemo, useState } from 'react';
import { Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PreviewDebugEvent } from '@/lib/site-builder/preview-debug-events';
import { deriveSandboxStatus, previewEventTypeLabel } from '@/lib/site-builder/preview-debug-events';
import type { RbyanVersionEntry } from '@/lib/rbyan/types';

type Props = {
  events: PreviewDebugEvent[];
  loadError: string | null;
  saveError: string | null;
  saveStatus: 'idle' | 'saving' | 'saved' | 'saved_local_only' | 'error';
  unsaved: boolean;
  lastSavedAt: number | null;
  previewHtml: string;
  missingCoreFiles: string[];
  onClearEvents: () => void;
  /** GET /api/config/public or similar — null until first check. */
  serverReachable: boolean | null;
  rbyanBusy: boolean;
  versions: RbyanVersionEntry[];
  onRevertVersion?: (versionId: string) => void;
  /** When set with `onExpandedChange`, the shell controls open/closed (e.g. shared between main + fullscreen preview). */
  expanded?: boolean;
  onExpandedChange?: (open: boolean) => void;
  defaultExpanded?: boolean;
};

function formatSavedAt(ts: number | null): string {
  if (ts == null) return '—';
  try {
    return new Date(ts).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

function StatusChip({ label, state }: { label: string; state: 'ok' | 'bad' | 'warn' | 'pending' }) {
  const sym = state === 'ok' ? '✓' : state === 'bad' ? '✗' : state === 'warn' ? '!' : '…';
  const cls =
    state === 'ok'
      ? 'border-emerald-700/50 bg-emerald-950/40 text-emerald-200'
      : state === 'bad'
        ? 'border-rose-700/50 bg-rose-950/40 text-rose-200'
        : state === 'warn'
          ? 'border-amber-700/50 bg-amber-950/40 text-amber-200'
          : 'border-white/10 bg-black/30 text-zinc-400';
  return (
    <span className={cn('inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9px]', cls)} title={label}>
      <span className="font-sans text-[8px] font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
      {sym}
    </span>
  );
}

function EventColumn({
  title,
  description,
  accentClass,
  items,
  emptyHint,
}: {
  title: string;
  description: string;
  accentClass: string;
  items: PreviewDebugEvent[];
  emptyHint: string;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-col rounded-md border border-white/10 bg-black/35">
      <div className={cn('shrink-0 border-b border-white/10 px-2 py-1.5', accentClass)}>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-200">{title}</p>
        <p className="mt-0.5 text-[9px] leading-tight text-zinc-500">{description}</p>
      </div>
      <div className="min-h-[4.5rem] max-h-[min(28vh,220px)] flex-1 space-y-1 overflow-y-auto p-2 text-[10px] leading-snug">
        {items.length === 0 ? (
          <p className="text-zinc-600">{emptyHint}</p>
        ) : (
          items.map((ev) => (
            <div key={ev.id} className="break-words rounded border border-white/5 bg-white/[0.03] px-2 py-1 font-mono text-zinc-300">
              <span className="text-zinc-500">{ev.time}</span>{' '}
              <span className="font-sans text-[9px] font-semibold uppercase tracking-wide text-zinc-400">
                {previewEventTypeLabel(ev.type)}
              </span>
              {ev.detail ? <p className="mt-0.5 text-zinc-400">{ev.detail}</p> : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function SiteBuilderPreviewDebugPanel({
  events,
  loadError,
  saveError,
  saveStatus,
  unsaved,
  lastSavedAt,
  previewHtml,
  missingCoreFiles,
  onClearEvents,
  serverReachable,
  rbyanBusy,
  versions,
  onRevertVersion,
  expanded: expandedProp,
  onExpandedChange,
  defaultExpanded = false,
}: Props) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const controlled = expandedProp !== undefined;
  const expanded = controlled ? expandedProp : internalExpanded;
  const setExpanded = (v: boolean) => {
    onExpandedChange?.(v);
    if (!controlled) setInternalExpanded(v);
  };

  const compileFailed = previewHtml.includes('Preview could not compile');
  const jsItems = useMemo(() => events.filter((e) => e.category === 'js'), [events]);
  const blockedItems = useMemo(() => events.filter((e) => e.category === 'blocked'), [events]);
  const iframeItems = useMemo(() => events.filter((e) => e.category === 'iframe'), [events]);

  const sandbox = useMemo(() => deriveSandboxStatus(events), [events]);
  const previewSafeState: 'ok' | 'bad' | 'pending' =
    sandbox === 'leaked' ? 'bad' : sandbox === 'safe' ? 'ok' : 'pending';

  const saveRealState: 'ok' | 'bad' | 'warn' | 'pending' =
    saveStatus === 'saved'
      ? 'ok'
      : saveStatus === 'saved_local_only'
        ? 'warn'
        : saveStatus === 'error'
          ? 'bad'
          : saveStatus === 'saving'
            ? 'pending'
            : 'pending';

  const serverState: 'ok' | 'bad' | 'pending' =
    serverReachable === true ? 'ok' : serverReachable === false ? 'bad' : 'pending';

  /** Applying output counts as "AI active"; idle means no apply in flight. */
  const aiState: 'ok' | 'bad' | 'warn' | 'pending' = rbyanBusy ? 'warn' : 'ok';

  const workspaceIssues =
    !!loadError ||
    !!saveError ||
    compileFailed ||
    missingCoreFiles.length > 0 ||
    unsaved ||
    saveStatus === 'saving' ||
    saveStatus === 'saved_local_only' ||
    saveStatus === 'error' ||
    sandbox === 'leaked';

  const previewIssues = jsItems.length + blockedItems.length + iframeItems.length > 0;
  const hasIssues = workspaceIssues || previewIssues;

  const versionRows = useMemo(() => [...versions].reverse().slice(0, 24), [versions]);

  return (
    <div
      className={cn(
        'shrink-0 border-t border-white/10 bg-zinc-950/95 backdrop-blur-sm',
        hasIssues && 'border-amber-600/25'
      )}
      aria-label="Builder debug"
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex w-full flex-col gap-1.5 px-3 py-2 text-left transition-colors hover:bg-white/[0.04] sm:flex-row sm:items-center',
          hasIssues && !expanded && 'bg-amber-950/15'
        )}
      >
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <Bug className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-zinc-200">Builder debug</p>
            <p className="truncate text-[10px] text-zinc-500">
              JS {jsItems.length} · Blocked links {blockedItems.length} · Iframe {iframeItems.length}
              {workspaceIssues ? <span className="text-amber-500/90"> · Workspace note below</span> : null}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1 sm:justify-end">
          <StatusChip label="Preview" state={previewSafeState} />
          <StatusChip label="Save" state={saveRealState} />
          <StatusChip label="Server" state={serverState} />
          <StatusChip label="AI active" state={aiState} />
        </div>
        <div className="flex shrink-0 items-center justify-end gap-1 sm:ml-auto">
          {events.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              className="h-7 px-2 text-[10px] text-zinc-500 hover:text-zinc-200"
              onClick={(e) => {
                e.stopPropagation();
                onClearEvents();
              }}
            >
              Clear preview log
            </Button>
          ) : null}
          <span className="rounded border border-white/10 px-1.5 py-0.5 text-[9px] font-medium text-zinc-400">
            {expanded ? 'Hide' : 'Show'}
          </span>
          {expanded ? <ChevronUp className="h-4 w-4 text-zinc-500" aria-hidden /> : <ChevronDown className="h-4 w-4 text-zinc-500" aria-hidden />}
        </div>
      </button>

      {expanded ? (
        <div className="space-y-3 border-t border-white/5 px-3 pb-3 pt-2">
          <div className="rounded-md border border-white/15 bg-black/50 px-2 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">System status</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusChip label="Preview sandbox" state={previewSafeState} />
              <StatusChip label="Save (honest)" state={saveRealState} />
              <StatusChip label="Server" state={serverState} />
              <StatusChip label="AI active" state={rbyanBusy ? 'warn' : 'ok'} />
            </div>
            <ul className="mt-2 space-y-1 text-[10px] leading-snug text-zinc-500">
              <li>
                <span className="font-semibold text-zinc-400">Preview:</span>{' '}
                {sandbox === 'leaked'
                  ? 'Isolation probe reported parent/top access — treat sandbox as broken.'
                  : sandbox === 'safe'
                    ? 'All four probes blocked parent/top access (expected with allow-scripts only).'
                    : 'Waiting for preview iframe probes (reload preview if this stays pending).'}
              </li>
              <li>
                <span className="font-semibold text-zinc-400">Save:</span>{' '}
                {saveStatus === 'saved' && !unsaved && 'Last write reported success from the server API.'}
                {saveStatus === 'saved' && unsaved && 'Server accepted the last save; you have new unsaved edits.'}
                {saveStatus === 'saved_local_only' && 'Files are in this browser only; server API failed (see error below).'}
                {saveStatus === 'error' && 'Save failed — nothing claimed as server-synced.'}
                {saveStatus === 'saving' && 'Save in progress…'}
                {saveStatus === 'idle' && 'No completed save in this session yet, or waiting after load.'}
              </li>
              <li>
                <span className="font-semibold text-zinc-400">Server:</span>{' '}
                {serverReachable === null && 'Not checked yet.'}
                {serverReachable === true && 'Reachable (config endpoint responded).'}
                {serverReachable === false && 'Unreachable from this browser session.'}
              </li>
              <li>
                <span className="font-semibold text-zinc-400">AI:</span>{' '}
                {rbyanBusy
                  ? 'Active — applying model output to this workspace (snapshots capture before/after).'
                  : 'Idle — no apply in progress.'}
              </li>
            </ul>
          </div>

          <div className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-[10px] leading-relaxed text-zinc-400">
            <p>
              Preview <span className="font-mono text-zinc-300">iframe</span> uses{' '}
              <span className="font-mono text-zinc-300">sandbox=&quot;allow-scripts&quot;</span> and{' '}
              <span className="font-mono text-zinc-300">srcdoc</span>. Root paths like{' '}
              <span className="font-mono text-zinc-300">/contact</span> are blocked in-frame (use full <span className="font-mono text-zinc-300">https://…</span> for
              external targets). <span className="font-mono text-zinc-300">#</span> / fragment links are logged — they do not navigate in preview.
            </p>
            <p className="mt-1 text-zinc-500">
              Last saved: <span className="font-medium text-zinc-300">{formatSavedAt(lastSavedAt)}</span>
              {unsaved ? <span className="ml-2 text-amber-400">Unsaved edits</span> : null}
              {saveStatus === 'saving' ? <span className="ml-2 text-violet-300">Saving…</span> : null}
              {saveStatus === 'saved_local_only' ? <span className="ml-2 text-amber-400">Local only (server failed)</span> : null}
              {saveStatus === 'saved' && !unsaved ? <span className="ml-2 text-emerald-400/90">Saved to server</span> : null}
            </p>
            {missingCoreFiles.length > 0 ? (
              <p className="mt-1 rounded border border-amber-700/40 bg-amber-950/40 px-2 py-1 text-amber-200">
                Missing files: <span className="font-mono">{missingCoreFiles.join(', ')}</span>
              </p>
            ) : null}
            {loadError ? <p className="mt-1 rounded border border-rose-700/40 bg-rose-950/40 px-2 py-1 text-rose-200">Load: {loadError}</p> : null}
            {saveError ? (
              <p
                className={cn(
                  'mt-1 rounded border px-2 py-1',
                  saveStatus === 'saved_local_only'
                    ? 'border-amber-700/40 bg-amber-950/40 text-amber-100'
                    : 'border-rose-700/40 bg-rose-950/40 text-rose-200'
                )}
              >
                Save: {saveError}
              </p>
            ) : null}
            {compileFailed ? (
              <p className="mt-1 rounded border border-amber-700/40 bg-amber-950/40 px-2 py-1 text-amber-200">
                Preview HTML failed to compose — check index.html / CSS / JS.
              </p>
            ) : null}
          </div>

          {versionRows.length > 0 ? (
            <div className="rounded-md border border-white/10 bg-black/40 px-2 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Version snapshots</p>
              <p className="mt-1 text-[9px] text-zinc-500">Manual saves, AI apply (before/after), and restores. Revert replaces workspace files.</p>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-[10px]">
                {versionRows.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-2 rounded border border-white/5 bg-white/[0.04] px-2 py-1">
                    <span className="min-w-0 truncate text-zinc-300">
                      <span className="text-zinc-500">{new Date(v.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</span>{' '}
                      {v.label}
                    </span>
                    {onRevertVersion ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-6 shrink-0 px-2 text-[9px] text-violet-300 hover:text-violet-100"
                        onClick={() => {
                          if (window.confirm(`Restore workspace to “${v.label}”? Unsaved editor changes will be replaced.`)) {
                            onRevertVersion(v.id);
                          }
                        }}
                      >
                        Revert
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid min-h-0 grid-cols-1 gap-2 md:grid-cols-3">
            <EventColumn
              title="JS errors"
              description="window.onerror, error events, unhandled rejections, and preview shell errors."
              accentClass="bg-rose-950/25"
              items={jsItems}
              emptyHint="No JS errors reported from the preview yet."
            />
            <EventColumn
              title="Blocked links"
              description="Root paths, relatives, javascript:, hash/fragment, and bad targets."
              accentClass="bg-amber-950/25"
              items={blockedItems}
              emptyHint="No blocked in-frame link events yet."
            />
            <EventColumn
              title="Iframe & sandbox"
              description="Sandbox probes, external tabs, blocked forms, workspace messages."
              accentClass="bg-violet-950/25"
              items={iframeItems}
              emptyHint="No iframe isolation events yet (sandbox probes appear after each preview load)."
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

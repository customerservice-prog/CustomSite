import { useMemo, useState } from 'react';
import { Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PreviewDebugEvent } from '@/lib/site-builder/preview-debug-events';
import { previewEventTypeLabel } from '@/lib/site-builder/preview-debug-events';

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

  const workspaceIssues =
    !!loadError ||
    !!saveError ||
    compileFailed ||
    missingCoreFiles.length > 0 ||
    unsaved ||
    saveStatus === 'saving' ||
    saveStatus === 'saved_local_only' ||
    saveStatus === 'error';

  const previewIssues = jsItems.length + blockedItems.length + iframeItems.length > 0;
  const hasIssues = workspaceIssues || previewIssues;

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
          'flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-white/[0.04]',
          hasIssues && !expanded && 'bg-amber-950/15'
        )}
      >
        <Bug className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-zinc-200">Builder debug</p>
          <p className="truncate text-[10px] text-zinc-500">
            JS {jsItems.length} · Blocked links {blockedItems.length} · Iframe {iframeItems.length}
            {workspaceIssues ? <span className="text-amber-500/90"> · Workspace note below</span> : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
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
          <div className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-[10px] leading-relaxed text-zinc-400">
            <p>
              Preview <span className="font-mono text-zinc-300">iframe</span> uses{' '}
              <span className="font-mono text-zinc-300">sandbox=&quot;allow-scripts&quot;</span> and{' '}
              <span className="font-mono text-zinc-300">srcdoc</span>. No same-origin access, forms cannot submit in-frame, and
              in-frame navigation is blocked; external <span className="font-mono text-zinc-300">http(s)</span> links open in a
              new tab.
            </p>
            <p className="mt-1 text-zinc-500">
              Last saved: <span className="font-medium text-zinc-300">{formatSavedAt(lastSavedAt)}</span>
              {unsaved ? <span className="ml-2 text-amber-400">Unsaved edits</span> : null}
              {saveStatus === 'saving' ? <span className="ml-2 text-violet-300">Saving…</span> : null}
              {saveStatus === 'saved_local_only' ? <span className="ml-2 text-amber-400">Local only (cloud failed)</span> : null}
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
              description="Navigation kept inside the sandbox: relative paths, root paths, javascript:, bad targets."
              accentClass="bg-amber-950/25"
              items={blockedItems}
              emptyHint="No blocked in-frame link events yet."
            />
            <EventColumn
              title="Iframe & sandbox"
              description="External tabs, failed opens, blocked forms, and other isolation messages."
              accentClass="bg-violet-950/25"
              items={iframeItems}
              emptyHint="No iframe isolation events yet (forms and external opens appear here)."
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

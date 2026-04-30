import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  lines: string[];
  loadError: string | null;
  saveError: string | null;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  unsaved: boolean;
  lastSavedAt: number | null;
  previewHtml: string;
  missingCoreFiles: string[];
  onClear: () => void;
};

function formatSavedAt(ts: number | null): string {
  if (ts == null) return '—';
  try {
    return new Date(ts).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

export function SiteBuilderPreviewDebugPanel({
  lines,
  loadError,
  saveError,
  saveStatus,
  unsaved,
  lastSavedAt,
  previewHtml,
  missingCoreFiles,
  onClear,
}: Props) {
  const compileFailed = previewHtml.includes('Preview could not compile');
  const hasIssues =
    lines.length > 0 ||
    !!loadError ||
    !!saveError ||
    compileFailed ||
    missingCoreFiles.length > 0 ||
    unsaved ||
    saveStatus === 'saving' ||
    saveStatus === 'error';

  return (
    <div
      className={cn(
        'mt-2 flex max-h-44 min-h-[5.5rem] shrink-0 flex-col rounded-md border border-white/10 bg-black/50',
        hasIssues && 'border-amber-600/30 bg-amber-950/20'
      )}
      aria-label="Preview debug"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-2 py-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Preview debug</p>
        <div className="flex items-center gap-1.5">
          {lines.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              className="h-6 px-2 text-[10px] text-zinc-500 hover:text-zinc-200"
              onClick={onClear}
            >
              Clear log
            </Button>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2 text-[10px] leading-snug">
        <p className="text-zinc-500">
          Preview uses <span className="font-mono text-zinc-400">srcdoc</span>. Linked{' '}
          <span className="font-mono text-zinc-400">styles.css</span> /{' '}
          <span className="font-mono text-zinc-400">script.js</span> from index are inlined for this view.
        </p>
        <p className="text-zinc-500">
          Last saved to disk: <span className="font-medium text-zinc-300">{formatSavedAt(lastSavedAt)}</span>
          {unsaved ? <span className="ml-2 text-amber-400">· Unsaved editor changes</span> : null}
          {saveStatus === 'saving' ? <span className="ml-2 text-violet-300">· Saving…</span> : null}
        </p>
        {missingCoreFiles.length > 0 ? (
          <p className="rounded border border-amber-700/40 bg-amber-950/40 px-2 py-1 text-amber-200">
            Missing files (preview may be incomplete):{' '}
            <span className="font-mono">{missingCoreFiles.join(', ')}</span>
          </p>
        ) : null}
        {loadError ? (
          <p className="rounded border border-rose-700/40 bg-rose-950/40 px-2 py-1 text-rose-200">Load: {loadError}</p>
        ) : null}
        {saveError ? (
          <p className="rounded border border-rose-700/40 bg-rose-950/40 px-2 py-1 text-rose-200">Save: {saveError}</p>
        ) : null}
        {compileFailed ? (
          <p className="rounded border border-amber-700/40 bg-amber-950/40 px-2 py-1 text-amber-200">
            Preview HTML failed to compose — check index.html / CSS / JS for syntax issues.
          </p>
        ) : null}
        {lines.length > 0 ? (
          <div className="font-mono text-zinc-400">
            {lines.map((line, i) => (
              <div key={`${i}-${line.slice(0, 32)}`} className="break-words border-t border-white/5 py-0.5 first:border-t-0 first:pt-0">
                {line}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-600">No iframe events yet — JS errors, blocked links, and rejections appear here.</p>
        )}
      </div>
    </div>
  );
}

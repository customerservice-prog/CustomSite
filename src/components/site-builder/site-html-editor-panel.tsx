import { useEffect, useMemo, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { EditorSelection, Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { oneDark } from '@codemirror/theme-one-dark';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronUp, Code2, LayoutTemplate } from 'lucide-react';

export type BuilderSurfaceMode = 'code' | 'templates';

function editorFileKind(path: string): 'html' | 'css' | 'javascript' {
  const lower = path.toLowerCase();
  if (lower.endsWith('.css')) return 'css';
  if (lower.endsWith('.js') || lower.endsWith('.mjs')) return 'javascript';
  return 'html';
}

type Props = {
  pageLabel: string;
  /** Current file path — drives syntax mode in Code surface. */
  filePath: string;
  surfaceMode: BuilderSurfaceMode;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  loading: boolean;
  saving: boolean;
  error: string | null;
  dirty: boolean;
  /** False when the project workspace has no files yet (sidebar empty). */
  workspaceHasFiles?: boolean;
  empty?: boolean;
  pageGuidance?: string;
  onInsertSection?: () => void;
  focusSectionRequest?: { id: string } | null;
  onConsumeSectionFocus?: () => void;
  onCreateEditor?: (view: EditorView) => void;
  /** Dark studio chrome — minimal copy, optional oneDark editor. */
  studioChrome?: boolean;
  /** Hide duplicate save when parent toolbar owns save. */
  hideToolbarSave?: boolean;
};

export function SiteHtmlEditorPanel({
  pageLabel,
  filePath,
  surfaceMode,
  value,
  onChange,
  onSave,
  loading,
  saving,
  error,
  dirty,
  workspaceHasFiles = true,
  empty,
  pageGuidance,
  onInsertSection,
  focusSectionRequest,
  onConsumeSectionFocus,
  onCreateEditor,
  studioChrome,
  hideToolbarSave,
}: Props) {
  const viewRef = useRef<EditorView | null>(null);
  const [templatesHtmlOpen, setTemplatesHtmlOpen] = useState(false);
  const kind = useMemo(() => editorFileKind(filePath), [filePath]);

  const saveKeymap = useMemo(
    () =>
      Prec.highest(
        keymap.of([
          {
            key: 'Mod-s',
            run: () => {
              onSave();
              return true;
            },
          },
        ])
      ),
    [onSave]
  );

  const extensions = useMemo(() => {
    const lang =
      kind === 'css'
        ? [css(), EditorView.lineWrapping]
        : kind === 'javascript'
          ? [javascript(), EditorView.lineWrapping]
          : [html(), EditorView.lineWrapping];
    const base = [...lang, saveKeymap];
    return studioChrome ? [...base, oneDark] : base;
  }, [kind, studioChrome, saveKeymap]);

  const showCodeEditor =
    surfaceMode === 'code' || kind !== 'html' || (surfaceMode === 'templates' && templatesHtmlOpen);

  useEffect(() => {
    if (surfaceMode === 'templates') setTemplatesHtmlOpen(false);
  }, [surfaceMode]);

  useEffect(() => {
    if (!focusSectionRequest?.id || !viewRef.current) return;
    if (surfaceMode === 'templates' && kind === 'html' && !templatesHtmlOpen) setTemplatesHtmlOpen(true);
    const needle = `data-cs-section="${focusSectionRequest.id}"`;
    const pos = value.indexOf(needle);
    if (pos !== -1) {
      viewRef.current.dispatch({
        selection: EditorSelection.cursor(pos),
        scrollIntoView: true,
      });
      viewRef.current.focus();
    }
    onConsumeSectionFocus?.();
  }, [focusSectionRequest, value, onConsumeSectionFocus, surfaceMode, kind, templatesHtmlOpen]);

  const codeMirrorHeight = studioChrome ? 'min(52vh, 720px)' : 'min(62vh, 640px)';

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-col',
        studioChrome ? 'bg-[#08080a] text-zinc-200' : 'bg-white'
      )}
    >
      <div
        className={cn(
          'flex shrink-0 flex-col gap-2 px-4 py-3',
          studioChrome ? 'border-b border-white/10 py-2' : 'border-b border-slate-100/90'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className={cn(
                'truncate font-semibold tracking-tight',
                studioChrome ? 'font-mono text-[11px] text-zinc-400' : 'text-sm text-slate-900'
              )}
            >
              {pageLabel}
            </p>
            {!studioChrome && (
              <p className="text-[11px] leading-snug text-slate-500">
                {surfaceMode === 'code'
                  ? 'Agency code workspace — full HTML, CSS, or JS for this client project.'
                  : 'Conversion layout — insert sections, then open HTML when you want raw source.'}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {onInsertSection && kind === 'html' && (
              <Button
                type="button"
                className={cn(
                  'h-8 gap-1.5 px-2.5 text-xs font-semibold',
                  studioChrome
                    ? 'border border-violet-500/30 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20'
                    : 'shadow-sm shadow-violet-900/10'
                )}
                disabled={loading || !workspaceHasFiles}
                title={
                  !workspaceHasFiles
                    ? 'Add site files first (use Start from template or blank code), then insert sections.'
                    : undefined
                }
                onClick={() => onInsertSection()}
              >
                <LayoutTemplate className="h-3.5 w-3.5" strokeWidth={2} />
                Insert section
              </Button>
            )}
            {!hideToolbarSave && (
              <Button
                type="button"
                variant="secondary"
                className="h-9 px-3 text-xs font-semibold"
                disabled={saving || loading || !dirty || empty}
                onClick={() => onSave()}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            )}
          </div>
        </div>
        {pageGuidance && !empty && !studioChrome && (
          <p className="rounded-lg bg-violet-50/80 px-3 py-2 text-xs leading-relaxed text-slate-700 ring-1 ring-violet-100/80">
            {pageGuidance}
          </p>
        )}
      </div>
      {error && (
        <p
          className={cn(
            'mx-4 mb-2 rounded-lg px-3 py-2 text-xs ring-1',
            studioChrome
              ? 'bg-red-950/50 text-red-200 ring-red-500/30'
              : 'bg-red-50 text-red-800 ring-red-100/80'
          )}
        >
          {error}
        </p>
      )}
      <div className="min-h-0 flex-1 overflow-hidden px-3 pb-4 pt-0">
        {empty ? (
          <div
            className={cn(
              'flex h-full min-h-[280px] flex-col items-center justify-center px-6 text-center',
              studioChrome ? 'text-zinc-500' : 'rounded-xl bg-slate-50/80'
            )}
          >
            <p className={cn('text-sm font-medium', studioChrome ? 'text-zinc-300' : 'text-slate-700')}>No site files yet</p>
            <p className="mt-2 max-w-xs text-xs leading-relaxed">
              {studioChrome ? (
                <>Use the start dialog — template or blank.</>
              ) : (
                <>
                  Choose <span className="font-semibold text-slate-800">Start from template</span> or{' '}
                  <span className="font-semibold text-slate-800">Start from blank</span> in the dialog — this builder is for agency production, not
                  client DIY.
                </>
              )}
            </p>
          </div>
        ) : loading ? (
          <div
            className={cn(
              'flex h-[min(60vh,520px)] min-h-[280px] items-center justify-center',
              studioChrome ? 'bg-[#08080a]' : 'rounded-xl bg-slate-50/60'
            )}
          >
            <div
              className={cn(
                'h-6 w-6 animate-spin rounded-full border-2',
                studioChrome ? 'border-zinc-700 border-t-violet-400' : 'border-slate-200 border-t-violet-600'
              )}
              aria-hidden
            />
            <span className="sr-only">Loading editor</span>
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-2">
            {surfaceMode === 'templates' && kind === 'html' && !showCodeEditor ? (
              <div
                className={cn(
                  'flex min-h-[min(32vh,280px)] flex-col items-center justify-center gap-3 px-5 py-6 text-center',
                  studioChrome
                    ? 'border border-dashed border-white/10 bg-white/[0.02]'
                    : 'rounded-xl border border-dashed border-slate-200/90 bg-slate-50/50'
                )}
              >
                <LayoutTemplate className={cn('h-8 w-8', studioChrome ? 'text-violet-400' : 'text-violet-500')} strokeWidth={1.5} aria-hidden />
                <p className={cn('text-xs font-semibold', studioChrome ? 'text-zinc-300' : 'text-slate-800')}>Sections + library</p>
                <Button
                  type="button"
                  variant="secondary"
                  className={cn(
                    'gap-1.5 text-xs font-semibold',
                    studioChrome && 'border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10'
                  )}
                  onClick={() => setTemplatesHtmlOpen(true)}
                >
                  <Code2 className="h-3.5 w-3.5" strokeWidth={2} />
                  Edit source
                </Button>
              </div>
            ) : (
              <>
                {surfaceMode === 'templates' && kind === 'html' && (
                  <button
                    type="button"
                    onClick={() => setTemplatesHtmlOpen(false)}
                    className={cn(
                      'flex w-full shrink-0 items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors',
                      studioChrome
                        ? 'rounded-md border border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200'
                        : 'rounded-lg border border-slate-200 bg-slate-50/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    )}
                  >
                    <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} />
                    Back to template view
                  </button>
                )}
                <div
                  className={cn(
                    'flex min-h-0 flex-1 flex-col overflow-hidden transition-shadow duration-200',
                    studioChrome
                      ? 'rounded-lg ring-1 ring-white/10 focus-within:ring-violet-500/30'
                      : 'rounded-xl bg-white ring-1 ring-slate-200/80 focus-within:ring-2 focus-within:ring-violet-500/25 focus-within:ring-offset-0'
                  )}
                >
                  <div
                    className={cn(
                      'flex shrink-0 items-center justify-between px-2 py-1.5',
                      studioChrome ? 'border-b border-white/10' : 'border-b border-slate-100/90'
                    )}
                  >
                    <span
                      className={cn(
                        'px-1 text-[10px] font-semibold uppercase tracking-wide',
                        studioChrome ? 'text-zinc-500' : 'text-slate-500'
                      )}
                    >
                      {kind === 'html' ? 'HTML' : kind === 'css' ? 'CSS' : 'JavaScript'}
                    </span>
                  </div>
                  <div className="min-h-0 flex-1 overflow-auto" style={{ minHeight: codeMirrorHeight }}>
                    <CodeMirror
                      value={value}
                      height="100%"
                      minHeight={codeMirrorHeight}
                      theme={studioChrome ? undefined : 'light'}
                      extensions={extensions}
                      onChange={onChange}
                      onCreateEditor={(v) => {
                        viewRef.current = v;
                        onCreateEditor?.(v);
                      }}
                      basicSetup={{
                        lineNumbers: true,
                        foldGutter: true,
                        dropCursor: false,
                        allowMultipleSelections: false,
                        indentOnInput: true,
                        bracketMatching: true,
                        closeBrackets: true,
                        autocompletion: true,
                        highlightSelectionMatches: true,
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

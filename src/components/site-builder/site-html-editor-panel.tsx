import { useEffect, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { Button } from '@/components/ui/button';
import { LayoutTemplate } from 'lucide-react';

type Props = {
  pageLabel: string;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  loading: boolean;
  saving: boolean;
  error: string | null;
  dirty: boolean;
  empty?: boolean;
  /** Short guidance shown above the editor. */
  pageGuidance?: string;
  onInsertSection?: () => void;
  /** When set, scroll the editor to this section id once, then call onConsumeSectionFocus. */
  focusSectionRequest?: { id: string } | null;
  onConsumeSectionFocus?: () => void;
  onCreateEditor?: (view: EditorView) => void;
};

export function SiteHtmlEditorPanel({
  pageLabel,
  value,
  onChange,
  onSave,
  loading,
  saving,
  error,
  dirty,
  empty,
  pageGuidance,
  onInsertSection,
  focusSectionRequest,
  onConsumeSectionFocus,
  onCreateEditor,
}: Props) {
  const viewRef = useRef<EditorView | null>(null);
  const extensions = [html(), EditorView.lineWrapping];

  useEffect(() => {
    if (!focusSectionRequest?.id || !viewRef.current) return;
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
  }, [focusSectionRequest, value, onConsumeSectionFocus]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex shrink-0 flex-col gap-2 border-b border-slate-100/90 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-slate-900">{pageLabel}</p>
            <p className="text-[11px] text-slate-500">Page content</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {onInsertSection && (
              <Button
                type="button"
                variant="secondary"
                className="h-9 gap-1.5 px-3 text-xs font-semibold"
                disabled={empty || loading}
                onClick={() => onInsertSection()}
              >
                <LayoutTemplate className="h-3.5 w-3.5" strokeWidth={2} />
                Insert section
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              className="h-9 px-4 text-sm font-semibold shadow-sm shadow-slate-900/5"
              disabled={saving || loading || !dirty || empty}
              onClick={() => onSave()}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
        {pageGuidance && !empty && (
          <p className="rounded-lg bg-slate-50/90 px-3 py-2 text-xs leading-relaxed text-slate-600 ring-1 ring-slate-100">{pageGuidance}</p>
        )}
      </div>
      {error && (
        <p className="mx-4 mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-100/80">{error}</p>
      )}
      <div className="min-h-0 flex-1 overflow-hidden px-3 pb-4 pt-0">
        {empty ? (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-xl bg-slate-50/80 px-6 text-center">
            <p className="text-sm font-medium text-slate-700">Nothing to edit yet</p>
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-500">
              Create your homepage to unlock structured sections and the editor.
            </p>
          </div>
        ) : loading ? (
          <div className="flex h-[min(60vh,520px)] min-h-[280px] items-center justify-center rounded-xl bg-slate-50/60">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-violet-600" aria-hidden />
            <span className="sr-only">Loading editor</span>
          </div>
        ) : (
          <div className="h-[min(60vh,560px)] min-h-[280px] overflow-hidden rounded-xl bg-white ring-1 ring-slate-200/80 transition-shadow duration-200 focus-within:ring-2 focus-within:ring-violet-500/25 focus-within:ring-offset-0">
            <CodeMirror
              value={value}
              height="calc(100vh - 14rem)"
              theme="light"
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
        )}
      </div>
    </div>
  );
}

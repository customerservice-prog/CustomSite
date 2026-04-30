import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  onError?: (message: string) => void;
};

type State = { hasError: boolean; message: string };

/** Catches React errors in the preview column only; does not affect the rest of the admin shell. */
export class SiteBuilderPreviewErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message || 'Unknown error' };
  }

  componentDidCatch(err: Error, info: ErrorInfo): void {
    this.props.onError?.(err.message);
    console.error('[SiteBuilderPreview]', err, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[120px] flex-col justify-center rounded-md border border-amber-600/40 bg-amber-950/30 p-3 text-xs text-amber-100">
          <p className="font-semibold">Preview panel error</p>
          <p className="mt-1 break-words text-amber-200/90">{this.state.message}</p>
          <p className="mt-2 text-[10px] text-amber-200/60">Use &quot;Reset preview&quot; to remount the iframe.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

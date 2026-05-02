import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

type State = { err: Error | null };

/**
 * Isolates Settings from taking down the whole shell if one tab throws (e.g. React #185 from a bad selector).
 */
export class SettingsRouteErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('[settings] render error', err, info.componentStack);
  }

  render() {
    if (this.state.err) {
      return (
        <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-rose-50 px-6 py-8 text-rose-900 shadow-sm">
          <h1 className="text-lg font-semibold">Settings could not load</h1>
          <p className="mt-2 text-sm text-rose-800/90">{this.state.err.message}</p>
          <p className="mt-3 text-xs text-rose-700/90">
            Try reloading the page. If this persists, open the dashboard and contact support with the error above.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-900"
              onClick={() => this.setState({ err: null })}
            >
              Try again
            </button>
            <Link to="/dashboard" className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-900 hover:bg-rose-100">
              Go to dashboard
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

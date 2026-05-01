import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import '@/styles/globals.css';
import { router } from '@/router';

const el = document.getElementById('root');
if (!el) throw new Error('Root element #root not found');

class RootErrorBoundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null };

  static getDerivedStateFromError(err: Error) {
    return { err };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('[admin] render error', err, info.componentStack);
  }

  render() {
    if (this.state.err) {
      return (
        <div style={{ fontFamily: 'system-ui,sans-serif', padding: '2rem', maxWidth: '36rem', lineHeight: 1.5 }}>
          <h1 style={{ fontSize: '1.1rem' }}>Dashboard could not load</h1>
          <p style={{ color: '#475569' }}>{this.state.err.message}</p>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Try clearing site data for this origin, open <code>/admin.html</code>, or set{' '}
            <code>ADMIN_HTML_AT_ROOT=1</code> on the server if you meant to use the app at <code>/</code>.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(el).render(
  <StrictMode>
    <RootErrorBoundary>
      <RouterProvider router={router} />
    </RootErrorBoundary>
  </StrictMode>
);

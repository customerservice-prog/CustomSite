import { Link } from 'react-router-dom';
import { buttonClassName } from '@/components/ui/button';

/** Hash-router `*` child: full admin shell comes from `AppShell` + `PageContainer` around this outlet. */
export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">Page not found</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">That link is not a page in this app.</p>
      <Link to="/dashboard" className={buttonClassName('primary', 'mt-8 inline-flex')}>
        Go to dashboard
      </Link>
    </div>
  );
}

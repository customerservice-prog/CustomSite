import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { buttonClassName } from '@/components/ui/button';

/** Hash-router catch-all: keeps AppShell (nav, chrome) so users are not stranded on a bare error boundary. */
export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <PageHeader
        title="Page not found"
        description="That link or route does not exist in this app. Check the address or return to Studio Pulse."
      />
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/dashboard" className={buttonClassName('primary', 'inline-flex items-center gap-2')}>
          <Home className="h-4 w-4" aria-hidden />
          Studio Pulse
        </Link>
        <Link to="/projects" className={buttonClassName('secondary')}>
          Projects
        </Link>
      </div>
    </div>
  );
}

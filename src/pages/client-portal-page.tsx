import { ExternalLink, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, buttonClassName } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function ClientPortalPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Client portal"
        description="What your clients see: messages, invoices, files, and approvals — all tied to real projects."
        actions={
          <a href="/client-portal.html" target="_blank" rel="noreferrer">
            <Button type="button" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Open portal preview
            </Button>
          </a>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-100">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Branded experience</h2>
              <p className="text-sm text-slate-500">Logo, color, and subdomain from Settings → Client Portal.</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
              <span>Portal health</span>
              <Badge variant="success">Operational</Badge>
            </li>
            <li className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
              <span>Active client seats</span>
              <span className="font-semibold tabular-nums text-slate-900">128</span>
            </li>
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="font-bold text-slate-900">Agency shortcuts</h2>
          <p className="mt-1 text-sm text-slate-500">Jump back to operational views.</p>
          <div className="mt-4 flex flex-col gap-2">
            <Link to="/messages" className={buttonClassName('secondary', 'w-full justify-center')}>
              Inbox
            </Link>
            <Link to="/invoices" className={buttonClassName('secondary', 'w-full justify-center')}>
              Invoices
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

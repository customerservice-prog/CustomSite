import { ExternalLink, Globe, Mail, Palette, Shield, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, buttonClassName } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const modules = [
  { name: 'Messages', on: true },
  { name: 'Invoices & billing', on: true },
  { name: 'Files & deliverables', on: true },
  { name: 'Approvals', on: false },
];

const seats = [
  { name: 'Michael Lee', company: 'Northstar Digital', role: 'Billing', last: '2h ago' },
  { name: 'Sarah Johnson', company: 'SJ Studio', role: 'Primary', last: '1d ago' },
  { name: 'Taylor Brooks', company: 'Acme Co.', role: 'Viewer', last: '3d ago' },
];

const portalActivity = [
  { label: 'Invoice INV-1038 viewed', when: 'Today · 9:14 AM' },
  { label: 'File “Homepage copy.docx” downloaded', when: 'Yesterday' },
  { label: 'Message thread replied', when: 'Apr 22' },
];

export function ClientPortalPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Client portal"
        description="Preview the client URL, enabled modules, roles, and what clients see last."
        actions={
          <a href="/client-portal.html" target="_blank" rel="noreferrer">
            <Button type="button" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Open portal
            </Button>
          </a>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 shadow-md ring-1 ring-slate-900/[0.05] lg:col-span-2">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-800 ring-1 ring-slate-100">
              <Globe className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-slate-900">Portal status</h2>
              <p className="mt-1 text-sm text-slate-600">
                Uptime, authentication, and domain configuration for your client-facing experience.
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                  <span className="text-slate-700">Service health</span>
                  <Badge variant="success">Operational</Badge>
                </li>
                <li className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                  <span className="text-slate-700">Active client seats</span>
                  <span className="font-bold tabular-nums text-slate-900">128</span>
                </li>
                <li className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                  <span className="text-slate-700">Custom domain</span>
                  <Badge variant="info">clients.customsite.online</Badge>
                </li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="p-5 shadow-md ring-1 ring-slate-900/[0.05]">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900">Branding preview</h3>
          </div>
          <p className="mt-2 text-sm text-slate-600">Logo, accent color, and typography from Settings.</p>
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-center text-sm text-slate-500">
            Preview card · matches client login screen
          </div>
          <Button type="button" variant="secondary" className="mt-4 w-full">
            Adjust branding
          </Button>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 shadow-sm ring-1 ring-slate-900/[0.04]">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Shield className="h-4 w-4 text-slate-600" />
            Enabled modules
          </h3>
          <ul className="mt-4 space-y-2">
            {modules.map((m) => (
              <li key={m.name} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm">
                <span className="text-slate-800">{m.name}</span>
                <Badge variant={m.on ? 'success' : 'neutral'}>{m.on ? 'On' : 'Off'}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5 shadow-sm ring-1 ring-slate-900/[0.04]">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Users className="h-4 w-4 text-slate-600" />
            Client access
          </h3>
          <ul className="mt-4 space-y-2">
            {seats.map((s) => (
              <li key={s.name} className="rounded-xl border border-slate-100 px-3 py-2">
                <p className="font-semibold text-slate-900">{s.name}</p>
                <p className="text-xs text-slate-500">
                  {s.company} · {s.role} · {s.last}
                </p>
              </li>
            ))}
          </ul>
          <Button type="button" className="mt-4 w-full gap-2">
            <Mail className="h-4 w-4" />
            Invite client
          </Button>
        </Card>
      </div>

      <Card className="p-5 shadow-sm ring-1 ring-slate-900/[0.04]">
        <h3 className="text-sm font-bold text-slate-900">Recent portal activity</h3>
        <ul className="mt-4 divide-y divide-slate-100">
          {portalActivity.map((a) => (
            <li key={a.label} className="flex justify-between gap-4 py-3 text-sm">
              <span className="font-medium text-slate-800">{a.label}</span>
              <span className="shrink-0 text-xs text-slate-500">{a.when}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <Link to="/messages" className={buttonClassName('secondary', 'justify-center')}>
            Inbox
          </Link>
          <Link to="/invoices" className={buttonClassName('secondary', 'justify-center')}>
            Invoices
          </Link>
          <Link to="/files" className={buttonClassName('secondary', 'justify-center')}>
            Files
          </Link>
        </div>
      </Card>
    </div>
  );
}

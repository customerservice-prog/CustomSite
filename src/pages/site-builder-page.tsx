import { ExternalLink, Globe, LayoutTemplate, Rocket, FileStack, MonitorPlay } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Table, TableBody, TableCell, TableHeadCell, TableHeader, TableRow } from '@/components/ui/table';

const pages = [
  { name: 'Home', status: 'Published' as const, path: '/', updated: 'Apr 22' },
  { name: 'Services', status: 'Draft' as const, path: '/services', updated: 'Apr 21' },
  { name: 'Contact', status: 'Published' as const, path: '/contact', updated: 'Apr 18' },
];

const deploys = [
  { id: 'd1', label: 'Production', when: '14 min ago', who: 'Jordan Blake' },
  { id: 'd2', label: 'Preview', when: '2 hr ago', who: 'Alex Chen' },
];

export function SiteBuilderPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Site builder"
        description="Manage pages, drafts, and deployments — then open the visual editor when you are ready to ship."
        actions={
          <Button
            type="button"
            className="gap-2"
            onClick={() => window.open('/site-builder.html', '_blank', 'noopener')}
          >
            <ExternalLink className="h-4 w-4" />
            Open editor
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 shadow-md ring-1 ring-slate-900/[0.05] lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                <LayoutTemplate className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Publishing workflow</h2>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
                  Draft in the builder, preview on a safe URL, then publish to production when stakeholders approve.
                </p>
                <div className="mt-4 max-w-md">
                  <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500">
                    <span>Template coverage</span>
                    <span>72%</span>
                  </div>
                  <ProgressBar value={72} max={100} />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">Builder online</Badge>
              <Badge variant="info">Preview active</Badge>
            </div>
          </div>
        </Card>

        <Card className="space-y-4 p-5 shadow-md ring-1 ring-slate-900/[0.05]">
          <div className="flex items-center gap-3">
            <MonitorPlay className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Preview</h3>
              <p className="text-xs text-slate-500">Share a client-safe link before go-live.</p>
            </div>
          </div>
          <Button type="button" variant="secondary" className="w-full gap-2" onClick={() => window.open('/index.html', '_blank', 'noopener')}>
            <Globe className="h-4 w-4" />
            Open live preview
          </Button>
          <Button type="button" className="w-full gap-2" onClick={() => window.open('/site-builder.html', '_blank', 'noopener')}>
            <Rocket className="h-4 w-4" />
            Launch editor
          </Button>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 shadow-sm ring-1 ring-slate-900/[0.04]">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900">Site pages</h3>
            <Badge variant="neutral">3 pages</Badge>
          </div>
          <Table dense>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHeadCell>Page</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>Path</TableHeadCell>
                <TableHeadCell>Updated</TableHeadCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((p) => (
                <TableRow key={p.path}>
                  <TableCell className="font-medium text-slate-900">{p.name}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === 'Published' ? 'success' : 'warning'}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-slate-600">{p.path}</TableCell>
                  <TableCell className="text-slate-500">{p.updated}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card className="p-5 shadow-sm ring-1 ring-slate-900/[0.04]">
          <div className="mb-4 flex items-center gap-2">
            <FileStack className="h-5 w-5 text-slate-600" />
            <h3 className="text-sm font-bold text-slate-900">Recent deploys</h3>
          </div>
          <ul className="space-y-3">
            {deploys.map((d) => (
              <li key={d.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm">
                <div>
                  <p className="font-semibold text-slate-900">{d.label}</p>
                  <p className="text-xs text-slate-500">{d.who}</p>
                </div>
                <span className="text-xs font-medium text-slate-500">{d.when}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-500">
            Templates: <span className="font-semibold text-slate-700">Agency starter</span>,{' '}
            <span className="font-semibold text-slate-700">Services focus</span>
          </p>
        </Card>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { ExternalLink, Globe, RefreshCw, Rocket, Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ActionMenu } from '@/components/ui/action-menu';
import { useShell } from '@/context/shell-context';
import { cn } from '@/lib/utils';

const pages = [
  { name: 'Home', status: 'Published' as const, path: '/', updated: 'Apr 26' },
  { name: 'Services', status: 'Published' as const, path: '/pricing.html', updated: 'Apr 24' },
  { name: 'Portfolio', status: 'Published' as const, path: '/portfolio.html', updated: 'Apr 22' },
  { name: 'Case studies', status: 'Draft' as const, path: '/case-studies.html', updated: 'Apr 21' },
  { name: 'Agency', status: 'Published' as const, path: '/agency.html', updated: 'Apr 20' },
  { name: 'Contact', status: 'Published' as const, path: '/contact.html', updated: 'Apr 18' },
];

const deployLog = [
  { id: '1', line: 'Build #482 succeeded · static export', when: '14m ago' },
  { id: '2', line: 'Uploaded 12 assets to CDN', when: '14m ago' },
  { id: '3', line: 'Invalidation complete · edge cache', when: '13m ago' },
];

function previewSrc(path: string) {
  if (path === '/') return '/index.html';
  return path;
}

export function SiteBuilderPage() {
  const { toast } = useShell();
  const [selected, setSelected] = useState(pages[0]);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Draft' | 'Published'>('all');
  const [iframeKey, setIframeKey] = useState(0);

  const filteredPages = useMemo(() => {
    return pages.filter((p) => {
      const match =
        !q.trim() || p.name.toLowerCase().includes(q.toLowerCase()) || p.path.toLowerCase().includes(q.toLowerCase());
      const st = statusFilter === 'all' || p.status === statusFilter;
      return match && st;
    });
  }, [q, statusFilter]);

  const src = previewSrc(selected.path);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Site builder"
        description="Pages, preview, and deploy status."
        actions={
          <Button type="button" variant="secondary" className="gap-2" onClick={() => window.open('/index.html', '_blank', 'noopener')}>
            <ExternalLink className="h-4 w-4" />
            Open live
          </Button>
        }
      />

      <Card variant="compact" className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" className="gap-2" onClick={() => setIframeKey((k) => k + 1)}>
          <RefreshCw className="h-4 w-4" />
          Preview
        </Button>
        <Button
          type="button"
          className="gap-2"
          onClick={() => toast('Deploy queued. You will get a notification when the build finishes.', 'success')}
        >
          <Rocket className="h-4 w-4" />
          Deploy
        </Button>
        <Button type="button" variant="secondary" className="gap-2" onClick={() => window.open(src, '_blank', 'noopener')}>
          <Globe className="h-4 w-4" />
          Open preview URL
        </Button>
        <span className="text-xs text-gray-500">
          Preview: <span className="font-mono text-gray-700">{src}</span>
        </span>
      </Card>

      <div className="grid min-h-0 gap-6 lg:grid-cols-12">
        <Card variant="compact" className="flex flex-col lg:col-span-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-900">Pages</h2>
            <Badge variant="neutral" className="text-xs">
              {filteredPages.length}
            </Badge>
          </div>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search pages…"
              className="pl-9"
              aria-label="Search pages"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="mb-3 w-full"
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
          </Select>
          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {filteredPages.map((p) => (
              <li key={p.path} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelected(p)}
                  className={cn(
                    'min-w-0 flex-1 rounded-lg border px-3 py-2 text-left text-sm transition',
                    selected.path === p.path
                      ? 'border-purple-200 bg-purple-50 text-purple-900'
                      : 'border-transparent text-gray-800 hover:bg-gray-50'
                  )}
                >
                  <span className="block font-medium">{p.name}</span>
                  <span className="block text-xs text-gray-500">
                    {p.status} · {p.updated}
                  </span>
                </button>
                <ActionMenu
                  label={`Actions for ${p.name}`}
                  items={[
                    {
                      label: 'Open preview',
                      onClick: () => {
                        setSelected(p);
                        setIframeKey((k) => k + 1);
                      },
                    },
                    {
                      label: 'Open in new tab',
                      onClick: () => window.open(previewSrc(p.path), '_blank', 'noopener'),
                    },
                    {
                      label: 'Mark published',
                      onClick: () => toast(`${p.name} marked published.`, 'success'),
                    },
                  ]}
                />
              </li>
            ))}
          </ul>
        </Card>

        <Card variant="compact" className="flex min-h-[520px] flex-col overflow-hidden lg:col-span-8">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
            <h2 className="text-sm font-semibold text-gray-900">Live preview</h2>
            <span className="text-xs text-gray-500">{selected.name}</span>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
            <iframe
              key={`${src}-${iframeKey}`}
              title="Site preview"
              src={src}
              className="h-full min-h-[480px] w-full bg-white"
            />
          </div>
          <div className="mt-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">Deploy log</h3>
            <ul className="mt-2 space-y-2 text-sm text-gray-700">
              {deployLog.map((row) => (
                <li key={row.id} className="flex justify-between gap-2 border-b border-gray-50 py-1 last:border-0">
                  <span>{row.line}</span>
                  <span className="shrink-0 text-xs text-gray-400">{row.when}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}

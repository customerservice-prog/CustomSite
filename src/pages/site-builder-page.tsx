import { ExternalLink, LayoutTemplate } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/progress-bar';

export function SiteBuilderPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Site builder"
        description="Visual editor for client sites — open the full builder in a dedicated surface while keeping navigation in this app."
        actions={
          <Button
            type="button"
            className="gap-2"
            onClick={() => window.open('/site-builder.html', '_blank', 'noopener')}
          >
            <ExternalLink className="h-4 w-4" />
            Open legacy builder
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
              <LayoutTemplate className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Production workflow</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Draft in the builder, attach to a project phase, then publish to the client portal. This route stays inside the agency
                OS; the standalone HTML app remains available for deep editing sessions.
              </p>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500">
                  <span>Template migration</span>
                  <span>72%</span>
                </div>
                <ProgressBar value={72} max={100} />
              </div>
            </div>
          </div>
        </Card>
        <Card className="space-y-3 p-5">
          <h3 className="text-sm font-bold text-slate-900">Status</h3>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">Builder online</Badge>
            <Badge variant="info">Preview CDN</Badge>
          </div>
          <p className="text-sm text-slate-500">Last deploy · 14 minutes ago (sample)</p>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => window.open('/site-builder.html', '_blank', 'noopener')}
          >
            Launch editor
          </Button>
        </Card>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, MapPin, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useShell } from '@/context/shell-context';
import { useProjects } from '@/store/hooks';
import { useAppStore } from '@/store/useAppStore';
import { proactivelyRefreshAdminTokenIfStale } from '@/lib/admin-api';
import {
  fetchSeoHistory,
  fetchSeoHub,
  postSeoChecklist,
  postSeoSetup,
  type SeoChecklistCell,
  type SeoHubPayload,
} from '@/lib/admin-seo-hub-api';
import { cn } from '@/lib/utils';

const POLL_MS = 60_000;

const CHECKLIST_ROWS: { id: string; label: string; auto?: boolean }[] = [
  { id: 'gbp_verified', label: 'GBP verified / claimed' },
  { id: '10_reviews', label: 'At least 10 Google reviews', auto: true },
  { id: 'gbp_photos', label: 'GBP photos (10+)', auto: true },
  { id: 'gbp_description', label: 'GBP description (50+ chars)', auto: true },
  { id: 'gbp_hours', label: 'Business hours set', auto: true },
  { id: 'gbp_services', label: 'Services / menu on GBP', auto: true },
  { id: 'gbp_posts_recent', label: 'Recent GBP post (7 days)', auto: true },
  { id: 'website_linked', label: 'Review / website link on profile', auto: true },
  { id: 'rank_tracking_setup', label: 'Map pack rank tracking active', auto: true },
  { id: 'nap_consistency', label: 'NAP consistency (directories)', auto: false },
  { id: 'schema_markup', label: 'LocalBusiness schema', auto: false },
  { id: 'citations', label: 'Citation building', auto: false },
  { id: 'backlinks', label: 'Backlinks', auto: false },
];

function cellFor(rows: Record<string, SeoChecklistCell>, id: string): SeoChecklistCell {
  return rows[id] || { completed: false, completed_at: null, auto_detected: false, notes: null };
}

/** Simple SVG sparkline — review_count over snapshot_date ascending. */
function ReviewSpark({ points }: { points: { date: string; count: number }[] }) {
  if (points.length < 2) {
    return (
      <p className="text-xs text-slate-500">
        Chart needs at least two daily snapshots — run setup + cron after migration.
      </p>
    );
  }
  const w = 640;
  const h = 120;
  const pad = 8;
  const maxC = Math.max(...points.map((p) => p.count), 1);
  const minC = Math.min(...points.map((p) => p.count), 0);
  const span = Math.max(1, maxC - minC);
  const n = points.length;
  const path = points
    .map((p, i) => {
      const x = pad + ((w - pad * 2) * i) / (n - 1 || 1);
      const y = pad + ((h - pad * 2) * (1 - (p.count - minC) / span));
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg
      role="img"
      aria-label="Review count over time"
      className="w-full max-h-[140px]"
      viewBox={`0 0 ${w} ${h}`}
    >
      <rect x={0} y={0} width={w} height={h} fill="#f8fafc" rx={8} />
      <path d={path} fill="none" stroke="#6366f1" strokeWidth={2} />
      {points.map((p, i) => {
        const x = pad + ((w - pad * 2) * i) / (n - 1 || 1);
        const y = pad + ((h - pad * 2) * (1 - (p.count - minC) / span));
        return <circle key={p.date} cx={x} cy={y} r={4} fill="#4f46e5" />;
      })}
    </svg>
  );
}

export function SeoHubPage() {
  const projects = useProjects();
  const { toast } = useShell();
  const hydrateAgencyFromServer = useAppStore((s) => s.hydrateAgencyFromServer);

  const [projectId, setProjectId] = useState('');
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<SeoHubPayload | null>(null);
  const [hist, setHist] = useState<{ date: string; count: number }[]>([]);
  const [setupOpen, setSetupOpen] = useState(false);
  const [savingSetup, setSavingSetup] = useState(false);

  const [sfGbpPid, setSfGbpPid] = useState('');
  const [sfKeyword, setSfKeyword] = useState('');
  const [sfCity, setSfCity] = useState('');
  const [sfReviewGoal, setSfReviewGoal] = useState('50');
  const [sfReviewLink, setSfReviewLink] = useState('');
  const [sfGbpName, setSfGbpName] = useState('');

  useEffect(() => {
    if (import.meta.env.VITE_USE_REAL_API !== '1') return;
    void hydrateAgencyFromServer();
  }, [hydrateAgencyFromServer]);

  const loadPayload = useCallback(
    async (pid: string, quiet?: boolean) => {
      if (!pid.trim()) return;
      if (!quiet) setLoading(true);
      try {
        await proactivelyRefreshAdminTokenIfStale();
        const res = await fetchSeoHub(pid);
        if (!res.ok) {
          if (res.status === 503 && /022_seo_hub/i.test(res.error)) {
            toast('Run Supabase migration 022_seo_hub_tables.sql', 'error');
          } else {
            toast(res.error || 'Could not load SEO hub', 'error');
          }
          return;
        }
        setPayload(res.data);
        const h = await fetchSeoHistory(pid);
        if (h.ok && Array.isArray(h.data.reviews)) {
          const pts = h.data.reviews
            .filter((r) => r.snapshot_date && typeof r.review_count === 'number')
            .map((r) => ({ date: String(r.snapshot_date), count: Number(r.review_count) }));
          setHist(pts);
        } else {
          setHist([]);
        }
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Network error', 'error');
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    const first = projects[0]?.id;
    if (first && !projectId && import.meta.env.VITE_USE_REAL_API === '1') {
      setProjectId(first);
    }
  }, [projects, projectId]);

  useEffect(() => {
    if (!projectId) return undefined;
    void loadPayload(projectId);
    const t = window.setInterval(() => void loadPayload(projectId, true), POLL_MS);
    return () => window.clearInterval(t);
  }, [projectId, loadPayload]);

  const checklist = payload?.checklist || {};

  const syncSetupFieldsFromPayload = () => {
    const s = payload?.seo;
    setSfGbpPid(String(s?.gbp_place_id || ''));
    setSfKeyword(String(s?.primary_keyword || ''));
    setSfCity(String(s?.target_city || ''));
    setSfReviewGoal(String(s?.review_goal ?? 50));
    setSfReviewLink(String(s?.review_link || ''));
    setSfGbpName(String(s?.gbp_name || ''));
  };

  useEffect(() => {
    setSetupOpen(false);
  }, [projectId]);

  async function toggleCheck(id: string, nextDone: boolean) {
    if (!projectId || import.meta.env.VITE_USE_REAL_API !== '1') return;
    const prev = checklist[id];
    setPayload((p) => {
      if (!p) return p;
      const cur = cellFor(p.checklist, id);
      return {
        ...p,
        checklist: {
          ...p.checklist,
          [id]: {
            ...cur,
            completed: nextDone,
            auto_detected: false,
            completed_at: nextDone ? new Date().toISOString() : null,
            notes: cur.notes,
          },
        },
      };
    });
    const r = await postSeoChecklist(projectId, id, nextDone, prev?.notes ?? null);
    if (!r.ok) {
      toast(r.error || 'Could not save checklist', 'error');
      void loadPayload(projectId);
      return;
    }
    toast(nextDone ? 'Marked done' : 'Unchecked', 'success');
  }

  async function saveSetup(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || import.meta.env.VITE_USE_REAL_API !== '1') return;
    setSavingSetup(true);
    try {
      const goal = Number.parseInt(sfReviewGoal, 10);
      const r = await postSeoSetup(projectId, {
        gbp_place_id: sfGbpPid.trim() || null,
        primary_keyword: sfKeyword.trim() || null,
        target_city: sfCity.trim() || null,
        review_goal: Number.isFinite(goal) ? goal : 50,
        review_link: sfReviewLink.trim() || null,
        gbp_name: sfGbpName.trim() || null,
        secondary_keywords: [],
        near_me_keywords: [],
      });
      if (!r.ok) {
        toast(r.error || 'Setup failed', 'error');
        return;
      }
      toast('SEO profile saved — collection started in background.', 'success');
      setSetupOpen(false);
      await loadPayload(projectId);
    } finally {
      setSavingSetup(false);
    }
  }

  const rev = payload?.snapshots?.reviews as
    | { review_count?: number; avg_rating?: number; snapshot_date?: string }
    | undefined;
  const ranks = payload?.snapshots?.ranks || [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Local SEO Hub"
        description="Google Business Profile metrics, checklist, and map-pack snapshots. Data is stored in Supabase (not browser localStorage). Find a Place ID in Google's tool, then save setup for each project."
        actions={
          <a
            href="https://developers.google.com/maps/documentation/places/web-service/place-id"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-700"
          >
            Place ID finder <ExternalLink className="h-3.5 w-3.5" />
          </a>
        }
      />

      {import.meta.env.VITE_USE_REAL_API !== '1' && (
        <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          Turn on <code className="rounded bg-white px-1">VITE_USE_REAL_API=1</code> and sign in so this page can call{' '}
          <code className="rounded bg-white px-1">/api/admin/seo/*</code>.
        </Card>
      )}

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="seo-project">
              Project
            </label>
            <select
              id="seo-project"
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">Select…</option>
              {(projects || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="shrink-0 gap-2"
            disabled={!projectId || loading}
            onClick={() => void loadPayload(projectId)}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            type="button"
            className="shrink-0 gap-2 bg-violet-600 hover:bg-violet-700"
            disabled={!projectId || import.meta.env.VITE_USE_REAL_API !== '1'}
            onClick={() => {
              syncSetupFieldsFromPayload();
              setSetupOpen((o) => !o);
            }}
          >
            <MapPin className="h-4 w-4" />
            {payload?.seo ? 'Edit SEO setup' : 'Create SEO setup'}
          </Button>
        </div>

        {setupOpen && (
          <form onSubmit={saveSetup} className="mt-6 space-y-3 border-t border-slate-100 pt-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-600">GBP Place ID</label>
                <Input className="mt-1 font-mono text-xs" value={sfGbpPid} onChange={(e) => setSfGbpPid(e.target.value)} placeholder="ChIJ…" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Business name (match)</label>
                <Input value={sfGbpName} onChange={(e) => setSfGbpName(e.target.value)} placeholder="For rank matching" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Primary keyword</label>
                <Input value={sfKeyword} onChange={(e) => setSfKeyword(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Target city</label>
                <Input value={sfCity} onChange={(e) => setSfCity(e.target.value)} placeholder="Syracuse NY" required />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Review goal</label>
                <Input type="number" min={1} value={sfReviewGoal} onChange={(e) => setSfReviewGoal(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Google review URL</label>
                <Input value={sfReviewLink} onChange={(e) => setSfReviewLink(e.target.value)} placeholder="https://g.page/…" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={savingSetup || !projectId}>
                {savingSetup ? 'Saving…' : 'Save & collect now'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setSetupOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Card>

      {projectId && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Reviews (latest)</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
                {rev?.review_count != null ? rev.review_count : '—'}
              </p>
              <p className="text-sm text-slate-600">
                Avg {rev?.avg_rating != null ? Number(rev.avg_rating).toFixed(1) : '—'} ·{' '}
                {rev?.snapshot_date || 'no snapshot'}
              </p>
            </Card>
            <Card className="p-4 md:col-span-2">
              <p className="text-xs font-semibold uppercase text-slate-500">Map pack (latest run)</p>
              {ranks.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No rank rows yet — add DataForSEO credentials and run cron.</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm">
                  {ranks.map((r) => (
                    <li key={String((r as { keyword?: string }).keyword)} className="flex justify-between gap-2">
                      <span className="truncate text-slate-800">{(r as { keyword?: string }).keyword}</span>
                      <span className="shrink-0 tabular-nums text-slate-600">
                        pos {(r as { map_pack_position?: number | null }).map_pack_position ?? '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-1 text-xs text-slate-400">Date: {payload?.snapshots?.ranks_snapshot_date || '—'}</p>
            </Card>
          </div>

          <Card className="p-4">
            <h2 className="text-sm font-semibold text-slate-900">Review history (90 days)</h2>
            <div className="mt-4">
              <ReviewSpark points={hist} />
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold text-slate-900">Checklist</h2>
            <p className="mt-1 text-xs text-slate-500">
              Items marked “auto” update from cron when APIs confirm them. Manual items stay on you.
            </p>
            <ul className="mt-4 divide-y divide-slate-100">
              {CHECKLIST_ROWS.map((row) => {
                const c = cellFor(checklist, row.id);
                return (
                  <li key={row.id} className="flex flex-wrap items-center gap-3 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={c.completed}
                      onChange={(e) => void toggleCheck(row.id, e.target.checked)}
                      disabled={import.meta.env.VITE_USE_REAL_API !== '1'}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-slate-800">{row.label}</span>
                      {row.auto && (
                        <span className="ml-2 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-indigo-700">
                          auto
                        </span>
                      )}
                      {c.auto_detected && (
                        <span className="ml-2 text-[10px] font-medium text-slate-400">from sync</span>
                      )}
                      {c.notes && <p className="mt-0.5 text-xs text-slate-500">{c.notes}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">Cron</p>
            <p className="mt-1">
              Railway (or any scheduler): POST{' '}
              <code className="rounded bg-white px-1 py-0.5">/api/cron/seo-collect</code> with header{' '}
              <code className="rounded bg-white px-1 py-0.5">X-Cron-Secret</code> and env{' '}
              <code className="rounded bg-white px-1 py-0.5">SEO_CRON_ENABLED=1</code>. This page refreshes data every 60s when
              open.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

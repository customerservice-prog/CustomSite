import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshCw,
  Mail,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Globe,
  Clock,
} from 'lucide-react';
import { adminFetchJson, proactivelyRefreshAdminTokenIfStale } from '@/lib/admin-api';
import {
  compactHostnameForStatCard,
  formatRelativeTimeReceived,
  hostnameFromCurrentUrl,
  initialsFromName,
  parseSubjectPrefixedLeadMessage,
  previewText,
} from '@/lib/leads-message-format';
import { cn } from '@/lib/utils';

/** Row shape returned by `/api/admin/leads` (`public.leads`). */
interface ContactLeadApiRow {
  id: string;
  name: string;
  email: string;
  message: string;
  status: string | null;
  current_url?: string | null;
  created_at?: string | null;
  company?: string | null;
}

const BG = '#070502';
const GOLD = '#c9a84c';
const POLL_MS = 30_000;

function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function computeStats(leads: ContactLeadApiRow[]) {
  const total = leads.length;
  let today = 0;
  let unread = 0;
  const domainCounts = new Map<string, number>();
  const boundary = startOfLocalDay(Date.now());
  for (const L of leads) {
    if (String(L.status) === 'New') unread += 1;
    const created = L.created_at ? new Date(L.created_at).getTime() : NaN;
    if (Number.isFinite(created) && created >= boundary) today += 1;
    const h = hostnameFromCurrentUrl(L.current_url);
    if (h && h !== '—') domainCounts.set(h, (domainCounts.get(h) ?? 0) + 1);
  }
  let topDomainFull: string | null = null;
  let topN = 0;
  domainCounts.forEach((n, domain) => {
    if (n > topN) {
      topN = n;
      topDomainFull = domain;
    }
  });
  const topDomain = topDomainFull ? compactHostnameForStatCard(topDomainFull) : '—';
  return { total, today, unread, topDomain, topDomainFull };
}

export function MessagesCenterPage() {
  const [leads, setLeads] = useState<ContactLeadApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    const id = 'msg-center-font-link';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  const fetchLeads = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) setLoading(true);
    else setPolling(true);
    setError(null);
    try {
      await proactivelyRefreshAdminTokenIfStale();
      const r = await adminFetchJson<{ leads?: ContactLeadApiRow[] }>('/api/admin/leads');
      if (!r.ok) {
        setError(r.error || 'Could not load messages');
        return;
      }
      setLeads(Array.isArray(r.data.leads) ? r.data.leads : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
      setPolling(false);
    }
  }, []);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    const t = window.setInterval(() => {
      void fetchLeads({ quiet: true });
    }, POLL_MS);
    return () => window.clearInterval(t);
  }, [fetchLeads]);

  const stats = useMemo(() => computeStats(leads), [leads]);

  function toggleExpand(id: string) {
    setExpandedId((x) => (x === id ? null : id));
  }

  return (
    <div
      className="-mx-4 mb-[-1.5rem] min-h-[calc(100vh-5rem)] -mt-4 overflow-hidden px-4 pb-8 pt-6 md:-mx-8 md:px-8"
      style={{ backgroundColor: BG, color: 'rgba(255,255,255,0.9)' }}
    >
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.85rem]" style={{ fontFamily: 'Cinzel, serif', color: GOLD }}>
              Message Center
            </h1>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed" style={{ fontFamily: '"EB Garamond", Georgia, serif', color: 'rgba(255,255,253,0.72)' }}>
              Contact form submissions from your sites (<code className="rounded px-1 text-[13px]" style={{ backgroundColor: '#1a1712', color: GOLD }}>/api/contact</code>).
              Opens the same data as <span style={{ color: GOLD }}>GET /api/admin/leads</span> on this host.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchLeads()}
            disabled={loading}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition hover:opacity-90 disabled:opacity-50"
            style={{
              fontFamily: 'Cinzel, serif',
              borderColor: `${GOLD}55`,
              color: GOLD,
              backgroundColor: '#12100c',
            }}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </button>
        </header>

        <div
          className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
          style={{ fontFamily: '"EB Garamond", Georgia, serif' }}
        >
          {[
            { label: 'Total', value: stats.total },
            { label: 'Today', value: stats.today },
            { label: 'Unread (New)', value: stats.unread },
            {
              label: 'Top source',
              value: stats.topDomain,
              mono: true,
              title: stats.topDomainFull ?? undefined,
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border px-4 py-3"
              style={{ borderColor: `${GOLD}33`, backgroundColor: '#0e0c08' }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: `${GOLD}aa` }}>
                {s.label}
              </p>
              <p
                className={cn('mt-1 text-lg font-medium', s.mono && 'break-all text-sm leading-tight sm:text-base')}
                style={{ color: '#f5f0e6' }}
                title={s.title ?? (s.mono ? String(s.value) : undefined)}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {polling && !loading && (
          <p className="mb-3 text-right text-xs" style={{ color: `${GOLD}88` }}>
            Syncing…
          </p>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-100">{error}</div>
        )}

        {loading && leads.length === 0 && !error && (
          <p className="py-16 text-center text-sm" style={{ color: `${GOLD}99`, fontFamily: '"EB Garamond", Georgia, serif' }}>
            Loading messages…
          </p>
        )}

        {!loading && leads.length === 0 && !error && (
          <p className="py-16 text-center text-sm" style={{ color: `${GOLD}88`, fontFamily: '"EB Garamond", Georgia, serif' }}>
            No submissions yet. Leads from your contact forms will appear here.
          </p>
        )}

        <ul className="space-y-3">
          {leads.map((lead) => {
            const isNew = String(lead.status) === 'New';
            const parsed = parseSubjectPrefixedLeadMessage(lead.message);
            const preview = previewText(parsed.displayPreviewSource || lead.message);
            const host = hostnameFromCurrentUrl(lead.current_url);
            const ago = formatRelativeTimeReceived(lead.created_at ?? null);
            const expanded = expandedId === lead.id;
            const replySubject =
              parsed.inferredSubject?.trim() ||
              `Re: Message from ${host === '—' ? 'contact form' : host}`;
            const mailto = `mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent(replySubject)}`;

            return (
              <li key={lead.id}>
                <div
                  className="overflow-hidden rounded-xl transition"
                  style={{
                    backgroundColor: '#100d08',
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: '#2a2419',
                    borderLeftWidth: isNew ? 4 : 1,
                    borderLeftColor: isNew ? GOLD : '#2a2419',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleExpand(lead.id)}
                    className="flex w-full flex-col gap-3 p-4 text-left sm:flex-row sm:items-start sm:gap-4"
                    aria-expanded={expanded}
                  >
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold uppercase"
                      style={{
                        fontFamily: 'Cinzel, serif',
                        backgroundColor: '#1f1a14',
                        color: GOLD,
                        border: `1px solid ${GOLD}44`,
                      }}
                    >
                      {initialsFromName(lead.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-medium" style={{ fontFamily: 'Cinzel, serif', color: '#f8f5ef' }}>
                          {lead.name || 'Unknown'}
                        </span>
                        {isNew && (
                          <span
                            className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                            style={{ backgroundColor: `${GOLD}22`, color: GOLD }}
                          >
                            New
                          </span>
                        )}
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-sm text-amber-100/85" style={{ fontFamily: '"EB Garamond", Georgia, serif' }}>
                        <Mail className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                        <span className="truncate">{lead.email}</span>
                      </p>
                      <p className="mt-2 line-clamp-2 text-[15px] leading-snug opacity-92" style={{ fontFamily: '"EB Garamond", Georgia, serif' }}>
                        {preview || '—'}
                      </p>
                      <div
                        className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]"
                        style={{ color: `${GOLD}aa`, fontFamily: '"EB Garamond", Georgia, serif' }}
                      >
                        <span className="inline-flex items-center gap-1">
                          <Globe className="h-3.5 w-3.5" aria-hidden />
                          {host}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" aria-hidden />
                          {ago}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 self-end sm:self-center">
                      {expanded ? (
                        <ChevronUp className="h-5 w-5" style={{ color: GOLD }} />
                      ) : (
                        <ChevronDown className="h-5 w-5 opacity-70" style={{ color: GOLD }} />
                      )}
                    </div>
                  </button>

                  {expanded && (
                    <div
                      className="border-t px-4 py-4 sm:pl-[4.75rem]"
                      style={{ borderColor: '#2a2419', fontFamily: '"EB Garamond", Georgia, serif' }}
                    >
                      {parsed.inferredSubject && (
                        <p className="mb-3 text-[15px]" style={{ color: GOLD }}>
                          <span className="font-semibold" style={{ fontFamily: 'Cinzel, serif' }}>
                            Subject
                          </span>
                          : {parsed.inferredSubject}
                        </p>
                      )}
                      <div className="whitespace-pre-wrap text-[17px] leading-relaxed text-stone-200/95">
                        {parsed.bodyForDisplay.trim() ? parsed.bodyForDisplay : lead.message.trim() || '(No message body)'}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <a
                          href={mailto}
                          className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition hover:brightness-110"
                          style={{ fontFamily: 'Cinzel, serif', backgroundColor: GOLD, color: BG }}
                        >
                          <Mail className="h-4 w-4" />
                          Reply
                        </a>
                        {lead.current_url && host !== '—' && (
                          <a
                            href={/^https?:/i.test(String(lead.current_url)) ? String(lead.current_url) : `https://${lead.current_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm text-stone-200 transition hover:bg-white/5"
                            style={{ borderColor: `${GOLD}44`, fontFamily: 'Cinzel, serif' }}
                          >
                            <ExternalLink className="h-4 w-4" style={{ color: GOLD }} />
                            Open page
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-10 text-center text-[11px]" style={{ color: `${GOLD}55`, fontFamily: '"EB Garamond", Georgia, serif' }}>
          Auto-refresh every 30 seconds · Bearer tokens refresh via POST /api/auth/refresh · refresh token mirrored in{' '}
          <code style={{ color: `${GOLD}99` }}>cs_refresh_token</code>
        </p>
      </div>
    </div>
  );
}

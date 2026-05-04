import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { Mail } from 'lucide-react';
import { useClientPortalProject } from '@/hooks/use-client-portal-project';
import { useAppStore } from '@/store/useAppStore';
import * as sel from '@/store/selectors';
import { getAccessToken, proactivelyRefreshAdminTokenIfStale } from '@/lib/admin-api';
import { shouldShowDemoDatasetBanner } from '@/lib/runtime-demo';
import { cn } from '@/lib/utils';

interface PortalContactLead {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at?: string | null;
  project_id?: string | null;
  project_name?: string | null;
}

interface PortalTeamMessage {
  id: string;
  project_id: string;
  sender_id?: string | null;
  content: string;
  created_at?: string | null;
  project_name?: string | null;
}

interface PortalInboxPayload {
  messages: PortalTeamMessage[];
  contactLeads: PortalContactLead[];
  projects?: { id: string; name: string | null }[];
}

type LiveGateState = 'unset' | 'pending' | 'forbidden' | 'loaded';

function stripPreview(s: string, max = 220) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trimEnd() + '…';
}

function formatWhen(iso: string | null | undefined) {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return String(iso);
  }
}

export function ClientPortalMessagesPage() {
  const ctx = useClientPortalProject();
  const threads = useAppStore(
    useShallow((s) => (ctx?.project ? sel.getThreadsForProject(s, ctx.project.id) : []))
  );

  const [liveInbox, setLiveInbox] = useState<PortalInboxPayload | null>(null);
  const [liveErr, setLiveErr] = useState<string | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveGate, setLiveGate] = useState<LiveGateState>('unset');

  const demo = shouldShowDemoDatasetBanner();

  const loadPortalInbox = useCallback(async () => {
    if (demo || import.meta.env.VITE_USE_REAL_API !== '1') return;
    setLiveErr(null);
    try {
      await proactivelyRefreshAdminTokenIfStale();
      const tok = getAccessToken()?.trim();
      if (!tok) return;
      setLiveLoading(true);
      setLiveGate('pending');
      const r = await fetch('/api/messages', { headers: { Authorization: `Bearer ${tok}` } });
      const j = (await r.json().catch(() => null)) as { error?: string } & PortalInboxPayload | null;
      if (r.status === 400 || r.status === 403) {
        setLiveInbox(null);
        setLiveGate('forbidden');
        setLiveErr(null);
        return;
      }
      if (!r.ok || !j) {
        setLiveInbox(null);
        setLiveGate('unset');
        setLiveErr((j && j.error) || 'Could not load your inbox.');
        return;
      }
      setLiveGate('loaded');
      setLiveInbox({
        messages: Array.isArray(j.messages) ? j.messages : [],
        contactLeads: Array.isArray(j.contactLeads) ? j.contactLeads : [],
        projects: Array.isArray(j.projects) ? j.projects : [],
      });
    } catch {
      setLiveGate('unset');
      setLiveErr('Network error loading inbox.');
    } finally {
      setLiveLoading(false);
    }
  }, [demo]);

  useEffect(() => {
    void loadPortalInbox();
  }, [loadPortalInbox]);

  const orderedLeads = useMemo(() => {
    const xs = [...(liveInbox?.contactLeads || [])];
    xs.sort((a, b) => {
      const ta = new Date(String(a.created_at || 0)).getTime();
      const tb = new Date(String(b.created_at || 0)).getTime();
      return tb - ta;
    });
    return xs;
  }, [liveInbox]);

  const orderedMsgs = useMemo(() => {
    const xs = [...(liveInbox?.messages || [])];
    xs.sort((a, b) => {
      const ta = new Date(String(a.created_at || 0)).getTime();
      const tb = new Date(String(b.created_at || 0)).getTime();
      return tb - ta;
    });
    return xs;
  }, [liveInbox]);

  /** Demo threads belong to agency preview; real clients hide them once inbox API succeeds. */
  const showStudioPreview = demo || liveGate === 'forbidden' || liveGate === 'unset';

  if (!ctx) {
    return (
      <p className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-600 shadow-sm">
        When your project is connected, conversations with our team appear here alongside messages from visitors on any
        of your hosted sites that use CustomSite contact forms.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-stone-900">Messages</h2>
        <p className="mt-1 text-sm text-stone-600">
          Visitor contact forms mirror into this inbox for each project linked to your account — you and CustomSite stay
          in sync. Reply to visitors directly from their email addresses.
        </p>
      </div>

      {liveLoading ? (
        <p className="rounded-2xl border border-stone-200 bg-white px-5 py-4 text-sm text-stone-600 shadow-sm">
          Loading your inbox…
        </p>
      ) : null}

      {liveErr ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">{liveErr}</p>
      ) : null}

      {liveGate === 'loaded' && orderedLeads.length === 0 && !liveLoading ? (
        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Site visitor messages</h3>
          <p className="rounded-2xl border border-stone-200 bg-white px-5 py-5 text-sm text-stone-600 shadow-sm">
            No visitor submissions yet across your hosted sites. Forms on every project tied to your account sync here automatically.
          </p>
        </section>
      ) : null}

      {liveInbox && orderedLeads.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Site visitor messages</h3>
          <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white shadow-sm">
            {orderedLeads.map((L) => {
              const subj =
                `${L.project_name ? `${L.project_name} · ` : ''}Message via your site`;
              const mailto = `mailto:${L.email}?subject=${encodeURIComponent(subj)}`;
              return (
                <li key={L.id} className="gap-4 px-5 py-4 sm:flex sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold text-stone-900">{L.name || 'Visitor'}</span>
                      {L.project_name ? (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-800">
                          {L.project_name}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-stone-700">{stripPreview(L.message, 460)}</p>
                    <p className="mt-2 inline-flex flex-wrap items-center gap-2 text-xs text-stone-500">
                      <span>{formatWhen(L.created_at)}</span>
                      <span className="text-stone-300">·</span>
                      <span className="inline-flex items-center gap-1 text-stone-600">
                        <Mail className="h-3.5 w-3.5" aria-hidden />
                        {L.email}
                      </span>
                    </p>
                  </div>
                  <a
                    href={mailto}
                    className={cn(
                      'mt-3 inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800 sm:mt-0'
                    )}
                  >
                    <Mail className="h-4 w-4" />
                    Reply
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {liveGate === 'loaded' && orderedMsgs.length === 0 && !liveLoading ? (
        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Studio conversations</h3>
          <p className="rounded-2xl border border-stone-200 bg-white px-5 py-5 text-sm text-stone-600 shadow-sm">
            No studio thread notes yet — team messages on your projects will appear here alongside visitor mail.
          </p>
        </section>
      ) : null}

      {liveInbox && orderedMsgs.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Studio conversations</h3>
          <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white shadow-sm">
            {orderedMsgs.map((m) => (
              <li key={m.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-400">
                  <span>{formatWhen(m.created_at)}</span>
                  {m.project_name ? (
                    <>
                      <span className="text-stone-200">·</span>
                      <span className="font-medium text-stone-600">{m.project_name}</span>
                    </>
                  ) : null}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">{m.content}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {showStudioPreview ? (
        <div className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
            Studio demo threads (agency preview mode)
          </h3>
          <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white shadow-sm">
            {threads.length === 0 ? (
              <li className="p-6 text-sm text-stone-500">
                No seeded threads yet. When you log in via the hosted client portal, site visitor submissions from every
                project we host for you will appear above automatically.
              </li>
            ) : (
              threads.map((t) => (
                <li key={t.id} className="px-5 py-4">
                  <p className="font-semibold text-stone-900">{t.participant}</p>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600">{t.preview}</p>
                  <p className="mt-2 text-xs text-stone-400">{t.lastActivityLabel}</p>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

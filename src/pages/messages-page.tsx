import { useEffect, useMemo, useState } from 'react';
import { Paperclip, Search, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import { PageHeader } from '@/components/ui/page-header';
import { SplitInboxLayout } from '@/components/layout/templates/split-inbox-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { daysSinceIso } from '@/lib/days-since';
import { messageStatusBadgeVariant } from '@/lib/statuses';
import { titleCaseStatus } from '@/lib/format-display';
import { useShell } from '@/context/shell-context';
import { useClients, useMessageThreads } from '@/store/hooks';
import { useAppStore } from '@/store/useAppStore';
import * as sel from '@/store/selectors';
import { RecommendedNextAction, type NextActionItem } from '@/components/workspace/recommended-next-action';

function threadSortRank(status: string): number {
  if (status === 'Unread') return 0;
  if (status === 'Waiting') return 1;
  if (status === 'Replied') return 2;
  return 3;
}

export function MessagesPage() {
  const { toast } = useShell();
  const allThreads = useMessageThreads();
  const sortedThreads = useMemo(() => {
    return [...allThreads].sort((a, b) => threadSortRank(a.status) - threadSortRank(b.status));
  }, [allThreads]);
  const defaultThreadId = useMemo(() => {
    const u = sortedThreads.find((t) => t.status === 'Unread');
    return u?.id ?? sortedThreads[0]?.id ?? '';
  }, [sortedThreads]);
  const [selectedId, setSelectedId] = useState(defaultThreadId);
  const [q, setQ] = useState('');
  const [inboxFilter, setInboxFilter] = useState<'all' | 'unread' | 'waiting'>('unread');
  const [draft, setDraft] = useState('');
  const [attachSimulated, setAttachSimulated] = useState(false);
  const appendTeamMessage = useAppStore((s) => s.appendTeamMessage);
  const clients = useClients();
  const clientById = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c])), [clients]);

  useEffect(() => {
    if (!selectedId && defaultThreadId) setSelectedId(defaultThreadId);
  }, [sortedThreads, selectedId, defaultThreadId]);

  useEffect(() => {
    setAttachSimulated(false);
  }, [selectedId]);

  const threads = useMemo(() => {
    return sortedThreads.filter((t) => {
      const match =
        !q.trim() ||
        t.participant.toLowerCase().includes(q.toLowerCase()) ||
        t.preview.toLowerCase().includes(q.toLowerCase());
      const inboxOk =
        inboxFilter === 'all'
          ? true
          : inboxFilter === 'unread'
            ? t.status === 'Unread'
            : t.status === 'Waiting';
      return match && inboxOk;
    });
  }, [sortedThreads, q, inboxFilter]);

  useEffect(() => {
    if (threads.length && !threads.some((t) => t.id === selectedId)) {
      setSelectedId(threads[0].id);
    }
  }, [threads, selectedId]);

  const selected = sortedThreads.find((t) => t.id === selectedId) ?? threads[0];

  const unreadCount = useMemo(() => sortedThreads.filter((t) => t.status === 'Unread').length, [sortedThreads]);
  const staleWaitingCount = useMemo(
    () => sortedThreads.filter((t) => t.status === 'Waiting' && daysSinceIso(t.updatedAt) >= 3).length,
    [sortedThreads]
  );

  const messageNextActions: NextActionItem[] = useMemo(() => {
    const items: NextActionItem[] = [];
    const unread = sortedThreads.filter((t) => t.status === 'Unread');
    if (unread[0]) {
      items.push({
        label: `Reply to ${unread[0].participant}`,
        hint: unread[0].preview,
        href: '/messages',
        tone: 'danger',
      });
    }
    const waiting = sortedThreads.filter((t) => t.status === 'Waiting');
    if (waiting[0]) {
      const c = clientById[waiting[0].clientId];
      items.push({
        label: `Follow up with ${c?.company ?? waiting[0].participant}`,
        hint: 'Client owes you a decision — send a clear nudge.',
        href: '/messages',
        tone: 'warning',
      });
    }
    const replied = sortedThreads.find((t) => t.status === 'Replied');
    if (replied && items.length < 3) {
      items.push({
        label: `Archive or close thread with ${replied.participant}`,
        href: '/messages',
      });
    }
    return items.slice(0, 3);
  }, [sortedThreads, clientById]);

  const client = useAppStore(useShallow((s) => (selected ? s.clients[selected.clientId] : undefined)));
  const project = useAppStore(useShallow((s) => (selected ? s.projects[selected.projectId] : undefined)));

  const threadMessages = useAppStore(
    useShallow((s) => (selectedId ? sel.getMessagesForThread(s, selectedId) : []))
  );

  function send() {
    if (!draft.trim() || !selected) return;
    appendTeamMessage(selected.id, draft.trim());
    setDraft('');
    setAttachSimulated(false);
    toast('Message sent — clients see this in their portal thread with your branding.', 'success');
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <PageHeader
          title="Client communications"
          description="Curated threads tied to engagements — reply with clear milestones, review requests, and next steps so every touch feels like a senior partner, not a chat app."
        />
        {(unreadCount > 0 || staleWaitingCount > 0) && (
          <Card variant="compact" className="border-l-4 border-slate-800 bg-slate-50/90 py-3">
            <p className="text-[11px] font-bold uppercase text-slate-600">Decide next</p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-900">
              {unreadCount > 0 && (
                <li>
                  <span className="font-semibold text-red-800">{unreadCount} client{unreadCount === 1 ? '' : 's'} waiting</span> on your reply — respond while context is fresh; delays read as deprioritized.
                </li>
              )}
              {staleWaitingCount > 0 && (
                <li>
                  <span className="font-semibold text-amber-900">{staleWaitingCount} thread{staleWaitingCount === 1 ? '' : 's'}</span> with no client reply in 3+ days — send a tight follow-up with a deadline.
                </li>
              )}
            </ul>
          </Card>
        )}
        <RecommendedNextAction items={messageNextActions} />
      </div>

      <SplitInboxLayout
        sidebar={
          <div className="flex h-full min-h-0 flex-col bg-white">
            <div className="border-b border-slate-200 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search conversations…"
                  className="pl-9"
                  aria-label="Search conversations"
                />
              </div>
              <div className="mt-2 flex flex-col gap-1.5">
                {(
                  [
                    { id: 'all' as const, label: 'All' },
                    { id: 'unread' as const, label: 'Needs your reply' },
                    { id: 'waiting' as const, label: 'Waiting on client' },
                  ] as const
                ).map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setInboxFilter(id)}
                    className={cn(
                      'w-full rounded-xl border px-3 py-2 text-left text-xs font-bold uppercase tracking-wide transition duration-150',
                      inboxFilter === id
                        ? 'border-indigo-200 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto">
              {threads.length === 0 ? (
                <li className="p-6 text-center text-sm text-slate-600">
                  <p className="font-medium text-slate-800">No conversations here</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    Adjust filters or keep shipping work — client threads show up as soon as someone replies in the portal or you log a message.
                  </p>
                </li>
              ) : (
                threads.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(t.id)}
                      className={cn(
                        'flex w-full flex-col gap-1 border-b border-slate-100 px-4 py-3 text-left transition duration-150',
                        selectedId === t.id ? 'bg-indigo-50/80' : 'hover:bg-slate-50'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold text-slate-900">{t.participant}</span>
                        <Badge variant={messageStatusBadgeVariant(t.status)} className="shrink-0 text-[10px]">
                          {titleCaseStatus(t.status)}
                        </Badge>
                      </div>
                      <p className="line-clamp-2 text-xs text-slate-500">{t.preview}</p>
                      <span className="text-[10px] font-medium text-slate-400">{t.lastActivityLabel}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        }
        main={
          selected ? (
            <div className="flex h-full min-h-0 flex-col">
              <header className="border-b border-slate-200 bg-white px-4 py-3 lg:px-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{selected.participant}</h2>
                    <p className="text-xs text-slate-500">Last activity {selected.lastActivityLabel}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {client && (
                      <Link
                        to={`/clients/${client.id}`}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-900"
                      >
                        Client · {client.company}
                      </Link>
                    )}
                    {project && (
                      <Link
                        to={`/projects/${project.id}`}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-900"
                      >
                        Project · {project.name}
                      </Link>
                    )}
                  </div>
                </div>
              </header>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 lg:px-6">
                {threadMessages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      'max-w-[85%] rounded-2xl border px-4 py-3 text-sm shadow-sm transition',
                      m.from === 'team'
                        ? 'ml-auto border-indigo-100 bg-indigo-50/90 text-slate-800'
                        : 'border-slate-100 bg-white text-slate-700'
                    )}
                  >
                    <p>{m.body}</p>
                    <p className="mt-1 text-[10px] font-medium text-slate-400">{m.timeLabel}</p>
                  </div>
                ))}
              </div>
              <footer className="border-t border-slate-200 bg-white p-3 lg:p-4">
                {attachSimulated && (
                  <p className="mb-2 rounded-lg border border-indigo-100 bg-indigo-50/90 px-3 py-2 text-xs font-medium text-indigo-900">
                    Brand guidelines.pdf staged — sends with your next message.
                  </p>
                )}
                <div className="flex gap-2">
                  <IconButton
                    aria-label="Attach file"
                    type="button"
                    onClick={() => {
                      setAttachSimulated(true);
                      toast('File staged for this reply.', 'success');
                    }}
                  >
                    <Paperclip className="h-4 w-4" />
                  </IconButton>
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write a concise update — milestone, review request, or next step with a date…"
                    className="min-h-[44px] flex-1 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                  />
                  <Button type="button" className="shrink-0 self-end px-3" onClick={send} aria-label="Send message">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </footer>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">Select a conversation.</div>
          )
        }
      />
    </div>
  );
}

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
import { cn } from '@/lib/utils';
import { messageStatusBadgeVariant } from '@/lib/statuses';
import { useShell } from '@/context/shell-context';
import { useMessageThreads } from '@/store/hooks';
import { useAppStore } from '@/store/useAppStore';
import * as sel from '@/store/selectors';

export function MessagesPage() {
  const { toast } = useShell();
  const allThreads = useMessageThreads();
  const [selectedId, setSelectedId] = useState(allThreads[0]?.id ?? '');
  const [q, setQ] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [draft, setDraft] = useState('');
  const appendTeamMessage = useAppStore((s) => s.appendTeamMessage);

  useEffect(() => {
    if (!selectedId && allThreads[0]) setSelectedId(allThreads[0].id);
  }, [allThreads, selectedId]);

  const threads = useMemo(() => {
    return allThreads.filter((t) => {
      const match =
        !q.trim() ||
        t.participant.toLowerCase().includes(q.toLowerCase()) ||
        t.preview.toLowerCase().includes(q.toLowerCase());
      const unread = !unreadOnly || t.status === 'Unread';
      return match && unread;
    });
  }, [allThreads, q, unreadOnly]);

  useEffect(() => {
    if (threads.length && !threads.some((t) => t.id === selectedId)) {
      setSelectedId(threads[0].id);
    }
  }, [threads, selectedId]);

  const selected = allThreads.find((t) => t.id === selectedId) ?? threads[0];

  const client = useAppStore(useShallow((s) => (selected ? s.clients[selected.clientId] : undefined)));
  const project = useAppStore(useShallow((s) => (selected ? s.projects[selected.projectId] : undefined)));

  const threadMessages = useAppStore(
    useShallow((s) => (selectedId ? sel.getMessagesForThread(s, selectedId) : []))
  );

  function send() {
    if (!draft.trim() || !selected) return;
    appendTeamMessage(selected.id, draft.trim());
    setDraft('');
    toast('Delivered — your client sees this in their thread.', 'success');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        description="Grouped by who owes the next move — you first, then the client, then everything that’s cooling off."
      />

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
              <button
                type="button"
                onClick={() => setUnreadOnly((v) => !v)}
                className={cn(
                  'mt-2 w-full rounded-xl border px-3 py-2 text-left text-xs font-bold uppercase tracking-wide transition duration-150',
                  unreadOnly
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-900'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                )}
              >
                {unreadOnly ? 'Showing unread only' : 'All conversations'}
              </button>
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
                          {t.status}
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
                <div className="flex gap-2">
                  <IconButton
                    aria-label="Attach file"
                    type="button"
                    onClick={() => toast('Upload files from the Files page and link them here.', 'info')}
                  >
                    <Paperclip className="h-4 w-4" />
                  </IconButton>
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write a reply…"
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

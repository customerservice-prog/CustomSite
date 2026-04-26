import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import {
  FileText,
  FolderKanban,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  Users,
  Workflow,
} from 'lucide-react';
import { useShell } from '@/context/shell-context';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store/useAppStore';
import * as sel from '@/store/selectors';

type Cmd = { id: string; label: string; hint?: string; icon: typeof Search; run: () => void };

export function CommandMenu() {
  const { commandOpen, setCommandOpen } = useShell();
  const navigate = useNavigate();
  const openModal = useAppStore((s) => s.openModal);
  const [q, setQ] = useState('');
  const clientList = useAppStore(useShallow(sel.clientsList));
  const projectList = useAppStore(useShallow(sel.projectsList));

  const commands = useMemo<Cmd[]>(
    () => [
      { id: 'dash', label: 'Go to Dashboard', hint: 'Navigation', icon: LayoutDashboard, run: () => navigate('/dashboard') },
      { id: 'pipe', label: 'Go to Pipeline', hint: 'Navigation', icon: Workflow, run: () => navigate('/pipeline') },
      { id: 'cli', label: 'Go to Clients', hint: 'Navigation', icon: Users, run: () => navigate('/clients') },
      { id: 'proj', label: 'Go to Projects', hint: 'Navigation', icon: FolderKanban, run: () => navigate('/projects') },
      { id: 'inv', label: 'Go to Invoices', hint: 'Navigation', icon: FileText, run: () => navigate('/invoices') },
      { id: 'set', label: 'Go to Settings', hint: 'Navigation', icon: Settings, run: () => navigate('/settings') },
      { id: 'nc', label: 'Create client', hint: 'Action', icon: Plus, run: () => openModal('create-client') },
      { id: 'np', label: 'Create project', hint: 'Action', icon: FolderKanban, run: () => openModal('create-project') },
      { id: 'ni', label: 'Create invoice', hint: 'Action', icon: FileText, run: () => openModal('create-invoice') },
      { id: 'nt', label: 'Create task', hint: 'Action', icon: Plus, run: () => openModal('create-task') },
    ],
    [navigate, openModal]
  );

  const searchHits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [] as Cmd[];
    const out: Cmd[] = [];
    clientList.forEach((c) => {
      if (c.name.toLowerCase().includes(s) || c.company.toLowerCase().includes(s)) {
        out.push({
          id: `client-${c.id}`,
          label: c.name,
          hint: `Client · ${c.company}`,
          icon: Users,
          run: () => navigate(`/clients/${c.id}`),
        });
      }
    });
    projectList.forEach((p) => {
      const cl = useAppStore.getState().clients[p.clientId];
      if (p.name.toLowerCase().includes(s) || (cl?.company.toLowerCase().includes(s) ?? false)) {
        out.push({
          id: `project-${p.id}`,
          label: p.name,
          hint: `Project · ${cl?.company ?? ''}`,
          icon: FolderKanban,
          run: () => navigate(`/projects/${p.id}`),
        });
      }
    });
    return out.slice(0, 8);
  }, [q, navigate, clientList, projectList]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const cmdMatch = commands.filter(
      (c) => !s || c.label.toLowerCase().includes(s) || c.hint?.toLowerCase().includes(s)
    );
    if (!s) return commands;
    return [...searchHits, ...cmdMatch];
  }, [commands, q, searchHits]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
      if (e.key === 'Escape') setCommandOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [setCommandOpen]);

  useEffect(() => {
    if (!commandOpen) setQ('');
  }, [commandOpen]);

  if (!commandOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-start justify-center pt-[15vh] px-4" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition"
        aria-label="Close"
        onClick={() => setCommandOpen(false)}
      />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/5">
        <div className="flex items-center gap-2 border-b border-slate-100 px-3">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search commands, clients, projects…"
            className="border-0 shadow-none focus:ring-0"
            autoFocus
          />
          <kbd className="hidden shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 sm:inline">
            esc
          </kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto py-2">
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  c.run();
                  setCommandOpen(false);
                }}
                className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-slate-50"
              >
                <c.icon className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1 font-medium text-slate-900">{c.label}</span>
                {c.hint && <span className="text-xs text-slate-400">{c.hint}</span>}
              </button>
            </li>
          ))}
          {!filtered.length && <li className="px-3 py-8 text-center text-sm text-slate-500">No matches</li>}
        </ul>
        <p className="border-t border-slate-100 px-3 py-2 text-center text-[11px] text-slate-400">
          Pro tip: <kbd className="rounded bg-slate-100 px-1 font-mono">⌘</kbd> /{' '}
          <kbd className="rounded bg-slate-100 px-1 font-mono">Ctrl</kbd> + <kbd className="rounded bg-slate-100 px-1 font-mono">K</kbd>
        </p>
      </div>
    </div>,
    document.body
  );
}

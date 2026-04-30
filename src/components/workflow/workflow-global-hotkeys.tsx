import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import { useAppStore } from '@/store/useAppStore';
import { useProjectSiteWorkspaceStore } from '@/store/use-project-site-workspace-store';

function firstClientSiteProjectId(): string | null {
  const projects = Object.values(useAppStore.getState().projects).filter((p) => p.deliveryFocus === 'client_site');
  projects.sort((a, b) => a.name.localeCompare(b.name));
  return projects[0]?.id ?? null;
}

function resolveProjectId(pathname: string, search: string): string | null {
  const siteMatch = pathname.match(/^\/projects\/([^/]+)\/site$/);
  if (siteMatch) return siteMatch[1];
  const q = new URLSearchParams(search);
  const fromQuery = q.get('project');
  if (fromQuery && useAppStore.getState().projects[fromQuery]) return fromQuery;
  const last = useProjectSiteWorkspaceStore.getState().lastFocusedProjectId;
  if (last && useAppStore.getState().projects[last]) return last;
  return firstClientSiteProjectId();
}

/** Global shortcuts: command palette, AI/code toggle, quick page, insert section, Bryan the Brain submit, save. */
export function WorkflowGlobalHotkeys() {
  const navigate = useNavigate();
  const location = useLocation();
  const setCommandOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const projects = useAppStore(useShallow((s) => s.projects));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key === 'k' || e.key === 'K') {
        if (e.shiftKey) return;
        e.preventDefault();
        setCommandOpen(true);
        return;
      }

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName ?? '';
      const inTextField = tag === 'INPUT' || tag === 'TEXTAREA' || Boolean(target?.isContentEditable);

      if (e.key === '/' || e.key === '?') {
        if (e.shiftKey) return;
        e.preventDefault();
        const stablePid =
          resolveProjectId(location.pathname, location.search) ||
          Object.values(projects)
            .filter((p) => p.deliveryFocus === 'client_site')
            .sort((a, b) => a.name.localeCompare(b.name))[0]?.id;
        if (!stablePid) return;
        if (location.pathname.startsWith('/rbyan')) {
          navigate(`/projects/${stablePid}/site`);
          useProjectSiteWorkspaceStore.getState().setBuilderSurface(stablePid, 'code');
        } else {
          navigate(`/rbyan?project=${encodeURIComponent(stablePid)}`);
          useProjectSiteWorkspaceStore.getState().setBuilderSurface(stablePid, 'ai');
        }
        return;
      }

      if (e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        const pid =
          resolveProjectId(location.pathname, location.search) ||
          Object.values(projects)
            .filter((p) => p.deliveryFocus === 'client_site')
            .sort((a, b) => a.name.localeCompare(b.name))[0]?.id;
        if (!pid) return;
        useProjectSiteWorkspaceStore.getState().requestQuickAddPage();
        navigate(`/projects/${pid}/site?quickPage=1`);
        return;
      }

      if (e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        const pid =
          resolveProjectId(location.pathname, location.search) ||
          Object.values(projects)
            .filter((p) => p.deliveryFocus === 'client_site')
            .sort((a, b) => a.name.localeCompare(b.name))[0]?.id;
        if (!pid) return;
        navigate(`/projects/${pid}/site`);
        window.dispatchEvent(new CustomEvent('workflow-insert-section'));
        return;
      }

      if (e.key === 'Enter' && location.pathname.startsWith('/rbyan')) {
        if (!inTextField || tag !== 'TEXTAREA') return;
        if (target?.getAttribute('aria-label') !== 'Message Bryan the Brain') return;
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('rbyan-submit-prompt'));
        return;
      }

      if ((e.key === 's' || e.key === 'S') && !e.shiftKey && /\/projects\/[^/]+\/site$/.test(location.pathname)) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('site-builder-save'));
        return;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navigate, location.pathname, location.search, setCommandOpen, projects]);

  return null;
}

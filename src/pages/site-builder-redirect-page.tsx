import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import { useAppStore } from '@/store/useAppStore';

/** Sends users to the first client-site project builder, or back to Projects if none exist. */
export function SiteBuilderRedirectPage() {
  const projects = useAppStore(useShallow((s) => Object.values(s.projects)));
  const projectId = useMemo(() => {
    const site = projects.filter((p) => p.deliveryFocus === 'client_site').sort((a, b) => a.name.localeCompare(b.name));
    return site[0]?.id;
  }, [projects]);

  if (projectId) {
    return <Navigate to={`/projects/${projectId}/site`} replace />;
  }
  return <Navigate to="/projects" replace />;
}

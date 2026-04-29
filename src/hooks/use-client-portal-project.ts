import { useAppStore } from '@/store/useAppStore';
import type { Client, Project } from '@/lib/types/entities';

/** First project flagged for the client-facing portal (demo / single-tenant). */
export function useClientPortalProject(): { project: Project; client: Client } | null {
  const project = useAppStore((s) =>
    Object.values(s.projects).find((p) => p.clientPortalVisible && p.deliveryFocus === 'client_site')
  );
  const client = useAppStore((s) => (project ? s.clients[project.clientId] : undefined));
  if (!project || !client) return null;
  return { project, client };
}

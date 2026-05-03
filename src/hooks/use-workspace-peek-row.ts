import { useCallback } from 'react';
import { useProjectSiteWorkspaceStore, type ProjectSiteWorkspaceRow } from '@/store/use-project-site-workspace-store';

/** Subscribes to the site workspace row for previews (project detail, etc.). Keep in this module so builds never drop the hook. */
export function useWorkspacePeekRow(projectId: string | undefined): ProjectSiteWorkspaceRow | undefined {
  return useProjectSiteWorkspaceStore(
    useCallback((s) => (projectId ? s.byProjectId[projectId] : undefined), [projectId]),
  );
}

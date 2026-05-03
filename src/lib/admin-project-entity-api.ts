import { adminFetchJson, type AdminJsonResult } from '@/lib/admin-api';
import { LIVE_DESTRUCT_CONFIRM, LIVE_DESTRUCT_CONFIRM_HEADER } from '@/lib/live-destructive-confirm';

/** DELETE /api/admin/entity/project/:id (matches `routes/admin.js`). */
export function deleteAdminProjectEntity(
  projectId: string,
  opts?: { confirmLiveDestructive?: boolean }
): Promise<AdminJsonResult<{ success?: boolean }>> {
  const headers = new Headers();
  if (opts?.confirmLiveDestructive) {
    headers.set(LIVE_DESTRUCT_CONFIRM_HEADER, LIVE_DESTRUCT_CONFIRM.DELETE_LIVE_PROJECT);
  }
  return adminFetchJson(`/api/admin/entity/project/${encodeURIComponent(projectId)}`, {
    method: 'DELETE',
    headers,
  });
}

/** First attempt; on live/published gate, `window.confirm` then retry with confirmation header. */
export async function deleteProjectWithLiveConfirm(projectId: string): Promise<
  AdminJsonResult<{ success?: boolean }>
> {
  let r = await deleteAdminProjectEntity(projectId);
  if (!r.ok && r.code === 'LIVE_PROJECT_DELETE_REQUIRES_CONFIRMATION') {
    const msg =
      'This project is live or has been published.\n\n' +
      'Deleting removes it from the database and cascades related site data.\n\n' +
      'Continue?';
    if (!window.confirm(msg)) {
      return { ok: false, status: 400, error: 'Delete cancelled.', code: r.code };
    }
    r = await deleteAdminProjectEntity(projectId, { confirmLiveDestructive: true });
  }
  return r;
}

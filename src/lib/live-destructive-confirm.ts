/** Must match `lib/destructiveOperationGuards.js` → CONFIRM_VALUE. */

export const LIVE_DESTRUCT_CONFIRM_HEADER = 'x-confirm-delete' as const;

export const LIVE_DESTRUCT_CONFIRM = {
  DELETE_LIVE_PROJECT: 'yes-delete-live-project',
  DELETE_LIVE_SITE_FILE: 'yes-delete-live-site-file',
  RESTORE_SNAPSHOT_OVERWRITES_LIVE_SITE: 'yes-restore-snapshot-overwrites-live-site',
  DELETE_LIVE_PROJECT_VIDEO: 'yes-delete-live-project-video',
} as const;

'use strict';

/**
 * Safety gate for operations that can harm live client sites.
 * See user rule: live / published projects require header x-confirm-delete with a matching value.
 */

const HEADER = 'x-confirm-delete';

const CONFIRM_VALUE = Object.freeze({
  DELETE_LIVE_PROJECT: 'yes-delete-live-project',
  DELETE_LIVE_SITE_FILE: 'yes-delete-live-site-file',
  RESTORE_SNAPSHOT_OVERWRITES_LIVE_SITE: 'yes-restore-snapshot-overwrites-live-site',
  DELETE_LIVE_PROJECT_VIDEO: 'yes-delete-live-project-video',
});

/** @param {import('express').Request} req */
function readConfirmHeader(req) {
  const v = req.headers[HEADER];
  if (Array.isArray(v)) return String(v[0] || '').trim();
  return v == null ? '' : String(v).trim();
}

function isProjectLiveOrPublished(projectRow) {
  if (!projectRow || typeof projectRow !== 'object') return false;
  const st = String(projectRow.status || '').toLowerCase();
  if (st === 'live') return true;
  if (projectRow.launched_at != null && String(projectRow.launched_at).trim()) return true;
  if (projectRow.published_at != null && String(projectRow.published_at).trim()) return true;
  return false;
}

function projectPayloadForError(projectRow, clientLabel) {
  return {
    id: projectRow.id,
    name: projectRow.name,
    status: projectRow.status ?? null,
    published_at: projectRow.published_at ?? null,
    launched_at: projectRow.launched_at ?? null,
    client: clientLabel || null,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function loadProjectWithClientLabel(supabase, projectId) {
  const { data: project, error } = await supabase.from('projects').select('*').eq('id', projectId).maybeSingle();
  if (error || !project) return { project: null, clientLabel: null, error };
  let clientLabel = null;
  if (project.client_id) {
    const c = await supabase
      .from('users')
      .select('full_name, company, email')
      .eq('id', project.client_id)
      .maybeSingle();
    if (!c.error && c.data) {
      const row = c.data;
      clientLabel =
        (row.company && String(row.company).trim()) ||
        (row.full_name && String(row.full_name).trim()) ||
        row.email ||
        null;
    }
  }
  return { project, clientLabel, error: null };
}

/**
 * @returns {boolean} true if caller may proceed
 */
function gateLiveDestructive(req, res, projectRow, clientLabel, cfg) {
  if (!isProjectLiveOrPublished(projectRow)) return true;
  if (readConfirmHeader(req) === cfg.requiredValue) return true;
  res.status(400).json({
    error: cfg.message,
    code: cfg.code,
    project: projectPayloadForError(projectRow, clientLabel),
    ...(cfg.extra && typeof cfg.extra === 'object' ? cfg.extra : {}),
    required_header: HEADER,
    required_value: cfg.requiredValue,
  });
  return false;
}

module.exports = {
  CONFIRM_DELETE_HEADER: HEADER,
  CONFIRM_VALUE,
  readConfirmHeader,
  isProjectLiveOrPublished,
  loadProjectWithClientLabel,
  gateLiveDestructive,
};

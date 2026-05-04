'use strict';

/**
 * Sync auto-detected checklist rows (does not unset human-completed-only items blindly).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} projectId
 * @param {Record<string, { completed: boolean, note?: string }>} hints check_id → desired state when auto true
 */
async function upsertAutoChecklistHints(supabase, projectId, hints) {
  const entries = Object.entries(hints).filter(([, v]) => v.completed);
  for (const [check_id, v] of entries) {
    const { data: existing } = await supabase
      .from('seo_checklist_progress')
      .select('id, completed, auto_detected')
      .eq('project_id', projectId)
      .eq('check_id', check_id)
      .maybeSingle();

    if (existing && existing.auto_detected === false) {
      continue;
    }

    const now = new Date().toISOString();
    const { error } = await supabase.from('seo_checklist_progress').upsert(
      {
        project_id: projectId,
        check_id,
        completed: true,
        completed_at: now,
        auto_detected: true,
        notes: v.note || null,
        updated_at: now,
      },
      { onConflict: 'project_id,check_id' }
    );
    if (error) console.warn('[seo auto-check]', projectId, check_id, error.message);
  }
}

/**
 * After review / rank / gbp snapshots + seo_projects row load.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} projectId
 * @param {Record<string, unknown>} [seoRow]
 */
async function applyAutoChecksFromLatestData(supabase, projectId, seoRow) {
  const hints = {};

  const { data: rev } = await supabase
    .from('seo_review_snapshots')
    .select('review_count')
    .eq('project_id', projectId)
    .eq('source', 'google')
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const rc = Number(rev?.review_count ?? 0);
  if (rc >= 10) {
    hints['10_reviews'] = { completed: true, note: `Auto: ${rc} Google reviews` };
  }

  if (seoRow && String(seoRow.review_link || '').trim().length > 8) {
    hints.website_linked = { completed: true, note: 'Auto: review_link set on SEO profile' };
  }

  const { count: rankCount, error: re } = await supabase
    .from('seo_rank_snapshots')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);
  if (!re && (rankCount || 0) > 0) {
    hints.rank_tracking_setup = { completed: true, note: 'Auto: rank snapshot exists' };
  }

  const { data: gbp } = await supabase
    .from('seo_gbp_snapshots')
    .select(
      'photo_count, has_description, has_hours, has_services, has_posts_recent, has_photos'
    )
    .eq('project_id', projectId)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (gbp) {
    const pc = Number(gbp.photo_count ?? 0);
    if (gbp.has_photos && pc > 10) {
      hints.gbp_photos = { completed: true, note: `Auto: ${pc} photos` };
    }
    if (gbp.has_description) {
      hints.gbp_description = { completed: true, note: 'Auto: description present' };
    }
    if (gbp.has_hours) {
      hints.gbp_hours = { completed: true, note: 'Auto: hours present' };
    }
    if (gbp.has_posts_recent) {
      hints.gbp_posts_recent = { completed: true, note: 'Auto: recent post' };
    }
    if (gbp.has_services) {
      hints.gbp_services = { completed: true, note: 'Auto: services/menu' };
    }
  }

  await upsertAutoChecklistHints(supabase, projectId, hints);
}

module.exports = { applyAutoChecksFromLatestData, upsertAutoChecklistHints };

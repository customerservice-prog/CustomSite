'use strict';

const { collectReviewsForProject } = require('./collectReviews');
const { collectRankingsForProject } = require('./collectRankings');
const { collectGbpSignalsForProject } = require('./collectGbpSignals');
const { applyAutoChecksFromLatestData } = require('./applyAutoChecks');

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ project_id: string } & Record<string, unknown>} seoRow row from seo_projects joined with ids
 */
async function collectSeoDataForProject(supabase, seoRow) {
  const projectId = seoRow.project_id;
  const out = { project_id: projectId, reviews: null, rankings: null, gbp: null, errors: [] };

  try {
    out.reviews = await collectReviewsForProject(supabase, seoRow);
  } catch (e) {
    out.errors.push({ step: 'reviews', message: e instanceof Error ? e.message : String(e) });
  }

  try {
    out.rankings = await collectRankingsForProject(supabase, seoRow);
  } catch (e) {
    out.errors.push({ step: 'rankings', message: e instanceof Error ? e.message : String(e) });
  }

  try {
    out.gbp = await collectGbpSignalsForProject(supabase, seoRow);
  } catch (e) {
    out.errors.push({ step: 'gbp', message: e instanceof Error ? e.message : String(e) });
  }

  try {
    await applyAutoChecksFromLatestData(supabase, projectId, seoRow);
  } catch (e) {
    out.errors.push({ step: 'auto_checks', message: e instanceof Error ? e.message : String(e) });
  }

  return out;
}

module.exports = { collectSeoDataForProject };

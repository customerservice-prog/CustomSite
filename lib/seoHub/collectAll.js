'use strict';

const { collectSeoDataForProject } = require('./collectProject');

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function collectAllSeoProjects(supabase) {
  const { data: rows, error } = await supabase.from('seo_projects').select('*').limit(500);
  if (error) throw new Error(error.message);

  /** @type {Record<string, unknown>[]} */
  const list = rows || [];
  const results = [];
  for (const row of list) {
    const r = await collectSeoDataForProject(supabase, row);
    results.push(r);
  }
  return { projects: list.length, results };
}

module.exports = { collectAllSeoProjects };

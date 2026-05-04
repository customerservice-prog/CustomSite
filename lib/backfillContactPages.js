'use strict';

const { buildStandardContactPageHtml } = require('./projectContactPageHtml');

/**
 * Projects that lack a routed contact surface get a standalone `contact.html`.
 * Skip when `contact.html` already exists OR `index.html` embeds `#cs-contact-form`.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase service client
 * @param {{ dryRun?: boolean }} opts
 */
async function runContactPageBackfill(supabase, opts) {
  const dryRun = Boolean(opts && opts.dryRun);
  const summary = {
    scanned: 0,
    skipped: 0,
    created: 0,
    touched: [],
    errors: [],
  };

  try {
    const r = await supabase.from('projects').select('id, name').order('created_at', { ascending: true });
    const projects = r.data || [];
    if (r.error) throw r.error;

    for (const p of projects) {
      summary.scanned += 1;
      const projectId = p.id;

      try {
        const q = await supabase
          .from('site_files')
          .select('path')
          .eq('project_id', projectId)
          .or('path.eq.contact.html,path.eq.index.html');
        if (q.error) throw q.error;
        const rows = q.data || [];
        const paths = rows.map((row) => String(row.path || ''));
        if (paths.includes('contact.html')) {
          summary.skipped += 1;
          continue;
        }
        if (paths.includes('index.html')) {
          const rowQ = await supabase
            .from('site_files')
            .select('content')
            .eq('project_id', projectId)
            .eq('path', 'index.html')
            .maybeSingle();
          if (rowQ.error) throw rowQ.error;
          const txt = rowQ.data && typeof rowQ.data.content === 'string' ? rowQ.data.content : '';
          if (/id\s*=\s*["']cs-contact-form["']/.test(txt) || /\/api\/forms\//i.test(txt) || /\/api\/contact/i.test(txt)) {
            summary.skipped += 1;
            continue;
          }
        }
      } catch (e) {
        summary.errors.push(`${projectId}: ${String(e.message || e)}`);
        continue;
      }

      if (dryRun) {
        summary.touched.push({ projectId, path: 'contact.html', dryRun: true });
        summary.created += 1;
        continue;
      }

      const { error } = await supabase.from('site_files').insert({
        project_id: projectId,
        path: 'contact.html',
        content: buildStandardContactPageHtml({ projectName: p.name, projectId }),
      });
      if (error) {
        summary.errors.push(`${projectId}/contact.html: ${error.message}`);
      } else {
        summary.created += 1;
        summary.touched.push({ projectId, path: 'contact.html' });
      }
    }

    return summary;
  } catch (e) {
    summary.errors.push(e && e.message ? e.message : String(e));
    return summary;
  }
}

module.exports = { runContactPageBackfill };

'use strict';

const express = require('express');
const { getService, isSupabaseConfigured } = require('../lib/supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireAdmin);

function mig(err) {
  return err && /site_pageviews|site_analytics_daily|does not exist/i.test(String(err.message || ''));
}

/** GET /projects/:projectId/analytics */
router.get('/projects/:projectId/analytics', async (req, res) => {
  try {
    if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Supabase not configured' });
    const { projectId } = req.params;
    const supabase = getService();

    const { data: proj, error: pe } = await supabase
      .from('projects')
      .select('id, launched_at, name')
      .eq('id', projectId)
      .maybeSingle();
    if (pe) return res.status(500).json({ error: pe.message });
    if (!proj) return res.status(404).json({ error: 'Not found' });

    const launch = proj.launched_at ? new Date(proj.launched_at) : null;
    const launchIso = launch ? launch.toISOString() : null;

    let totalQ = supabase.from('site_pageviews').select('*', { count: 'exact', head: true }).eq('project_id', projectId);
    if (launchIso) totalQ = totalQ.gte('viewed_at', launchIso);
    const { count: total_views, error: te } = await totalQ;
    if (te) {
      if (mig(te)) return res.status(503).json({ error: 'Run migration 008_site_analytics.sql' });
      return res.status(500).json({ error: te.message });
    }

    const now = new Date();
    const y = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const yesterdayStart = new Date(y);
    yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
    const yesterdayStr = yesterdayStart.toISOString().slice(0, 10);

    const { data: yRow } = await supabase
      .from('site_analytics_daily')
      .select('pageviews, unique_visitors')
      .eq('project_id', projectId)
      .eq('date', yesterdayStr)
      .maybeSingle();

    const todayStartUtc = y.toISOString();
    const todayCutoff =
      launchIso && new Date(launchIso) > new Date(todayStartUtc) ? launchIso : todayStartUtc;

    let yesterday_views = Number(yRow?.pageviews ?? 0) || 0;
    if (yRow == null) {
      let yestQ = supabase
        .from('site_pageviews')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .gte('viewed_at', yesterdayStart.toISOString())
        .lt('viewed_at', todayStartUtc);
      if (launchIso) yestQ = yestQ.gte('viewed_at', launchIso);
      const { count: yc, error: ye } = await yestQ;
      if (ye && !mig(ye)) return res.status(500).json({ error: ye.message });
      if (!ye) yesterday_views = yc || 0;
    }

    let todayQ = supabase
      .from('site_pageviews')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .gte('viewed_at', todayCutoff);
    const { count: today_views, error: tde } = await todayQ;
    if (tde && mig(tde)) return res.status(503).json({ error: 'Run migration 008_site_analytics.sql' });
    if (tde) return res.status(500).json({ error: tde.message });

    const thirtyAgo = new Date(y);
    thirtyAgo.setUTCDate(thirtyAgo.getUTCDate() - 29);
    const thirtyStr = thirtyAgo.toISOString().slice(0, 10);

    const { data: dailyRows, error: de } = await supabase
      .from('site_analytics_daily')
      .select('date, pageviews, unique_visitors')
      .eq('project_id', projectId)
      .gte('date', thirtyStr)
      .order('date', { ascending: true });
    if (de) {
      if (mig(de)) return res.status(503).json({ error: 'Run migration 008_site_analytics.sql' });
      return res.status(500).json({ error: de.message });
    }

    const { data: refSample, error: re } = await supabase
      .from('site_pageviews')
      .select('referrer')
      .eq('project_id', projectId)
      .not('referrer', 'is', null)
      .order('viewed_at', { ascending: false })
      .limit(2000);
    if (re && !mig(re)) return res.status(500).json({ error: re.message });

    const refCounts = {};
    for (const r of refSample || []) {
      const k = (r.referrer || '').slice(0, 500) || '(direct)';
      refCounts[k] = (refCounts[k] || 0) + 1;
    }
    const top_referrers = Object.entries(refCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([referrer, count]) => ({ referrer, count }));

    let peak_day = null;
    for (const row of dailyRows || []) {
      if (!peak_day || (row.pageviews || 0) > peak_day.pageviews) {
        peak_day = { date: row.date, pageviews: row.pageviews || 0 };
      }
    }

    return res.json({
      total_views: total_views || 0,
      yesterday_views,
      yesterday_unique_visitors: yRow?.unique_visitors ?? 0,
      today_views: today_views || 0,
      last_30_days: (dailyRows || []).map((r) => ({
        date: r.date,
        pageviews: r.pageviews ?? 0,
        unique_visitors: r.unique_visitors ?? 0,
      })),
      launched_at: proj.launched_at,
      peak_day,
      top_referrers,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

/** GET /analytics/live — all projects */
router.get('/analytics/live', async (_req, res) => {
  try {
    if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Supabase not configured' });
    const supabase = getService();
    const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: rows, error } = await supabase
      .from('site_pageviews')
      .select('project_id, visitor_id')
      .gte('viewed_at', since);
    if (error) {
      if (mig(error)) return res.status(503).json({ error: 'Run migration 008_site_analytics.sql', total_live: 0, by_project: [] });
      return res.status(500).json({ error: error.message });
    }

    const byProj = {};
    let totalVisitors = 0;
    for (const r of rows || []) {
      const pid = r.project_id;
      if (!pid) continue;
      if (!byProj[pid]) byProj[pid] = new Set();
      if (r.visitor_id) byProj[pid].add(r.visitor_id);
    }
    const ids = Object.keys(byProj);
    let names = {};
    if (ids.length) {
      const { data: projs } = await supabase.from('projects').select('id, name').in('id', ids);
      for (const p of projs || []) names[p.id] = p.name;
    }
    const by_project = ids.map((project_id) => {
      const live_visitors = byProj[project_id].size;
      totalVisitors += live_visitors;
      return { project_id, name: names[project_id] || project_id, live_visitors };
    });
    by_project.sort((a, b) => b.live_visitors - a.live_visitors);

    return res.json({ total_live: totalVisitors, by_project });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = { siteAnalyticsAdminRouter: router };

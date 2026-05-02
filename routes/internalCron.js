'use strict';

const express = require('express');
const { getService, isSupabaseConfigured } = require('../lib/supabase');

const router = express.Router();

function requireCronSecret(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret?.trim()) {
    res.status(503).json({ error: 'CRON_SECRET is not configured on server' });
    return false;
  }
  const sent = String(req.get('x-cron-secret') || '').trim();
  if (!sent || sent !== secret.trim()) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

/** Roll up yesterday (UTC) into site_analytics_daily */
router.post('/internal/cron/rollup-site-analytics', async (req, res) => {
  try {
    if (!requireCronSecret(req, res)) return;
    if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Supabase not configured' });
    const supabase = getService();

    const now = new Date();
    const y = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    y.setUTCDate(y.getUTCDate() - 1);
    const dateStr = y.toISOString().slice(0, 10);
    const start = `${dateStr}T00:00:00.000Z`;
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();

    const { data: rows, error } = await supabase
      .from('site_pageviews')
      .select('project_id, visitor_id')
      .gte('viewed_at', start)
      .lt('viewed_at', end);
    if (error) {
      if (/site_pageviews|does not exist/i.test(String(error.message))) {
        return res.status(503).json({ error: 'Run migration 008_site_analytics.sql' });
      }
      return res.status(500).json({ error: error.message });
    }

    const byProject = {};
    for (const row of rows || []) {
      const pid = row.project_id;
      if (!pid) continue;
      if (!byProject[pid]) byProject[pid] = { pageviews: 0, visitors: new Set() };
      byProject[pid].pageviews += 1;
      if (row.visitor_id) byProject[pid].visitors.add(row.visitor_id);
    }

    let upserted = 0;
    for (const [projectId, stats] of Object.entries(byProject)) {
      const { error: uerr } = await supabase.from('site_analytics_daily').upsert(
        {
          project_id: projectId,
          date: dateStr,
          pageviews: stats.pageviews,
          unique_visitors: stats.visitors.size,
        },
        { onConflict: 'project_id,date' }
      );
      if (!uerr) upserted += 1;
      else console.warn('[rollup analytics]', projectId, uerr.message);
    }

    return res.json({
      date: dateStr,
      projects_touched: upserted,
      raw_rows: (rows || []).length,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = { internalCronRouter: router };

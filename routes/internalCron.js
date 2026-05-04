'use strict';

/**
 * Scheduled jobs (protect client sites):
 * - Never DELETE or overwrite `site_files` from these routes.
 * - `rollup-site-analytics`: reads site_pageviews; writes only `site_analytics_daily` upserts.
 * - `check-video-health`: reads site HTML via sync helper; UPDATE/INSERT `project_videos` metadata only.
 * - `cron/seo-collect`: Local SEO Hub — Places reviews, DataForSEO ranks, GBP stub; needs `SEO_CRON_ENABLED=1`.
 * - Use `DRY_RUN=true` env in future batch tools; these endpoints log per-project failures and continue.
 */

const express = require('express');
const { getService, isSupabaseConfigured } = require('../lib/supabase');
const { probeYoutubeMqThumbnail } = require('../lib/youtubeMqThumbnailProbe');
const { upsertEmbeddedYoutubeFromProjectSiteFiles } = require('../lib/projectVideosHtmlSync');
const { collectAllSeoProjects } = require('../lib/seoHub/collectAll');

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

/**
 * Scheduled SEO collection (reviews via Places API, rankings via DataForSEO, GBP stub).
 * Headers: X-Cron-Secret matching CRON_SECRET. Env SEO_CRON_ENABLED=1 required.
 *
 * Railway: POST https://YOUR_HOST/api/cron/seo-collect with secret header daily/weekly as needed.
 */
router.post('/cron/seo-collect', async (req, res) => {
  try {
    if (!requireCronSecret(req, res)) return;
    if (!/^1|true|yes$/i.test(String(process.env.SEO_CRON_ENABLED || '').trim())) {
      return res.status(503).json({ error: 'SEO_CRON_ENABLED is not ON (set to 1 on Railway).' });
    }
    if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Supabase not configured' });
    const supabase = getService();
    let summary;
    try {
      summary = await collectAllSeoProjects(supabase);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/seo_projects|does not exist/i.test(msg)) {
        return res.status(503).json({ error: 'Run migration 022_seo_hub_tables.sql' });
      }
      console.error('[cron seo-collect]', e);
      return res.status(500).json({ error: msg });
    }
    console.log('[cron seo-collect]', summary.projects, 'seo profile(s)');
    return res.json({ ok: true, ...summary });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

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
      if (!uerr) {
        upserted += 1;
        console.log('[rollup analytics]', 'project', projectId, 'date', dateStr);
      } else console.warn('[rollup analytics]', projectId, uerr.message);
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

/**
 * Nightly: sync YouTube IDs from HTML into project_videos, then mqdefault thumbnail probe.
 * Flags dead ids (narrow ~120×90 “Video unavailable” thumb vs ~320×180 live).
 */
router.post('/internal/cron/check-video-health', async (_req, res) => {
  try {
    if (!requireCronSecret(_req, res)) return;
    if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Supabase not configured' });
    const supabase = getService();

    const { data: projectRows } = await supabase.from('projects').select('id').limit(500);
    const projectIds = (projectRows || []).map((r) => r.id).filter(Boolean);
    const embedded_upserts = { inserted: 0, skipped: 0, metadata_patched: 0, projects_scanned: 0 };

    for (const pid of projectIds) {
      try {
        console.log('[cron video-health]', 'project', pid);
        const r = await upsertEmbeddedYoutubeFromProjectSiteFiles(supabase, pid);
        embedded_upserts.inserted += r.inserted || 0;
        embedded_upserts.skipped += r.skipped || 0;
        embedded_upserts.metadata_patched += r.metadata_patched || 0;
        embedded_upserts.projects_scanned += 1;
      } catch (e) {
        console.warn('[cron video-health] embedded scan', pid, e.message || e);
      }
    }

    let checked = 0;
    let ok = 0;
    let unavailable = 0;
    /** Privacy-safe aggregate log only (no video titles / PII). */
    const unhealthyByProject = {};

    const pageSize = 80;
    for (let off = 0; ; off += pageSize) {
      const { data: batch, error: rngErr } = await supabase
        .from('project_videos')
        .select('id, project_id, youtube_id')
        .order('created_at', { ascending: true })
        .range(off, off + pageSize - 1);
      if (rngErr) {
        if (/health_status|health_checked|does not exist/i.test(String(rngErr.message))) {
          return res.status(503).json({ error: 'Run migration 009_project_video_health.sql' });
        }
        return res.status(500).json({ error: rngErr.message });
      }
      if (!batch || batch.length === 0) break;

      for (const row of batch) {
        checked += 1;
        await new Promise((r) => setTimeout(r, 40));
        const probe = await probeYoutubeMqThumbnail(row.youtube_id);
        const nowIso = new Date().toISOString();
        const healthOk = probe.ok;
        /** @type {Record<string, unknown>} */
        const patch = {
          health_status: healthOk ? 'ok' : 'unavailable',
          health_checked_at: nowIso,
          last_checked: nowIso,
        };
        if (!healthOk) {
          patch.status = 'unavailable';
          unavailable += 1;
          unhealthyByProject[row.project_id] = (unhealthyByProject[row.project_id] || 0) + 1;
        } else {
          patch.status = 'active';
          ok += 1;
        }

        let { error: uerr } = await supabase.from('project_videos').update(patch).eq('id', row.id).eq('project_id', row.project_id);
        if (
          uerr &&
          (/health_status|health_checked/i.test(String(uerr.message)) || /column/i.test(String(uerr.message)))
        ) {
          const { health_status: _hs, health_checked_at: _hca, ...rest } = patch;
          ({ error: uerr } = await supabase.from('project_videos').update(rest).eq('id', row.id).eq('project_id', row.project_id));
        }
        if (uerr) console.warn('[cron video-health] update', row.id, uerr.message);
      }
    }

    for (const [pid, count] of Object.entries(unhealthyByProject)) {
      console.warn('[video-health] project', pid, count, 'video(s) marked unavailable (thumbnail probe)');
    }

    return res.json({
      checked,
      ok,
      unavailable,
      embedded_upserts,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = { internalCronRouter: router };

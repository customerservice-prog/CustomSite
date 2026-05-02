'use strict';

const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { getService, isSupabaseConfigured } = require('../lib/supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { extractYoutubeId, fetchYoutubeOembed, probeYoutubeAvailability } = require('../lib/youtubeUtils');

const STORAGE_BUCKET = String(process.env.CUSTOMSITE_STORAGE_BUCKET || 'project-assets').trim() || 'project-assets';

const publicVideosLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Math.min(Number(process.env.CUSTOMSITE_PUBLIC_VIDEOS_RATELIMIT_MAX) || 90, 300),
  standardHeaders: true,
  legacyHeaders: false,
});

const publicRouter = express.Router();

publicRouter.get('/public/projects/:projectId/videos', publicVideosLimiter, async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.json({ videos: [] });
    }
    const { projectId } = req.params;
    const supabase = getService();
    const { data, error } = await supabase
      .from('project_videos')
      .select(
        'id, youtube_id, title, description, author_name, thumbnail_url, cached_thumbnail, status, sort_order, last_checked'
      )
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) {
      if (/project_videos|does not exist/i.test(error.message)) {
        return res.status(503).json({
          error: 'Run migration 007_project_videos.sql to enable project videos.',
        });
      }
      return res.status(500).json({ error: error.message });
    }
    const rows = Array.isArray(data) ? data : [];
    const videos = rows.map((row) => {
      const thumb = row.cached_thumbnail || row.thumbnail_url || '';
      return {
        id: row.id,
        youtube_id: row.youtube_id,
        title: row.title,
        description: row.description,
        author_name: row.author_name,
        thumbnail_url: row.thumbnail_url,
        cached_thumbnail: row.cached_thumbnail,
        /** Prefer CDN backup, then YouTube oEmbed thumbnail */
        thumbnail: thumb,
        status: row.status || 'active',
        sort_order: row.sort_order,
        last_checked: row.last_checked,
        watchUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(row.youtube_id)}`,
      };
    });
    return res.json({ videos });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

const adminRouter = express.Router();
adminRouter.use(requireAuth, requireAdmin);

function migrationHint(err) {
  return err && /project_videos|does not exist/i.test(String(err.message));
}

async function cacheOneThumbnail(supabase, row) {
  const thumbSrc = row.thumbnail_url || row.cached_thumbnail;
  if (!thumbSrc || !String(thumbSrc).startsWith('http')) return false;
  const path = `thumbnails/${String(row.project_id).trim()}/${String(row.youtube_id).trim()}.jpg`;
  const ctrl = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(45000) : undefined;
  const img = await fetch(thumbSrc, {
    redirect: 'follow',
    signal: ctrl,
    headers: { 'User-Agent': 'CustomSite-ThumbnailBackup/1.0' },
  });
  if (!img.ok) return false;
  const buf = Buffer.from(await img.arrayBuffer());
  if (buf.length < 128 || buf.length > 12 * 1024 * 1024) return false;
  const up = await supabase.storage.from(STORAGE_BUCKET).upload(path, buf, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (up.error) throw new Error(up.error.message);
  const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  const publicUrl = pub?.publicUrl;
  if (!publicUrl) throw new Error('No public URL for thumbnail upload');
  const { error } = await supabase
    .from('project_videos')
    .update({ cached_thumbnail: publicUrl, last_checked: new Date().toISOString() })
    .eq('id', row.id);
  if (error) throw error;
  return true;
}

/** GET → list videos for project */
adminRouter.get('/projects/:projectId/videos', async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({ error: 'Supabase not configured', videos: [] });
    }
    const { projectId } = req.params;
    const supabase = getService();
    const { data, error } = await supabase
      .from('project_videos')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) {
      if (migrationHint(error)) {
        return res.status(503).json({ error: 'Run migration 007_project_videos.sql', videos: [] });
      }
      return res.status(500).json({ error: error.message });
    }
    return res.json({ videos: data || [] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

/** POST → add by youtube URL or raw id (+ optional sort_order at end) */
adminRouter.post('/projects/:projectId/videos', express.json({ limit: '64kb' }), async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({ error: 'Supabase not configured' });
    }
    const { projectId } = req.params;
    const raw = req.body?.youtube_url || req.body?.youtube_id || req.body?.url;
    const youtube_id = extractYoutubeId(String(raw || ''));
    if (!youtube_id) {
      return res.status(400).json({ error: 'youtube_url or youtube_id required (paste a standard YouTube link)' });
    }
    let meta = await fetchYoutubeOembed(youtube_id);
    let title = meta?.title || `YouTube ${youtube_id}`;
    let description = req.body?.description != null ? String(req.body.description) : null;
    let author_name = meta?.author_name || null;
    let thumbnail_url = meta?.thumbnail_url || null;

    const supabase = getService();

    const { data: dup } = await supabase
      .from('project_videos')
      .select('id')
      .eq('project_id', projectId)
      .eq('youtube_id', youtube_id)
      .maybeSingle();
    if (dup?.id) {
      return res.status(409).json({ error: 'That video is already on this project', id: dup.id });
    }

    const { count: vidCount } = await supabase
      .from('project_videos')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);
    const sort_order =
      typeof req.body?.sort_order === 'number' ? req.body.sort_order : typeof vidCount === 'number' ? vidCount : 0;

    const insertRow = {
      project_id: projectId,
      youtube_id,
      title,
      description,
      author_name,
      thumbnail_url,
      status: 'active',
      sort_order,
      last_checked: new Date().toISOString(),
    };

    const { data: row, error } = await supabase.from('project_videos').insert(insertRow).select('*').maybeSingle();
    if (error) {
      if (migrationHint(error)) {
        return res.status(503).json({ error: 'Run migration 007_project_videos.sql' });
      }
      return res.status(500).json({ error: error.message });
    }

    /** Best-effort: warm backup thumbnail immediately when oEmbed provided one */
    if (row?.thumbnail_url) {
      try {
        await cacheOneThumbnail(supabase, row);
        const fresh = await supabase.from('project_videos').select('*').eq('id', row.id).maybeSingle();
        return res.status(201).json({ video: fresh.data || row });
      } catch (e) {
        console.warn('[videos] thumbnail cache deferred', e.message || e);
      }
    }

    return res.status(201).json({ video: row });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

/** PUT partial update metadata */
adminRouter.put('/projects/:projectId/videos/:videoId', express.json({ limit: '128kb' }), async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({ error: 'Supabase not configured' });
    }
    const { projectId, videoId } = req.params;
    const b = req.body || {};
    const patch = {};
    ['title', 'description', 'author_name', 'thumbnail_url', 'cached_thumbnail', 'duration', 'view_count', 'status', 'sort_order'].forEach(
      (k) => {
        if (b[k] !== undefined) patch[k] = b[k];
      }
    );
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'No updatable fields' });
    }
    const supabase = getService();
    const { data, error } = await supabase
      .from('project_videos')
      .update(patch)
      .eq('id', videoId)
      .eq('project_id', projectId)
      .select('*')
      .maybeSingle();
    if (error) {
      if (migrationHint(error)) return res.status(503).json({ error: 'Run migration 007_project_videos.sql' });
      return res.status(500).json({ error: error.message });
    }
    if (!data) return res.status(404).json({ error: 'Not found' });
    return res.json({ video: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

/** PUT reorder `{ ordered_ids: string[] }` */
adminRouter.put('/projects/:projectId/videos/reorder', express.json({ limit: '256kb' }), async (req, res) => {
  try {
    if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Supabase not configured' });
    const { projectId } = req.params;
    const ids = req.body?.ordered_ids;
    if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string')) {
      return res.status(400).json({ error: 'ordered_ids: string[] required' });
    }
    const supabase = getService();
    for (let i = 0; i < ids.length; i += 1) {
      const { error } = await supabase.from('project_videos').update({ sort_order: i }).eq('id', ids[i]).eq('project_id', projectId);
      if (error) {
        if (migrationHint(error)) return res.status(503).json({ error: 'Run migration 007_project_videos.sql' });
        return res.status(500).json({ error: error.message });
      }
    }
    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

adminRouter.delete('/projects/:projectId/videos/:videoId', async (req, res) => {
  try {
    if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Supabase not configured' });
    const { projectId, videoId } = req.params;
    const supabase = getService();
    const { error } = await supabase.from('project_videos').delete().eq('id', videoId).eq('project_id', projectId);
    if (error) {
      if (migrationHint(error)) return res.status(503).json({ error: 'Run migration 007_project_videos.sql' });
      return res.status(500).json({ error: error.message });
    }
    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

/** POST → oEmbed probe all videos */
adminRouter.post('/projects/:projectId/videos/check', async (req, res) => {
  try {
    if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Supabase not configured' });
    const { projectId } = req.params;
    const supabase = getService();
    const { data: rows, error } = await supabase.from('project_videos').select('*').eq('project_id', projectId).order('sort_order');
    if (error) {
      if (migrationHint(error)) return res.status(503).json({ error: 'Run migration 007_project_videos.sql' });
      return res.status(500).json({ error: error.message });
    }
    const list = rows || [];
    let active = 0;
    let unavailable = 0;
    const checked = list.length;

    const nowIso = new Date().toISOString();
    for (const row of list) {
      const probe = await probeYoutubeAvailability(row.youtube_id);
      if (probe.ok) {
        active += 1;
        const m = probe.meta || {};
        const patch = {
          status: 'active',
          last_checked: nowIso,
          title:
            typeof m.title === 'string' && String(m.title).trim()
              ? String(m.title).trim()
              : row.title || `YouTube ${row.youtube_id}`,
          author_name:
            typeof m.author_name === 'string' ? m.author_name : row.author_name,
          thumbnail_url:
            typeof m.thumbnail_url === 'string' ? m.thumbnail_url : row.thumbnail_url,
        };
        await supabase.from('project_videos').update(patch).eq('id', row.id).eq('project_id', projectId);
      } else {
        unavailable += 1;
        await supabase
          .from('project_videos')
          .update({ status: 'unavailable', last_checked: nowIso })
          .eq('id', row.id)
          .eq('project_id', projectId);
      }
    }

    return res.json({
      checked,
      active,
      unavailable,
      summary: `${checked} checked — ${active} active, ${unavailable} unavailable`,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

/** POST → download YouTube thumbnails into Storage for rows missing backup */
adminRouter.post('/projects/:projectId/videos/cache-thumbnails', async (req, res) => {
  try {
    if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Supabase not configured' });
    const { projectId } = req.params;
    const supabase = getService();
    const { data: rows, error } = await supabase
      .from('project_videos')
      .select('*')
      .eq('project_id', projectId)
      .is('cached_thumbnail', null)
      .not('thumbnail_url', 'is', null);
    if (error) {
      if (migrationHint(error)) return res.status(503).json({ error: 'Run migration 007_project_videos.sql' });
      return res.status(500).json({ error: error.message });
    }
    let cached = 0;
    let failed = 0;
    for (const row of rows || []) {
      try {
        if (await cacheOneThumbnail(supabase, row)) cached += 1;
        else failed += 1;
      } catch (e) {
        console.warn('[videos] cache fail', row.youtube_id, e.message || e);
        failed += 1;
      }
    }
    return res.json({
      queued: (rows || []).length,
      cached,
      failed,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

/** Mounted at `/api` — no JWT; validate `CRON_SECRET` (Railway/cron HTTP trigger). */
const projectVideosCronRouter = express.Router();

projectVideosCronRouter.post('/internal/cron/cache-video-thumbnails', async (_req, res) => {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret?.trim()) {
      return res.status(503).json({ error: 'CRON_SECRET is not configured on server' });
    }
    const sent = String(_req.get('x-cron-secret') || '').trim();
    if (!sent || sent !== secret.trim()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Supabase not configured' });
    const supabase = getService();
    const { data: rows, error } = await supabase
      .from('project_videos')
      .select('*')
      .is('cached_thumbnail', null)
      .not('thumbnail_url', 'is', null)
      .limit(250);
    if (error) {
      if (migrationHint(error)) return res.status(503).json({ error: 'Run migration 007_project_videos.sql' });
      return res.status(500).json({ error: error.message });
    }
    let cached = 0;
    let failed = 0;
    for (const row of rows || []) {
      try {
        if (await cacheOneThumbnail(supabase, row)) cached += 1;
        else failed += 1;
      } catch (e) {
        console.warn('[cron] thumbnail', row.youtube_id, e.message || e);
        failed += 1;
      }
    }
    return res.json({ processed: (rows || []).length, cached, failed });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = {
  projectVideosPublicRouter: publicRouter,
  projectVideosAdminRouter: adminRouter,
  projectVideosCronRouter,
};

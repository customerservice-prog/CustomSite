'use strict';

const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { getService, isSupabaseConfigured } = require('../lib/supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  runArchiveCycle,
  updateOembedStatus,
  assertYoutubeId,
} = require('../lib/videoArchive/runArchiveCycle');

const listLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Math.min(Number(process.env.VIDEO_ARCHIVE_LIST_RATELIMIT_MAX) || 120, 300),
});

const router = express.Router();

/** Sync can be cron secret, VIDEO_ARCHIVE_SYNC_SECRET, or Bearer admin JWT. */
function archiveSyncGate(req, res, next) {
  const cron = process.env.CRON_SECRET?.trim();
  if (cron && String(req.get('x-cron-secret') || '').trim() === cron) return next();

  const sec = process.env.VIDEO_ARCHIVE_SYNC_SECRET?.trim();
  if (sec && String(req.get('x-video-archive-sync-secret') || '').trim() === sec) return next();

  return requireAuth(req, res, () => requireAdmin(req, res, next));
}

router.get('/videos', listLimiter, async (_req, res) => {
  try {
    if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Supabase not configured', videos: [] });
    const supabase = getService();
    let { data, error } = await supabase
      .from('videos')
      .select('*')
      .order('category', { ascending: true })
      .order('title', { ascending: true });
    if (error) {
      if (/does not exist|could not find|schema cache/i.test(String(error.message || ''))) {
        return res.status(503).json({ error: 'Run migration 017_global_video_archive.sql', videos: [] });
      }
      return res.status(500).json({ error: error.message });
    }
    return res.json({ videos: data || [] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/videos/:youtube_id/check', async (req, res) => {
  try {
    if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Supabase not configured' });
    const yt = assertYoutubeId(req.params.youtube_id);
    if (!yt) return res.status(400).json({ error: 'Invalid youtube_id' });

    const supabase = getService();

    let { data: row, error } = await supabase.from('videos').select('*').eq('youtube_id', yt).maybeSingle();

    /** Auto-create sparse row when missing — supports check before seed */
    if (!error && !row) {
      const iso = new Date().toISOString();
      ({ data: row, error } = await supabase
        .from('videos')
        .insert({
          youtube_id: yt,
          title: null,
          channel: null,
          category: 'general',
          youtube_status: 'unknown',
          last_checked: null,
          created_at: iso,
        })
        .select()
        .maybeSingle());
    }

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    await updateOembedStatus(supabase, row);

    const { data: fresh } = await supabase.from('videos').select('*').eq('youtube_id', yt).maybeSingle();

    return res.json({
      youtube_id: yt,
      status: fresh?.youtube_status ?? 'unknown',
      video_url: fresh?.video_url ?? null,
      thumbnail_url: fresh?.thumbnail_url ?? null,
      last_checked: fresh?.last_checked ?? null,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/videos/sync', express.json({ limit: '64kb' }), archiveSyncGate, async (req, res) => {
  try {
    if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Supabase not configured' });
    const body = req.body || {};
    const summary = await runArchiveCycle(getService(), {
      checkOnly: /^1|true$/i.test(String(body.checkOnly ?? '')),
      rowLimit: body.rowLimit,
      downloadLimit: body.downloadLimit,
    });

    if (summary.error) {
      const code = /missing|videos/i.test(String(summary.error || '')) ? 503 : 500;
      return res.status(code).json({ error: summary.error });
    }

    console.log('[video-archive/sync]', summary);

    /** Optional lightweight email ping — Resend stub */
    if (/^1|true$/i.test(String(process.env.VIDEO_ARCHIVE_EMAIL_ALERT ?? ''))) {
      console.log('[video-archive/sync] EMAIL_ALERT suppressed — configure RESEND_FROM + ADMIN_EMAIL wiring if needed.');
    }

    return res.json({ ok: true, summary });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Server error' });
  }
});

module.exports = { videoArchiveRouter: router };

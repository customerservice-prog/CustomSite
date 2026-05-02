'use strict';

const express = require('express');
const { getService, isSupabaseConfigured } = require('../lib/supabase');
const { thumbnailBufferLooksUnavailable, FALLBACK_SVG } = require('../lib/youtubeThumbnailLogic');
const { fetchYoutubeThumbnailBuffer } = require('../lib/fetchYoutubeThumbnail');

const router = express.Router();

const THUMB_BUCKET = String(process.env.CUSTOMSITE_VIDEO_THUMB_BUCKET || 'video-thumbs').trim() || 'video-thumbs';

/** Dedupe concurrent fetches per id */
const inflight = new Map();

function validateVideoId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

async function uploadThumbToBucket(supabase, id, buf) {
  const path = `${id}.jpg`;
  const up = await supabase.storage.from(THUMB_BUCKET).upload(path, buf, {
    contentType: 'image/jpeg',
    upsert: true,
    cacheControl: '86400',
  });
  if (up.error) throw new Error(up.error.message || 'storage upload failed');
}

async function tryDownloadStored(supabase, id) {
  const path = `${id}.jpg`;
  const { data, error } = await supabase.storage.from(THUMB_BUCKET).download(path);
  if (error || !data) return null;
  const ab = await data.arrayBuffer();
  return Buffer.from(ab);
}

/**
 * GET /yt-thumb?videoId=xxxxxxxxxxx
 */
router.get('/yt-thumb', async (req, res) => {
  try {
    const id = validateVideoId(String(req.query.videoId || '').trim());
    if (!id) return res.status(400).type('text/plain').send('Invalid videoId');

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=86400');

    /** Pass-through cache only (skip Supabase) — CUSTOMSITE_VIDEO_THUMB_BUCKET names the bucket. */
    const skipStorage = String(process.env.CUSTOMSITE_YT_THUMB_STORAGE || '').trim() === '0';

    /** 1 — YouTube/CDN fetch first so missing `video-thumbs` bucket cannot block thumbnails. */
    let ytPromise = inflight.get(id);
    if (!ytPromise) {
      ytPromise = fetchYoutubeThumbnailBuffer(id).finally(() => inflight.delete(id));
      inflight.set(id, ytPromise);
    }
    try {
      const bufYt = await ytPromise;
      if (bufYt && !thumbnailBufferLooksUnavailable(bufYt)) {
        if (!skipStorage && isSupabaseConfigured()) {
          uploadThumbToBucket(getService(), id, bufYt).catch((e) =>
            console.warn('[yt-thumb] cache upload skipped', id, e.message || e)
          );
        }
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('X-Thumbnail-Source', 'youtube-first');
        return res.send(bufYt);
      }
    } catch {
      /* continue to Storage + final fallback */
    }

    /** 2 — Supabase bucket cache hit */
    if (!skipStorage && isSupabaseConfigured()) {
      const supabase = getService();
      let stored;
      try {
        stored = await tryDownloadStored(supabase, id);
      } catch {
        stored = null;
      }
      if (stored && !thumbnailBufferLooksUnavailable(stored)) {
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('X-Thumbnail-Source', 'storage');
        return res.send(stored);
      }
    }

    /** 3 — retry fetch outside inflight singleton (prior attempt may race) */
    const bufRaw = await fetchYoutubeThumbnailBuffer(id);
    if (!bufRaw || thumbnailBufferLooksUnavailable(bufRaw)) {
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.setHeader('X-Thumbnail-Source', 'fallback');
      return res.status(200).send(FALLBACK_SVG);
    }
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('X-Thumbnail-Source', 'youtube-proxy-retry');
    return res.send(bufRaw);
  } catch (e) {
    console.error(e);
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    return res.status(200).send(FALLBACK_SVG);
  }
});

module.exports = router;

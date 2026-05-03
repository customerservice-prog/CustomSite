'use strict';

const fs = require('fs/promises');
const path = require('path');
const os = require('os');

const youtubedlCreate = require('youtube-dl-exec').create;
const youtubedlDefault = require('youtube-dl-exec');

const { checkYoutubeOembed } = require('../youtubeOembedCheck');
const { VIDEO_ARCHIVE_BUCKET } = require('./constants');

const YOUTUBE_WATCH = 'https://www.youtube.com/watch?v=';

/** Prefer system yt-dlp when YT_DLP_PATH is set (Railway Dockerfile). */
function downloader() {
  const bin = String(process.env.YT_DLP_PATH || '').trim();
  return bin ? youtubedlCreate(bin) : youtubedlDefault;
}

function ffmpegPath() {
  return String(process.env.FFMPEG_PATH || '').trim() || '/usr/bin/ffmpeg';
}

function assertYoutubeId(id) {
  return typeof id === 'string' && /^[-_\w]{11}$/.test(id.trim()) ? id.trim() : null;
}

async function updateOembedStatus(supabase, row) {
  const id = assertYoutubeId(row.youtube_id);
  if (!id) return 'unknown';
  const oe = await checkYoutubeOembed(id);
  const youtube_status = oe.ok ? 'available' : 'unavailable';
  const iso = new Date().toISOString();
  await supabase
    .from('videos')
    .update({
      youtube_status,
      last_checked: iso,
    })
    .eq('id', row.id);
  return youtube_status;
}

async function uploadFile(supabase, storagePath, filePath, contentType) {
  const buf = await fs.readFile(filePath);
  const { error } = await supabase.storage.from(VIDEO_ARCHIVE_BUCKET).upload(storagePath, buf, {
    contentType: contentType || 'application/octet-stream',
    upsert: true,
  });
  if (error) throw new Error(error.message || String(error));
  const { data: pub } = supabase.storage.from(VIDEO_ARCHIVE_BUCKET).getPublicUrl(storagePath);
  return pub?.publicUrl || null;
}

async function pickVideoFile(workDir, youtubeId) {
  const files = await fs.readdir(workDir);
  const media = files.filter((f) => /\.(mp4|webm|mkv)$/i.test(f));
  if (!media.length) return null;
  const hit = media.find((f) => f.includes(youtubeId)) || media.sort((a, b) => a.localeCompare(b))[media.length - 1];
  return path.join(workDir, hit);
}

async function pickThumbFile(workDir) {
  const files = await fs.readdir(workDir);
  const th = files.find((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
  return th ? path.join(workDir, th) : null;
}

async function archiveYoutubeRow(supabase, row) {
  const youtubeId = assertYoutubeId(row.youtube_id);
  if (!youtubeId) {
    console.warn('[video-archive] Invalid youtube id on row', row.id);
    return { ok: false, reason: 'invalid_id' };
  }

  if (row.youtube_status === 'unavailable') {
    return { ok: false, reason: 'unavailable_skip_download' };
  }

  if (row.archived_at && row.video_url && row.thumbnail_url) {
    return { ok: true, skipped: true };
  }

  const tmpRoot = path.join(process.env.VIDEO_ARCHIVE_TMP || os.tmpdir(), 'video-archive');
  await fs.mkdir(tmpRoot, { recursive: true });
  const workDir = path.join(tmpRoot, youtubeId);
  await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  await fs.mkdir(workDir, { recursive: true });

  const url = `${YOUTUBE_WATCH}${youtubeId}`;
  const dl = downloader();

  const format =
    process.env.VIDEO_ARCHIVE_YT_FORMAT ||
    'bestvideo[height<=720]+bestaudio/bestvideo[height<=720]/best[height<=720]/best';

  const flags = {
    format,
    mergeOutputFormat: 'mp4',
    output: path.join(workDir, `${youtubeId}.%(ext)s`),
    writeThumbnail: true,
    noPlaylist: true,
    ffmpegLocation: ffmpegPath(),
    retries: 2,
    newline: false,
    noWarnings: true,
    noCheckCertificates: true,
  };

  const spawnOpts = {
    cwd: workDir,
    timeout: Number(process.env.VIDEO_ARCHIVE_DOWNLOAD_TIMEOUT_MS) || 20 * 60 * 1000,
    killSignal: 'SIGKILL',
  };

  try {
    await dl(url, flags, spawnOpts);
  } catch (e) {
    const msg = (e && (e.stderr || e.message || e.stdout)) || String(e);
    console.warn('[video-archive] yt-dlp failed', youtubeId, String(msg).slice(0, 500));
    await supabase.from('videos').update({ youtube_status: 'unavailable', last_checked: new Date().toISOString() }).eq('id', row.id);
    return { ok: false, reason: 'ytdlp_error', detail: String(msg).slice(0, 400) };
  }

  const videoFs = await pickVideoFile(workDir, youtubeId);
  const thumbFs = await pickThumbFile(workDir);

  if (!videoFs) {
    console.warn('[video-archive] No video file for', youtubeId);
    await supabase.from('videos').update({ youtube_status: 'unknown', last_checked: new Date().toISOString() }).eq('id', row.id);
    return { ok: false, reason: 'no_media_file' };
  }

  const ext = path.extname(videoFs).toLowerCase() || '.mp4';
  const safeExt = ext === '.jpeg' ? '.jpg' : ext;
  const videoStoragePath = `videos/${youtubeId}/video${safeExt.startsWith('.') ? safeExt : '.mp4'}`;
  const thumbStoragePath = `videos/${youtubeId}/thumb.jpg`;

  let videoMime = 'video/mp4';
  if (safeExt === '.webm') videoMime = 'video/webm';
  else if (safeExt === '.mkv') videoMime = 'video/x-matroska';

  let video_public_url = null;
  let thumb_public_url = null;

  try {
    video_public_url = await uploadFile(supabase, videoStoragePath, videoFs, videoMime);
    if (thumbFs) thumb_public_url = await uploadFile(supabase, thumbStoragePath, thumbFs, 'image/jpeg');
  } catch (err) {
    console.warn('[video-archive] upload failed', youtubeId, err.message || err);
    return { ok: false, reason: 'upload_error', detail: String(err.message || err) };
  }

  const nowIso = new Date().toISOString();
  const { error: uerr } = await supabase
    .from('videos')
    .update({
      video_url: video_public_url,
      thumbnail_url: thumb_public_url,
      archived_at: nowIso,
      last_checked: nowIso,
    })
    .eq('id', row.id);

  if (uerr) {
    console.warn('[video-archive] db update urls failed', uerr.message);
    return { ok: false, reason: 'db_update', detail: uerr.message };
  }

  return { ok: true, video_url: video_public_url, thumbnail_url: thumb_public_url };
}

async function runArchiveCycle(supabase, options = {}) {
  const skipDownload = /^1|true$/i.test(String(process.env.VIDEO_ARCHIVE_CHECK_ONLY || options.checkOnly));

  let { data: rows, error } = await supabase
    .from('videos')
    .select(
      'id, youtube_id, title, channel, category, category_label, thumbnail_url, video_url, youtube_status, archived_at, last_checked'
    )
    .order('category')
    .order('title');

  if (error) {
    if (/does not exist|could not find|schema cache/i.test(String(error.message || ''))) {
      console.error('[video-archive] Table `videos` missing — run migration 017_global_video_archive.sql');
    }
    return { error: error.message };
  }

  const list = rows || [];

  const rowLimitRaw = Number(process.env.VIDEO_ARCHIVE_ROW_LIMIT || options.rowLimit || '');
  const todo =
    Number.isFinite(rowLimitRaw) && rowLimitRaw > 0 ? list.slice(0, rowLimitRaw) : list;

  const downloadLimitRaw = Number(process.env.VIDEO_ARCHIVE_DOWNLOAD_LIMIT || options.downloadLimit || '');
  const downloadLimit =
    skipDownload ? 0 : Number.isFinite(downloadLimitRaw) && downloadLimitRaw > 0 ? downloadLimitRaw : todo.length;

  const summary = { checked: 0, archived: 0, skipped_archive: 0, errors: [], download_attempts: 0 };

  for (let i = 0; i < todo.length; i += 1) {
    const row = todo[i];
    try {
      const st = await updateOembedStatus(supabase, row);
      row.youtube_status = st;
    } catch (e) {
      console.warn('[video-archive] oembed update failed', row.youtube_id, e.message || e);
      summary.errors.push(`${row.youtube_id}:oembed:${e.message || e}`);
      continue;
    }
    summary.checked += 1;

    if (skipDownload) continue;
    if (summary.download_attempts >= downloadLimit) continue;
    if (row.youtube_status === 'unavailable') continue;

    if (row.archived_at && row.video_url && row.thumbnail_url) {
      summary.skipped_archive += 1;
      continue;
    }

    summary.download_attempts += 1;
    const ar = await archiveYoutubeRow(supabase, row);

    if (ar.skipped) summary.skipped_archive += 1;
    else if (ar.ok && !ar.skipped) summary.archived += 1;
    else if (!ar.ok && ar.reason && ar.reason !== 'unavailable_skip_download') {
      summary.errors.push(`${row.youtube_id}:${ar.reason}:${ar.detail || ''}`);
    }
  }

  return summary;
}

module.exports = {
  runArchiveCycle,
  updateOembedStatus,
  archiveYoutubeRow,
  assertYoutubeId,
  VIDEO_ARCHIVE_BUCKET,
};

'use strict';

const { probeYoutubeAvailability } = require('./youtubeUtils');

/** @param {Buffer} buf */
function jpegDimensions(buf) {
  let i = 0;
  if (!buf || buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  i = 2;
  while (i < buf.length - 10) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1];
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2 || marker === 0xc3) {
      const h = buf.readUInt16BE(i + 5);
      const w = buf.readUInt16BE(i + 7);
      if (w > 0 && h > 0 && w < 20000 && h < 20000) return { width: w, height: h };
      return null;
    }
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    if (marker === 0xda || marker === 0xff) break;
    if (i + 3 >= buf.length) break;
    const segLen = buf.readUInt16BE(i + 2);
    if (segLen < 2) break;
    i += 2 + segLen;
  }
  return null;
}

/**
 * Live YouTube mqdefault.jpg is typically 320×180; removed/private often ~120×90.
 * @param {string} youtubeId
 * @returns {Promise<{ ok: boolean, width?: number, height?: number, source: string }>}
 */
async function probeYoutubeMqThumbnail(youtubeId) {
  const id = String(youtubeId || '').trim();
  if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return { ok: false, source: 'bad_id' };
  const url = `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
  const ctrl = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(12000) : undefined;
  try {
    const r = await fetch(url, {
      redirect: 'follow',
      signal: ctrl,
      headers: { 'User-Agent': 'CustomSite-VideoHealth/1.0' },
    });
    if (!r.ok) {
      const o = await probeYoutubeAvailability(id);
      return { ok: o.ok, source: o.ok ? 'oembed_fallback' : 'http_fail' };
    }
    const buf = Buffer.from(await r.arrayBuffer());
    const ct = (r.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('jpeg') || ct.includes('jpg') || (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8)) {
      const d = jpegDimensions(buf);
      if (d) {
        const small = d.width <= 160 && d.height <= 120;
        return { ok: !small, width: d.width, height: d.height, source: 'jpeg' };
      }
    }
    const o = await probeYoutubeAvailability(id);
    return { ok: o.ok, source: o.ok ? 'oembed_fallback' : 'parse_fail' };
  } catch {
    try {
      const o = await probeYoutubeAvailability(id);
      return { ok: o.ok, source: o.ok ? 'oembed_fallback' : 'network' };
    } catch {
      return { ok: false, source: 'network' };
    }
  }
}

module.exports = { probeYoutubeMqThumbnail, jpegDimensions };

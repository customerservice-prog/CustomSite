/**
 * Local dev: caches YouTube thumbnails and updates videos-data.json archived flags.
 * Usage: node cache-thumbs.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const root = __dirname;
const dataPath = path.join(root, 'videos-data.json');
const thumbsDir = path.join(root, 'thumbs');

function fetchHead(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        method: 'GET',
        headers: { 'User-Agent': 'SoulVault-thumb-cache/1.0' },
      },
      (res) => {
        res.resume();
        resolve(res.statusCode || 0);
      },
    );
    req.on('error', reject);
    req.setTimeout(25000, () => {
      req.destroy(new Error('timeout'));
    });
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const req = https.get(
      url,
      {
        headers: { 'User-Agent': 'SoulVault-thumb-cache/1.0' },
      },
      (res) => {
        if ((res.statusCode || 0) >= 400) {
          file.close(() => fs.unlink(dest, () => resolve(false)));
          return;
        }
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve(true)));
      },
    );
    req.on('error', (err) => {
      file.close(() => fs.unlink(dest, () => reject(err)));
    });
    req.setTimeout(60000, () => {
      req.destroy(new Error('timeout'));
    });
  });
}

(async function main() {
  if (!fs.existsSync(thumbsDir)) fs.mkdirSync(thumbsDir, { recursive: true });

  const raw = fs.readFileSync(dataPath, 'utf8');
  /** @type {{ videos: Array<{ id: string }> }} */
  const data = JSON.parse(raw);
  let changed = false;

  for (const v of data.videos || []) {
    const id = v.id;
    if (!id) continue;

    const out = path.join(thumbsDir, `${id}.jpg`);
    const maxUrl = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
    const hqUrl = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

    const maxCode = await fetchHead(maxUrl).catch(() => 0);
    const okMax = maxCode === 200;
    let saved = false;
    if (okMax) {
      saved = await downloadFile(maxUrl, out).catch(() => false);
    }
    if (!saved) {
      const hqCode = await fetchHead(hqUrl).catch(() => 0);
      if (hqCode === 200) {
        saved = await downloadFile(hqUrl, out).catch(() => false);
      }
    }

    const archived = !saved;
    v.fallback_thumb = `/thumbs/${id}.jpg`;
    if (v.archived !== archived) {
      v.archived = archived;
      changed = true;
    }
    console.log(saved ? `[ok] ${id}` : `[archived] ${id}`);
  }

  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  if (changed) console.log('\nUpdated videos-data.json archived flags.');
})();

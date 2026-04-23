'use strict';

const archiver = require('archiver');

/**
 * @param {Array<{ path: string, content: string, encoding?: 'utf8' | 'base64' }>} files
 * @param {object} [extra] - { dockerfile, packageJson, railwayJson, startSh }
 * @returns {Promise<Buffer>}
 */
function addServeBundle(files, extra) {
  const e = extra || {};
  const withMeta = [
    ...files,
    e.packageJson
      ? { path: 'package.json', content: e.packageJson, encoding: 'utf8' }
      : {
          path: 'package.json',
          encoding: 'utf8',
          content: JSON.stringify(
            {
              name: 'customsite-static',
              private: true,
              scripts: {
                start: 'npx --yes serve@14 . -l tcp://0.0.0.0:$PORT',
              },
            },
            null,
            2
          ),
        },
    e.railwayJson
      ? { path: 'railway.json', content: e.railwayJson, encoding: 'utf8' }
      : {
          path: 'railway.json',
          encoding: 'utf8',
          content: JSON.stringify(
            {
              $schema: 'https://railway.com/railway.schema.json',
              build: { builder: 'NIXPACKS' },
              deploy: { startCommand: 'npm start', restartPolicyType: 'ON_FAILURE' },
            },
            null,
            2
          ),
        },
    e.dockerfile ? { path: 'Dockerfile', content: e.dockerfile, encoding: 'utf8' } : null,
  ].filter(Boolean);
  return withMeta;
}

function appendFileToArchive(archive, f) {
  const enc = f.encoding || 'utf8';
  if (enc === 'base64') {
    const buf = Buffer.from(f.content, 'base64');
    archive.append(buf, { name: f.path });
  } else {
    archive.append(f.content, { name: f.path });
  }
}

/**
 * @param {Array<{ path: string, content: string, encoding?: string }>} files
 * @param {object} [opts]
 * @returns {Promise<Buffer>}
 */
function createZipBuffer(files, opts) {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks = [];
    archive.on('error', reject);
    archive.on('data', (c) => chunks.push(c));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    for (const f of files) {
      appendFileToArchive(archive, f);
    }
    if (opts && opts.nixpacksToml) {
      archive.append(opts.nixpacksToml, { name: 'nixpacks.toml' });
    }
    archive.finalize();
  });
}

/**
 * @param {Array<{ path: string, content: string, encoding?: string }>} files
 */
function createZipStream(files) {
  const archive = archiver('zip', { zlib: { level: 9 } });
  for (const f of files) {
    appendFileToArchive(archive, f);
  }
  archive.finalize();
  return archive;
}

module.exports = {
  addServeBundle,
  createZipBuffer,
  createZipStream,
};

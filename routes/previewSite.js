'use strict';

const { getService, isSupabaseConfigured } = require('../lib/supabase');
const devStore = require('../lib/devSiteFileStore');
const { injectSiteSettingsIntoHtml } = require('../lib/siteHeadInjector');
const { applyClientHtmlVideoModalGuard } = require('../lib/clientSiteVideoModalGuard');

function mimeForPath(p) {
  const lower = p.toLowerCase();
  if (lower.endsWith('.html')) return 'text/html; charset=utf-8';
  if (lower.endsWith('.css')) return 'text/css; charset=utf-8';
  if (lower.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (lower.endsWith('.svg')) return 'image/svg+xml; charset=utf-8';
  if (lower.endsWith('.json')) return 'application/json; charset=utf-8';
  if (lower.endsWith('.txt')) return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Public origin for <base> — trust proxy in server.js + optional PUBLIC_SITE_URL */
function originFromRequest(req) {
  const env = process.env.PUBLIC_SITE_URL;
  if (env) {
    try {
      return new URL(env).origin;
    } catch {
      /* */
    }
  }
  const rawProto = req.get('x-forwarded-proto') || req.protocol || 'https';
  const proto = String(rawProto).split(',')[0].trim();
  const rawHost = req.get('x-forwarded-host') || req.get('host') || '';
  const host = String(rawHost).split(',')[0].trim();
  if (!host) return null;
  return `${proto}://${host}`;
}

/**
 * Trailing slash required: relative `href="css/x.css"` resolves under /preview/{id}/.
 * Nested `src/pages/foo.html` uses base /preview/{id}/src/pages/
 */
function previewBaseForFilePath(origin, projectId, filePath) {
  if (!origin) return null;
  const p = filePath.replace(/^\//, '');
  const i = p.lastIndexOf('/');
  const rel = i < 0 ? '' : `${p.slice(0, i)}/`;
  return `${origin}/preview/${projectId}/${rel}`;
}

function injectHtmlBaseIfNeeded(html, baseHref) {
  if (!baseHref) return html;
  const str = String(html);
  const safe = String(baseHref).replace(/"/g, '&quot;');
  const tag = `<base href="${safe}" data-cs-preview-base="1">`;
  if (/<base\s[^>]*\/?>/i.test(str)) {
    return str.replace(/<base\s[^>]*\/?>/i, tag);
  }
  if (/<head[^>]*>/i.test(str)) {
    return str.replace(/<head([^>]*)>/i, (m, attrs) => `<head${attrs}>\n${tag}\n`);
  }
  if (/<html[^>]*>/i.test(str)) {
    return str.replace(
      /<html[^>]*>/i,
      (m) => `${m}\n<head><meta charset="utf-8" />${tag}</head>`
    );
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8" />${tag}</head><body>\n${str}\n</body></html>`;
}

/**
 * @param {object} data - { content, content_encoding? }
 * @param {import('http').IncomingMessage} req
 * @param {unknown} siteSettings
 */
function buildPreviewResponseBody(data, filePath, projectId, req, siteSettings) {
  const enc = data.content_encoding === 'base64' ? 'base64' : 'utf8';
  const isHtml = filePath.toLowerCase().endsWith('.html');

  if (enc === 'base64' && !isHtml) {
    return Buffer.from(String(data.content), 'base64');
  }

  if (!isHtml) {
    return enc === 'base64' ? Buffer.from(String(data.content), 'base64') : data.content;
  }

  const raw =
    enc === 'base64'
      ? Buffer.from(String(data.content), 'base64').toString('utf8')
      : String(data.content);
  const origin = originFromRequest(req);
  const base = previewBaseForFilePath(origin, projectId, filePath);
  const merged = injectHtmlBaseIfNeeded(raw, base);
  const wired = injectSiteSettingsIntoHtml(merged, filePath, siteSettings);
  return applyClientHtmlVideoModalGuard(wired);
}

async function handlePreview(req, res) {
  const raw = req.path.slice('/preview/'.length);
  const segments = raw.split('/').filter(Boolean);
  if (!segments.length) {
    res.status(404).type('html').send('<!DOCTYPE html><html><body>Missing project id</body></html>');
    return;
  }

  const projectId = segments[0];
  let filePath = segments.slice(1).join('/');
  if (!filePath || filePath.endsWith('/')) {
    filePath = filePath ? `${filePath.replace(/\/$/, '')}/index.html` : 'index.html';
  }

  if (filePath.includes('..')) {
    res.status(400).send('Invalid path');
    return;
  }

  if (!isSupabaseConfigured()) {
    const data = devStore.getFile(projectId, filePath);
    if (!data) {
      res.status(404).type('html').send(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Not found</title></head><body><p>No file <code>${escapeHtml(filePath)}</code>. Open <strong>Site builder</strong> and run <em>Init starter</em> or create this file.</p></body></html>`
      );
      return;
    }
    res.setHeader('Content-Type', mimeForPath(filePath));
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    const out = buildPreviewResponseBody(data, filePath, projectId, req, null);
    if (Buffer.isBuffer(out)) {
      res.send(out);
      return;
    }
    res.send(out);
    return;
  }

  const supabase = getService();
  const [qFile, qProj] = await Promise.all([
    (async () => {
      let q1 = await supabase
        .from('site_files')
        .select('content, content_encoding')
        .eq('project_id', projectId)
        .eq('path', filePath)
        .maybeSingle();
      if (q1.error && /content_encoding/.test(String(q1.error.message))) {
        const q2 = await supabase
          .from('site_files')
          .select('content')
          .eq('project_id', projectId)
          .eq('path', filePath)
          .maybeSingle();
        return q2;
      }
      return q1;
    })(),
    supabase.from('projects').select('site_settings').eq('id', projectId).maybeSingle(),
  ]);

  let row = qFile.data;
  let err = qFile.error;

  const siteSettings = qProj?.error ? null : qProj?.data?.site_settings;

  if (err) {
    console.error(err);
    res.status(500).send('Error loading preview');
    return;
  }
  if (!row) {
    res.status(404).type('html').send(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Not found</title></head><body><p>No file <code>${escapeHtml(filePath)}</code>. Open <strong>Site builder</strong> and run <em>Init starter</em> or create this file.</p></body></html>`
    );
    return;
  }

  res.setHeader('Content-Type', mimeForPath(filePath));
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  const out = buildPreviewResponseBody(row, filePath, projectId, req, siteSettings);
  if (Buffer.isBuffer(out)) {
    res.send(out);
    return;
  }
  res.send(out);
}

function previewSiteMiddleware(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (!req.path.startsWith('/preview/')) return next();
  handlePreview(req, res).catch(next);
}

module.exports = previewSiteMiddleware;

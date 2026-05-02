'use strict';

const path = require('path');
const { getService, isSupabaseConfigured } = require('../lib/supabase');
const { isPlatformHostname, stripPort, customDomainLookupVariants } = require('../lib/customsitePlatformHosts');

const CACHE_TTL_MS = Math.min(Math.max(Number(process.env.CUSTOMSITE_DOMAIN_CACHE_MS) || 120000, 5000), 600000);
/** @type {Map<string, { projectId: string | null; expires: number }>} */
const projectByHostCache = new Map();

function mimeForPath(p) {
  const lower = p.toLowerCase();
  if (lower.endsWith('.html')) return 'text/html; charset=utf-8';
  if (lower.endsWith('.css')) return 'text/css; charset=utf-8';
  if (lower.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (lower.endsWith('.svg')) return 'image/svg+xml; charset=utf-8';
  if (lower.endsWith('.json')) return 'application/json; charset=utf-8';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.ico')) return 'image/x-icon';
  if (lower.endsWith('.woff2')) return 'font/woff2';
  if (lower.endsWith('.woff')) return 'font/woff';
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

function originForClientSite(req) {
  const rawProto = req.get('x-forwarded-proto') || req.protocol || 'https';
  const proto = String(rawProto).split(',')[0].trim();
  const host = stripPort(req.get('x-forwarded-host') || req.get('host') || '');
  if (!host) return null;
  return `${proto}://${host}`;
}

/** @param {string | null} baseHref e.g. https://client.com/ */
function injectLiveBaseHref(html, baseHref) {
  if (!baseHref) return html;
  const str = String(html);
  const safe = String(baseHref).replace(/"/g, '&quot;');
  const tag = `<base href="${safe}" data-cs-live-site="1">`;
  if (/<base\s[^>]*\/?>/i.test(str)) {
    return str.replace(/<base\s[^>]*\/?>/i, tag);
  }
  if (/<head[^>]*>/i.test(str)) {
    return str.replace(/<head([^>]*)>/i, (m, attrs) => `<head${attrs}>\n${tag}\n`);
  }
  if (/<html[^>]*>/i.test(str)) {
    return str.replace(/<html[^>]*>/i, (m) => `${m}\n<head><meta charset="utf-8" />${tag}</head>`);
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8" />${tag}</head><body>\n${str}\n</body></html>`;
}

/**
 * Map URL path to site_files path (posix, no leading slash).
 */
function resolveSiteFilePath(urlPath) {
  let p = String(urlPath || '/').split('?')[0];
  if (p.includes('..')) return null;
  p = p.replace(/\\/g, '/');
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  if (p === '/' || p === '') return 'index.html';
  const rel = p.replace(/^\//, '');
  const ext = path.posix.extname(rel);
  if (!ext) {
    return `${rel}.html`;
  }
  return rel;
}

async function lookupProjectIdByHost(supabase, hostKey) {
  const now = Date.now();
  const hit = projectByHostCache.get(hostKey);
  if (hit && hit.expires > now) {
    return hit.projectId;
  }
  const variants = customDomainLookupVariants(hostKey);
  const { data: rows, error } = await supabase.from('projects').select('id').in('custom_domain', variants).limit(1);
  if (error) {
    console.error('[clientDomainSite] project lookup', error.message);
    projectByHostCache.set(hostKey, { projectId: null, expires: now + 15000 });
    return null;
  }
  const id = rows && rows[0] && rows[0].id ? String(rows[0].id) : null;
  projectByHostCache.set(hostKey, { projectId: id, expires: now + CACHE_TTL_MS });
  return id;
}

async function loadFileRow(supabase, projectId, filePath) {
  let row;
  let err;
  const q1 = await supabase
    .from('site_files')
    .select('content, content_encoding')
    .eq('project_id', projectId)
    .eq('path', filePath)
    .maybeSingle();
  row = q1.data;
  err = q1.error;
  if (err && /content_encoding/.test(String(err.message))) {
    const q2 = await supabase
      .from('site_files')
      .select('content')
      .eq('project_id', projectId)
      .eq('path', filePath)
      .maybeSingle();
    row = q2.data;
    err = q2.error;
  }
  if (err) throw err;
  return row;
}

function buildBody(row, filePath, req) {
  const enc = row.content_encoding === 'base64' ? 'base64' : 'utf8';
  const isHtml = filePath.toLowerCase().endsWith('.html');
  if (enc === 'base64' && !isHtml) {
    return Buffer.from(String(row.content), 'base64');
  }
  if (!isHtml) {
    return enc === 'base64' ? Buffer.from(String(row.content), 'base64') : row.content;
  }
  const raw =
    enc === 'base64' ? Buffer.from(String(row.content), 'base64').toString('utf8') : String(row.content);
  const origin = originForClientSite(req);
  const baseHref = origin ? `${origin.replace(/\/$/, '')}/` : null;
  return injectLiveBaseHref(raw, baseHref);
}

async function handleClientDomain(req, res) {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const host = stripPort(req.get('x-forwarded-host') || req.get('host') || '');
  if (!host || isPlatformHostname(host)) {
    return false;
  }

  const reqPath = req.path || '/';
  if (reqPath.startsWith('/api') || reqPath.startsWith('/preview/')) {
    return false;
  }

  const supabase = getService();
  const projectId = await lookupProjectIdByHost(supabase, host);
  if (!projectId) {
    res.status(404).type('html').send(
      `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Not found</title></head><body style="font-family:system-ui;padding:2rem;color:#334155"><h1>Site not found</h1><p>No project is linked to <strong>${escapeHtml(
        host
      )}</strong>. If you own this domain, add it in CustomSite (project → production domain) and point DNS here.</p></body></html>`
    );
    return true;
  }

  const filePath = resolveSiteFilePath(reqPath);
  if (!filePath) {
    res.status(400).type('text/plain').send('Invalid path');
    return true;
  }

  let row;
  try {
    row = await loadFileRow(supabase, projectId, filePath);
    if (!row && filePath.endsWith('.html')) {
      row = await loadFileRow(supabase, projectId, filePath.replace(/\.html$/i, ''));
    }
  } catch (e) {
    console.error(e);
    res.status(500).type('text/plain').send('Error loading site');
    return true;
  }

  if (!row) {
    res.status(404).type('html').send(
      `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Page not found</title></head><body style="font-family:system-ui;padding:2rem;color:#334155"><h1>Page not found</h1><p><code>${escapeHtml(
        filePath
      )}</code> is not in this site.</p></body></html>`
    );
    return true;
  }

  res.setHeader('Content-Type', mimeForPath(filePath));
  res.setHeader('Cache-Control', 'public, max-age=120');
  if (req.method === 'HEAD') {
    res.end();
    return true;
  }
  const out = buildBody(row, filePath, req);
  if (Buffer.isBuffer(out)) {
    res.send(out);
  } else {
    res.send(out);
  }
  return true;
}

/**
 * Serves `site_files` for the project whose `custom_domain` matches Host (with www apex variants).
 * Register after LOCAL_SEO / host-specific marketing routes so those hosts are unchanged.
 * Register before `express.static` so client domains never receive the platform marketing `index.html`.
 */
function clientDomainSiteMiddleware(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  handleClientDomain(req, res)
    .then((handled) => {
      if (!handled) next();
    })
    .catch(next);
}

module.exports = clientDomainSiteMiddleware;

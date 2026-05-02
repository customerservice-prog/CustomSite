'use strict';

const path = require('path');
const { getService, isSupabaseConfigured } = require('../lib/supabase');
const { normalizeCustomDomainHost } = require('../lib/normalizeCustomDomainHost');
const {
  isPlatformHostname,
  stripPort,
  stripWww,
  customDomainLookupVariants,
} = require('../lib/customsitePlatformHosts');
const { injectSiteSettingsIntoHtml } = require('../lib/siteHeadInjector');
const { applyClientHtmlVideoModalGuard } = require('../lib/clientSiteVideoModalGuard');
const {
  applyClientSiteTechnicalSeo,
  filePathToUrlPath,
  buildSitemapXml,
  buildRobotsTxt,
} = require('../lib/clientSiteSeo');
const { insertSitePageview } = require('../lib/sitePageviewTrack');

const CACHE_TTL_MS = Math.min(Math.max(Number(process.env.CUSTOMSITE_DOMAIN_CACHE_MS) || 120000, 5000), 600000);
/** @type {Map<string, { projectId: string | null; siteSettings: unknown | null; launchedAt: string | null; projectName: string | null; expires: number }>} */
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

function setClientSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
}

function setCacheForAsset(res, filePath) {
  const lower = String(filePath).toLowerCase();
  if (lower.endsWith('.html')) res.setHeader('Cache-Control', 'public, max-age=3600');
  else if (lower.endsWith('.css') || lower.endsWith('.js')) res.setHeader('Cache-Control', 'public, max-age=86400');
  else if (/\.(png|jpe?g|gif|webp|svg|ico)$/i.test(lower)) res.setHeader('Cache-Control', 'public, max-age=604800');
  else res.setHeader('Cache-Control', 'public, max-age=86400');
}

/** @returns {Promise<{ projectId: string; siteSettings?: unknown | null; launchedAt: string | null; projectName: string | null } | null>} */
async function lookupProjectMetaByHost(supabase, hostKey) {
  const now = Date.now();
  const hit = projectByHostCache.get(hostKey);
  if (hit && hit.expires > now) {
    return hit.projectId
      ? { projectId: hit.projectId, siteSettings: hit.siteSettings, launchedAt: hit.launchedAt, projectName: hit.projectName }
      : null;
  }
  const nh = normalizeCustomDomainHost(hostKey);
  /** Match DB values pasted as URLs or with stray whitespace/trailing slashes. */
  let variantSet = [];
  if (nh) {
    const apex = /^www\./i.test(nh) ? nh.slice(4) : nh;
    const hostLike = apex && /^[\w.-]+$/.test(apex)
      ? [apex, `www.${apex}`]
      : [nh];
    const urlWrapped = apex && /^[\w.-]+$/.test(apex)
      ? [`https://${apex}`, `https://${apex}/`, `http://${apex}`, `http://${apex}/`]
      : [];
    variantSet = [...new Set([...customDomainLookupVariants(hostKey), ...hostLike, ...urlWrapped].filter(Boolean))];
  } else {
    variantSet = customDomainLookupVariants(hostKey);
  }
  let projSelect =
    'id, site_settings, custom_domain, launched_at, name, live_url';
  let { data: rows, error } = await supabase
    .from('projects')
    .select(projSelect)
    .in('custom_domain', variantSet)
    .limit(10);
  if (error && /\blive_url\b/.test(String(error.message))) {
    projSelect = 'id, site_settings, custom_domain, launched_at, name';
    ({ data: rows, error } = await supabase.from('projects').select(projSelect).in('custom_domain', variantSet).limit(10));
  }
  if (error && /site_settings/.test(String(error.message))) {
    ({ data: rows, error } = await supabase
      .from('projects')
      .select('id, custom_domain, launched_at, name')
      .in('custom_domain', variantSet)
      .limit(10));
  }
  if (error) {
    console.error('[clientDomainSite] project lookup', error.message);
    projectByHostCache.set(hostKey, {
      projectId: null,
      siteSettings: null,
      launchedAt: null,
      projectName: null,
      expires: now + 15000,
    });
    return null;
  }
  let row0 = rows && rows[0];
  if (!row0) {
    const want = nh || normalizeCustomDomainHost(hostKey);
    /** LIKE metachars — strip so filter stays narrow + safe */
    const lit = want ? want.replace(/[%_\\]/g, '') : '';
    if (lit && lit.length >= 3 && /^[\w.-]+$/i.test(lit)) {
      const looseSel =
        'id, site_settings, custom_domain, launched_at, name, live_url';
      let { data: loose, error: e2 } = await supabase
        .from('projects')
        .select(looseSel)
        .not('custom_domain', 'is', null)
        .ilike('custom_domain', `%${lit}%`)
        .limit(24);
      if (e2 && /\blive_url\b/.test(String(e2.message))) {
        ({
          data: loose,
          error: e2,
        } = await supabase
          .from('projects')
          .select('id, site_settings, custom_domain, launched_at, name')
          .not('custom_domain', 'is', null)
          .ilike('custom_domain', `%${lit}%`)
          .limit(24));
      }
      if (!e2 && loose && loose.length) {
        row0 = loose.find((r) => normalizeCustomDomainHost(r.custom_domain) === want);
      }
    }
    if (!row0 && want && /^[\w.-]+$/i.test(want)) {
      const prefixes = [
        `https://${want}`,
        `http://${want}`,
        `https://www.${want}`,
        `http://www.${want}`,
      ];
      for (const pre of prefixes) {
        const r = await supabase
          .from('projects')
          .select('id, site_settings, custom_domain, launched_at, name, live_url')
          .not('live_url', 'is', null)
          .ilike('live_url', `${pre}%`)
          .limit(8);
        if (r.error) {
          if (/\blive_url\b/.test(String(r.error.message))) break;
          continue;
        }
        const hit = (r.data || []).find((x) => normalizeCustomDomainHost(x.live_url) === want);
        if (hit) {
          row0 = hit;
          break;
        }
      }
    }
  }
  const id = row0 && row0.id ? String(row0.id) : null;
  const siteSettings = row0 && row0.site_settings !== undefined ? row0.site_settings : null;
  const launchedAt = row0 && row0.launched_at ? String(row0.launched_at) : null;
  const projectName = row0 && row0.name != null ? String(row0.name) : null;
  projectByHostCache.set(hostKey, {
    projectId: id,
    siteSettings,
    launchedAt,
    projectName,
    expires: now + CACHE_TTL_MS,
  });
  return id ? { projectId: id, siteSettings, launchedAt, projectName } : null;
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
    const q2 = await supabase.from('site_files').select('content').eq('project_id', projectId).eq('path', filePath).maybeSingle();
    row = q2.data;
    err = q2.error;
  }
  if (err) throw err;
  return row;
}

async function listSitemapEntries(supabase, projectId) {
  const { data, error } = await supabase.from('site_files').select('path, updated_at').eq('project_id', projectId);
  if (error) throw error;
  const today = new Date().toISOString().slice(0, 10);
  return (data || [])
    .filter((r) => r.path && /\.html$/i.test(r.path))
    .map((r) => {
      const lm = r.updated_at ? String(r.updated_at).slice(0, 10) : today;
      return { path: filePathToUrlPath(r.path), lastmod: lm };
    })
    .sort((a, b) => {
      if (a.path === '/') return -1;
      if (b.path === '/') return 1;
      return a.path.localeCompare(b.path);
    });
}

function schedulePageviewTracking(res, opts) {
  const { shouldTrack } = opts;
  if (!shouldTrack) return;
  res.once('finish', () => {
    setImmediate(() => {
      insertSitePageview(opts.supabase, opts.ctx).catch(() => {});
    });
  });
}

function buildBody(row, filePath, req, siteSettings, projectName) {
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
  const withBase = injectLiveBaseHref(raw, baseHref);
  const withSettings = injectSiteSettingsIntoHtml(withBase, filePath, siteSettings);
  const canonOrigin = origin ? origin.replace(/\/$/, '') : `https://${stripPort(req.get('x-forwarded-host') || req.get('host') || 'localhost')}`;
  const afterSeo = applyClientSiteTechnicalSeo(withSettings, {
    filePath,
    siteSettings,
    siteName: projectName || 'Site',
    canonicalOrigin: canonOrigin,
  });
  return applyClientHtmlVideoModalGuard(String(afterSeo));
}

async function handleClientDomain(req, res) {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const hostIncoming = stripPort(req.get('x-forwarded-host') || req.get('host') || '');
  if (!hostIncoming || isPlatformHostname(hostIncoming)) {
    return false;
  }

  const reqPath = (req.path || '/').split('?')[0];
  if (reqPath.startsWith('/api') || reqPath.startsWith('/preview/')) {
    return false;
  }

  if (
    String(process.env.CUSTOMSITE_SKIP_CLIENT_WWW_REDIRECT || '').trim() !== '1' &&
    /^www\./i.test(hostIncoming)
  ) {
    const apex = stripWww(hostIncoming);
    if (apex && apex !== hostIncoming) {
      const rawProto = req.get('x-forwarded-proto') || req.protocol || 'https';
      const proto = String(rawProto).split(',')[0].trim() || 'https';
      const rel = req.originalUrl || req.url || '/';
      try {
        const dest = new URL(rel, `${proto === 'http' ? 'http' : 'https'}://${apex}/`);
        dest.protocol = proto === 'http' ? 'http:' : 'https:';
        dest.hostname = apex;
        dest.port = '';
        return res.redirect(301, dest.toString());
      } catch {
        const q = String(rel).startsWith('/') ? rel : `/${rel}`;
        return res.redirect(301, `${proto === 'http' ? 'http' : 'https'}://${apex}${q}`);
      }
    }
  }

  const host = hostIncoming;
  const supabase = getService();
  const meta = await lookupProjectMetaByHost(supabase, host);
  const projectId = meta && meta.projectId;
  const siteSettings = meta && meta.siteSettings;
  const launchedAt = meta && meta.launchedAt;
  const projectName = meta && meta.projectName;
  if (!projectId) {
    setClientSecurityHeaders(res);
    res.status(404).type('html').send(
      `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Not found</title></head><body style="font-family:system-ui;padding:2rem;color:#334155"><h1>Site not found</h1><p>No project is linked to <strong>${escapeHtml(
        host
      )}</strong>. If you own this domain, add it in CustomSite (project → production domain) and point DNS here.</p></body></html>`
    );
    return true;
  }

  const origin = originForClientSite(req);
  const originBase = origin ? origin.replace(/\/$/, '') : `https://${host}`;

  if (reqPath === '/sitemap.xml') {
    setClientSecurityHeaders(res);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    if (req.method === 'HEAD') {
      res.end();
      return true;
    }
    try {
      const entries = await listSitemapEntries(supabase, projectId);
      const xml = buildSitemapXml(originBase, entries.length ? entries : [{ path: '/', lastmod: new Date().toISOString().slice(0, 10) }]);
      res.send(xml);
    } catch (e) {
      console.error(e);
      res.status(500).type('text/plain').send('Sitemap error');
    }
    return true;
  }

  if (reqPath === '/robots.txt') {
    setClientSecurityHeaders(res);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    if (req.method === 'HEAD') {
      res.end();
      return true;
    }
    res.send(buildRobotsTxt(originBase));
    return true;
  }

  const filePath = resolveSiteFilePath(reqPath);
  if (!filePath) {
    setClientSecurityHeaders(res);
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
    setClientSecurityHeaders(res);
    res.status(500).type('text/plain').send('Error loading site');
    return true;
  }

  if (!row) {
    setClientSecurityHeaders(res);
    res.status(404).type('html').send(
      `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Page not found</title></head><body style="font-family:system-ui;padding:2rem;color:#334155"><h1>Page not found</h1><p><code>${escapeHtml(
        filePath
      )}</code> is not in this site.</p></body></html>`
    );
    return true;
  }

  setClientSecurityHeaders(res);
  setCacheForAsset(res, filePath);
  res.setHeader('Content-Type', mimeForPath(filePath));

  const trackPath = req.path.split('?')[0] || '/';
  const shouldTrackHtml = launchedAt && req.method === 'GET' && filePath.toLowerCase().endsWith('.html');
  schedulePageviewTracking(res, {
    shouldTrack: shouldTrackHtml,
    supabase,
    ctx: {
      projectId,
      host,
      path: trackPath.endsWith('/') && trackPath.length > 1 ? trackPath.slice(0, -1) || '/' : trackPath,
      req,
    },
  });

  if (req.method === 'HEAD') {
    res.end();
    return true;
  }
  const out = buildBody(row, filePath, req, siteSettings, projectName);
  if (Buffer.isBuffer(out)) {
    res.send(out);
  } else {
    res.send(out);
  }
  return true;
}

function clientDomainSiteMiddleware(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  handleClientDomain(req, res)
    .then((handled) => {
      if (!handled) next();
    })
    .catch(next);
}

module.exports = clientDomainSiteMiddleware;

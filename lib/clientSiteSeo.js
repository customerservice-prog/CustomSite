'use strict';

const { getPageSeo } = require('./siteHeadInjector');
const { htmlAppearsToHaveViewportMeta } = require('./htmlViewportMeta');

function escapeAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** @returns { string } pathname with leading slash, `/` for home */
function filePathToUrlPath(filePath) {
  const lower = String(filePath || '').toLowerCase();
  if (lower === 'index.html') return '/';
  const base = String(filePath).replace(/\.html$/i, '');
  return '/' + base.replace(/^\//, '').replace(/\\/g, '/');
}

function canonicalFull(origin, pathname) {
  const o = String(origin || '').replace(/\/$/, '');
  const p = pathname === '/' ? '/' : pathname.startsWith('/') ? pathname : `/${pathname}`;
  return p === '/' ? `${o}/` : `${o}${p}`;
}

function stripTagsToText(segment, softMax) {
  let t = String(segment || '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length > softMax + 80) t = t.slice(0, softMax + 80).trimEnd();
  return t;
}

function excerptFromBody(html, max = 155) {
  const body = html.match(/<body\b[^>]*>([\s\S]*)<\/body>/i);
  const chunk = body ? body[1] : html;
  let t = stripTagsToText(chunk, max);
  if (t.length > max) t = t.slice(0, max - 1).trimEnd() + '…';
  return t;
}

function extractTitleInner(html) {
  const m = html.match(/<title\b[^>]*>([^<]*)<\/title>/i);
  return m ? String(m[1]).trim() : '';
}

function extractFirstAbsoluteImgSrc(html) {
  const re = /\bsrc\s*=\s*"([^"]+)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const u = m[1].trim();
    if (/^https?:\/\//i.test(u)) return u;
  }
  const re2 = /\bsrc\s*=\s*'([^']+)'/gi;
  while ((m = re2.exec(html)) !== null) {
    const u = m[1].trim();
    if (/^https?:\/\//i.test(u)) return u;
  }
  return '';
}

function humanizeFileToTitle(filePath) {
  const b = String(filePath).replace(/\.html$/i, '');
  const part = b.split('/').pop() || 'Page';
  if (part.toLowerCase() === 'index') return 'Home';
  return part
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function metaExists(html, re) {
  return re.test(html);
}

function buildJsonLd(siteSettings, siteName, canonicalUrl, description) {
  const s = siteSettings && typeof siteSettings === 'object' && !Array.isArray(siteSettings) ? siteSettings : {};
  const st = String(s.site_type || s.siteType || 'portfolio')
    .trim()
    .toLowerCase();
  const sameAs = Array.isArray(s.same_as) ? s.same_as : Array.isArray(s.sameAs) ? s.sameAs : [];

  /** @type {Record<string, unknown>} */
  let node;
  if (st === 'person') {
    node = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: siteName,
      url: canonicalUrl,
      description,
      sameAs,
    };
  } else if (st === 'restaurant') {
    node = {
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      name: siteName,
      url: canonicalUrl,
      description,
      address: s.restaurant_address || s.address || undefined,
      telephone: s.telephone || s.phone || undefined,
    };
  } else if (st === 'local_business') {
    node = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: siteName,
      url: canonicalUrl,
      description,
      address: s.business_address || s.address || undefined,
    };
  } else if (st === 'ecommerce') {
    node = {
      '@context': 'https://schema.org',
      '@type': 'OnlineStore',
      name: siteName,
      url: canonicalUrl,
      description,
    };
  } else {
    node = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteName,
      url: canonicalUrl,
      description,
    };
  }
  return JSON.stringify(node).replace(/</g, '\\u003c');
}

/**
 * Full technical SEO pass for HTML served on custom domains (after GA / base href injection).
 * @param {string} html
 * @param {{ filePath: string, siteSettings: unknown, siteName: string, canonicalOrigin: string }} ctx
 */
function applyClientSiteTechnicalSeo(html, ctx) {
  if (!html || typeof html !== 'string' || !ctx.filePath.toLowerCase().endsWith('.html')) return html;

  const s = ctx.siteSettings && typeof ctx.siteSettings === 'object' && !Array.isArray(ctx.siteSettings) ? ctx.siteSettings : {};
  const pageSeo = getPageSeo(s, ctx.filePath) || {};
  const urlPath = filePathToUrlPath(ctx.filePath);
  const canonDefault = canonicalFull(ctx.canonicalOrigin, urlPath);

  const siteName = String(ctx.siteName || s.client_site_name || s.brand_name || s.site_name || 'Site').trim() || 'Site';

  const titleFromSeo = (pageSeo.title || pageSeo.pageTitle || '').toString().trim();
  const existingTitle = extractTitleInner(html);
  const pageTitleBase = titleFromSeo || existingTitle || humanizeFileToTitle(ctx.filePath);
  const fullTitle = `${pageTitleBase} | ${siteName}`.slice(0, 120);

  const descFromSeo = (pageSeo.description || pageSeo.metaDescription || '').toString().trim();
  const description = (descFromSeo || excerptFromBody(html, 155) || `${pageTitleBase} — ${siteName}`).slice(0, 160);

  const ogFromSeo = (pageSeo.og_image_url || pageSeo.ogImage || s.default_og_image || s.logo_url || '').toString().trim();
  const ogImage = ogFromSeo || extractFirstAbsoluteImgSrc(html) || '';

  const canonFromSeo = (pageSeo.canonical_url || pageSeo.canonical || '').toString().trim();
  const canonicalHref = canonFromSeo || canonDefault;

  const noIndex = pageSeo.no_index === true || pageSeo.index === false || pageSeo.robots === 'noindex';
  const robotsContent = noIndex ? 'noindex, nofollow' : 'index, follow';

  const gVer = (s.google_site_verification || s.googleSearchConsoleVerification || '').toString().trim();

  let out = html;
  if (titleFromSeo && /<title\b/i.test(out)) {
    out = out.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, `<title>${escapeAttr(fullTitle)}</title>`);
  }

  /** @type {string[]} */
  const inject = [];

  if (!/\bcharset\s*=\s*["']?utf-8/i.test(out)) {
    inject.push('<meta charset="UTF-8" />');
  }
  if (!metaExists(out, /name\s*=\s*["']viewport["']/i)) {
    inject.push('<meta name="viewport" content="width=device-width, initial-scale=1.0" />');
  }
  if (!metaExists(out, /name\s*=\s*["']description["']/i)) {
    inject.push(`<meta name="description" content="${escapeAttr(description)}" />`);
  }
  if (!metaExists(out, /name\s*=\s*["']robots["']/i)) {
    inject.push(`<meta name="robots" content="${escapeAttr(robotsContent)}" />`);
  }
  if (gVer && !metaExists(out, /name\s*=\s*["']google-site-verification["']/i)) {
    inject.push(`<meta name="google-site-verification" content="${escapeAttr(gVer)}" />`);
  }

  if (!/<title\b/i.test(out)) {
    inject.push(`<title>${escapeAttr(fullTitle)}</title>`);
  }

  if (!metaExists(out, /rel\s*=\s*["']canonical["']/i)) {
    inject.push(`<link rel="canonical" href="${escapeAttr(canonicalHref)}" />`);
  }

  if (!metaExists(out, /property\s*=\s*["']og:title["']/i)) {
    inject.push(`<meta property="og:title" content="${escapeAttr(pageTitleBase)}" />`);
  }
  if (!metaExists(out, /property\s*=\s*["']og:description["']/i)) {
    inject.push(`<meta property="og:description" content="${escapeAttr(description)}" />`);
  }
  if (!metaExists(out, /property\s*=\s*["']og:url["']/i)) {
    inject.push(`<meta property="og:url" content="${escapeAttr(canonicalHref)}" />`);
  }
  if (!metaExists(out, /property\s*=\s*["']og:type["']/i)) {
    inject.push('<meta property="og:type" content="website" />');
  }
  if (ogImage && !metaExists(out, /property\s*=\s*["']og:image["']/i)) {
    inject.push(`<meta property="og:image" content="${escapeAttr(ogImage)}" />`);
  }
  if (!metaExists(out, /property\s*=\s*["']og:site_name["']/i)) {
    inject.push(`<meta property="og:site_name" content="${escapeAttr(siteName)}" />`);
  }

  if (!metaExists(out, /name\s*=\s*["']twitter:card["']/i)) {
    inject.push('<meta name="twitter:card" content="summary_large_image" />');
  }
  if (!metaExists(out, /name\s*=\s*["']twitter:title["']/i)) {
    inject.push(`<meta name="twitter:title" content="${escapeAttr(pageTitleBase)}" />`);
  }
  if (!metaExists(out, /name\s*=\s*["']twitter:description["']/i)) {
    inject.push(`<meta name="twitter:description" content="${escapeAttr(description)}" />`);
  }
  if (ogImage && !metaExists(out, /name\s*=\s*["']twitter:image["']/i)) {
    inject.push(`<meta name="twitter:image" content="${escapeAttr(ogImage)}" />`);
  }

  const ld = buildJsonLd(s, siteName, canonicalHref, description);
  const ldTag = `<script type="application/ld+json" data-cs-autoseo="1">${ld}</script>`;
  out = out.replace(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*data-cs-autoseo\s*=\s*["']1["'][^>]*>[\s\S]*?<\/script>/gi, '');

  const headInject = inject.filter(Boolean).join('\n');
  const headBlock = `${headInject ? `${headInject}\n` : ''}${ldTag}\n`;
  if (/<\/head>/i.test(out)) {
    out = out.replace(/<\/head>/i, `${headBlock}</head>`);
  } else if (/<head\b[^>]*>/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, (m, attrs) => `<head${attrs}>\n${headBlock}`);
  } else if (/<html\b[^>]*>/i.test(out) && !/<head\b/i.test(out)) {
    out = out.replace(/<html(\b[^>]*)>/i, `<html$1><head>\n${headBlock}</head>`);
  } else if (!/<html\b/i.test(out) && /<body\b/i.test(out)) {
    out = `<!DOCTYPE html><html lang="en"><head>\n${headBlock}</head>${out}</html>`;
  } else {
    out = `<!DOCTYPE html><html lang="en"><head>\n${headBlock}</head><body>\n${out}\n</body></html>`;
  }

  return out;
}

/**
 * @param {string} originNoSlash e.g. https://example.com
 * @param {{ path: string, lastmod: string }[]} entries
 */
function buildSitemapXml(originNoSlash, entries) {
  const base = String(originNoSlash || '').replace(/\/$/, '');
  const body = entries
    .map(({ path, lastmod }) => {
      const loc = path === '/' ? `${base}/` : `${base}${path.startsWith('/') ? path : `/${path}`}`;
      const pr = path === '/' ? '1.0' : '0.8';
      const ch = path === '/' ? 'weekly' : 'monthly';
      return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${escapeXml(lastmod)}</lastmod>
    <priority>${pr}</priority>
    <changefreq>${ch}</changefreq>
  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

function buildRobotsTxt(originNoSlash) {
  const base = String(originNoSlash || '').replace(/\/$/, '');
  return `User-agent: *
Allow: /
Sitemap: ${base}/sitemap.xml
`;
}

module.exports = {
  applyClientSiteTechnicalSeo,
  filePathToUrlPath,
  canonicalFull,
  buildSitemapXml,
  buildRobotsTxt,
};

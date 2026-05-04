'use strict';

const { htmlAppearsToHaveViewportMeta } = require('./htmlViewportMeta');

/**
 * Read project `site_settings` JSON and inject GA4, viewport, and per-page SEO into HTML responses.
 */

function escapeHtmlAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/** @param {unknown} raw */
function getPageSeo(raw, htmlPath) {
  if (!raw || typeof raw !== 'object') return null;
  const ps = raw.page_seo ?? raw.pageSeo;
  if (!ps || typeof ps !== 'object') return null;
  const key = htmlPath.replace(/^\//, '');
  const row = ps[key];
  return row && typeof row === 'object' ? row : null;
}

/**
 * @param {string} html
 * @param {string} filePath posix path e.g. index.html
 * @param {unknown} siteSettings
 */
function injectSiteSettingsIntoHtml(html, filePath, siteSettings) {
  if (!html || typeof html !== 'string' || !filePath.toLowerCase().endsWith('.html')) return html;

  let s = siteSettings;
  if (!s || typeof s !== 'object') s = {};
  const seo = getPageSeo(s, filePath);
  const ga = (s.ga4_measurement_id ?? s.ga4MeasurementId ?? s.tracking_id ?? '').toString().trim();

  /** @type {string[]} */
  const injectChunks = [];

  if (!htmlAppearsToHaveViewportMeta(html)) {
    injectChunks.push(
      '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />',
    );
  }

  if (seo) {
    const title = seo.title ?? seo.pageTitle ?? '';
    const desc = seo.description ?? seo.metaDescription ?? '';
    const og = seo.og_image_url ?? seo.ogImage ?? '';
    const canon = seo.canonical_url ?? seo.canonical ?? '';
    if (title && !/<title\b/i.test(html)) {
      injectChunks.push(`<title>${escapeHtmlAttr(String(title)).slice(0, 220)}</title>`);
    } else if (title && /<title\b[^>]*>[\s\S]*?<\/title>/i.test(html)) {
      /* optional replace skipped — avoid breaking client markup */
    }
    if (desc) {
      const d = escapeHtmlAttr(String(desc).slice(0, 400));
      if (!/name\s*=\s*"description"/i.test(html)) {
        injectChunks.push(`<meta name="description" content="${d}" />`);
      }
    }
    if (og) {
      injectChunks.push(`<meta property="og:image" content="${escapeHtmlAttr(String(og).trim())}" />`);
    }
    if (canon && !/rel\s*=\s*"canonical"/i.test(html)) {
      injectChunks.push(`<link rel="canonical" href="${escapeHtmlAttr(String(canon).trim())}" />`);
    }
  }

  if (/^G-[A-Za-z0-9_-]+$/.test(ga)) {
    injectChunks.push(
      `<script async src="https://www.googletagmanager.com/gtag/js?id=${escapeHtmlAttr(ga)}"></script>`,
      `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${escapeHtmlAttr(
        ga,
      )}');</script>`,
    );
  }

  const extraHead = injectChunks.filter(Boolean).join('\n');
  if (!extraHead) return html;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, (m, attrs) => `<head${attrs}>\n${extraHead}\n`);
  }
  if (/<html\b[^>]*>/i.test(html) && !/<head\b/i.test(html)) {
    return html.replace(/<html(\b[^>]*)>/i, `<html$1><head>\n${extraHead}\n</head>`);
  }
  if (!/<html\b/i.test(html) && /<body\b/i.test(html)) {
    return `<!DOCTYPE html><html lang="en"><head>\n${extraHead}\n</head>${html}</html>`;
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8" />\n${extraHead}\n</head><body>\n${html}\n</body></html>`;
}

module.exports = {
  injectSiteSettingsIntoHtml,
  getPageSeo,
};

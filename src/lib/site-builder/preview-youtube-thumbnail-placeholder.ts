/**
 * Site builder inline preview only: avoids loading Google/YouTube thumbnail CDNs while editing.
 * Full-screen preview and "open preview in new tab" use the untouched HTML via {@link composePreviewDocument}.
 */
const DEFAULT_PLACEHOLDER = '/assets/video-unavailable.png';

const YOUTUBE_THUMB_IN_ATTR_OR_CSS = /(?:ytimg\.com|img\.youtube\.com|youtube\.com\/vi\/)/i;
const YOUTUBE_THUMB_SRC = /\b(?:src|srcset)\s*=\s*["'][^"']*(?:ytimg\.com|img\.youtube\.com|youtube\.com\/vi\/)/i;

/**
 * Rewrite `<img>` / `<source>` attributes and common `background-image:url(...)` uses of YouTube thumbnails.
 */
export function applyInlinePreviewYoutubeThumbnailPlaceholders(html: string, placeholderPath = DEFAULT_PLACEHOLDER): string {
  if (!html || !YOUTUBE_THUMB_IN_ATTR_OR_CSS.test(html)) return html;
  let out = html.replace(/(<img\b)([^>]*?)(\/?>)/gi, (_full, open: string, attrs: string, close: string) => {
    if (!YOUTUBE_THUMB_SRC.test(attrs)) return `${open}${attrs}${close}`;
    let next = attrs
      .replace(/\bsrc\s*=\s*"[^"]*"/gi, `src="${placeholderPath}"`)
      .replace(/\bsrc\s*=\s*'[^']*'/gi, `src='${placeholderPath}'`);
    next = next.replace(/\bsrcset\s*=\s*"[^"]*"/gi, '').replace(/\bsrcset\s*=\s*'[^']*'/gi, '');
    return `${open}${next}${close}`;
  });

  out = out.replace(/(<source\b)([^>]*?)(\/?>)/gi, (_full, open: string, attrs: string, close: string) => {
    if (!YOUTUBE_THUMB_SRC.test(attrs)) return `${open}${attrs}${close}`;
    let next = attrs
      .replace(/\bsrc\s*=\s*"[^"]*"/gi, `src="${placeholderPath}"`)
      .replace(/\bsrc\s*=\s*'[^']*'/gi, `src='${placeholderPath}'`);
    next = next.replace(/\bsrcset\s*=\s*"[^"]*"/gi, '').replace(/\bsrcset\s*=\s*'[^']*'/gi, '');
    return `${open}${next}${close}`;
  });

  out = out.replace(
    /url\(\s*["']?(https?:\/\/[^"')]*(?:ytimg\.com|img\.youtube\.com|youtube\.com\/vi\/)[^"')]*)["']?\s*\)/gi,
    `url("${placeholderPath}")`
  );

  return out;
}

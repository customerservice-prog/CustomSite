'use strict';

/**
 * Responsive baseline injected into HTML served on client custom domains.
 * Matches `src/lib/site-builder/preview-responsive-baseline.ts` — keep `<style>` in sync.
 */

const STYLE_TAG = `<style id="data-cs-responsive-baseline">
html{-webkit-text-size-adjust:100%;text-size-adjust:100%;max-width:100%;}
@media (max-width:1024px){
html{overflow-x:hidden;-webkit-overflow-scrolling:touch;}
body{overflow-x:hidden;-webkit-overflow-scrolling:touch;}
}
@supports (overflow-x:clip){
@media (max-width:1024px){
html{overflow-x:clip;}
body{overflow-x:clip;}
}
}
body{max-width:100%;}
img,picture,video,canvas,svg{max-width:100%;height:auto;}
iframe{max-width:100%;vertical-align:middle;border:0;}
pre,code,samp,kbd{max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;word-break:break-word;}
figure{margin:0;max-width:100%;}
</style>`;

function injectClientSiteMobileBaseline(html) {
  const s = String(html ?? '');
  if (!s) return s;
  if (/\bdata-cs-responsive-baseline\b/i.test(s) || /\bdata-cs-mobile-baseline\b/i.test(s)) return s;
  if (/<\/head>/i.test(s)) return s.replace(/<\/head>/i, `${STYLE_TAG}\n</head>`);
  if (/<head\b[^>]*>/i.test(s)) return s.replace(/<head(\b[^>]*)>/i, `<head$1>\n${STYLE_TAG}\n`);
  if (/<html\b[^>]*>/i.test(s) && !/<head\b/i.test(s)) {
    return s.replace(/<html(\b[^>]*)>/i, `<html$1><head>\n${STYLE_TAG}\n</head>`);
  }
  if (!/<html\b/i.test(s) && /<body\b/i.test(s)) {
    return `<!DOCTYPE html><html lang="en"><head>\n${STYLE_TAG}\n</head>${s}</html>`;
  }
  return `<!DOCTYPE html><html lang="en"><head>${STYLE_TAG}</head><body>\n${s}\n</body></html>`;
}

module.exports = { injectClientSiteMobileBaseline };

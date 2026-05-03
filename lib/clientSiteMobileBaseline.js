'use strict';

/**
 * Small responsive baseline injected into HTML served on client custom domains.
 * Fixes common “looks fine on desktop, broken on phones” cases: iOS font scaling,
 * media wider than the viewport, and wide code blocks blowing layout.
 */

const STYLE_TAG = `<style id="data-cs-mobile-baseline">
html{-webkit-text-size-adjust:100%;text-size-adjust:100%;}
img,picture,video,canvas,svg{max-width:100%;height:auto;}
iframe{max-width:100%;vertical-align:middle;border:0;}
pre,code,samp,kbd{max-width:100%;overflow-x:auto;word-break:break-word;}
</style>`;

function injectClientSiteMobileBaseline(html) {
  const s = String(html ?? '');
  if (!s || /\bdata-cs-mobile-baseline\b/i.test(s)) return s;
  if (/<\/head>/i.test(s)) return s.replace(/<\/head>/i, `${STYLE_TAG}\n</head>`);
  return s;
}

module.exports = { injectClientSiteMobileBaseline };

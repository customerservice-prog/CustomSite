/** Keep `<style>…</style>` identical to root `lib/clientSiteMobileBaseline.js` (live custom domains). */

export const CLIENT_SITE_RESPONSIVE_BASELINE_STYLE = `<style id="data-cs-responsive-baseline">
html{-webkit-text-size-adjust:100%;text-size-adjust:100%;max-width:100%;}
@media (max-width:1024px){
html{overflow-x:clip;}
body{overflow-x:clip;}
}
body{max-width:100%;}
img,picture,video,canvas,svg{max-width:100%;height:auto;}
iframe{max-width:100%;vertical-align:middle;border:0;}
pre,code,samp,kbd{max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;word-break:break-word;}
figure{margin:0;max-width:100%;}
</style>`;

export function injectPreviewResponsiveBaseline(html: string): string {
  const s = html ?? '';
  if (!/\S/.test(s)) return s;
  if (/\bdata-cs-responsive-baseline\b/i.test(s) || /\bdata-cs-mobile-baseline\b/i.test(s)) return s;
  if (/<\/head>/i.test(s)) {
    return s.replace(/<\/head>/i, `${CLIENT_SITE_RESPONSIVE_BASELINE_STYLE.trim()}\n</head>`);
  }
  return s;
}

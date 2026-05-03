'use strict';

/**
 * index.html ships legacy #videoModal + #modalIframe; videos.html adds `.videos-section` + overlays.
 * Preview injects `<base href=".../preview/.../">` so an empty iframe loads the enclosing page — hide modal + reset iframe.
 *
 * IMPORTANT (Cestui & similar): pages that OPEN the modal on purpose must EITHER:
 *   - include `.videos-section` on a wrapper inside the modal or page, OR
 *   - set `data-cs-allow-modal="1"` on `#videoModal`
 * Otherwise guards below call `display:none !important`, which defeats `classList.add('active')` alone —
 * client `openModal` must use `m.style.setProperty('display','flex','important')` as a workaround.
 */

function videoModalMarkedAllowed(mid) {
  return /\bdata-cs-allow-modal\s*=\s*["']1["']/i.test(String(mid || ''));
}

function ensureVideoModalHiddenAttribute(html) {
  return String(html || '').replace(
    /<div(\s+[^>]*\bid\s*=\s*["']videoModal["'][^>]*)(>)/i,
    (_full, mid, gt) => {
      /** Let curated pages disable server-side inline smash — they opt in with explicit attribute. */
      if (videoModalMarkedAllowed(mid)) return _full;
      if (/\bstyle\s*=/i.test(mid)) {
        return _full.replace(/\bstyle\s*=\s*(["'])([\s\S]*?)\1/i, (sm, q, val) => {
          /** Avoid stacking another !important hide on already-hidden modals */
          if (/\bdisplay\s*:\s*none\b/i.test(val) && /\!important\b/i.test(val)) return sm;
          return `style=${q}display:none !important;${val}${q}`;
        });
      }
      return `<div${mid} style="display:none !important"${gt}`;
    },
  );
}

function guardConditionJs() {
  return (
    "var __csVm=document.getElementById('videoModal');" +
    "var __csAllow=!__csVm||__csVm.getAttribute('data-cs-allow-modal')==='1';" +
    "if(document.querySelector('.videos-section')||__csAllow)return;"
  );
}

function injectSyncVideoModalGuard(html) {
  const syncSnippet =
    '<script data-cs-vid-modal-sync="">' +
    'try{' +
    guardConditionJs() +
    "var v=document.getElementById('videoModal');" +
    "if(v)v.style.setProperty('display','none','important');" +
    "var f=document.getElementById('modalIframe');" +
    "if(f){f.src='about:blank';f.setAttribute('data-cs-reset','1');}" +
    '}catch(e){}' +
    '</script>';

  const s = String(html || '');
  const withBeforeScript = s.replace(
    /<script([^>]*)\bsrc\s*=\s*(["'])([^"']*\bscript\.js)\2([^>]*)>\s*<\/script>/gi,
    (full) => syncSnippet + full,
  );
  if (withBeforeScript !== s) return withBeforeScript;
  if (/<\/body>/i.test(s)) return s.replace(/<\/body>/i, `${syncSnippet}</body>`);
  return `${s}${syncSnippet}`;
}

function applyClientHtmlVideoModalGuard(html) {
  let out = ensureVideoModalHiddenAttribute(html);
  if (!/\b(videoModal|modalIframe|vid-modal-overlay)\b/i.test(out)) return String(html || '');

  out = injectSyncVideoModalGuard(out);

  const snippet =
    '<script data-cs-vid-modal-guard="">' +
    "document.addEventListener('DOMContentLoaded',function(){" +
    'try{' +
    guardConditionJs() +
    "document.querySelectorAll('.vid-modal-overlay').forEach(function(n){" +
    'if(n.parentNode)n.parentNode.removeChild(n);' +
    '});' +
    "var v=document.getElementById('videoModal');" +
    "if(v)v.style.setProperty('display','none','important');" +
    "var f=document.getElementById('modalIframe');" +
    'if(f){' +
    "f.src='about:blank';" +
    "f.setAttribute('data-cs-reset','1');" +
    '}' +
    '}catch(e){}' +
    '});' +
    '</script>';

  if (/<\/body>/i.test(out)) return out.replace(/<\/body>/i, `${snippet}</body>`);
  return `${out}${snippet}`;
}

module.exports = { applyClientHtmlVideoModalGuard };

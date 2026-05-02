'use strict';

/**
 * index.html ships legacy #videoModal + #modalIframe; videos.html adds .videos-section + script.js overlays.
 * Preview injects <base href=".../preview/{id}/"> so an empty iframe src resolves to the preview URL
 * and can embed the whole site in the modal on load — fix by hiding the modal and resetting the iframe.
 *
 * Runs on served HTML only (not JS); script.js on the client still benefits from these guards.
 */

function ensureVideoModalHiddenAttribute(html) {
  return String(html || '').replace(
    /<div(\s+[^>]*\bid\s*=\s*["']videoModal["'][^>]*)(>)/i,
    (_full, mid, gt) => {
      if (/\bstyle\s*=/i.test(mid)) {
        return _full.replace(/\bstyle\s*=\s*(["'])([\s\S]*?)\1/i, (sm, q, val) => {
          if (/\bdisplay\s*:\s*none\b/i.test(val)) return sm;
          return `style=${q}display:none !important;${val}${q}`;
        });
      }
      return `<div${mid} style="display:none !important"${gt}`;
    }
  );
}

function injectSyncVideoModalGuard(html) {
  const syncSnippet =
    '<script data-cs-vid-modal-sync="">' +
    "try{" +
    "if(!document.querySelector('.videos-section')){" +
    "var v=document.getElementById('videoModal');" +
    "if(v)v.style.setProperty('display','none','important');" +
    "var f=document.getElementById('modalIframe');" +
    "if(f){f.src='about:blank';f.setAttribute('data-cs-reset','1');}" +
    '}' +
    '}catch(e){}' +
    '</script>';

  const s = String(html || '');
  /** Prefer running immediately before external script.js parses (videoModal is usually above it in DOM). */
  const withBeforeScript = s.replace(
    /<script([^>]*)\bsrc\s*=\s*(["'])([^"']*\bscript\.js)\2([^>]*)>\s*<\/script>/gi,
    (full) => syncSnippet + full
  );
  if (withBeforeScript !== s) return withBeforeScript;
  /** No external script.js match — still run at end of parse (after #videoModal exists). */
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
    "if(!document.querySelector('.videos-section')){" +
    "document.querySelectorAll('.vid-modal-overlay').forEach(function(n){" +
    'if(n.parentNode)n.parentNode.removeChild(n);' +
    '});' +
    '}' +
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

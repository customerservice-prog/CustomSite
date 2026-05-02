'use strict';

/**
 * index.html ships a legacy #videoModal + #modalIframe; videos.html uses script.js overlays.
 * Preview injects <base href=".../preview/{id}/"> so an empty iframe src resolves to the preview URL
 * and can embed the whole site in the modal on load — fix by resetting the iframe target.
 */
function applyClientHtmlVideoModalGuard(html) {
  const s = String(html || '');
  if (!/\b(videoModal|modalIframe|vid-modal-overlay)\b/.test(s)) return s;

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

  if (/<\/body>/i.test(s)) return s.replace(/<\/body>/i, `${snippet}</body>`);
  return `${s}${snippet}`;
}

module.exports = { applyClientHtmlVideoModalGuard };

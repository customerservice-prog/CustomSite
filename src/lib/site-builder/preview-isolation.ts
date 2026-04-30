/**
 * Injected at end of preview HTML (before </body>) so clicks/forms do not escape the iframe
 * and errors can be reported to the admin shell via postMessage.
 * Escaped for embedding in srcdoc; ends with <\/script> so user </script> in page cannot break out.
 *
 * Requires a dedicated <base href="https://preview.invalid/..."> (see compose-preview-document)
 * so path-absolute links do not use the parent document as fallback base.
 *
 * Uses capture on `window` (and keydown for Enter) so link navigation is intercepted before default.
 */
export const PREVIEW_ISOLATION_SCRIPT = `
<script>
(function () {
  'use strict';
  function post(type, detail) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          { source: 'site-builder-preview', type: type, detail: String(detail || '').slice(0, 2000) },
          '*'
        );
      }
    } catch (e) {}
  }
  function runSandboxProbes() {
    function postProbe(name, outcome) {
      post('sandbox-probe-' + name, outcome);
    }
    try {
      void parent.localStorage.length;
      postProbe('parent-localStorage', 'leaked:readable');
    } catch (e) {
      postProbe('parent-localStorage', 'blocked:' + ((e && e.name) || 'Error'));
    }
    try {
      var pn = parent.document && parent.document.documentElement && parent.document.documentElement.tagName;
      postProbe('parent-document', 'leaked:' + String(pn || '?'));
    } catch (e2) {
      postProbe('parent-document', 'blocked:' + ((e2 && e2.name) || 'Error'));
    }
    try {
      var ph = String(parent.location.href).slice(0, 240);
      postProbe('parent-location-href', 'leaked:' + ph);
    } catch (e3) {
      postProbe('parent-location-href', 'blocked:' + ((e3 && e3.name) || 'Error'));
    }
    try {
      window.top.location = '/customsite-preview-sandbox-test';
      postProbe('top-location-assign', 'leaked:no-throw');
    } catch (e4) {
      postProbe('top-location-assign', 'blocked:' + ((e4 && e4.name) || 'Error'));
    }
  }
  function showBlockedNavToast(href) {
    try {
      console.warn('Blocked preview navigation:', href);
      var msg = document.createElement('div');
      msg.setAttribute('role', 'status');
      msg.textContent = '\u26A0\uFE0F Preview blocked navigation to ' + String(href || '');
      msg.style.cssText =
        'position:fixed;bottom:10px;right:10px;background:#111;color:#fff;padding:8px 12px;border-radius:6px;font-size:12px;z-index:2147483647;font-family:system-ui,sans-serif;max-width:min(90vw,22rem);box-shadow:0 4px 12px rgba(0,0,0,0.35);word-break:break-word';
      (document.body || document.documentElement).appendChild(msg);
      window.setTimeout(function () {
        try {
          msg.remove();
        } catch (r) {}
      }, 2500);
    } catch (x) {}
  }
  function blockNav(e, type, detail, showToast) {
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    post(type, detail);
    if (showToast) showBlockedNavToast(detail);
  }
  function processAnchorLink(e, a) {
    if (e.defaultPrevented) return;
    var href = (a.getAttribute('href') || '').trim();
    var low = href.toLowerCase();
    var tgt = (a.getAttribute('target') || '').toLowerCase();
    if (tgt === '_top' || tgt === '_parent') {
      blockNav(e, 'blocked-target', tgt + ' ' + href.slice(0, 120), true);
      return;
    }
    if (!href) return;
    if (low === '#' || low === '#/' || (low.charAt(0) === '#' && low.length <= 120)) {
      blockNav(e, 'blocked-hash-href', href.slice(0, 200), true);
      return;
    }
    if (low.indexOf('javascript:') === 0) {
      blockNav(e, 'blocked-javascript-href', href.slice(0, 120), true);
      return;
    }
    if (/^https?:\\/\\//i.test(href)) {
      blockNav(e, 'opened-external-tab', href.slice(0, 500), false);
      try {
        window.open(href, '_blank', 'noopener,noreferrer');
      } catch (x) {
        post('open-failed', href.slice(0, 200));
      }
      return;
    }
    if (/^\\/\\//.test(href)) {
      try {
        var pr = new URL(href, 'https://preview.invalid/');
        blockNav(e, 'opened-external-tab', pr.href, false);
        window.open(pr.href, '_blank', 'noopener,noreferrer');
      } catch (x2) {
        blockNav(e, 'blocked-protocol-relative', href.slice(0, 200), true);
      }
      return;
    }
    if (href.charAt(0) === '/' && href.charAt(1) !== '/') {
      blockNav(e, 'blocked-root-path', href.slice(0, 500), true);
      return;
    }
    blockNav(e, 'blocked-relative-nav', href.slice(0, 500), true);
  }
  function handlePointerActivation(e) {
    if (e.defaultPrevented) return;
    var t = e.target;
    if (!t || !t.closest) return;
    var a = t.closest('a[href]');
    if (!a) return;
    processAnchorLink(e, a);
  }
  function handleKeydownActivation(e) {
    if (e.defaultPrevented) return;
    if (e.key !== 'Enter') return;
    var t = e.target;
    if (!t || !t.closest) return;
    var a = t.closest('a[href]');
    if (!a) return;
    processAnchorLink(e, a);
  }
  window.onerror = function (message, source, lineno, colno, error) {
    try {
      console.log('Preview Error:', message, source, lineno, colno, error && error.message);
      post(
        'iframe-onerror',
        String(message || '') + ' ' + String(source || '').slice(-120) + ':' + String(lineno || '')
      );
    } catch (z) {}
    return false;
  };
  window.addEventListener('error', function (ev) {
    post('iframe-error', (ev && ev.message) || 'error');
  });
  window.addEventListener('unhandledrejection', function (ev) {
    var r = ev && ev.reason;
    post('iframe-rejection', (r && r.message) || String(r || ''));
  });
  window.addEventListener('click', handlePointerActivation, true);
  window.addEventListener(
    'auxclick',
    function (e) {
      if (e.button === 1) handlePointerActivation(e);
    },
    true
  );
  window.addEventListener('keydown', handleKeydownActivation, true);
  document.addEventListener(
    'submit',
    function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      post('blocked-form', 'submit');
    },
    true
  );
  runSandboxProbes();
})();
<\/script>
`.trim();

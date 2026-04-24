'use strict';

/**
 * Home hero: restarts the “live build” MacBook animation on an interval
 * so keyframes run again (replaces old static image slide show).
 */
(function initLiveBuilderLoop() {
  const PERIOD_MS = 6500;
  function restart() {
    const el = document.getElementById('live-builder');
    if (!el || !el.parentNode) return;
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }
  setInterval(restart, PERIOD_MS);
})();

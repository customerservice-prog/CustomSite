'use strict';

/**
 * Home hero: MacBook shows code → compiles → live preview, then loops.
 * Clones #live-builder at loop end to reset CSS keyframes.
 */
(function initLiveBuilderLoop() {
  const CYCLE_MS = 9200;
  const TO_PREVIEW_MS = 2600;
  const LABEL_CODE = '1 · Write HTML & CSS';
  const LABEL_PREVIEW = '2 · From code to live site';

  let toPreview;
  let toLoop;
  let labelFirst = true;

  function setLabel(text) {
    const label = document.getElementById('heroBuildStepLabel');
    if (!label) return;
    if (labelFirst) {
      labelFirst = false;
      label.textContent = text;
      return;
    }
    label.style.transition = 'opacity 0.3s ease';
    label.style.opacity = '0';
    window.setTimeout(function () {
      label.textContent = text;
      label.style.opacity = '1';
    }, 200);
  }

  function clearTimers() {
    if (toPreview) clearTimeout(toPreview);
    if (toLoop) clearTimeout(toLoop);
  }

  function runCycle(live) {
    if (!live) return;
    clearTimers();
    live.setAttribute('data-phase', 'code');
    setLabel(LABEL_CODE);
    toPreview = setTimeout(function onPreview() {
      live.setAttribute('data-phase', 'preview');
      setLabel(LABEL_PREVIEW);
      toLoop = setTimeout(function onLoop() {
        const el = document.getElementById('live-builder');
        if (!el || !el.parentNode) return;
        const fresh = el.cloneNode(true);
        el.parentNode.replaceChild(fresh, el);
        const next = document.getElementById('live-builder');
        runCycle(next);
      }, CYCLE_MS - TO_PREVIEW_MS);
    }, TO_PREVIEW_MS);
  }

  function staticPreview() {
    const live = document.getElementById('live-builder');
    if (live) live.setAttribute('data-phase', 'preview');
    setLabel(LABEL_PREVIEW);
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', staticPreview, { once: true });
    } else {
      staticPreview();
    }
    return;
  }

  function start() {
    const live = document.getElementById('live-builder');
    runCycle(live);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

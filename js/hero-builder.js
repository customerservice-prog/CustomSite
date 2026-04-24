/**
 * Hero site-build preview: CSS-driven sequence; clone-replace every 10s to restart.
 * prefers-reduced-motion: static final frame, no loop.
 */
(function initHeroBuilderLoop() {
  const LOOP_MS = 10000;

  function restartBuilderAnimation() {
    const el = document.getElementById('hero-builder-preview');
    if (!el || !el.parentNode) return;
    const next = el.cloneNode(true);
    el.parentNode.replaceChild(next, el);
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const el = document.getElementById('hero-builder-preview');
    if (el) el.classList.add('hb--static');
    return;
  }

  function schedule() {
    restartBuilderAnimation();
    setTimeout(schedule, LOOP_MS);
  }

  setTimeout(schedule, LOOP_MS);
})();

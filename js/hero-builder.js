/**
 * Hero site-build preview: restart all CSS animations by replacing the widget node.
 * 60s loop: first site ~0–30s, second site from ~30s, surface fade ~59.4s, clone at 60s.
 * Re-query #hero-builder-preview each time — old node references break after replaceChild.
 * prefers-reduced-motion: static frame, no loop.
 */
(function initHeroBuilderLoop() {
  const LOOP_MS = 60000;

  function restartHeroBuilder() {
    const widget = document.getElementById('hero-builder-preview');
    if (!widget || !widget.parentNode) return;
    const clone = widget.cloneNode(true);
    widget.parentNode.replaceChild(clone, widget);
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const el = document.getElementById('hero-builder-preview');
    if (el) el.classList.add('hb--static');
    return;
  }

  function schedule() {
    restartHeroBuilder();
    setTimeout(schedule, LOOP_MS);
  }

  setTimeout(schedule, LOOP_MS);
})();

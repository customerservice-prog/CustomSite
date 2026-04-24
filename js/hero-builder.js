/**
 * Hero site-build preview: restart all CSS animations by replacing the widget node.
 * Cycle ~28.6s (surface fade ends ~27.6s). Re-query #hero-builder-preview each time — old
 * node references break after replaceChild. Address URL cycles each loop.
 * prefers-reduced-motion: static frame, no loop.
 */
(function initHeroBuilderLoop() {
  const LOOP_MS = 28600;
  const ADDR_URLS = [
    'summitcomfort-hvac.com',
    'riverbend-retail.com',
    'northfieldental.com',
  ];
  let urlRound = 1;

  function applyNextUrl(clone) {
    const text = clone.querySelector('.hb-addr-text');
    if (text) {
      text.textContent = ADDR_URLS[urlRound % ADDR_URLS.length];
      urlRound += 1;
    }
  }

  function restartHeroBuilder() {
    const widget = document.getElementById('hero-builder-preview');
    if (!widget || !widget.parentNode) return;
    const clone = widget.cloneNode(true);
    applyNextUrl(clone);
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

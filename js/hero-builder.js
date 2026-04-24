/**
 * Hero site-build preview: restart all CSS animations by replacing the widget node
 * on a 60s timer. While offscreen, the loop and animations pause. Before replace,
 * WAAPI animations are cancelled; the observer re-targets the new node.
 * prefers-reduced-motion: static frame, no loop.
 */
(function initHeroBuilderLoop() {
  const LOOP_MS = 60000;
  let loopTimer = null;
  let hasStarted = false;
  let offscreen = false;
  /** @type {IntersectionObserver | null} */
  let io = null;

  function cancelAnimationsOn(el) {
    if (!el || !el.getAnimations) return;
    try {
      el.getAnimations({ subtree: true }).forEach((a) => {
        try {
          a.cancel();
        } catch {
          /* */
        }
      });
    } catch {
      /* */
    }
  }

  function armLoop() {
    clearTimeout(loopTimer);
    loopTimer = setTimeout(swapWidgetNode, LOOP_MS);
  }

  function stopLoop() {
    clearTimeout(loopTimer);
    loopTimer = null;
  }

  function swapWidgetNode() {
    const widget = document.getElementById('hero-builder-preview');
    if (!widget || !widget.parentNode) return;
    stopLoop();
    cancelAnimationsOn(widget);
    if (io) {
      try {
        io.unobserve(widget);
      } catch {
        /* */
      }
    }
    const clone = widget.cloneNode(true);
    widget.parentNode.replaceChild(clone, widget);
    if (io) {
      try {
        io.observe(clone);
      } catch {
        /* */
      }
    }
    armLoop();
  }

  function onIntersect(entries) {
    const w = document.getElementById('hero-builder-preview');
    if (!w || !entries[0]) return;
    if (!entries[0].isIntersecting) {
      if (!offscreen) {
        w.classList.add('hb--paused');
        stopLoop();
        cancelAnimationsOn(w);
        offscreen = true;
      }
      return;
    }
    w.classList.remove('hb--paused');
    if (offscreen) {
      offscreen = false;
      if (hasStarted) {
        swapWidgetNode();
      } else {
        hasStarted = true;
        armLoop();
      }
      return;
    }
    if (!hasStarted) {
      hasStarted = true;
      armLoop();
    }
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const el = document.getElementById('hero-builder-preview');
    if (el) el.classList.add('hb--static');
    return;
  }

  const el = document.getElementById('hero-builder-preview');
  if (!el) return;

  io = new IntersectionObserver(onIntersect, {
    root: null,
    threshold: 0.01,
    rootMargin: '80px 0px',
  });
  io.observe(el);
})();

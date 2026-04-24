/**
 * Hero "site being built" preview — data-phase timer loop (~11.5s).
 * Respects prefers-reduced-motion (static complete state, no loop).
 */
(function initHeroBuilderPreview() {
  const root = document.getElementById('hero-builder-preview');
  if (!root) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    root.setAttribute('data-phase', '6');
    root.setAttribute('data-build', 'complete');
    const bar = root.querySelector('.hero-builder__progress-fill');
    if (bar) {
      bar.style.width = '100%';
    }
    const urlEl = root.querySelector('.hero-builder__url-text');
    if (urlEl) urlEl.textContent = 'yourclientsite.com';
    return;
  }

  const t = { p1: 500, p2: 2000, p3: 3500, p4: 5000, p5: 6500, p6: 8000, fade: 11000, next: 11500 };
  const urlEl = root.querySelector('.hero-builder__url-text');
  const bar = root.querySelector('.hero-builder__progress-fill');
  const timers = [];
  const stage = root.querySelector('.hero-builder__stage');

  function clearTimers() {
    while (timers.length) clearTimeout(timers.pop());
  }

  function setUrl(phase) {
    if (!urlEl) return;
    if (phase === 6) {
      urlEl.textContent = 'yourclientsite.com';
    } else {
      urlEl.textContent = 'yourclientsite.com — building…';
    }
  }

  function startBar() {
    if (!bar) return;
    bar.style.transition = 'none';
    bar.style.width = '0%';
    bar.style.opacity = '1';
    if (stage) {
      void stage.offsetWidth;
    } else {
      void root.offsetWidth;
    }
    bar.style.transition = 'width 8s linear';
    bar.style.width = '100%';
  }

  function runLoop() {
    clearTimers();
    root.setAttribute('data-build', 'active');
    root.setAttribute('data-phase', '0');
    setUrl(0);
    startBar();

    timers.push(setTimeout(() => { root.setAttribute('data-phase', '1'); }, t.p1));
    timers.push(
      setTimeout(() => {
        const ty = root.querySelector('.hero-builder__type');
        if (ty) {
          ty.style.animation = 'none';
          void ty.offsetWidth;
          ty.style.removeProperty('animation');
        }
        root.setAttribute('data-phase', '2');
      }, t.p2)
    );
    timers.push(setTimeout(() => { root.setAttribute('data-phase', '3'); }, t.p3));
    timers.push(setTimeout(() => { root.setAttribute('data-phase', '4'); }, t.p4));
    timers.push(setTimeout(() => { root.setAttribute('data-phase', '5'); }, t.p5));
    timers.push(
      setTimeout(() => {
        root.setAttribute('data-phase', '6');
        root.setAttribute('data-build', 'complete');
        setUrl(6);
      }, t.p6)
    );
    timers.push(
      setTimeout(() => {
        root.setAttribute('data-phase', '7');
        root.setAttribute('data-build', 'fading');
      }, t.fade)
    );
    timers.push(
      setTimeout(() => {
        if (bar) {
          bar.style.transition = 'none';
          bar.style.width = '0%';
        }
        root.setAttribute('data-phase', '0');
        root.setAttribute('data-build', 'active');
        setUrl(0);
        void root.offsetWidth;
        runLoop();
      }, t.next)
    );
  }

  runLoop();
})();

'use strict';
/**
 * Mobile nav for local SEO domain landings: drawer + focus trap (Escape to close).
 */
(function () {
  const btn = document.getElementById('ldMenuBtn');
  const panel = document.getElementById('ldTopnavRight');
  const backdrop = document.getElementById('ldNavBackdrop');
  if (!btn || !panel || !backdrop) return;

  function close() {
    panel.classList.remove('is-open');
    backdrop.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open menu');
    document.body.style.overflow = '';
  }
  function open() {
    panel.classList.add('is-open');
    backdrop.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Close menu');
    document.body.style.overflow = 'hidden';
  }
  function toggle() {
    if (panel.classList.contains('is-open')) close();
    else open();
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });
  backdrop.addEventListener('click', close);
  panel.querySelectorAll('a, button').forEach((el) => {
    el.addEventListener('click', () => {
      if (window.matchMedia('(max-width: 768px)').matches) close();
    });
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
  window.addEventListener(
    'resize',
    () => {
      if (window.innerWidth > 768) close();
    },
    { passive: true }
  );
})();

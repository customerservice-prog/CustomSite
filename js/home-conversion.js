'use strict';
/**
 * Home: dynamic next-slot dates + before/after compare slider (--split on .compare-slider).
 */
(function initHomeConversion() {
  if (!document.body.classList.contains('page-home')) return;

  function nextKickoffDate() {
    const d = new Date();
    d.setDate(d.getDate() + 21);
    return d;
  }

  const fmt = (d) =>
    d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  document.querySelectorAll('[data-next-slot]').forEach((el) => {
    el.textContent = fmt(nextKickoffDate());
  });

  const slider = document.getElementById('homeCompareSlider');
  const compareRoot = document.getElementById('homeCompareRoot');
  if (slider && compareRoot) {
    const setSplit = (v) => {
      compareRoot.style.setProperty('--split', v + '%');
      slider.setAttribute('aria-valuenow', String(v));
    };
    setSplit(slider.value);
    slider.addEventListener('input', () => setSplit(slider.value));
  }
})();

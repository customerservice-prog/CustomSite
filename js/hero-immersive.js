'use strict';

(function initImmersiveHero() {
  const industryNames = [
    'HVAC & Home Services',
    'Party & Event Rentals',
    'Restaurants & Dining',
    'Medical & Dental',
    'Real Estate',
  ];

  const slides = document.querySelectorAll('.macbook-screen-inner .slide');
  const labelText = document.querySelector('.screen-label-text');
  const macbookWrap = document.querySelector('.macbook-wrap');

  if (!slides.length || !macbookWrap) return;

  let currentSlide = 0;
  let cycleInterval = null;

  function startCycling() {
    if (cycleInterval) return;
    cycleInterval = setInterval(() => {
      slides[currentSlide].classList.remove('active');
      currentSlide = (currentSlide + 1) % slides.length;
      slides[currentSlide].classList.add('active');
      if (labelText) {
        labelText.style.opacity = '0';
        setTimeout(() => {
          labelText.textContent = industryNames[currentSlide];
          labelText.style.opacity = '1';
        }, 400);
      }
    }, 5000);
  }

  function stopCycling() {
    if (cycleInterval) {
      clearInterval(cycleInterval);
      cycleInterval = null;
    }
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        startCycling();
      } else {
        stopCycling();
      }
    },
    { threshold: 0.1 }
  );

  observer.observe(macbookWrap);
})();

(function initHeroTypewriter() {
  const el = document.getElementById('heroTypewriter');
  if (!el) return;
  const phrases = [
    'That earn trust, not bounces',
    'Built for Syracuse & CNY',
    'Ready in about 3 weeks',
    'From $799 with a real human',
  ];
  let p = 0;
  let c = 0;
  let forward = true;
  let hold = 0;
  const tickMs = 48;

  function step() {
    if (hold > 0) {
      hold -= 1;
      return;
    }
    const word = phrases[p];
    if (forward) {
      c += 1;
      el.textContent = word.slice(0, c);
      if (c >= word.length) {
        forward = false;
        hold = 32;
      }
    } else {
      c -= 1;
      el.textContent = word.slice(0, Math.max(0, c));
      if (c <= 0) {
        forward = true;
        p = (p + 1) % phrases.length;
        hold = 8;
      }
    }
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = phrases[0];
    return;
  }
  setInterval(step, tickMs);
})();

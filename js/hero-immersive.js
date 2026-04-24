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

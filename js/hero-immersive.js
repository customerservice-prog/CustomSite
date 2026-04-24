'use strict';

(function initImmersiveHero() {
  const typeEl = document.getElementById('typewriter');
  const phrases = [
    'Actually Converts',
    'Loads in Under 2s',
    'Wins Local Searches',
    'Looks Like a Million',
    'Launches in 3 Weeks',
  ];

  if (typeEl) {
    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;

    function typeWriter() {
      const current = phrases[phraseIndex];

      if (!deleting) {
        typeEl.textContent = current.slice(0, ++charIndex);
        if (charIndex === current.length) {
          deleting = true;
          return setTimeout(typeWriter, 2200);
        }
      } else {
        typeEl.textContent = current.slice(0, --charIndex);
        if (charIndex === 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
        }
      }

      setTimeout(typeWriter, deleting ? 45 : 85);
    }

    typeWriter();
  }

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

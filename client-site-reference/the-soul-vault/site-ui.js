(function () {
  'use strict';

  function basename() {
    var p = (window.location.pathname || '/').replace(/\\/g, '/');
    var m = p.match(/\/([^/]+)$/);
    if (!m || m[1] === '') return 'index.html';
    var seg = decodeURIComponent(m[1]);
    if (!/\.html?$/i.test(seg)) return 'index.html';
    return seg;
  }

  function normalizeCompare(href) {
    try {
      return href.split('#')[0].split('?')[0].trim().replace(/^\.\//, '');
    } catch (e) {
      return '';
    }
  }

  var current = basename();
  document.querySelectorAll('.site-nav a[href]').forEach(function (a) {
    var h = normalizeCompare(a.getAttribute('href') || '');
    if (
      h === current ||
      (current === 'index.html' &&
        (h === 'index.html' || h === './index.html' || h === '.'))
    ) {
      a.classList.add('nav-active');
    }
  });

  /** Scroll reveal */
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var targets = document.querySelectorAll('.reveal-section');
    if (targets.length) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) {
              en.target.classList.add('is-visible');
            }
          });
        },
        { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
      );
      targets.forEach(function (el) {
        io.observe(el);
      });
    }
  } else {
    document.querySelectorAll('.reveal-section').forEach(function (el) {
      el.classList.add('is-visible');
    });
  }
})();

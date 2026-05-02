(function () {
  'use strict';

  function currentPage() {
    var path = window.location.pathname.split('/').pop() || '';
    return path.replace(/^\//, '') || 'index.html';
  }

  function markNav() {
    var page = currentPage();
    document.querySelectorAll('.nav-main a').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      if (href === page || (page === '' && href === 'index.html')) {
        a.classList.add('is-active');
      }
    });
  }

  function bindVideoCards() {
    var modal = document.getElementById('tcp-video-modal');
    var frame = document.getElementById('tcp-video-frame');
    var titleEl = document.getElementById('tcp-video-title');
    if (!modal || !frame || !titleEl) return;

    function openModal(videoId, title) {
      titleEl.textContent = title || 'Video';
      frame.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(videoId) + '?autoplay=1&rel=0';
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      frame.src = '';
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    document.querySelectorAll('.video-card[data-youtube]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openModal(btn.getAttribute('data-youtube'), btn.getAttribute('data-title'));
      });
    });

    modal.querySelector('[data-tcp-close]').addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });
  }

  function tierFromPrice(n) {
    if (n < 50) return 'under50';
    if (n < 100) return '50to100';
    return 'over100';
  }

  function applyProductFilters() {
    var grid = document.getElementById('tcp-product-grid');
    if (!grid) return;
    var catEl = document.getElementById('f-cat');
    var matEl = document.getElementById('f-mat');
    var priceEl = document.getElementById('f-price');
    var sortEl = document.getElementById('f-sort');
    var cat = (catEl && catEl.value) || 'all';
    var mat = (matEl && matEl.value) || 'all';
    var price = (priceEl && priceEl.value) || 'all';
    var sort = (sortEl && sortEl.value) || 'popular';

    var cards = Array.prototype.slice.call(grid.querySelectorAll('.product-card'));
    cards.forEach(function (card) {
      var c = card.getAttribute('data-category') || '';
      var m = card.getAttribute('data-material') || '';
      var p = parseFloat(card.getAttribute('data-price') || '0', 10);
      var tier = tierFromPrice(p);
      var ok = true;
      if (cat !== 'all' && c !== cat) ok = false;
      if (mat !== 'all' && m !== mat) ok = false;
      if (price !== 'all' && tier !== price) ok = false;
      card.classList.toggle('tcp-hidden', !ok);
    });

    var visible = cards.filter(function (card) {
      return !card.classList.contains('tcp-hidden');
    });
    if (sort === 'price-asc') {
      visible.sort(function (a, b) {
        return parseFloat(a.getAttribute('data-price'), 10) - parseFloat(b.getAttribute('data-price'), 10);
      });
    } else if (sort === 'price-desc') {
      visible.sort(function (a, b) {
        return parseFloat(b.getAttribute('data-price'), 10) - parseFloat(a.getAttribute('data-price'), 10);
      });
    } else if (sort === 'newest') {
      visible.sort(function (a, b) {
        return (parseInt(b.getAttribute('data-new'), 10) || 0) - (parseInt(a.getAttribute('data-new'), 10) || 0);
      });
    }

    visible.forEach(function (el) {
      grid.appendChild(el);
    });

    renderFilterBadges(cat, mat, price);
    var countEl = document.getElementById('tcp-filter-count');
    if (countEl) countEl.textContent = visible.length + ' products';
  }

  function renderFilterBadges(cat, mat, price) {
    var box = document.getElementById('tcp-active-filters');
    if (!box) return;
    var labels = [];
    if (cat !== 'all') labels.push('Category: ' + cat.replace(/-/g, ' '));
    if (mat !== 'all') labels.push('Material: ' + mat);
    if (price !== 'all') {
      labels.push(
        price === 'under50'
          ? 'Price: Under $50'
          : price === '50to100'
            ? 'Price: $50 – $100'
            : 'Price: $100+'
      );
    }
    box.innerHTML = labels
      .map(function (t) {
        return '<span class="filter-badge">' + escapeHtml(t) + '</span>';
      })
      .join('');
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function bindProductsPage() {
    ['f-cat', 'f-mat', 'f-price', 'f-sort'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', applyProductFilters);
    });
    applyProductFilters();
    document.querySelectorAll('.js-clear-filters').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        ['f-cat', 'f-mat', 'f-price'].forEach(function (id) {
          var z = document.getElementById(id);
          if (z) z.value = 'all';
        });
        var s = document.getElementById('f-sort');
        if (s) s.value = 'popular';
        applyProductFilters();
      });
    });

    var params = new URLSearchParams(window.location.search);
    var qCat = params.get('cat');
    if (qCat) {
      var sel = document.getElementById('f-cat');
      if (sel) {
        for (var i = 0; i < sel.options.length; i++) {
          if (sel.options[i].value === qCat) {
            sel.selectedIndex = i;
            break;
          }
        }
      }
      applyProductFilters();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    markNav();
    bindVideoCards();
    bindProductsPage();
  });
})();

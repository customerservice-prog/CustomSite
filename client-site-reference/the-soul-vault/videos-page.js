(function () {
  'use strict';

  var CAT_COLORS = {
    'Soul & Vatican': '#d4af37',
    'Cestui Que Vie': '#60d0ff',
    'Papal Bulls': '#e87040',
    'Three City States': '#a060ff',
    'Common Law': '#40e870',
    'Trust & Commerce': '#c084fc',
    'Admiralty & Symbols': '#f472b6',
    'History & Narrative': '#93c5fd',
    'Reclaim Path': '#34d399',
    Counterpoints: '#94a3b8',
  };

  var state = { rows: [], cat: 'all', q: '' };

  function thumbSrc(id) {
    return '/thumbs/' + id + '.jpg';
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function applyFilters(rows) {
    var q = state.q.trim().toLowerCase();
    return rows.filter(function (v) {
      if (state.cat !== 'all' && v.category !== state.cat) return false;
      if (!q) return true;
      return (
        String(v.title || '')
          .toLowerCase()
          .indexOf(q) >= 0 ||
        String(v.author || '')
          .toLowerCase()
          .indexOf(q) >= 0
      );
    });
  }

  function setActiveFilter(bar) {
    bar.querySelectorAll('button[data-cat]').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-cat') === state.cat);
    });
  }

  function renderCatalog(root, countEl) {
    var visible = applyFilters(state.rows);
    countEl.textContent =
      'Showing ' + visible.length + ' of ' + state.rows.length + ' videos';

    var order = Object.keys(
      state.rows.reduce(function (acc, v) {
        acc[v.category] = true;
        return acc;
      }, {}),
    ).sort();

    var blocks = '';
    order.forEach(function (cat) {
      if (state.cat !== 'all' && state.cat !== cat) return;
      var list = applyFilters(
        state.rows.filter(function (v) {
          return v.category === cat;
        }),
      );
      if (!list.length) return;
      var dot = CAT_COLORS[cat] || '#d4af37';
      blocks +=
        '<section class="cat-block reveal-section is-visible" data-cat-block="' +
        esc(cat) +
        '">' +
        '<div class="cat-heading"><span class="cat-dot" style="background:' +
        dot +
        '"></span><h2>' +
        esc(cat) +
        '</h2>' +
        '<span class="cat-meta">' +
        list.length +
        '</span></div>' +
        '<div class="videos-grid-cards">' +
        list
          .map(function (v) {
            return (
              '<article class="vid-tile" data-ytid="' +
              esc(v.id) +
              '" style="border-top:3px solid ' +
              dot +
              '" role="button" tabindex="0">' +
              '<div class="vid-thumb-wrap">' +
              '<img src="' +
              thumbSrc(v.id) +
              '" alt="" loading="lazy" decoding="async" data-ytid="' +
              esc(v.id) +
              '" onerror="onSoulVaultThumbError(this)" />' +
              '<span class="vid-playing-badge">▶ Playing</span>' +
              '<div class="vid-play-overlay"><span class="vid-disc">▶</span></div>' +
              '</div>' +
              '<div class="video-info"><div class="video-title">' +
              esc(v.title) +
              '</div>' +
              '<div class="video-meta" style="font-family:&quot;Courier New&quot;,monospace;font-size:.68rem;color:#888;margin-top:.35rem">' +
              esc(v.author) +
              '</div></div></article>'
            );
          })
          .join('') +
        '</div></section>';
    });
    root.innerHTML = blocks || '<p style="margin-top:28px;color:#888">No matches.</p>';
    root.querySelectorAll('.vid-tile').forEach(function (card) {
      function go() {
        var id = card.getAttribute('data-ytid');
        if (id && window.openVidModal) window.openVidModal(id, null);
      }
      card.addEventListener('click', go);
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          go();
        }
      });
    });
  }

  function setupFilterBar(bar, root, countEl) {
    var cats = {};
    state.rows.forEach(function (v) {
      cats[v.category] = true;
    });
    var order = Object.keys(cats).sort();
    bar.innerHTML =
      '<button type="button" data-cat="all">All</button>' +
      order
        .map(function (c) {
          return '<button type="button" data-cat="' + esc(c) + '">' + esc(c) + '</button>';
        })
        .join('');
    bar.querySelectorAll('button[data-cat]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.cat = b.getAttribute('data-cat') || 'all';
        setActiveFilter(bar);
        renderCatalog(root, countEl);
      });
    });
    setActiveFilter(bar);
  }

  fetch('./videos-data.json', { credentials: 'same-origin' })
    .then(function (r) {
      return r.ok ? r.json() : { videos: [] };
    })
    .then(function (data) {
      state.rows = data.videos || [];
      var root = document.getElementById('videosCatalog');
      var ce = document.getElementById('videosCountBadge');
      var bar = document.getElementById('videosFilterButtons');
      var search = document.getElementById('videosSearch');
      if (!root || !ce || !bar) return;
      setupFilterBar(bar, root, ce);
      renderCatalog(root, ce);
      if (search) {
        search.addEventListener('input', function () {
          state.q = search.value;
          renderCatalog(root, ce);
        });
      }
    })
    .catch(function () {
      var root = document.getElementById('videosCatalog');
      if (root) root.innerHTML = '<p style="color:#c44">Could not load videos-data.json.</p>';
    });
})();

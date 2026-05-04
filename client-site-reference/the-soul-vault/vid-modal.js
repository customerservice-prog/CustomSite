/* global closeVidModal, openVidModal */
(function () {
  'use strict';

  window._SoulVaultArchivedMessage =
    'This video was removed from YouTube. We are sourcing a backup copy.';

  function ensureMeta(cb) {
    if (window._SoulVaultVideoIdx) return cb(window._SoulVaultVideoIdx);
    fetch('./videos-data.json', { credentials: 'same-origin' })
      .then(function (r) {
        return r.ok ? r.json() : { videos: [] };
      })
      .then(function (data) {
        var rows = data && data.videos ? data.videos : [];
        var idx = {};
        rows.forEach(function (row) {
          if (row && row.id) idx[row.id] = row;
        });
        window._SoulVaultVideosRaw = rows;
        window._SoulVaultVideoIdx = idx;
        cb(idx);
      })
      .catch(function () {
        window._SoulVaultVideoIdx = window._SoulVaultVideoIdx || {};
        cb(window._SoulVaultVideoIdx);
      });
  }

  function setPlaying(id) {
    document.querySelectorAll('.vid-tile[data-ytid]').forEach(function (el) {
      var match = id && el.getAttribute('data-ytid') === id;
      el.classList.toggle('is-playing', !!match);
      el.classList.toggle('video-card-playing', !!match);
    });
  }

  window.closeVidModal = function closeVidModal() {
    var overlay = document.getElementById('vidModalOverlay');
    var frame = document.getElementById('vidModalIframe');
    var archived = document.getElementById('vidModalArchived');
    window._SoulVaultCurrentPlayingId = null;
    if (overlay) {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
    }
    if (frame) {
      frame.removeAttribute('src');
      frame.style.display = 'block';
    }
    if (archived) {
      archived.classList.remove('visible');
      archived.textContent = '';
    }
    document.body.style.overflow = '';
    setPlaying(null);
  };

  window.openVidModal = function openVidModal(id, startTime) {
    ensureMeta(function (idx) {
      var overlay = document.getElementById('vidModalOverlay');
      var titleEl = document.getElementById('vidModalTitle');
      var frame = document.getElementById('vidModalIframe');
      var archived = document.getElementById('vidModalArchived');
      if (!overlay || !frame || !archived) return;

      var row = idx[id];
      var isArchived = row && row.archived === true;
      window._SoulVaultCurrentPlayingId = id;

      if (titleEl) titleEl.textContent = row && row.title ? row.title : id;

      if (isArchived) {
        frame.removeAttribute('src');
        frame.style.display = 'none';
        archived.textContent = '';
        var msg = document.createElement('p');
        msg.textContent = window._SoulVaultArchivedMessage;
        archived.appendChild(msg);
        archived.classList.add('visible');
      } else {
        archived.classList.remove('visible');
        archived.textContent = '';
        frame.style.display = 'block';
        var st =
          typeof startTime === 'number' && !Number.isNaN(startTime)
            ? Math.floor(startTime)
            : null;
        var qs = '?autoplay=1&rel=0&modestbranding=1';
        if (st != null) qs += '&start=' + String(st);
        frame.src =
          ['https://www.you', 'tube.com/embed/'].join('') + encodeURIComponent(id) + qs;
      }

      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      setPlaying(id);
    });
  };

  document.addEventListener(
    'click',
    function (e) {
      if (e.target === document.getElementById('vidModalOverlay')) closeVidModal();
    },
    false,
  );
  document.addEventListener(
    'keydown',
    function (e) {
      if (e.key === 'Escape') closeVidModal();
    },
    false,
  );

  window.onSoulVaultThumbError = function (img) {
    if (!img || !img.closest) return;
    if (img.dataset.fallbackApplied !== 'hq') {
      img.dataset.fallbackApplied = 'hq';
      var id =
        img.getAttribute('data-ytid') ||
        (img.closest('.vid-tile') && img.closest('.vid-tile').getAttribute('data-ytid'));
      if (!id) {
        img.onerror = null;
        img.src = '/deleted-video-placeholder.jpg';
        return;
      }
      img.src =
        ['https://img.you', 'tube.com/vi/'].join('') + id + ['/hqdefault', '.jpg'].join('');
      return;
    }
    img.onerror = null;
    img.src = '/deleted-video-placeholder.jpg';
  };
})();

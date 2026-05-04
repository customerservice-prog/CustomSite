// THE EYE IS I — Message Center (hosted on theeyeisi.com)
// Deploy: PUT /api/admin/projects/{projectId}/site/file with path "inbox-app.js"
// SECURITY: Keep SEED_AT empty in repos. Prefer tokens from CustomSite login (ei_access_token / ei_refresh_token).

var SEED_AT = '';

var BASE = '';

var LS_AT_KEY = 'ei_access_token';

var LS_RT_KEY = 'ei_refresh_token';

function saveTokens(at, rt) {
  try {
    localStorage.setItem(LS_AT_KEY, at);
    if (rt) localStorage.setItem(LS_RT_KEY, rt);
  } catch (e) {}
}

function loadStoredAT() {
  try {
    return localStorage.getItem(LS_AT_KEY);
  } catch (e) {
    return null;
  }
}

function loadStoredRT() {
  try {
    return localStorage.getItem(LS_RT_KEY);
  } catch (e) {
    return null;
  }
}

function refreshWithRT(rt) {
  return fetch(BASE + '/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: rt }),
  })
    .then(function (r) {
      return r.json();
    })
    .then(function (d) {
      if (d.error) throw new Error(d.error);
      saveTokens(d.access_token, d.refresh_token);
      return d.access_token;
    });
}

function getToken() {
  var storedRT = loadStoredRT();
  if (storedRT) return refreshWithRT(storedRT);
  var storedAT = loadStoredAT();
  if (storedAT && storedAT.length > 100) return Promise.resolve(storedAT);
  if (SEED_AT && SEED_AT.length > 100) {
    saveTokens(SEED_AT, null);
    return Promise.resolve(SEED_AT);
  }
  return Promise.reject(new Error('No auth. Open customsite.online/admin.html first.'));
}

function callAPI(token) {
  return fetch(BASE + '/api/admin/leads', { headers: { Authorization: 'Bearer ' + token } })
    .then(function (r) {
      if (r.status === 401) {
        localStorage.removeItem(LS_AT_KEY);
        var rt = loadStoredRT();
        if (rt) {
          return refreshWithRT(rt).then(function (newAT) {
            return fetch(BASE + '/api/admin/leads', { headers: { Authorization: 'Bearer ' + newAT } });
          });
        }
        if (SEED_AT && SEED_AT.length > 100) {
          saveTokens(SEED_AT, null);
          return fetch(BASE + '/api/admin/leads', { headers: { Authorization: 'Bearer ' + SEED_AT } });
        }
        throw new Error('Session expired. Please reload from customsite.online');
      }
      return r;
    })
    .then(function (r) {
      return r.json();
    });
}

function timeAgo(dateStr) {
  var d = new Date(dateStr),
    now = new Date();
  var diff = Math.floor((now - d) / 1000);
  if (diff < 60) return diff + 's ago';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncateAtWord(str, max) {
  if (!str || str.length <= max) return str;
  var cut = str.substring(0, max);
  var lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.substring(0, lastSpace) : cut).replace(/\s+$/, '') + '...';
}

function extractSubject(msg) {
  if (!msg) return '';
  var m = msg.match(/^Subject:\s*(.+)/m);
  return m ? m[1].trim() : '';
}

function extractBody(msg) {
  if (!msg) return '';
  var idx = msg.indexOf('\n\n');
  return idx >= 0 ? msg.substring(idx + 2).trim() : msg;
}

/** Short label for TOP SOURCE stat (avoid two-line wraps on long domains). */
function formatTopSrcDisplay(rawHost) {
  var host = (rawHost || 'theeyeisi.com').replace(/^https?:\/\//, '').split('/')[0];
  host = host.replace(/^www\./i, '');
  var u = host.toUpperCase();
  if (u.length <= 15) return esc(u);
  return esc(u.substring(0, 13) + '...');
}

function renderInbox(leads) {
  var total = leads.length,
    today = 0,
    unread = 0;
  var sources = {};
  var now = new Date();
  leads.forEach(function (l) {
    var d = new Date(l.created_at);
    if (now - d < 86400000) today++;
    var st = String(l.status || '').toLowerCase();
    if (!l.status || st === 'new') unread++;
    var src = (l.current_url || 'theeyeisi.com').replace(/^https?:\/\//, '').split('/')[0];
    sources[src] = (sources[src] || 0) + 1;
  });
  var topSrc =
    Object.keys(sources).sort(function (a, b) {
      return sources[b] - sources[a];
    })[0] || 'theeyeisi.com';

  var cntEl = document.getElementById('msgCount');
  if (cntEl) cntEl.textContent = total + ' MESSAGES';

  var html = '<div class="stats-bar">';
  html +=
    '<div class="stat-box"><div class="stat-num">' +
    total +
    '</div><div class="stat-lbl">TOTAL</div></div>';
  html +=
    '<div class="stat-box"><div class="stat-num">' +
    today +
    '</div><div class="stat-lbl">TODAY</div></div>';
  html +=
    '<div class="stat-box"><div class="stat-num">' +
    unread +
    '</div><div class="stat-lbl">UNREAD</div></div>';
  html +=
    '<div class="stat-box"><div class="stat-num stat-num--top-source" title="' +
    esc(topSrc) +
    '">' +
    formatTopSrcDisplay(topSrc) +
    '</div><div class="stat-lbl">TOP SOURCE</div></div>';
  html += '</div>';
  html +=
    '<div class="inbox-header"><span class="inbox-lbl">ALL TRANSMISSIONS</span><span class="inbox-lbl">' +
    total +
    ' TOTAL</span></div>';

  leads.forEach(function (l) {
    var name = esc(l.name || 'Anonymous');
    var email = esc(l.email || '');
    var src = (l.current_url || 'theeyeisi.com')
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      .toUpperCase();
    var subj = esc(extractSubject(l.message || ''));
    var bodyRaw = extractBody(l.message || '');
    var body = esc(bodyRaw);
    var rawPreviewSource = bodyRaw.replace(/\s+/g, ' ').trim();
    var preview = esc(rawPreviewSource.length > 80 ? truncateAtWord(rawPreviewSource, 80) : rawPreviewSource);
    var st = String(l.status || '').toLowerCase();
    var isNew = !l.status || st === 'new';
    var ts = timeAgo(l.created_at);
    var fullDate = new Date(l.created_at).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    var avatar = name.replace(/&amp;/g, '&').charAt(0).toUpperCase();
    var rawEmail = l.email || '';

    html += '<div class="message-card' + (isNew ? ' new' : '') + '">';
    html += '<div class="msg-header" onclick="toggleMsg(this.parentElement)">';
    html += '<div class="msg-avatar">' + avatar + '</div>';
    html += '<div class="msg-info">';
    html +=
      '<div class="msg-from">' +
      name +
      (isNew ? '<span class="new-badge" style="margin-left:8px">NEW</span>' : '') +
      '</div>';
    html += '<div class="msg-email">' + email + '</div>';
    html += '<div class="msg-preview">' + preview + '</div>';
    html += '</div>';
    html += '<div class="msg-meta"><div class="msg-site-tag">' + esc(src) + '</div><div class="msg-time">' + ts + '</div></div>';
    html += '</div>';
    html += '<div class="msg-body">';
    if (subj) html += '<div class="msg-subject-line">' + subj + '</div>';
    html += '<div class="msg-full-text">' + body + '</div>';
    html += '<div class="msg-actions">';
    html += '<div class="msg-full-time">Received: ' + fullDate + '</div>';
    if (rawEmail) html += '<a href="mailto:' + esc(rawEmail) + '" class="msg-reply-btn">&#9993; REPLY</a>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
  });

  if (!leads.length) html += '<div class="empty-title">NO TRANSMISSIONS RECEIVED YET</div>';

  var container = document.getElementById('inboxContainer');
  if (container) container.innerHTML = html;
}

function toggleMsg(card) {
  var body = card.querySelector('.msg-body');
  if (!body) return;
  var isOpen = body.classList.contains('open');
  document.querySelectorAll('.msg-body.open').forEach(function (b) {
    b.classList.remove('open');
  });
  document.querySelectorAll('.message-card').forEach(function (c) {
    c.style.borderLeftColor = '';
  });
  if (!isOpen) {
    body.classList.add('open');
    card.style.borderLeftColor = 'rgba(201,168,76,0.8)';
  }
}

function loadMessages() {
  var container = document.getElementById('inboxContainer');
  if (container) container.innerHTML = '<p class="loading">&#9651; LOADING TRANSMISSIONS&#8230;</p>';
  var cntEl = document.getElementById('msgCount');
  if (cntEl) cntEl.textContent = 'LOADING…';

  getToken()
    .then(function (token) {
      return callAPI(token);
    })
    .then(function (d) {
      var leads = d.leads || d || [];
      if (!Array.isArray(leads)) throw new Error('Unexpected format');
      leads.sort(function (a, b) {
        return new Date(b.created_at) - new Date(a.created_at);
      });
      renderInbox(leads);
    })
    .catch(function (e) {
      var c = document.getElementById('msgCount');
      if (c) c.textContent = 'ERROR';
      var box = document.getElementById('inboxContainer');
      if (box) box.innerHTML = '<div class="error-banner">ERROR: ' + esc(e.message) + '</div>';
    });
}

document.addEventListener('DOMContentLoaded', function () {
  loadMessages();
  setInterval(loadMessages, 30000);
});

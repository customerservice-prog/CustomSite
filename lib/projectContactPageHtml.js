'use strict';

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {{ projectName?: string|null, projectId: string }} o
 */
function buildStandardContactPageHtml(o) {
  const name = escapeHtml(o.projectName && String(o.projectName).trim() ? String(o.projectName).trim() : 'Get in touch');
  const pid = escapeHtml(o.projectId);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${name} — Contact</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&amp;family=Inter:wght@400;500;600;700&amp;display=swap" rel="stylesheet" />
  <style>
    :root {
      --cs-bg-top: #0c0a14;
      --cs-bg-mid: #151028;
      --cs-card: rgba(255,255,255,0.055);
      --cs-border: rgba(255,255,255,0.12);
      --cs-accent: #a78bfa;
      --cs-accent-strong: #7c3aed;
      --cs-text: #f4f4f8;
      --cs-muted: rgba(244,244,248,0.68);
      --radius: 1rem;
    }
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: Inter, system-ui, -apple-system, sans-serif;
      color: var(--cs-text);
      background: radial-gradient(1200px 800px at 10% -20%, rgba(124,58,237,0.35), transparent 55%),
        radial-gradient(900px 600px at 100% 100%, rgba(56,189,248,0.14), transparent 50%),
        linear-gradient(170deg, var(--cs-bg-top), var(--cs-bg-mid) 45%, #0a0812);
      line-height: 1.6;
    }
    a { color: var(--cs-accent); }
    .shell { max-width: 980px; margin: 0 auto; padding: 2rem 1.25rem 3.5rem; }
    nav { padding: 0.75rem 0 2rem; }
    nav a { color: var(--cs-muted); text-decoration: none; font-size: 0.9rem; font-weight: 500; transition: color 0.15s ease; }
    nav a:hover { color: var(--cs-text); }
    .grid {
      display: grid;
      gap: 2.25rem;
      align-items: start;
      grid-template-columns: 1fr;
    }
    @media (min-width: 900px) {
      .grid { grid-template-columns: 1fr 1.05fr; gap: 3rem; }
    }
    h1 {
      font-family: 'DM Serif Display', Georgia, serif;
      font-size: clamp(2.05rem, 4vw, 2.85rem);
      font-weight: 400;
      line-height: 1.08;
      margin: 0 0 1rem;
      letter-spacing: -0.02em;
    }
    .lede {
      margin: 0;
      font-size: 1.05rem;
      color: var(--cs-muted);
      max-width: 28rem;
    }
    ul.meta {
      margin: 1.75rem 0 0;
      padding: 0;
      list-style: none;
      color: var(--cs-muted);
      font-size: 0.93rem;
    }
    ul.meta li { margin-bottom: 0.45rem; }
    ul.meta span { display: inline-block; min-width: 5rem; opacity: 0.8; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; }
    form.card {
      background: var(--cs-card);
      border: 1px solid var(--cs-border);
      border-radius: var(--radius);
      padding: 1.5rem 1.35rem;
      backdrop-filter: blur(12px);
      box-shadow: 0 28px 60px rgba(0,0,0,0.35);
    }
    @media (min-width: 520px) { form.card { padding: 2rem 1.75rem; } }
    .field { margin-bottom: 1rem; }
    label { display: block; font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.38rem; color: var(--cs-muted); }
    input:not([type="hidden"]), textarea {
      width: 100%;
      border-radius: 0.65rem;
      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(6,5,14,0.55);
      color: var(--cs-text);
      padding: 0.65rem 0.85rem;
      font: inherit;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    textarea { resize: vertical; min-height: 7rem; }
    input:not([type="hidden"]):focus, textarea:focus {
      border-color: var(--cs-accent-strong);
      box-shadow: 0 0 0 3px rgba(124,58,237,0.25);
    }
    button[type="submit"] {
      appearance: none;
      border: none;
      cursor: pointer;
      margin-top: 0.75rem;
      width: 100%;
      padding: 0.9rem 1rem;
      border-radius: 0.65rem;
      font-weight: 700;
      font-size: 0.95rem;
      color: #0b0814;
      background: linear-gradient(135deg, #d8b4fe, #a78bfa 45%, #7c3aed);
      box-shadow: 0 10px 34px rgba(124,58,237,0.35);
      transition: transform 0.12s ease, filter 0.12s ease;
    }
    button[type="submit"]:hover { filter: brightness(1.06); transform: translateY(-1px); }
    button[type="submit"]:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }
    #cs-form-status {
      margin-top: 1rem;
      font-size: 0.875rem;
      min-height: 1.25em;
      color: var(--cs-muted);
    }
    #cs-form-status[data-kind="success"] { color: #bbf7d0; }
    #cs-form-status[data-kind="error"] { color: #fecaca; }
    .honeypot { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
  </style>
</head>
<body>
  <div class="shell">
    <nav><a href="index.html">← Back to site</a></nav>
    <div class="grid">
      <div>
        <h1>${name}</h1>
        <p class="lede">
          Reach the team behind this website. Include a preferred email — we reply from the studio inbox and your message appears in your portal.
        </p>
        <ul class="meta" aria-label="Quick expectations">
          <li><span>Reply</span> Usually within one business day</li>
          <li><span>Privacy</span> We never sell your info</li>
          <li><span>Hosting</span> Messages route through CustomSite</li>
        </ul>
      </div>
      <form id="cs-contact-form" class="card" novalidate>
        <input type="text" name="cs_hp_website" class="honeypot" tabindex="-1" autocomplete="off" aria-hidden="true" />
        <input type="hidden" name="_gotcha" value="" />
        <div class="field">
          <label for="cx-name">Name <span aria-hidden style="opacity:0.6">*</span></label>
          <input id="cx-name" name="name" type="text" required autocomplete="name" maxlength="500" />
        </div>
        <div class="field">
          <label for="cx-email">Email <span aria-hidden style="opacity:0.6">*</span></label>
          <input id="cx-email" name="email" type="email" required autocomplete="email" maxlength="320" />
        </div>
        <div class="field">
          <label for="cx-phone">Phone <span aria-hidden style="opacity:0.5">(optional)</span></label>
          <input id="cx-phone" name="phone" type="tel" autocomplete="tel" maxlength="80" />
        </div>
        <div class="field">
          <label for="cx-company">Company <span aria-hidden style="opacity:0.5">(optional)</span></label>
          <input id="cx-company" name="company" type="text" autocomplete="organization" maxlength="200" />
        </div>
        <div class="field">
          <label for="cx-message">Message <span aria-hidden style="opacity:0.6">*</span></label>
          <textarea id="cx-message" name="message" required maxlength="12000" placeholder="What would you like to discuss?"></textarea>
        </div>
        <button type="submit" id="cx-submit">Send message</button>
        <p id="cs-form-status" role="status" aria-live="polite"></p>
      </form>
    </div>
  </div>
  <script>
(function () {
  var PROJECT_ID = '${pid}';
  var form = document.getElementById('cs-contact-form');
  var st = document.getElementById('cs-form-status');
  var btn = document.getElementById('cx-submit');
  if (!form || !PROJECT_ID || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(PROJECT_ID)) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var hp = form.querySelector('[name="cs_hp_website"]');
    if (hp && String(hp.value || '').trim()) return;
    if (st) { st.removeAttribute('data-kind'); st.textContent = ''; }
    var fd = new FormData(form);
    var body = {};
    fd.forEach(function (v, k) { body[k] = typeof v === 'string' ? v : String(v); });
    body.current_url = typeof location !== 'undefined' ? location.href : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({}, body, { project_id: PROJECT_ID }))
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (j) { return { ok: res.ok, j: j, status: res.status }; });
      })
      .then(function (x) {
        if (st) {
          if (x.ok && x.j && x.j.success) {
            st.setAttribute('data-kind', 'success');
            st.textContent = 'Thanks — your message was sent. Check your inbox for a confirmation.';
            form.reset();
          } else if (x.status === 429) {
            st.setAttribute('data-kind', 'error');
            st.textContent = (x.j && x.j.error) ? x.j.error : 'Too many requests. Try again shortly.';
          } else {
            st.setAttribute('data-kind', 'error');
            st.textContent = (x.j && x.j.error) ? x.j.error : 'Something went wrong. Please try again.';
          }
        }
      })
      .catch(function () {
        if (st) {
          st.setAttribute('data-kind', 'error');
          st.textContent = 'Network error.';
        }
      })
      .then(function () {
        if (btn) { btn.disabled = false; btn.textContent = 'Send message'; }
      });
  });
})();
  </script>
</body>
</html>
`;
}

module.exports = { buildStandardContactPageHtml };

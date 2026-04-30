'use strict';

import { getToken } from './config.js';
import { api } from './api.js';
import { initToast, toast } from './toast.js';

let projectId = null;
let projects = [];
let files = [];
let selectedPath = 'index.html';
let previewWidth = '100%';
/** @type {'project' | 'mirror'} */
let previewMode = 'project';

/** When the API has no site files yet, show these pages and load the public marketing mirror so preview is never blank. */
const MIRROR_PAGES = [
  { path: 'index.html', label: 'Home' },
  { path: 'agency.html', label: 'Agency' },
  { path: 'portfolio.html', label: 'Portfolio' },
  { path: 'pricing.html', label: 'Pricing' },
  { path: 'contact.html', label: 'Contact' },
];

function showAuthBanner() {
  const b = document.getElementById('pdErrorBanner');
  if (!b) return;
  b.classList.add('is-on');
  b.innerHTML =
    'Sign in required. <a href="/client-portal.html?agency=1">Open the client portal</a> with an agency account, then return here.';
}

function pageLabel(path) {
  const p = String(path || '');
  const mirror = MIRROR_PAGES.find((x) => x.path === p);
  if (mirror) return mirror.label;
  if (p === 'index.html') return 'Home';
  if (p === 'styles.css') return 'Styles';
  if (p === 'app.js') return 'Scripts';
  if (/\.html$/i.test(p)) return p.replace(/\.html$/i, '').replace(/[-_]/g, ' ');
  return p;
}

function statusForPath(path) {
  if (previewMode === 'mirror') return { label: 'Live mirror', cls: 'pub' };
  if (path === 'index.html' || path === 'styles.css') return { label: 'Published', cls: 'pub' };
  return { label: 'Draft', cls: 'draft' };
}

function escapeHtmlAttr(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

async function fetchPreviewHtml(url) {
  const t = getToken();
  const headers = {};
  if (t) headers.Authorization = `Bearer ${t}`;
  const r = await fetch(url, { headers, credentials: 'same-origin' });
  if (!r.ok) {
    const err = await r.text().catch(() => r.statusText);
    throw new Error(String(err || r.statusText || 'Preview request failed').slice(0, 400));
  }
  return r.text();
}

async function setPreviewFrame() {
  const fr = document.getElementById('pdFrame');
  const sz = document.getElementById('pdFrameSizer');
  if (!fr || !sz) return;
  fr.removeAttribute('src');
  try {
    let url;
    if (previewMode === 'mirror') {
      const p = selectedPath || 'index.html';
      url = `/${encodeURI(p)}?pdMirror=1&t=${Date.now()}`;
    } else if (projectId) {
      url = `/preview/${projectId}/${encodeURI(selectedPath)}?t=${Date.now()}`;
    } else {
      return;
    }
    const html = await fetchPreviewHtml(url);
    fr.srcdoc = html;
  } catch (e) {
    const msg = escapeHtmlAttr(e && e.message ? e.message : 'Preview failed');
    fr.srcdoc = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Preview error</title></head><body style="font-family:system-ui;padding:1rem"><p><strong>Preview could not load.</strong></p><p>${msg}</p></body></html>`;
  }
  if (previewWidth === '100%') {
    sz.style.maxWidth = '100%';
    fr.style.width = '100%';
  } else {
    sz.style.maxWidth = previewWidth;
    fr.style.width = '100%';
  }
}

function renderFileList() {
  const box = document.getElementById('pdFileList');
  if (!box) return;
  box.replaceChildren();
  const paths = (files || []).map((f) => f.path).filter(Boolean).sort();
  if (!paths.length) {
    const p = document.createElement('p');
    p.className = 'pd-pages-h';
    p.style.textTransform = 'none';
    p.style.letterSpacing = 'normal';
    p.textContent = 'No pages found — sign in and pick a project, or open Site builder from the admin workspace.';
    box.appendChild(p);
    return;
  }
  for (const path of paths) {
    if (!/\.html?$/i.test(path) && path !== 'styles.css') continue;
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'pd-row' + (path === selectedPath ? ' is-on' : '');
    const st = statusForPath(path);
    row.innerHTML = `<span>${pageLabel(path)}</span><span class="pd-badge ${st.cls}">${st.label}</span>`;
    row.addEventListener('click', () => {
      selectedPath = path;
      document.querySelectorAll('.pd-row').forEach((r) => r.classList.remove('is-on'));
      row.classList.add('is-on');
      void setPreviewFrame();
    });
    box.appendChild(row);
  }
}

async function loadFiles() {
  if (!projectId) return;
  let d = await api(`/api/admin/projects/${projectId}/site`);
  files = d.files || [];
  if (!files.length) {
    try {
      await api(`/api/admin/projects/${projectId}/site/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: 'business' }),
      });
      d = await api(`/api/admin/projects/${projectId}/site`);
      files = d.files || [];
    } catch (_) {
      /* fall through to mirror */
    }
  }
  if (!files.length) {
    previewMode = 'mirror';
    files = MIRROR_PAGES.map((row) => ({ path: row.path, updated_at: null }));
    selectedPath = 'index.html';
  } else {
    previewMode = 'project';
  }
  renderFileList();
  const prefer = files.some((f) => f.path === 'index.html') ? 'index.html' : files[0]?.path || 'index.html';
  selectedPath = prefer;
  void setPreviewFrame();
}

async function onProject(id) {
  projectId = id;
  await loadFiles();
}

async function loadProjects() {
  const d = await api('/api/admin/projects');
  projects = d.projects || [];
  const sel = document.getElementById('pdProject');
  if (!sel) return;
  sel.innerHTML = '';
  for (const p of projects) {
    const o = document.createElement('option');
    o.value = p.id;
    o.textContent = p.name;
    sel.appendChild(o);
  }
  const q = new URLSearchParams(location.search).get('project');
  const pick = q && projects.some((x) => x.id === q) ? q : projects[0]?.id;
  if (pick) {
    sel.value = pick;
    await onProject(pick);
  }
  sel.onchange = async () => {
    await onProject(sel.value);
  };
}

async function runDeploy(env) {
  if (!projectId) {
    toast('Select a project', 'error');
    return;
  }
  try {
    const r = await api(`/api/admin/projects/${projectId}/deploy`, {
      method: 'POST',
      body: JSON.stringify({ environment: env }),
    });
    const stepHint = Array.isArray(r.steps) && r.steps.length ? ` (${r.steps.length} steps logged)` : '';
    const partial = r.partial ? ' — partial / manual ZIP may be required' : '';
    toast(
      r.ok === false || r.error ? String(r.error || 'Deploy failed') : `Deploy API completed${stepHint}${partial}`,
      r.ok === false || r.error ? 'error' : 'success'
    );
  } catch (e) {
    toast(e.message || 'Deploy failed', 'error');
  }
}

function main() {
  if (!getToken()) {
    showAuthBanner();
    return;
  }
  initToast();
  document.getElementById('pdOpenMarketing')?.addEventListener('click', () => {
    window.open('/index.html', '_blank', 'noopener');
  });
  document.getElementById('pdEditPage')?.addEventListener('click', () => {
    if (!projectId) {
      toast('Select a project', 'error');
      return;
    }
    const file = encodeURIComponent(selectedPath || 'index.html');
    const pid = encodeURIComponent(projectId);
    window.open(`/site-builder?project=${pid}&file=${file}`, '_blank', 'noopener');
  });
  document.getElementById('pdPreviewUrl')?.addEventListener('click', () => {
    if (!projectId && previewMode !== 'mirror') {
      toast('Select a project', 'error');
      return;
    }
    const safePath = String(selectedPath || 'index.html').replace(/^\/+/, '');
    const url =
      previewMode === 'mirror'
        ? `${window.location.origin}/${encodeURI(safePath)}`
        : `${window.location.origin}/preview/${projectId}/${encodeURI(safePath)}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      void navigator.clipboard.writeText(url).then(() => toast('Preview URL copied', 'success'));
    } else {
      toast(url, 'info');
    }
  });
  document.getElementById('pdRefresh')?.addEventListener('click', () => void loadFiles());
  document.getElementById('pdDeployStaging')?.addEventListener('click', () => void runDeploy('staging'));
  document.getElementById('pdDeployProd')?.addEventListener('click', () => void runDeploy('production'));
  document.querySelectorAll('#pdPreviewBar .pd-dv button[data-pd]').forEach((btn) => {
    btn.addEventListener('click', () => {
      previewWidth = btn.getAttribute('data-pd') || '100%';
      document.querySelectorAll('#pdPreviewBar .pd-dv button[data-pd]').forEach((b) => {
        b.classList.toggle('is-on', b === btn);
      });
      void setPreviewFrame();
    });
  });
  void loadProjects().catch((e) => {
    const b = document.getElementById('pdErrorBanner');
    if (b) {
      b.classList.add('is-on');
      b.textContent = e.message || 'Could not load projects';
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  void main();
}

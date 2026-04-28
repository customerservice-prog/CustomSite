'use strict';

import { getToken } from './config.js';
import { api } from './api.js';
import { initToast, toast } from './toast.js';

let projectId = null;
let projects = [];
let files = [];
let selectedPath = 'index.html';
let previewWidth = '100%';

function showAuthBanner() {
  const b = document.getElementById('pdErrorBanner');
  if (!b) return;
  b.classList.add('is-on');
  b.innerHTML =
    'Sign in required. <a href="/client-portal.html?agency=1">Open the client portal</a> with an agency account, then return here.';
}

function pageLabel(path) {
  const p = String(path || '');
  if (p === 'index.html') return 'Home';
  if (p === 'styles.css') return 'Styles';
  if (p === 'app.js') return 'Scripts';
  if (/\.html$/i.test(p)) return p.replace(/\.html$/i, '').replace(/[-_]/g, ' ');
  return p;
}

function statusForPath(path) {
  if (path === 'index.html' || path === 'styles.css') return { label: 'Published', cls: 'pub' };
  return { label: 'Draft', cls: 'draft' };
}

function setPreviewFrame() {
  const fr = document.getElementById('pdFrame');
  const sz = document.getElementById('pdFrameSizer');
  if (!fr || !sz || !projectId) return;
  fr.src = `/preview/${projectId}/${encodeURI(selectedPath)}?t=${Date.now()}`;
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
    p.textContent = 'No pages yet — use Deploy or connect your project.';
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
      setPreviewFrame();
    });
    box.appendChild(row);
  }
}

async function loadFiles() {
  if (!projectId) return;
  const d = await api(`/api/admin/projects/${projectId}/site`);
  files = d.files || [];
  renderFileList();
  const prefer = files.some((f) => f.path === 'index.html') ? 'index.html' : files[0]?.path || 'index.html';
  selectedPath = prefer;
  setPreviewFrame();
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
    toast(r.ok ? 'Deploy queued' : (r.error || 'Deploy finished'), r.ok ? 'success' : 'info');
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
    if (!projectId) {
      toast('Select a project', 'error');
      return;
    }
    const path = encodeURIComponent(selectedPath || 'index.html');
    const url = `${window.location.origin}/preview/${projectId}/${path}`;
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
      setPreviewFrame();
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

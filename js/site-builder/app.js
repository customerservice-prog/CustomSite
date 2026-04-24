'use strict';

import { getToken } from './config.js';
import { getRailwaySettings, setRailwaySettings } from './config.js';
import { api, hasServerError } from './api.js';
import { initToast, toast } from './toast.js';
import { initEditor, showModel, setModelLanguage, formatDocument, removeModel } from './editor.js';

const TEMPLATE_LABELS = {
  basic: 'Basic HTML / CSS / JS',
  business: 'Business landing (hero, about, services, contact)',
  ecommerce: 'E‑commerce (product, pricing, CTA)',
  portfolio: 'Portfolio / agency (grid, about, contact)',
  restaurant: 'Restaurant (menu, hours, location)',
};

const SNIPPETS = [
  { label: 'Navbar', html: '<nav class="nav"><a href="#">Logo</a><a href="#about">About</a></nav>\n' },
  { label: 'Hero', html: '<section class="hero"><h1>Headline</h1><p>Subcopy</p></section>\n' },
  { label: 'Feature grid', html: '<div class="grid"><div class="i">1</div><div class="i">2</div><div class="i">3</div></div>\n' },
  { label: 'Footer', html: '<footer class="ft"><p>© Year · Client</p></footer>\n' },
  { label: 'Contact', html: '<form><input type="email" placeholder="Email" /><button type="button">Send</button></form>\n' },
];

let monacoI = null;
let ed = null;
let projectId = null;
let projects = [];
let fileRows = [];
let builderProject = null;
/** @type {Map<string, { content: string, encoding?: string }>} */
const mem = new Map();
const dirty = new Set();
let openTabs = [];
let activePath = null;
let autoPreviewT = null;
const debounceMs = 1500;

function isLocalDevHost() {
  const h = location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '';
}

function isLikelyConnectionError(e) {
  const m = String((e && e.message) || '');
  if (m.includes('Session expired') || m.includes('Sign in again')) return false;
  return /could not reach|network|connect|Failed to fetch|Load failed|NetworkError|offline/i.test(m);
}

function connectionHint(e) {
  const base = (e && e.message) || 'Could not reach the server.';
  if (isLocalDevHost()) {
    return `${base} For local work, run \`npm run dev\` in the project folder.`;
  }
  return `${base} On the live site, use the same domain as the API (e.g. customsite.online), sign in with an agency account at /client-portal.html?agency=1, and confirm your host (e.g. Railway) is online.`;
}

const TEMPLATE_THUMB = {
  basic: 'linear-gradient(135deg,#312e81,#4f46e5)',
  business: 'linear-gradient(135deg,#0f172a,#334155)',
  ecommerce: 'linear-gradient(135deg,#7c2d12,#ea580c)',
  portfolio: 'linear-gradient(135deg,#44403c,#78716c)',
  restaurant: 'linear-gradient(135deg,#78350f,#b45309)',
};

function isImageFile(p) {
  return /\.(png|jpe?g|gif|webp|ico)$/i.test(p || '');
}

function phaseClass(st) {
  const s = (st || 'discovery').toLowerCase();
  if (s === 'live') return 'ph-live';
  if (s === 'review') return 'ph-review';
  if (s === 'development' || s === 'develop') return 'ph-development';
  if (s === 'design') return 'ph-design';
  return 'ph-discovery';
}

function stagingPreviewUrl() {
  if (!projectId) return '';
  return `${location.origin}/preview/${projectId}/index.html`;
}

function getDeployEnv() {
  const v = document.querySelector('input[name="sbenv"]:checked');
  return v && v.value === 'production' ? 'production' : 'staging';
}

function showBanner(msg) {
  const b = document.getElementById('sbErrorBanner');
  b.textContent = msg;
  b.classList.add('is-on');
}

function hideEmpty() {
  const has = fileRows && fileRows.length;
  const e = document.getElementById('sbEmptyState');
  if (has) e.classList.remove('is-on');
  else e.classList.add('is-on');
}

function setBreadcrumb() {
  document.getElementById('sbFileLabel').textContent = activePath || '—';
  updateDirtyMark();
}

function updateDirtyMark() {
  const dm = document.getElementById('sbDirtyMark');
  if (dm) dm.hidden = !activePath || !dirty.has(activePath);
}

function setDeployLogOpen(on) {
  const p = document.getElementById('sbLogPanel');
  const b = document.getElementById('sbLogToggle');
  if (!p) return;
  p.classList.toggle('is-on', on);
  if (on) p.removeAttribute('hidden');
  else p.setAttribute('hidden', '');
  if (b) b.setAttribute('aria-expanded', on ? 'true' : 'false');
}

function setPreviewUrlText() {
  const u = stagingPreviewUrl();
  const wrap = document.getElementById('sbStageLinkWrap');
  const a = document.getElementById('sbStageLink');
  const ph = document.getElementById('sbPreviewUrl');
  if (wrap) wrap.style.display = u ? 'inline' : 'none';
  if (a && u) {
    a.href = u;
    a.textContent = u.replace(/^https?:\/\//, '');
  }
  if (ph) {
    const ru = getRailwayUrl();
    ph.textContent = ru || u || '—';
  }
  const purl = document.getElementById('sbPageSpeed');
  if (purl) purl.href = u ? `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(u)}` : '#';
}

function refreshPreview() {
  const ifr = document.getElementById('sbPreviewFrame');
  if (!projectId) return;
  if (activePath && isImageFile(activePath)) return;
  if (ifr) {
    ifr.src = `/preview/${projectId}/index.html?t=${Date.now()}`;
  }
  setPreviewUrlText();
}

function getRailwayUrl() {
  if (!builderProject) return '';
  const env = getDeployEnv();
  if (env === 'production' && builderProject.railway_url_production) {
    return builderProject.railway_url_production;
  }
  if (builderProject.railway_url_staging) {
    return builderProject.railway_url_staging;
  }
  return '';
}

/**
 * Document base for preview: must match the file's folder in site storage so
 * relative links (css/, ../assets/) resolve like the live /preview/ URL.
 */
function previewBaseHrefForFile(filePath) {
  if (!projectId) return '';
  const p = String(filePath || 'index.html').replace(/^\//, '');
  const i = p.lastIndexOf('/');
  const dir = i < 0 ? '' : p.slice(0, i);
  const rel = dir ? `${dir}/` : '';
  return new URL(`/preview/${projectId}/${rel}`, location.origin).href;
}

/**
 * Injects a <base> tag so about:blank document.write() previews still load
 * the full multi-file site from the preview path (not the agency shell).
 * Replaces an existing <base> so templates don't point at the wrong origin.
 */
function htmlWithPreviewBase(raw) {
  const baseHref = previewBaseHrefForFile(activePath);
  if (!baseHref) return String(raw);
  const tag = `<base href="${baseHref}">`;
  const str = String(raw);
  if (/<base\s[^>]*>/i.test(str)) {
    return str.replace(/<base\s[^>]*>/i, tag);
  }
  if (/<head[^>]*>/i.test(str)) {
    return str.replace(/<head([^>]*)>/i, (m, attrs) => `<head${attrs}>\n${tag}\n`);
  }
  if (/<html[^>]*>/i.test(str)) {
    return str.replace(
      /<html[^>]*>/i,
      (m) => `${m}\n<head><meta charset="utf-8" />${tag}</head>`
    );
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8" />${tag}</head><body>\n${str}\n</body></html>`;
}

function liveWritePreview() {
  const ifr = document.getElementById('sbPreviewFrame');
  if (!ifr || !ed || !activePath) return;
  if (!activePath.toLowerCase().endsWith('.html')) return;
  const html = htmlWithPreviewBase(ed.getValue());
  try {
    const doc = ifr.contentDocument || (ifr.contentWindow && ifr.contentWindow.document);
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  } catch (e) {
    /* cross-origin or blocked */
  }
}

function scheduleLivePreview() {
  if (!document.getElementById('sbAutoPreview')?.checked) return;
  clearTimeout(autoPreviewT);
  autoPreviewT = setTimeout(liveWritePreview, debounceMs);
}

function markDirty(p, on) {
  if (on) dirty.add(p);
  else dirty.delete(p);
  renderTabs();
  updateDirtyMark();
}

function renderTabs() {
  const bar = document.getElementById('sbTabBar');
  bar.replaceChildren();
  for (const p of openTabs) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sb-tab' + (p === activePath ? ' is-active' : '');
    b.setAttribute('role', 'tab');
    b.innerHTML = `<span>${escapeHtml(simpleName(p))}</span><span class="dirty" aria-label="unsaved">${dirty.has(p) ? ' •' : ''}</span>
      <span class="close" data-path="${encodeURIComponent(p)}" title="Close">×</span>`;
    b.addEventListener('click', (e) => {
      if (e.target.closest('.close')) {
        e.stopPropagation();
        closeTab(p);
        return;
      }
      void activatePath(p, false);
    });
    bar.appendChild(b);
  }
  bar.querySelectorAll('.close').forEach((c) => {
    c.addEventListener('click', (e) => {
      e.stopPropagation();
      const path = decodeURIComponent(c.getAttribute('data-path') || '');
      if (path) closeTab(path);
    });
  });
  updateDirtyMark();
}

function simpleName(p) {
  const i = p.lastIndexOf('/');
  return i < 0 ? p : p.slice(i + 1);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function closeTab(p) {
  const i = openTabs.indexOf(p);
  if (i < 0) return;
  openTabs = openTabs.filter((x) => x !== p);
  removeModel(p);
  if (p === activePath) {
    const next = openTabs[openTabs.length - 1] || null;
    void activatePath(next, false);
  } else {
    renderTabs();
  }
}

function ensureTab(p) {
  if (openTabs.includes(p)) return;
  openTabs.push(p);
}

async function loadFileContent(p) {
  const c = mem.get(p);
  if (c) return c;
  const r = await api(`/api/admin/projects/${projectId}/site/file?path=${encodeURIComponent(p)}`);
  const entry = { content: r.content, encoding: r.content_encoding || 'utf8' };
  mem.set(p, entry);
  return entry;
}

async function activatePath(p, reload) {
  if (!p) {
    activePath = null;
    document.getElementById('sbImagePreview')?.classList.remove('is-on');
    document.getElementById('sbMonacoHost')?.style.setProperty('visibility', 'visible');
    setBreadcrumb();
    renderTabs();
    return;
  }
  activePath = p;
  ensureTab(p);
  setBreadcrumb();
  document.getElementById('sbEmptyState')?.classList.remove('is-on');
  if (isImageFile(p)) {
    document.getElementById('sbMonacoHost')?.style.setProperty('visibility', 'hidden');
    const en = mem.get(p) || (await loadFileContent(p));
    const img = document.getElementById('sbImgTag');
    const box = document.getElementById('sbImagePreview');
    box.classList.add('is-on');
    if (en.encoding === 'base64' && p.toLowerCase().endsWith('.svg') === false) {
      const mime = p.toLowerCase().endsWith('.png')
        ? 'image/png'
        : p.toLowerCase().endsWith('.gif')
          ? 'image/gif'
          : p.toLowerCase().endsWith('.webp')
            ? 'image/webp'
            : 'image/jpeg';
      img.src = `data:${mime};base64,${en.content}`;
    } else {
      const blob = new Blob([en.content], { type: 'text/plain;charset=utf-8' });
      img.src = URL.createObjectURL(blob);
    }
    return;
  }
  document.getElementById('sbImagePreview')?.classList.remove('is-on');
  document.getElementById('sbMonacoHost')?.style.setProperty('visibility', 'visible');
  const en = mem.get(p);
  if (!en || reload) {
    const x = await loadFileContent(p);
    mem.set(p, x);
  }
  const content = (mem.get(p) || { content: '' }).content;
  if (ed) {
    showModel(ed, p, content);
    setModelLanguage(ed, p);
  }
  ed?.focus();
  renderTabs();
  document.querySelectorAll('#sbFileTree .sb-f-item').forEach((el) => {
    el.classList.toggle('is-active', el.dataset.path === p);
  });
}

async function loadFileList() {
  if (!projectId) {
    fileRows = [];
    return;
  }
  const d = await api(`/api/admin/projects/${projectId}/site`);
  fileRows = d.files || [];
  hideEmpty();
  buildTree();
  const paths = (fileRows || []).map((f) => f.path).filter(Boolean);
  if (paths.length && !openTabs.length) {
    const prefer = paths.includes('index.html') ? 'index.html' : paths[0];
    await activatePath(prefer, true);
  } else if (!paths.length) {
    await activatePath(null, false);
  }
  renderTabs();
}

function buildTree() {
  const box = document.getElementById('sbFileTree');
  box.replaceChildren();
  const paths = (fileRows || []).map((f) => f.path).filter(Boolean);
  function ico(p) {
    if (/\.html?$/i.test(p)) return 'html';
    if (/\.css$/i.test(p)) return 'css';
    if (/\.(js|mjs)$/i.test(p)) return 'js';
    if (/\.(png|jpe?g|gif|webp|svg|ico)$/i.test(p)) return 'img';
    return 'txt';
  }
  const byFolder = new Map();
  for (const p of paths) {
    const i = p.lastIndexOf('/');
    const folder = i < 0 ? '' : p.slice(0, i);
    if (!byFolder.has(folder)) byFolder.set(folder, []);
    byFolder.get(folder).push(p);
  }
  const folderKeys = Array.from(byFolder.keys()).sort((a, b) => a.localeCompare(b));
  for (const folder of folderKeys) {
    if (folder) {
      const hd = document.createElement('div');
      hd.className = 'sb-f-folder';
      hd.textContent = folder + '/';
      box.appendChild(hd);
    }
    const files = (byFolder.get(folder) || []).sort();
    for (const path of files) {
      const row = document.createElement('div');
      row.className = 'sb-f-item' + (path === activePath ? ' is-active' : '');
      row.dataset.path = path;
      const ic = ico(path);
      row.innerHTML = `<span class="sb-ico ${ic}"></span><span>${escapeHtml(path)}</span>`;
      row.addEventListener('click', () => {
        void activatePath(path, true);
        document.querySelectorAll('.sb-f-item').forEach((n) => n.classList.remove('is-active'));
        row.classList.add('is-active');
      });
      row.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showCtx(e.clientX, e.clientY, path);
      });
      box.appendChild(row);
    }
  }
  renderTabs();
}

let ctxPath = null;
function showCtx(x, y, path) {
  ctxPath = path;
  const m = document.getElementById('sbContextMenu');
  m.classList.add('is-on');
  m.style.left = `${Math.min(x, window.innerWidth - 160)}px`;
  m.style.top = `${Math.min(y, window.innerHeight - 120)}px`;
  m.replaceChildren();
  for (const [l, fn] of [
    ['Rename', 'ren'],
    ['Delete', 'del'],
  ]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = l;
    b.setAttribute('role', 'menuitem');
    b.addEventListener('click', () => {
      m.classList.remove('is-on');
      if (fn === 'del') void deleteFilePath(path);
      if (fn === 'ren') void renamePath(path);
    });
    m.appendChild(b);
  }
}
document.addEventListener('click', () => {
  document.getElementById('sbContextMenu')?.classList.remove('is-on');
});

async function deleteFilePath(path) {
  const ok = await showConfirm('Delete this file?', path);
  if (!ok) return;
  if (!projectId) return;
  try {
    await api(`/api/admin/projects/${projectId}/site/file?path=${encodeURIComponent(path)}`, { method: 'DELETE' });
    mem.delete(path);
    openTabs = openTabs.filter((p) => p !== path);
    if (activePath === path) void activatePath(openTabs[0] || null, false);
    else void activatePath(activePath, true);
    toast('Deleted', 'success');
    await loadFileList();
  } catch (e) {
    toast(e.message, 'error');
  }
}

function showConfirm(title, body) {
  return new Promise((resolve) => {
    const mo = document.getElementById('sbModalBg');
    document.getElementById('sbModalTitle').textContent = title;
    document.getElementById('sbModalBody').textContent = body;
    mo.classList.add('is-on');
    const onDone = (v) => {
      mo.classList.remove('is-on');
      mo.removeEventListener('click', onBg);
      resolve(v);
    };
    function onBg(e) {
      if (e.target === mo) onDone(false);
    }
    mo.addEventListener('click', onBg);
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '0.4rem';
    row.style.marginTop = '0.5rem';
    const y = document.createElement('button');
    y.type = 'button';
    y.className = 'sb-btn sb-btn-primary';
    y.textContent = 'Confirm';
    y.onclick = () => onDone(true);
    const n = document.createElement('button');
    n.type = 'button';
    n.className = 'sb-btn';
    n.textContent = 'Cancel';
    n.onclick = () => onDone(false);
    const bodyEl = document.getElementById('sbModalBody');
    bodyEl.replaceChildren();
    bodyEl.appendChild(document.createTextNode(body));
    bodyEl.appendChild(row);
    row.appendChild(y);
    row.appendChild(n);
  });
}

async function showPromptModal(title, label, defaultVal) {
  return new Promise((resolve) => {
    const mo = document.getElementById('sbModalBg');
    document.getElementById('sbModalTitle').textContent = title;
    const bodyEl = document.getElementById('sbModalBody');
    bodyEl.replaceChildren();
    const lab = document.createElement('label');
    lab.style.display = 'block';
    lab.style.fontSize = '0.85rem';
    lab.style.color = '#94a3b8';
    lab.textContent = label;
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'sb-inp';
    inp.style.width = '100%';
    inp.style.marginTop = '0.35rem';
    inp.style.boxSizing = 'border-box';
    inp.value = defaultVal || '';
    bodyEl.appendChild(lab);
    bodyEl.appendChild(inp);
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '0.4rem';
    row.style.marginTop = '0.6rem';
    const y = document.createElement('button');
    y.type = 'button';
    y.className = 'sb-btn sb-btn-primary';
    y.textContent = 'OK';
    const n = document.createElement('button');
    n.type = 'button';
    n.className = 'sb-btn';
    n.textContent = 'Cancel';
    const onDone = (v) => {
      mo.classList.remove('is-on');
      mo.removeEventListener('click', onBg);
      resolve(v);
    };
    function onBg(e) {
      if (e.target === mo) onDone(null);
    }
    y.onclick = () => onDone(inp.value.trim());
    n.onclick = () => onDone(null);
    mo.addEventListener('click', onBg);
    mo.classList.add('is-on');
    row.appendChild(y);
    row.appendChild(n);
    bodyEl.appendChild(row);
    setTimeout(() => inp.focus(), 50);
  });
}

async function renamePath(path) {
  const np = await showPromptModal('Rename file', 'New path (e.g. css/main.css)', path);
  if (np == null || !np || np === path) return;
  if (np.includes('..') || np.startsWith('/')) {
    toast('Invalid path', 'error');
    return;
  }
  try {
    const cur = mem.get(path) || (await loadFileContent(path));
    await api(`/api/admin/projects/${projectId}/site/file`, {
      method: 'PUT',
      body: JSON.stringify({
        path: np,
        content: cur.content,
        content_encoding: cur.encoding === 'base64' ? 'base64' : 'utf8',
      }),
    });
    await api(`/api/admin/projects/${projectId}/site/file?path=${encodeURIComponent(path)}`, { method: 'DELETE' });
    mem.delete(path);
    removeModel(path);
    mem.set(np, { content: cur.content, encoding: cur.encoding });
    openTabs = openTabs.map((p) => (p === path ? np : p));
    if (activePath === path) activePath = np;
    toast('Renamed', 'success');
    await loadFileList();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function saveCurrent() {
  if (!projectId || !activePath) {
    toast('Select a file', 'error');
    return;
  }
  if (isImageFile(activePath)) {
    return;
  }
  const c = mem.get(activePath) || { content: '' };
  c.content = ed.getValue();
  mem.set(activePath, c);
  const btn = document.getElementById('sbSave');
  btn.setAttribute('aria-busy', 'true');
  try {
    await api(`/api/admin/projects/${projectId}/site/file`, {
      method: 'PUT',
      body: JSON.stringify({ path: activePath, content: c.content, content_encoding: 'utf8' }),
    });
    dirty.delete(activePath);
    renderTabs();
    updateDirtyMark();
    toast('Saved', 'success');
    refreshPreview();
  } catch (e) {
    if (isLikelyConnectionError(e)) {
      showBanner(connectionHint(e));
    }
    toast(e.message, 'error');
  } finally {
    btn.removeAttribute('aria-busy');
  }
}

async function loadProjects() {
  const d = await api('/api/admin/projects');
  projects = d.projects || [];
  const s = document.getElementById('sbProject');
  s.innerHTML = '<option value="">Select project…</option>';
  for (const p of projects) {
    const o = document.createElement('option');
    o.value = p.id;
    const client = p.client;
    o.textContent = `${p.name} — ${(client && client.email) || ''}`;
    s.appendChild(o);
  }
  const q = new URLSearchParams(location.search).get('project');
  if (q) {
    s.value = q;
    await onProjectPicked(q);
  }
  s.addEventListener('change', async () => {
    await onProjectPicked(s.value || null);
  });
}

async function onProjectPicked(id) {
  projectId = id;
  mem.clear();
  dirty.clear();
  openTabs = [];
  activePath = null;
  builderProject = null;
  if (!id) {
    document.getElementById('sbPhaseBadge').setAttribute('hidden', '');
    setPreviewUrlText();
    return;
  }
  try {
    const b = await api(`/api/admin/projects/${id}/builder`).catch(() => null);
    if (b) builderProject = b.project;
  } catch {
    /* */
  }
  const proj = projects.find((x) => x.id === id) || (builderProject && { ...builderProject, client: {} });
  const badge = document.getElementById('sbPhaseBadge');
  if (proj) {
    const c = builderProject?.client || proj.client;
    const ph = (builderProject && builderProject.status) || proj.status;
    const label = c && (c.full_name || c.company) ? c.company || c.full_name : c && c.email;
    const phLabel = (ph || '—').replace(/-/g, ' ');
    badge.innerHTML = `${escapeHtml(label || 'Client')} <span class="sb-ph-label">${escapeHtml(phLabel)}</span>`;
    badge.className = 'sb-badge ' + phaseClass(ph);
    badge.removeAttribute('hidden');
  } else {
    badge.setAttribute('hidden', '');
  }
  fillSeo();
  setPreviewUrlText();
  await loadFileList();
  if (fileRows && fileRows.length) {
    const p = (fileRows.find((f) => f.path === 'index.html') && 'index.html') || fileRows[0].path;
    await activatePath(p, true);
  } else {
    void activatePath(null, false);
  }
  refreshPreview();
}

function fillSeo() {
  const s = (builderProject && builderProject.site_settings) || {};
  const seo = s.seo || {};
  if (document.getElementById('seoTitle')) document.getElementById('seoTitle').value = seo.title || '';
  if (document.getElementById('seoDesc')) document.getElementById('seoDesc').value = seo.description || '';
  if (document.getElementById('seoOg')) document.getElementById('seoOg').value = seo.ogImage || '';
  if (document.getElementById('seoCanon')) document.getElementById('seoCanon').value = seo.canonical || '';
  if (document.getElementById('sbCustomDomain') && builderProject) {
    document.getElementById('sbCustomDomain').value = builderProject.custom_domain || '';
  }
}

function collectSeo() {
  return {
    title: document.getElementById('seoTitle')?.value || '',
    description: document.getElementById('seoDesc')?.value || '',
    ogImage: document.getElementById('seoOg')?.value || '',
    canonical: document.getElementById('seoCanon')?.value || '',
  };
}

function injectSeoIntoHtml(html, seo) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  if (!doc.head) return html;
  if (seo.title) {
    let t = doc.querySelector('title');
    if (!t) {
      t = doc.createElement('title');
      doc.head.appendChild(t);
    }
    t.textContent = seo.title;
  }
  if (seo.description) {
    let m = doc.querySelector('meta[name="description"]');
    if (!m) {
      m = doc.createElement('meta');
      m.setAttribute('name', 'description');
      doc.head.appendChild(m);
    }
    m.setAttribute('content', seo.description);
  }
  if (seo.ogImage) {
    let m = doc.querySelector('meta[property="og:image"]');
    if (!m) {
      m = doc.createElement('meta');
      m.setAttribute('property', 'og:image');
      doc.head.appendChild(m);
    }
    m.setAttribute('content', seo.ogImage);
  }
  if (seo.canonical) {
    let l = doc.querySelector('link[rel="canonical"]');
    if (!l) {
      l = doc.createElement('link');
      l.setAttribute('rel', 'canonical');
      doc.head.appendChild(l);
    }
    l.setAttribute('href', seo.canonical);
  }
  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
}

async function loadBuilderMeta() {
  if (!projectId) return;
  try {
    const b = await api(`/api/admin/projects/${projectId}/builder`);
    builderProject = b.project;
    fillSeo();
  } catch {
    /* */
  }
}

function setupSnippets() {
  const ul = document.getElementById('sbSnippets');
  ul.replaceChildren();
  for (const s of SNIPPETS) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = s.label;
    b.addEventListener('click', () => {
      if (!ed || !activePath || isImageFile(activePath) || !monacoI) return;
      const pos = ed.getPosition();
      const R = monacoI.Range;
      const range = new R(pos.lineNumber, pos.column, pos.lineNumber, pos.column);
      ed.executeEdits('snip', [{ range, text: s.html, forceMoveMarkers: true }]);
    });
    li.appendChild(b);
    ul.appendChild(li);
  }
}

function setupResLinks() {
  document.getElementById('sbResLinks')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!ed || !monacoI) return;
    const t = e.target;
    const R = monacoI.Range;
    const headIns = (txt) => ed.executeEdits('f', [{ range: new R(1, 1, 1, 1), text: txt }]);
    if (t.getAttribute('data-font')) {
      const link =
        '<link rel="preconnect" href="https://fonts.googleapis.com" />\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />\n';
      headIns(link);
      return;
    }
    if (t.getAttribute('data-cdn') === 'lucide') {
      headIns('<script src="https://unpkg.com/lucide@latest"><\/script>\n');
      return;
    }
    if (t.getAttribute('data-cdn') === 'fa') {
      headIns(
        '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" crossorigin="anonymous" />\n'
      );
    }
  });
}

async function runFindInFiles() {
  const q = (document.getElementById('sbFindQ')?.value || '').trim();
  if (!q || !projectId) {
    toast('Enter search text and select a project', 'error');
    return;
  }
  const res = document.getElementById('sbSearchResults');
  res.textContent = 'Searching…';
  const hits = [];
  for (const f of fileRows) {
    const fr = f.path;
    if (isImageFile(fr)) continue;
    const c = (mem.get(fr) || (await loadFileContent(fr))).content;
    if (c.includes(q)) hits.push(fr + ': ' + c.split(q)[0].slice(-40) + '…');
  }
  res.textContent = hits.length ? hits.join('\n\n') : 'No matches';
}
function openFindInFiles() {
  const o = document.getElementById('sbFindOverlay');
  o?.classList.remove('is-off');
  o?.classList.add('is-on');
  o?.setAttribute('aria-hidden', 'false');
  setTimeout(() => document.getElementById('sbFindQ')?.focus(), 50);
}
function closeFindInFiles() {
  const o = document.getElementById('sbFindOverlay');
  o?.classList.remove('is-on');
  o?.classList.add('is-off');
  o?.setAttribute('aria-hidden', 'true');
}

let cmdIdx = 0;
function showCommandPalette() {
  const p = document.getElementById('sbCommandPal');
  const inp = document.getElementById('sbCommandInput');
  p.classList.add('is-on');
  inp.value = '';
  inp.focus();
  const cmds = [
    { label: 'Save file', run: () => void saveCurrent() },
    { label: 'Init starter (templates)', run: () => openInit() },
    { label: 'Find in files (Ctrl+Shift+F)', run: () => openFindInFiles() },
    {
      label: 'Toggle deploy log',
      run: () => {
        const p = document.getElementById('sbLogPanel');
        setDeployLogOpen(!p?.classList.contains('is-on'));
      },
    },
    { label: 'Open settings', run: () => openSettings() },
    ...fileRows.map((f) => ({
      label: 'Open: ' + f.path,
      run: () => void activatePath(f.path, true),
    })),
  ];
  function render() {
    const q = (inp.value || '').toLowerCase();
    const list = document.getElementById('sbCommandList');
    list.replaceChildren();
    const m = cmds.filter((c) => c.label.toLowerCase().includes(q));
    m.forEach((c, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = c.label;
      b.className = i === 0 ? 'is-hi' : '';
      b.addEventListener('click', () => {
        c.run();
        p.classList.remove('is-on');
      });
      list.appendChild(b);
    });
  }
  cmdIdx = 0;
  render();
  inp.oninput = render;
  inp.onkeydown = (e) => {
    if (e.key === 'Escape') p.classList.remove('is-on');
  };
}
function openInit() {
  const m = document.getElementById('sbInitModal');
  const g = document.getElementById('sbInitGrid');
  g.replaceChildren();
  const order = ['basic', 'business', 'ecommerce', 'portfolio', 'restaurant'];
  for (const id of order) {
    const label = TEMPLATE_LABELS[id];
    if (!label) continue;
    const card = document.createElement('label');
    card.className = 'sb-tpl-card';
    card.innerHTML = `
      <input type="radio" name="tpl" value="${id}" />
      <div class="sb-tpl-thumb" style="background:${TEMPLATE_THUMB[id] || '#334155'}"></div>
      <div class="sb-tpl-txt">${escapeHtml(label)}<small>Template pack</small></div>`;
    g.appendChild(card);
  }
  const syncSel = () => {
    g.querySelectorAll('.sb-tpl-card').forEach((card) => {
      const inp = card.querySelector('input[name="tpl"]');
      card.classList.toggle('is-selected', inp && inp.checked);
    });
  };
  m.classList.add('is-on');
  const first = m.querySelector('input[name="tpl"]');
  if (first) {
    first.checked = true;
    document.getElementById('sbInitConfirm').disabled = false;
  }
  syncSel();
  m.querySelectorAll('input[name="tpl"]').forEach((r) => {
    r.addEventListener('change', () => {
      document.getElementById('sbInitConfirm').disabled = false;
      syncSel();
    });
  });
}
function openSettings() {
  const rs = getRailwaySettings();
  document.getElementById('sbRailToken').value = rs.token;
  document.getElementById('sbRailTeam').value = rs.teamId;
  document.getElementById('sbSettingsPanel').classList.add('is-on');
}

async function runDeploy(kind) {
  if (!projectId) {
    toast('Select a project', 'error');
    return;
  }
  const log = document.getElementById('sbLogBody');
  setDeployLogOpen(true);
  const rs = getRailwaySettings();
  log.textContent = 'Starting…\n';
  try {
    const r = await api(`/api/admin/projects/${projectId}/deploy`, {
      method: 'POST',
      body: JSON.stringify({
        environment: kind,
        teamId: rs.teamId || undefined,
        token: rs.token || undefined,
      }),
    });
    if (r.steps) {
      for (const s of r.steps) {
        log.textContent += `${s.status === 'done' ? '✓' : s.status === 'error' ? '✗' : '…'} ${s.label} ${(s.detail && ` — ${s.detail}`) || ''}\n`;
      }
    }
    if (r.publicUrl) {
      log.textContent += `Live: ${r.publicUrl}\n`;
      if (r.note) log.textContent += r.note + '\n';
    }
    if (r.error) {
      log.textContent += 'Error: ' + r.error + '\n';
    }
    if (r.downloadZip || r.manualUrl) {
      log.textContent += 'ZIP: ' + (r.manualUrl || r.downloadZip) + '\n';
    }
    await loadBuilderMeta();
    refreshPreview();
    toast('Deploy step finished (see log)', r.ok && !r.error ? 'success' : 'error');
  } catch (e) {
    log.textContent += e.message;
    toast(e.message, 'error');
  }
}

async function main() {
  if (!getToken()) return;
  initToast();
  if (hasServerError()) {
    /* api sets on fetch */
  }
  const host = document.getElementById('sbMonacoHost');
  const { monaco, editor } = await initEditor(host);
  monacoI = monaco;
  ed = editor;
  ed.onDidChangeModelContent(() => {
    if (activePath) {
      if (!isImageFile(activePath)) {
        mem.set(activePath, { content: ed.getValue(), encoding: 'utf8' });
        markDirty(activePath, true);
      }
      scheduleLivePreview();
    }
  });
  setupSnippets();
  setupResLinks();

  document.getElementById('sbSave').addEventListener('click', () => void saveCurrent());
  document.getElementById('sbFormat').addEventListener('click', () => {
    if (ed) formatDocument(ed);
  });
  document.getElementById('sbUndo')?.addEventListener('click', () => {
    ed?.trigger('browser', 'undo', null);
  });
  document.getElementById('sbRedo')?.addEventListener('click', () => {
    ed?.trigger('browser', 'redo', null);
  });
  document.getElementById('sbToggleSide').addEventListener('click', () => {
    document.getElementById('sbSidebar').classList.toggle('is-off');
  });
  document.getElementById('sbTogglePreview')?.addEventListener('click', () => {
    document.getElementById('sbPreview')?.classList.toggle('is-off');
  });
  document.getElementById('sbDeployS')?.addEventListener('click', () => {
    document.querySelector('input[name="sbenv"][value="staging"]')?.click();
    void runDeploy('staging');
  });
  document.getElementById('sbDeployP')?.addEventListener('click', () => {
    document.querySelector('input[name="sbenv"][value="production"]')?.click();
    void runDeploy('production');
  });
  document.getElementById('sbExport')?.addEventListener('click', async () => {
    if (!projectId) {
      toast('Select a project', 'error');
      return;
    }
    try {
      const blob = await api(`/api/admin/projects/${projectId}/site/export`);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `project-${projectId}.zip`;
      a.click();
      toast('Download started', 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  });
  document.getElementById('sbSettings')?.addEventListener('click', openSettings);
  document.getElementById('sbInitBtn')?.addEventListener('click', openInit);
  document.getElementById('sbInitCancel')?.addEventListener('click', () => {
    document.getElementById('sbInitModal').classList.remove('is-on');
  });
  document.getElementById('sbInitConfirm')?.addEventListener('click', async () => {
    const sel = document.querySelector('input[name="tpl"]:checked');
    const tpl = (sel && sel.value) || 'basic';
    document.getElementById('sbInitModal').classList.remove('is-on');
    if (!projectId) return;
    const ok = await showConfirm('Init starter', 'Overwrite or create starter files?');
    if (!ok) return;
    try {
      await api(`/api/admin/projects/${projectId}/site/init`, {
        method: 'POST',
        body: JSON.stringify({ template: tpl }),
      });
      mem.clear();
      openTabs = [];
      toast('Starter created', 'success');
      await loadFileList();
      void activatePath('index.html', true);
      refreshPreview();
    } catch (e) {
      toast(e.message, 'error');
    }
  });
  document.getElementById('sbFilePlus')?.addEventListener('click', () => {
    const n = document.getElementById('sbNewFileInput');
    n.style.display = n.style.display === 'block' ? 'none' : 'block';
    n.focus();
  });
  document.getElementById('sbNewFileInput')?.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    let p = (e.target.value || '').replace(/^\//, '').trim();
    e.target.value = '';
    e.target.style.display = 'none';
    if (!p || p.includes('..') || !projectId) return;
    mem.set(p, { content: '', encoding: 'utf8' });
    void activatePath(p, false);
    try {
      await saveCurrent();
      await loadFileList();
    } catch {
      /* */
    }
  });
  const fi = document.getElementById('sbFileInputHidden');
  const dz = document.getElementById('sbDropZone');
  async function doUpload(f) {
    if (!f || !projectId) return;
    const fd = new FormData();
    fd.append('file', f);
    try {
      const r = await fetch(`/api/admin/projects/${projectId}/site/upload-asset`, {
        method: 'POST',
        body: fd,
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || r.statusText);
      }
      const j = await r.json();
      toast('Uploaded: ' + j.path, 'success');
      mem.delete(j.path);
      await loadFileList();
    } catch (e) {
      toast(e.message, 'error');
    }
  }
  fi?.addEventListener('change', () => {
    if (fi.files[0]) void doUpload(fi.files[0]);
    fi.value = '';
  });
  dz?.addEventListener('click', () => fi?.click());
  dz?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dz.classList.add('sb-dz-hi');
  });
  dz?.addEventListener('dragleave', () => dz.classList.remove('sb-dz-hi'));
  dz?.addEventListener('drop', (e) => {
    e.preventDefault();
    dz.classList.remove('sb-dz-hi');
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) void doUpload(f);
  });
  document.getElementById('sbOpenTab')?.addEventListener('click', () => {
    const u = getRailwayUrl() || stagingPreviewUrl();
    if (u) window.open(u, '_blank', 'noopener');
  });
  document.getElementById('sbViewSource')?.addEventListener('click', () => {
    const ifr = document.getElementById('sbPreviewFrame');
    let html = '';
    try {
      const d = ifr && ifr.contentDocument;
      if (d && d.documentElement) {
        html = d.documentElement.outerHTML;
      }
    } catch {
      html = '';
    }
    if (!html && ed) html = ed.getValue();
    document.getElementById('sbSourceBody').textContent = html || '';
    document.getElementById('sbSourceModal').classList.add('is-on');
  });
  document.getElementById('sbSourceModal')?.addEventListener('click', (e) => {
    if (e.target.hasAttribute('data-close') || e.target.id === 'sbSourceModal') {
      document.getElementById('sbSourceModal').classList.remove('is-on');
    }
  });
  function setFrameWidth(w) {
    const fr = document.getElementById('sbPreviewFrame');
    if (!fr) return;
    if (w === 100) {
      fr.style.width = '100%';
    } else {
      fr.style.width = w + 'px';
    }
    document.querySelectorAll('#sbPreviewHead .sb-dv .sb-btn[data-dv]').forEach((b) => {
      b.classList.toggle('is-on', b.getAttribute('data-dv') == String(w));
    });
  }
  document.getElementById('sbPreviewHead')?.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-dv]');
    if (b) setFrameWidth(b.getAttribute('data-dv') === '100' ? 100 : parseInt(b.getAttribute('data-dv'), 10));
  });
  setFrameWidth(100);
  document.getElementById('sbTestRail')?.addEventListener('click', async () => {
    const t = document.getElementById('sbRailToken').value;
    const team = document.getElementById('sbRailTeam').value;
    setRailwaySettings({ token: t, teamId: team });
    try {
      const r = await api('/api/admin/railway/verify', { method: 'POST', body: JSON.stringify({ token: t, teamId: team }) });
      if (r.ok) toast('Token OK' + (r.teams && r.teams[0] ? ' — ' + r.teams[0].name : ''), 'success');
      else toast(r.error || 'Failed', 'error');
    } catch (e) {
      toast(e.message, 'error');
    }
  });
  document.getElementById('sbSaveSettings')?.addEventListener('click', async () => {
    if (!projectId) return;
    const se = collectSeo();
    const cd = document.getElementById('sbCustomDomain')?.value || '';
    try {
      const body = { custom_domain: cd || null, site_settings: { seo: se } };
      await api(`/api/admin/projects/${projectId}/builder`, { method: 'PATCH', body: JSON.stringify(body) });
      await loadBuilderMeta();
      toast('Settings saved', 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  });
  document.getElementById('sbApplySeo')?.addEventListener('click', async () => {
    if (activePath !== 'index.html' || isImageFile('index.html')) {
      const ok = await showConfirm('Open index.html', 'Switch to index.html to apply SEO?');
      if (ok) await activatePath('index.html', true);
    }
    if (activePath !== 'index.html') return;
    const se = collectSeo();
    const h = ed.getValue();
    const next = injectSeoIntoHtml(h, se);
    ed.setValue(next);
    mem.set('index.html', { content: next, encoding: 'utf8' });
    markDirty('index.html', true);
    void saveCurrent();
  });
  document.getElementById('sbCopyCname')?.addEventListener('click', () => {
    const target = (getRailwayUrl() || document.getElementById('sbDomainHint')?.textContent || '').replace(/^.*?:\/\//, '');
    const u = (builderProject && builderProject.railway_url_staging) || getRailwayUrl() || 'your-service.up.railway.app';
    const copy = u.replace(/https?:\/\//, '');
    navigator.clipboard.writeText(copy).then(() => toast('Copied: ' + copy, 'success'));
  });
  document.getElementById('sbDnsCheck')?.addEventListener('click', async () => {
    const h = document.getElementById('sbCustomDomain')?.value || '';
    if (!h) {
      toast('Enter a host', 'error');
      return;
    }
    try {
      const d = await api('/api/admin/site-builder/dns-check?host=' + encodeURIComponent(h));
      toast(
        d.ok ? 'DNS resolve OK' : 'Could not verify — point CNAME to your Railway service',
        d.ok ? 'success' : 'error'
      );
    } catch (e) {
      toast(e.message, 'error');
    }
  });
  document.getElementById('sbFindRun')?.addEventListener('click', () => void runFindInFiles());
  document.getElementById('sbFindClose')?.addEventListener('click', closeFindInFiles);
  document.getElementById('sbFindQ')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void runFindInFiles();
    }
  });
  document.getElementById('sbFindOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'sbFindOverlay') closeFindInFiles();
  });
  document.getElementById('sbLogToggle')?.addEventListener('click', () => {
    const p = document.getElementById('sbLogPanel');
    setDeployLogOpen(!p?.classList.contains('is-on'));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('sbFindOverlay')?.classList.contains('is-on')) {
      e.preventDefault();
      closeFindInFiles();
      return;
    }
    const m = (e) => (e.getModifierState('Meta') || e.getModifierState('Control')) && !e.getModifierState('Shift');
    const mS = (e) => (e.getModifierState('Meta') || e.getModifierState('Control')) && e.getModifierState('Shift');
    if (m(e) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      void saveCurrent();
    }
    if (mS(e) && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      showCommandPalette();
    }
    if (m(e) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      document.getElementById('sbSidebar')?.classList.toggle('is-off');
    }
    if (e.key === '`' && m(e) && !e.getModifierState('Shift')) {
      e.preventDefault();
      const p = document.getElementById('sbLogPanel');
      setDeployLogOpen(!p?.classList.contains('is-on'));
    }
    if (mS(e) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      openFindInFiles();
    }
  });
  document.getElementById('sbCommandPal')?.addEventListener('click', (e) => {
    if (e.target.id === 'sbCommandPal') e.currentTarget.classList.remove('is-on');
  });
  document.getElementById('sbSettingsPanel')?.addEventListener('click', (e) => {
    if (e.target.id === 'sbSettingsPanel') e.currentTarget.classList.remove('is-on');
  });
  document.querySelectorAll('input[name="sbenv"]').forEach((r) => r.addEventListener('change', () => setPreviewUrlText()));
  try {
    await loadProjects();
  } catch (e) {
    const m = (e && e.message) || '';
    if (m.includes('Session expired') || m.includes('Sign in again')) {
      return;
    }
    showBanner(isLikelyConnectionError(e) ? connectionHint(e) : m);
  }
  window.addEventListener('unhandledrejection', () => {
    /* */
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  void main();
}

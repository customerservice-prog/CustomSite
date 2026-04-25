'use strict';

import { initToast, toast } from './toast.js';
import { api, withBusy } from './api.js';
import { getToken, clearAuth } from './config.js';
import { filterRows, sortRows, paginate } from './table-helpers.js';

const PER = 25;

const COMMON_TZ = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'Europe/London',
  'Europe/Paris',
  'UTC',
  'Asia/Tokyo',
  'Australia/Sydney',
];

function timezoneDatalistHtml(id) {
  const safeId = String(id || 'csTzDatalist').replace(/[^a-zA-Z0-9_-]/g, '');
  const opts = COMMON_TZ.map((z) => `<option value="${esc(z)}"></option>`).join('');
  return `<datalist id="${safeId}">${opts}</datalist>`;
}

const state = {
  clients: [],
  projects: [],
  leads: [],
  invoices: [],
  activity: [],
  messages: [],
  contracts: [],
  timeEntries: [],
  table: {},
  currentTab: 'dashboard',
  ui: { projectClientId: null, msgProjectId: null, msgQ: '', timePeriod: 'month', contractSel: null },
  _prefillClientId: null,
  _prefillInvoice: null,
};

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getEl(id) {
  return document.getElementById(id);
}
/** Create mount node if layout HTML is out of date (avoids null dereference on modal/drawer). */
function ensureEl(id) {
  let n = getEl(id);
  if (!n) {
    n = document.createElement('div');
    n.id = id;
    document.body.appendChild(n);
  }
  return n;
}

const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Won', 'Lost', 'Closed Won', 'Closed Lost'];

function leadLaneFromStatus(s) {
  const x = s || 'New';
  if (x === 'New') return { lane: 0 };
  if (x === 'Contacted') return { lane: 1 };
  if (x === 'Qualified') return { lane: 2 };
  if (x === 'Proposal Sent') return { lane: 3 };
  if (x === 'Won' || x === 'Closed Won') return { lane: 4, sub: 'won' };
  if (x === 'Lost' || x === 'Closed Lost') return { lane: 4, sub: 'lost' };
  return { lane: 0 };
}

function laneToStatus(lane, sub) {
  if (lane === 0) return 'New';
  if (lane === 1) return 'Contacted';
  if (lane === 2) return 'Qualified';
  if (lane === 3) return 'Proposal Sent';
  if (lane === 4) return sub === 'won' ? 'Won' : 'Lost';
  return 'New';
}

function parseDisplayName() {
  const t = getToken();
  if (!t) return 'there';
  try {
    const part = t.split('.')[1];
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const p = JSON.parse(atob(b64));
    return p.name || p.user_metadata?.full_name || p.email?.split('@')[0] || 'there';
  } catch {
    return 'there';
  }
}

function parseJwtSub() {
  const t = getToken();
  if (!t) return null;
  try {
    const part = t.split('.')[1];
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const p = JSON.parse(atob(b64));
    return p.sub || null;
  } catch {
    return null;
  }
}

function getGreeting() {
  const h = new Date().getHours();
  const name = parseDisplayName();
  if (h < 12) return `Good morning, ${name} 👋`;
  if (h < 17) return `Good afternoon, ${name} 👋`;
  return `Good evening, ${name} 👋`;
}

function getDefaultHourlyRate() {
  const v = localStorage.getItem('cs_admin_hourly');
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 150;
}
function setDefaultHourlyRate(n) {
  localStorage.setItem('cs_admin_hourly', String(n));
}

/** @param {string} iso @param {'week' | 'month' | 'all'} period */
function timeEntryInPeriod(iso, period) {
  if (period === 'all') return true;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  if (period === 'month') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  if (period === 'week') {
    const start = new Date(now);
    const day = start.getDay();
    const toMon = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + toMon);
    start.setHours(0, 0, 0, 0);
    return d >= start;
  }
  return true;
}

function formatRelative(iso) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 172800) return 'yesterday';
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return new Date(t).toLocaleDateString();
}

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function countThisMonth(list, key = 'created_at') {
  const sm = startOfMonth();
  return list.filter((x) => x[key] && new Date(x[key]) >= sm).length;
}

function phBadge(phase) {
  const p = (phase || 'discovery').toLowerCase();
  const map = {
    discovery: 'Discovery',
    design: 'Design',
    development: 'Development',
    review: 'Review',
    live: 'Live',
  };
  const label = map[p] || p;
  const cls = p === 'development' ? 'development' : p;
  return `<span class="badge badge-${cls}">${esc(label)}</span>`;
}

function invStatusBadge(st) {
  const s = (st || 'pending').toLowerCase();
  const map = { pending: 'Unpaid', sent: 'Sent', paid: 'Paid', overdue: 'Overdue' };
  const label = map[s] || s;
  const cls = s === 'pending' ? 'pending' : s === 'paid' ? 'paid' : s === 'overdue' ? 'overdue' : s === 'sent' ? 'sent' : 'draft';
  return `<span class="badge badge-${cls}">${esc(label)}</span>`;
}

const TAB_CHROME = {
  dashboard: { section: 'Dashboard', page: 'Dashboard', docTitle: 'Dashboard', greet: true, act: '' },
  pipeline: {
    section: 'Pipeline',
    page: 'Pipeline',
    docTitle: 'Pipeline',
    greet: false,
    act:
      '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center"><button type="button" class="btn-secondary" id="hdrExportLeads">Export CSV</button><button type="button" class="btn-primary" id="hdrAddLead">+ Add lead</button></div>',
  },
  clients: { section: 'Clients', page: 'Clients', docTitle: 'Clients', greet: false, act: '<button type="button" class="btn-primary" id="hdrNewClient">+ New client</button>' },
  projects: { section: 'Projects', page: 'Projects', docTitle: 'Projects', greet: false, act: '' },
  invoices: { section: 'Invoices', page: 'Invoices', docTitle: 'Invoices', greet: false, act: '<button type="button" class="btn-primary" id="hdrNewInv">+ New invoice</button>' },
  files: { section: 'Files', page: 'Files', docTitle: 'Files', greet: false, act: '' },
  messages: { section: 'Messages', page: 'Messages', docTitle: 'Messages', greet: false, act: '' },
  time: { section: 'Time & Billing', page: 'Time & Billing', docTitle: 'Time & Billing', greet: false, act: '' },
  contracts: { section: 'Contracts', page: 'Contracts', docTitle: 'Contracts', greet: false, act: '' },
  activity: { section: 'Activity', page: 'Activity', docTitle: 'Activity', greet: false, act: '' },
  settings: { section: 'Settings', page: 'Settings', docTitle: 'Settings', greet: false, act: '' },
};

function readTabFromUrl() {
  try {
    const p = new URLSearchParams(window.location.search).get('tab');
    if (p && TAB_CHROME[p]) return p;
  } catch {
    /* */
  }
  return 'dashboard';
}

function setUserAvatar() {
  const initials = getEl('admAvatarInitials');
  const el = initials || getEl('csUserAvatar');
  if (!el) return;
  const t = getToken();
  if (!t) {
    el.textContent = '?';
    return;
  }
  const fromJwt = () => {
    try {
      const part = t.split('.')[1];
      const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
      const p = JSON.parse(atob(b64));
      const name = p.name || p.user_metadata?.full_name || (p.email && p.email.split('@')[0]) || '';
      return String(name);
    } catch {
      return '';
    }
  };
  const label = fromJwt();
  if (!label || !String(label).trim()) {
    el.textContent = '?';
    return;
  }
  const parts = label.trim().split(/\s+/);
  const disp =
    parts.length > 1
      ? (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
      : label.slice(0, 2).toUpperCase();
  el.textContent = disp.length ? disp : '?';
}

function wireHeaderActions(tab) {
  if (tab === 'pipeline') {
    getEl('hdrAddLead')?.addEventListener('click', () => openAddLeadDrawer());
    getEl('hdrExportLeads')?.addEventListener('click', async () => {
      const t = getToken();
      if (!t) return;
      try {
        const r = await fetch('/api/admin/leads/export', {
          headers: { Authorization: `Bearer ${t}` },
          credentials: 'same-origin',
        });
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error((err && err.error) || r.statusText || 'Export failed');
        }
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast('Leads export downloaded', 'success');
      } catch (e) {
        toast(e.message || 'Export failed', 'error');
      }
    });
  }
  if (tab === 'clients') {
    getEl('hdrNewClient')?.addEventListener('click', () => openNewClientDrawer());
  }
  if (tab === 'invoices') {
    getEl('hdrNewInv')?.addEventListener('click', () => {
      getEl('invFormCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      getEl('invc')?.focus();
    });
  }
}

function updatePageHeader(tab) {
  const c = TAB_CHROME[tab] || { section: tab, page: tab, docTitle: tab, greet: false, act: '' };
  const docT = c.docTitle || c.page || c.section || tab;
  if (typeof document !== 'undefined') {
    document.title = `${docT} — CustomSite Admin`;
  }
  const bc = getEl('admBreadcrumb');
  const title = getEl('admPageTitle');
  const greetWrap = getEl('admDashGreetWrap');
  const g = getEl('admGreeting');
  const sd = getEl('admSubDate');
  const div = getEl('admPageDivider');
  const actions = getEl('admPageActions');
  if (bc) bc.textContent = `CustomSite > ${c.section}`;
  if (title) title.textContent = c.page;
  if (greetWrap) greetWrap.style.display = c.greet ? 'block' : 'none';
  if (c.greet && g && sd) {
    g.textContent = getGreeting();
    sd.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  if (div) div.style.display = c.greet || tab !== 'dashboard' ? 'block' : 'block';
  if (actions) actions.innerHTML = c.act || '';
  wireHeaderActions(tab);
  setUserAvatar();
  const mobileTitle = getEl('admMobileTitle');
  if (mobileTitle) mobileTitle.textContent = c.page || c.section || tab;
}

function openDrawer({ title, body, footer, onClose }) {
  const root = ensureEl('admDrawerRoot');
  root.innerHTML = `
    <div class="cs-drawer-overlay open" id="admDBack"></div>
    <div class="cs-drawer open" id="admDPanel" role="dialog" aria-modal="true" aria-label="${esc(title || 'Panel')}">
      <div class="cs-drawer-header">
        <h2 class="cs-drawer-title">${esc(title || '')}</h2>
        <button type="button" class="cs-drawer-close" id="admDClose" aria-label="Close">×</button>
      </div>
      <div class="cs-drawer-body" id="admDBodySlot">${body || ''}</div>
      ${footer ? `<div class="cs-drawer-footer">${footer}</div>` : ''}
    </div>`;
  const close = () => {
    root.innerHTML = '';
    onClose && onClose();
  };
  getEl('admDBack')?.addEventListener('click', close);
  getEl('admDClose')?.addEventListener('click', close);
  return { close, root: getEl('admDPanel') };
}

function formatActivityEvent(ev) {
  const a = String(ev.action || '');
  const aLow = a.toLowerCase();
  let meta = ev.metadata;
  if (meta && typeof meta === 'string') {
    try {
      meta = JSON.parse(meta);
    } catch {
      meta = {};
    }
  }
  if (!meta || typeof meta !== 'object') meta = {};
  const rel = ev.created_at ? formatRelative(ev.created_at) : '—';
  if (a === 'sign_in' || aLow.includes('sign_in') || a === 'auth.signin') {
    return { icon: '🔑', text: 'You signed in', rel };
  }
  if (a === 'project_created' || a === 'project.create') {
    let nm = meta.name;
    if (!nm && ev.entity_id) {
      const pr = state.projects.find((p) => p.id === ev.entity_id);
      nm = pr && pr.name;
    }
    return { icon: '📁', text: `Created project “${esc(nm || 'Project')}”`, rel };
  }
  if (a === 'lead.create' || a === 'lead_submitted') {
    return { icon: '📬', text: `New lead from contact form — ${esc(meta.name || meta.email || 'prospect')}`, rel };
  }
  if (a === 'lead_status_changed' || a === 'lead.update') {
    return {
      icon: '📊',
      text: `Lead ${esc(meta.name || '—')} → ${esc(meta.status || 'updated')}`,
      rel,
    };
  }
  if (a === 'client.update') {
    return { icon: '👤', text: 'Client profile updated', rel };
  }
  if (a === 'client.create' || a === 'client_created') {
    return { icon: '👤', text: `Added client ${esc(meta.name || meta.email || '')}`, rel };
  }
  if (a === 'client.delete') {
    return { icon: '👤', text: 'Client removed', rel };
  }
  if (a === 'invoice.create' || a === 'invoice_created') {
    return {
      icon: '💳',
      text: `Created invoice${meta.client_name ? ` for ${esc(meta.client_name)}` : ''} — $${esc(String(meta.amount != null ? Number(meta.amount).toFixed(2) : '0'))}`,
      rel,
    };
  }
  if (a === 'invoice.update' || a === 'invoice.paid') {
    return { icon: '✅', text: 'Invoice updated', rel };
  }
  if (a === 'invoice_paid') {
    return { icon: '✅', text: `Invoice paid — $${esc(String(meta.amount != null ? Number(meta.amount).toFixed(2) : '0'))}`, rel };
  }
  if (a === 'invoice.send' || a === 'invoice_sent') {
    return { icon: '✉️', text: 'Sent invoice to client', rel };
  }
  if (a === 'message.send' || a === 'message_sent') {
    return { icon: '💬', text: 'New message to client (project thread)', rel };
  }
  if (a === 'time.log' || a === 'time_logged') {
    return { icon: '⏱', text: `Logged ${esc(String(meta.hours || ''))} hrs`, rel };
  }
  if (a === 'contract.create' || a === 'contract_saved') {
    return { icon: '📄', text: `Contract ${meta.title ? `“${esc(meta.title)}”` : 'saved'}`, rel };
  }
  if (a === 'contract.send' || a === 'contract_sent') {
    return { icon: '📄', text: 'Contract sent to client', rel };
  }
  if (a === 'file.delete' || a === 'file.link' || a === 'file_uploaded') {
    return {
      icon: '📎',
      text: meta.filename ? `Uploaded ${esc(meta.filename)}` : 'Project file changed',
      rel,
    };
  }
  if (a === 'project.update' || a === 'project.update_posted') {
    return { icon: '📣', text: 'Project update posted to client', rel };
  }
  if (a === 'project.delete') {
    return { icon: '🗂', text: 'Project removed', rel };
  }
  return { icon: '🔔', text: esc(`${a}${ev.entity_type ? ' · ' + ev.entity_type : ''}`), rel };
}

function showTab(name) {
  if (!name) return;
  state.currentTab = name;
  document.querySelectorAll('button.adm-sb-item[data-tab], .adm-bbar-item[data-tab]').forEach((b) => {
    const on = b.getAttribute('data-tab') === name;
    b.classList.toggle('active', on);
    if (b.hasAttribute('aria-selected')) b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  document.querySelectorAll('.adm-panel[data-panel]').forEach((p) => {
    const on = p.getAttribute('data-panel') === name;
    p.classList.toggle('is-visible', on);
    p.toggleAttribute('hidden', !on);
  });
  getEl('admSidebar')?.classList.remove('open');
  const ovl = getEl('admSbOverlay');
  if (ovl) ovl.setAttribute('hidden', '');
  updatePageHeader(name);
  try {
    const u = new URL(window.location.href);
    u.searchParams.set('tab', name);
    history.replaceState(null, '', u.toString());
  } catch {
    /* */
  }
  if (name === 'files') {
    setTimeout(() => document.dispatchEvent(new CustomEvent('adm:files-panel')), 0);
  }
  if (name === 'invoices') {
    renderInvoices();
  }
  if (name === 'messages') {
    renderMessages();
  }
  if (name === 'time') {
    renderTime();
  }
  if (name === 'contracts') {
    renderContracts();
  }
  if (name === 'settings') {
    renderSettings();
  }
  if (name === 'activity') {
    renderActivity();
  }
}

function openModal(html, onClose) {
  const root = ensureEl('admModalRoot');
  root.innerHTML = `<div class="adm-modal-backdrop" role="dialog"><div class="adm-modal">${html}</div></div>`;
  const bd = root.querySelector('.adm-modal-backdrop');
  const close = () => {
    root.innerHTML = '';
    if (onClose) onClose();
  };
  bd?.addEventListener('click', (e) => {
    if (e.target === bd) close();
  });
  const x = root.querySelector('[data-close-modal]');
  if (x) x.addEventListener('click', close);
  return { close, root: root.querySelector('.adm-modal') };
}

function confirmDialog(title, text, onConfirm) {
  const html = `
    <h3 style="margin:0 0 0.5rem">${esc(title)}</h3>
    <p style="color:#64748b;font-size:0.95rem;margin-bottom:1rem">${esc(text)}</p>
    <div style="display:flex;gap:0.5rem;justify-content:flex-end">
      <button type="button" class="btn btn-outline" data-close-modal>Cancel</button>
      <button type="button" class="btn btn-primary" id="admConfirmGo">Confirm</button>
    </div>`;
  const { close, root } = openModal(html);
  root?.querySelector('#admConfirmGo')?.addEventListener('click', () => {
    onConfirm();
    close();
  });
}

let loadPromise;
async function checkDbHealth() {
  const el = document.getElementById('admDbBanner');
  if (!el) return;
  const t = getToken();
  if (!t) return;
  try {
    const r = await fetch('/api/admin/db-health', { headers: { Authorization: 'Bearer ' + t } });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401 || r.status === 403) {
      return;
    }
    if (d && d.ok) {
      el.innerHTML = '';
      el.hidden = true;
      return;
    }
    const hint = d && d.hint ? ` ${d.hint}` : '';
    const code = d && d.message ? d.message : 'Database check failed';
    el.hidden = false;
    el.innerHTML = `<strong>We couldn&rsquo;t load data from the database yet.</strong> <span>${esc(
      String(code)
    )}</span>${esc(
      hint
    )} Follow the <a href="docs/LAUNCH-PHASES.md" target="_blank" rel="noopener">setup guide</a> in order (it links the SQL you need in Supabase).`;
  } catch {
    el.innerHTML = '';
    el.hidden = true;
  }
}

async function loadAll() {
  if (!getToken()) return;
  const h = { headers: { Authorization: `Bearer ${getToken()}` } };
  try {
    const [leadsR, clientsR, projectsR, invR, actR, contrR, timeR, msgR] = await Promise.all([
      api('/api/admin/leads', h).catch(() => ({ leads: [] })),
      api('/api/admin/clients', h).catch(() => ({ clients: [] })),
      api('/api/admin/projects', h).catch(() => ({ projects: [] })),
      api('/api/admin/invoices', h).catch(() => ({ invoices: [] })),
      api('/api/admin/activity', h).catch(() => ({ events: [] })),
      api('/api/admin/contracts', h).catch(() => ({ contracts: [] })),
      api('/api/admin/time-entries', h).catch(() => ({ entries: [] })),
      api('/api/admin/messages', h).catch(() => ({ messages: [] })),
    ]);
    state.leads = leadsR.leads || [];
    state.clients = clientsR.clients || [];
    state.projects = projectsR.projects || [];
    state.invoices = invR.invoices || [];
    state.activity = actR.events || [];
    state.contracts = contrR.contracts || [];
    state.timeEntries = timeR.entries || [];
    state.messages = msgR.messages || [];
  } catch (e) {
    toast(e.message || 'Failed to load', 'error');
  }
  try {
    renderAll();
  } catch (e) {
    console.error('renderAll', e);
    toast(e.message || 'Could not build admin screens. Hard-refresh the page (Ctrl+Shift+R).', 'error');
  }
}

function projectOptions(projectId) {
  return state.projects
    .map(
      (p) =>
        `<option value="${esc(p.id)}"${
          projectId && p.id === projectId ? ' selected' : ''
        }>${esc(p.name)} — ${esc((p.client && p.client.email) || '')}</option>`
    )
    .join('');
}

function clientOptions(clientId) {
  return state.clients
    .map(
      (c) =>
        `<option value="${esc(c.id)}"${
          clientId && c.id === clientId ? ' selected' : ''
        }>${esc(c.email)}${c.company ? ' — ' + esc(c.company) : ''}</option>`
    )
    .join('');
}

function findProject(id) {
  return state.projects.find((p) => p.id === id);
}

function clientDisplayName(clientId) {
  const c = state.clients.find((x) => x.id === clientId);
  if (!c) return '—';
  return (c.full_name && String(c.full_name).trim()) || c.email || '—';
}

function projectNameOrDash(id) {
  const p = id && findProject(id);
  return p ? esc(p.name) : '—';
}

function syncPhaseDropdown(selPrj, phaseEl) {
  const p = findProject(selPrj);
  if (p && phaseEl) {
    phaseEl.value = p.status || 'discovery';
  }
}

/* ---------- Dashboard ---------- */
function clientGradientForId(id) {
  const gradients = [
    'linear-gradient(135deg,#6366f1,#8b5cf6)',
    'linear-gradient(135deg,#0ea5e9,#6366f1)',
    'linear-gradient(135deg,#f97316,#ec4899)',
    'linear-gradient(135deg,#10b981,#0d9488)',
    'linear-gradient(135deg,#f59e0b,#d97706)',
  ];
  let h = 0;
  const s = String(id || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return gradients[h % gradients.length];
}

function clientInitials(c) {
  const n = (c.full_name || c.email || '?').trim();
  const p = n.split(/\s+/);
  if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase();
  return n.slice(0, 2).toUpperCase();
}

function dashboardPanelSkeleton() {
  const sk = (w) => `<div class="cs-skel-line ${w}"></div>`;
  const card = () =>
    `<div class="cs-skel-block">${sk('w30')}${sk('w50')}${sk('w40')}</div>`;
  return `<div class="cs-dash-skel" aria-busy="true" aria-label="Loading dashboard">
    <div class="cs-kpi-row">${[1, 2, 3, 4].map(() => `<div class="cs-skel-card">${card()}</div>`).join('')}</div>
    <div class="cs-dash-2"><div class="cs-skel-card cs-skel-tall">${sk('w40')}${sk('w80')}</div><div class="cs-skel-card cs-skel-tall">${sk('w40')}${sk('w80')}</div></div>
    <div class="cs-skel-card cs-skel-wide">${sk('w25')}${sk('w90')}</div>
  </div>`;
}

function activityDateLabel(iso) {
  if (!iso) return 'Earlier';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Earlier';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  if (day.getTime() === today.getTime()) return 'Today';
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  if (day.getTime() === y.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function renderDashboard() {
  const open = state.projects.filter((p) => !['live'].includes(p.status));
  const byPh = (ph) => state.projects.filter((p) => p.status === ph).length;
  const unpaid = state.invoices
    .filter((i) => (i.status || 'pending') !== 'paid')
    .reduce((a, i) => a + Number(i.amount || 0), 0);
  const unpaidCount = state.invoices.filter((i) => (i.status || 'pending') !== 'paid').length;
  const newLeads = state.leads.filter((l) => l.status === 'New').length;
  const pipe = state.leads.filter((l) => !['Closed Won', 'Closed Lost'].includes(l.status)).length;
  const clientsMo = countThisMonth(state.clients, 'created_at');
  const leadsMo = countThisMonth(state.leads, 'created_at');
  const projsMo = countThisMonth(state.projects, 'created_at');

  const actEvents = (state.activity || []).slice(0, 10);
  const actHtml = actEvents.length
    ? `<ul class="cs-activity-tl" role="list">
        ${actEvents
          .map((ev) => {
            const f = formatActivityEvent(ev);
            return `<li><span class="cs-act-icon" aria-hidden="true">${f.icon}</span><div class="cs-act-body"><div>${f.text}</div><div class="cs-act-time">${f.rel}</div></div></li>`;
          })
          .join('')}
      </ul>`
    : '<p class="phase-note" style="margin:0">No activity yet — actions in admin will show here.</p>';

  const clientSitesRows = state.clients.slice(0, 12).map((c) => {
    const projs = state.projects.filter((p) => p.client_id === c.id);
    const live = projs.find((p) => p.status === 'live' && p.custom_domain);
    const hasDom = projs.some((p) => p.custom_domain);
    const stLabel = live ? 'Live' : hasDom ? 'DNS Pending' : 'Not deployed';
    const stIcon = live ? '🟢' : hasDom ? '🟡' : '⚪';
    const dom = (live && live.custom_domain) || projs.find((p) => p.custom_domain)?.custom_domain || '—';
    const pid = projs[0]?.id || '';
    return `<tr data-cid="${esc(c.id)}" class="go-dash-client">
        <td>${esc(c.full_name || c.email)}</td>
        <td>${esc(dom)}</td>
        <td><span class="phase-note">${stIcon} ${stLabel}</span></td>
        <td><a href="site-builder.html?project=${esc(
          pid
        )}" target="_blank" rel="noopener" class="btn-secondary btn-sm" style="display:inline-block;text-decoration:none" onclick="event.stopPropagation()">Go live →</a></td>
      </tr>`;
  });

  getEl('panel-dashboard').innerHTML = `
    <div class="cs-kpi-row">
      <div class="cs-kpi">
        <div class="cs-kpi-top">
          <div class="cs-kpi-icon indigo" aria-hidden="true">👥</div>
        </div>
        <div class="cs-kpi-n">${state.clients.length}</div>
        <div class="cs-kpi-l">Active clients</div>
        <div class="cs-kpi-trend up">+${clientsMo} this month</div>
      </div>
      <div class="cs-kpi">
        <div class="cs-kpi-top"><div class="cs-kpi-icon emerald" aria-hidden="true">📁</div></div>
        <div class="cs-kpi-n">${open.length}</div>
        <div class="cs-kpi-l">Open projects</div>
        <div class="cs-kpi-micro">Projects by phase</div>
        <div class="cs-kpi-pills" style="margin-top:6px">
          <span class="badge badge-discovery">D ${byPh('discovery')}</span>
          <span class="badge badge-design">De ${byPh('design')}</span>
          <span class="badge badge-dev" title="Development phase">Dev ${byPh('development')}</span>
          <span class="badge badge-review">R ${byPh('review')}</span>
          <span class="badge badge-live">L ${byPh('live')}</span>
        </div>
        <div class="cs-kpi-trend muted" style="margin-top:4px">+${projsMo} new this month</div>
      </div>
      <div class="cs-kpi">
        <div class="cs-kpi-top"><div class="cs-kpi-icon amber" aria-hidden="true">💰</div></div>
        <div class="cs-kpi-n">$${unpaid.toFixed(2)}</div>
        <div class="cs-kpi-l">Revenue (unpaid)</div>
        <div class="cs-kpi-trend muted">${unpaidCount} invoice${unpaidCount === 1 ? '' : 's'} outstanding</div>
      </div>
      <div class="cs-kpi">
        <div class="cs-kpi-top"><div class="cs-kpi-icon rose" aria-hidden="true">📬</div></div>
        <div class="cs-kpi-n">${newLeads}</div>
        <div class="cs-kpi-l">New leads</div>
        <div class="cs-kpi-trend up">${pipe} in pipeline</div>
        <div class="cs-kpi-trend muted" style="margin-top:2px">+${leadsMo} this month</div>
      </div>
    </div>
    <div class="cs-dash-2">
      <div class="card" style="margin-bottom:0">
        <div class="card-header" style="border:0;padding-bottom:0;margin-bottom:12px">
          <span class="card-title">Client sites — hosting</span>
        </div>
        <div class="data-table-wrap" style="border:0">
          <table class="data-table">
            <thead><tr><th>Client</th><th>Domain</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${
                state.clients.length
                  ? clientSitesRows.join('')
                  : '<tr><td colspan="4" class="phase-note" style="cursor:default">No clients yet. Create a client in the Clients tab.</td></tr>'
              }
            </tbody>
          </table>
        </div>
      </div>
      <div class="card" style="margin-bottom:0">
        <div class="card-header" style="border:0;padding-bottom:0;margin-bottom:12px">
          <span class="card-title">Quick actions</span>
        </div>
        <div class="cs-qa-tiles">
          <button type="button" class="cs-qa-tile" id="daQaLead"><span class="qi">➕</span><span class="ql">Add New Lead</span></button>
          <button type="button" class="cs-qa-tile" id="daQaClient"><span class="qi">👤</span><span class="ql">Create Client</span></button>
          <button type="button" class="cs-qa-tile" id="daQaInv"><span class="qi">📄</span><span class="ql">New Invoice</span></button>
          <button type="button" class="cs-qa-tile" id="daQaMsg"><span class="qi">💬</span><span class="ql">Send Message</span></button>
        </div>
      </div>
    </div>
    <div class="card" style="margin-bottom:0">
      <div class="card-header" style="border:0">
        <span class="card-title">Recent activity</span>
      </div>
      ${actHtml}
    </div>`;

  getEl('daQaLead')?.addEventListener('click', () => {
    showTab('pipeline');
    setTimeout(() => openAddLeadDrawer(), 0);
  });
  getEl('daQaClient')?.addEventListener('click', () => {
    showTab('clients');
    setTimeout(() => openNewClientDrawer(), 0);
  });
  getEl('daQaInv')?.addEventListener('click', () => {
    showTab('invoices');
  });
  getEl('daQaMsg')?.addEventListener('click', () => {
    showTab('messages');
  });
  getEl('panel-dashboard')?.querySelectorAll('.go-dash-client').forEach((row) => {
    row.addEventListener('click', () => {
      const id = row.getAttribute('data-cid');
      showTab('clients');
      setTimeout(() => id && openClientDrawer(id), 0);
    });
  });
}

/* ---------- Leads (Pipeline) ---------- */
function leadSrc(L) {
  return (L && (L.service_type || L.source)) || '—';
}

function leadCardHtml(L) {
  const src = leadSrc(L);
  return `<div class="lead-card" draggable="true" data-lead-id="${esc(L.id)}">
    <div class="lc-name">${esc(L.name)}</div>
    <div class="lc-sub">${esc(L.email)}</div>
    <div class="lc-sub">${
      L.company && String(L.company).trim()
        ? esc(L.company)
        : '<span class="cs-table-empty" aria-label="No company">—</span>'
    }</div>
    <div class="lc-badges"><span class="badge badge-draft">${esc(src)}</span></div>
    <div class="lc-sub" style="margin-top:6px;color:var(--cs-text-muted)">${L.created_at ? new Date(L.created_at).toLocaleString() : '—'}</div>
  </div>`;
}

function leadBuckets(rows) {
  const b = { '0': [], '1': [], '2': [], '3': [], won: [], lost: [] };
  rows.forEach((L) => {
    const { lane, sub } = leadLaneFromStatus(L.status);
    if (lane < 4) b[String(lane)].push(L);
    else if (sub === 'won') b.won.push(L);
    else b.lost.push(L);
  });
  return b;
}

function openAddLeadDrawer() {
  const { close, root } = openDrawer({
    title: 'Add lead',
    body: `<form id="fAddLead" class="adm-form-stack">
        <p class="phase-note" style="margin-top:0">For prospects from LinkedIn, email, or phone — not just the site form.</p>
        <div class="form-group"><label for="alName">Name *</label><input class="adm-inp" id="alName" name="name" required /></div>
        <div class="form-group"><label for="alEmail">Email *</label><input class="adm-inp" id="alEmail" name="email" type="email" required /></div>
        <div class="form-group"><label for="alCo">Company</label><input class="adm-inp" id="alCo" name="company" /></div>
        <div class="form-group"><label for="alSrc">Source</label><input class="adm-inp" id="alSrc" name="source" placeholder="e.g. LinkedIn" /></div>
        <div class="form-group"><label for="alMsg">Notes</label><textarea class="adm-inp" id="alMsg" name="message" rows="3" placeholder="Context for your team…"></textarea></div>
      </form>`,
    footer:
      '<button type="button" class="btn-secondary" id="fAddLCancel">Cancel</button> <button type="button" class="btn-primary" id="fAddLGo">Add lead</button>',
  });
  const cancel = () => close();
  root.querySelector('#fAddLCancel')?.addEventListener('click', cancel);
  root.querySelector('#fAddLGo')?.addEventListener('click', () => {
    const f = root.querySelector('#fAddLead');
    if (!f.checkValidity()) {
      f.reportValidity();
      return;
    }
    const fd = new FormData(f);
    const body = {
      name: fd.get('name'),
      email: fd.get('email'),
      company: fd.get('company') || '',
      source: fd.get('source') || 'Manual',
      message: fd.get('message') || 'Added from admin',
    };
    withBusy(
      root.querySelector('#fAddLGo'),
      api('/api/admin/leads', { method: 'POST', body: JSON.stringify(body) })
    )
      .then(() => {
        toast('Lead added', 'success');
        close();
        return loadAll();
      })
      .catch((err) => toast(err.message, 'error'));
  });
}

function openLeadDetailDrawer(id) {
  const L = state.leads.find((x) => x.id === id);
  if (!L) return;
  const { close, root } = openDrawer({
    title: 'Lead',
    body: `<div class="form-group"><label for="ldSt">Status</label>
      <select class="adm-inp" id="ldSt">${LEAD_STATUSES.map((s) => `<option value="${esc(s)}" ${L.status === s ? 'selected' : ''}>${esc(
        s
      )}</option>`).join('')}</select>
      <p class="phase-note" style="margin:0.35rem 0 0">Saves as soon as you change the dropdown.</p></div>
      <div class="form-group"><label for="ldName">Name</label><input class="adm-inp" id="ldName" value="${esc(L.name)}" /></div>
      <div class="form-group"><label for="ldEmail">Email</label><input class="adm-inp" id="ldEmail" type="email" value="${esc(L.email)}" /></div>
      <div class="form-group"><label for="ldCo">Company</label><input class="adm-inp" id="ldCo" value="${esc(L.company || '')}" /></div>
      <div class="form-group"><label for="ldPh">Phone</label><input class="adm-inp" id="ldPh" value="${esc(L.phone || '')}" /></div>
      <div class="form-group"><label for="ldSo">Source</label><input class="adm-inp" id="ldSo" value="${esc(leadSrc(L))}" readonly style="opacity:0.9" /></div>
      <div class="form-group"><label for="ldMsg">Notes</label><textarea class="adm-inp" id="ldMsg" rows="4">${esc(L.message || '')}</textarea></div>
      <p class="phase-note" style="margin:0">Refine or delete from the lead list; status changes appear in <strong>Activity</strong> when the server logs them.</p>`,
    footer: `<button type="button" class="btn-secondary" id="ldClose">Close</button>
      <button type="button" class="btn-ghost" id="ldSave" style="color:var(--cs-accent)">Save details</button>
      <button type="button" class="btn-primary" id="ldCv" ${L.status === 'Closed Won' || L.status === 'Closed Lost' ? 'disabled' : ''}>Convert to client</button>
      <button type="button" class="btn-danger" id="ldDel">Delete</button>`,
  });
  const refreshAndClose = () => {
    close();
    loadAll();
  };
  root.querySelector('#ldSt')?.addEventListener('change', (e) => {
    api(`/api/admin/leads/${L.id}`, { method: 'PATCH', body: JSON.stringify({ status: e.target.value }) })
      .then(() => {
        toast('Status saved', 'success');
        return loadAll();
      })
      .catch((err) => toast(err.message, 'error'));
  });
  root.querySelector('#ldSave')?.addEventListener('click', () => {
    const body = {
      name: root.querySelector('#ldName')?.value,
      email: root.querySelector('#ldEmail')?.value,
      company: root.querySelector('#ldCo')?.value || null,
      message: root.querySelector('#ldMsg')?.value || null,
      phone: root.querySelector('#ldPh')?.value || null,
    };
    api(`/api/admin/leads/${L.id}`, { method: 'PUT', body: JSON.stringify(body) })
      .then(() => {
        toast('Lead saved', 'success');
        return loadAll();
      })
      .catch((err) => toast(err.message, 'error'));
  });
  root.querySelector('#ldClose')?.addEventListener('click', close);
  root.querySelector('#ldCv')?.addEventListener('click', () => {
    confirmDialog('Convert lead', `Create a portal user for ${L.email} and a project?`, () => {
        api(`/api/admin/leads/${L.id}/convert`, { method: 'POST' })
        .then(() => {
          const nm = L.name && String(L.name).trim() ? String(L.name).trim() : 'Lead';
          toast(`${nm} converted to client ✓`, 'success');
          close();
          showTab('clients');
          return loadAll();
        })
        .catch((e) => toast(e.message, 'error'));
    });
  });
  root.querySelector('#ldDel')?.addEventListener('click', () => {
    confirmDialog('Delete lead', 'Permanently remove this lead?', () => {
      api(`/api/admin/leads/${L.id}`, { method: 'DELETE' })
        .then(() => {
          toast('Lead deleted', 'success');
          close();
          return loadAll();
        })
        .catch((e) => toast(e.message, 'error'));
    });
  });
}

function renderLeads() {
  const st = (state.table.leads = state.table.leads || {
    q: '',
    sort: 'created_at',
    dir: 'desc',
    page: 1,
    view: 'kanban',
  });
  let allRows = filterRows(state.leads, st.q, ['name', 'email', 'status', 'company']);
  allRows = sortRows(allRows, st.sort, st.dir, (r) => r[st.sort] || r.created_at);
  const { slice, page, totalPages } = paginate(allRows, st.page, PER);
  const b = leadBuckets(allRows);

  const head = (key, label) => {
    const cur = st.sort === key;
    return `<th><button type="button" class="tbl-link" data-lsort="${key}">${esc(label)}${cur ? (st.dir === 'asc' ? ' ▲' : ' ▼') : ''}</button></th>`;
  };

  const kanban = `
    <div class="cs-kanban" id="leadsKan" aria-label="Pipeline board">
      ${[0, 1, 2, 3]
        .map((lane) => {
          const labels = ['New', 'Contacted', 'Qualified', 'Proposal Sent'];
          const list = b[String(lane)] || [];
          return `<div class="cs-kanban-col" data-drop-lane="${lane}">
            <div class="cs-kan-hd"><span>${labels[lane]}</span><span class="cs-cnt">${list.length}</span></div>
            <div class="cs-drop-hint" style="border:0;min-height:8px"></div>
            ${list.map(leadCardHtml).join('')}
          </div>`;
        })
        .join('')}
      <div class="cs-won-lost-pair">
        <div class="cs-kanban-col" data-drop-lane="4" data-drop-sub="won">
          <div class="cs-kan-hd"><span>Won</span><span class="cs-cnt">${b.won.length}</span></div>
          ${b.won.map(leadCardHtml).join('')}
        </div>
        <div class="cs-kanban-col" data-drop-lane="4" data-drop-sub="lost">
          <div class="cs-kan-hd"><span>Lost / closed</span><span class="cs-cnt">${b.lost.length}</span></div>
          ${b.lost.map(leadCardHtml).join('')}
        </div>
      </div>
    </div>`;

  const table = `
    <div class="data-table-wrap">
      <table class="data-table lead-tbl">
        <thead>
          <tr>
            ${head('name', 'Name')}
            ${head('email', 'Email')}
            <th>Company</th>
            <th>Status</th>
            <th>Actions</th>
            ${head('created_at', 'Created')}
          </tr>
        </thead>
        <tbody>
          ${slice
            .map(
              (L) => `<tr class="pl-row" data-plid="${esc(L.id)}" style="cursor:pointer">
                <td>${esc(L.name)}</td>
                <td>${esc(L.email)}</td>
                <td>${
                  L.company && String(L.company).trim()
                    ? esc(L.company)
                    : '<span class="cs-table-empty" aria-label="No company">—</span>'
                }</td>
                <td onclick="event.stopPropagation()"><select class="status-sel adm-inp" data-lid="${esc(L.id)}" style="min-width:9rem">
                  ${LEAD_STATUSES.map((s) => `<option value="${esc(s)}" ${L.status === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
                </select></td>
                <td onclick="event.stopPropagation()">
                  <button type="button" class="btn-secondary btn-sm" data-ldv="${esc(L.id)}">View</button>
                  <button type="button" class="btn-ghost btn-sm" data-cvlead="${esc(L.id)}" ${
                    L.status === 'Closed Won' || L.status === 'Closed Lost' ? 'disabled' : ''
                  }>Convert</button>
                  <button type="button" class="btn-ghost btn-sm" style="color:var(--cs-danger)" data-dellead="${esc(L.id)}">Delete</button>
                </td>
                <td>${L.created_at ? new Date(L.created_at).toLocaleString() : '—'}</td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>
    <div class="adm-pager">
        <span>Page ${page} / ${totalPages}</span>
        <button type="button" class="btn-secondary btn-sm" data-lp="prev" ${page <= 1 ? 'disabled' : ''}>Prev</button>
        <button type="button" class="btn-secondary btn-sm" data-lp="next" ${page >= totalPages ? 'disabled' : ''}>Next</button>
    </div>`;

  const pipePanel = getEl('panel-leads') || getEl('panel-pipeline');
  if (!pipePanel) {
    console.error('renderLeads: #panel-leads (or #panel-pipeline) missing from DOM');
    return;
  }
  pipePanel.innerHTML = `
    <div class="cs-lead-toolbar">
      <div class="adm-table-tools" style="margin:0;flex:1;min-width:12rem">
        <label for="leadSearchInp" class="visually-hidden">Search leads</label>
        <input id="leadSearchInp" type="search" class="adm-inp" data-leads-search placeholder="Search name, email, company, status…" value="${esc(st.q)}" style="max-width:20rem" />
      </div>
      <div class="cs-seg" role="group" aria-label="View">
        <button type="button" class="${st.view === 'kanban' ? 'active' : ''}" data-lv="kanban">Board</button>
        <button type="button" class="${st.view === 'table' ? 'active' : ''}" data-lv="table">Table</button>
      </div>
    </div>
    <div id="leadsViewKan" class="card" style="margin-bottom:0;${st.view === 'table' ? 'display:none' : ''}">${kanban}</div>
    <div id="leadsViewTbl" class="card" style="margin-bottom:0;${st.view === 'kanban' ? 'display:none' : ''}">${table}</div>`;

  const panel = pipePanel;
  panel.querySelectorAll('[data-lv]').forEach((b) => {
    b.addEventListener('click', () => {
      st.view = b.getAttribute('data-lv') || 'kanban';
      renderLeads();
    });
  });
  panel.querySelector('[data-leads-search]')?.addEventListener('input', (e) => {
    st.q = e.target.value;
    st.page = 1;
    renderLeads();
  });
  panel.querySelectorAll('[data-lsort]').forEach((b) => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const k = b.getAttribute('data-lsort');
      if (st.sort === k) st.dir = st.dir === 'asc' ? 'desc' : 'asc';
      else {
        st.sort = k;
        st.dir = 'asc';
      }
      renderLeads();
    });
  });
  panel.querySelectorAll('.status-sel').forEach((sel) => {
    sel.addEventListener('change', (e) => e.stopPropagation());
    sel.addEventListener('change', () => {
      const id = sel.getAttribute('data-lid');
      api(`/api/admin/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ status: sel.value }) })
        .then(() => {
          toast('Status updated', 'success');
          return loadAll();
        })
        .catch((err) => toast(err.message, 'error'));
    });
  });
  panel.querySelectorAll('[data-cvlead]').forEach((btn) => {
    btn.addEventListener('click', (e) => e.stopPropagation());
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-cvlead');
      const L = state.leads.find((x) => x.id === id);
      if (!L) return;
      confirmDialog('Convert lead', `Create a portal user for ${L.email} and a project?`, () => {
        api(`/api/admin/leads/${id}/convert`, { method: 'POST' })
          .then(() => {
            const nm = L.name && String(L.name).trim() ? String(L.name).trim() : 'Lead';
            toast(`${nm} converted to client ✓`, 'success');
            return loadAll();
          })
          .catch((err) => toast(err.message, 'error'));
      });
    });
  });
  panel.querySelectorAll('[data-dellead]').forEach((btn) => {
    btn.addEventListener('click', (e) => e.stopPropagation());
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-dellead');
      confirmDialog('Delete lead', 'Permanently remove this lead?', () => {
        api(`/api/admin/leads/${id}`, { method: 'DELETE' })
          .then(() => {
            toast('Lead deleted', 'success');
            return loadAll();
          })
          .catch((err) => toast(err.message, 'error'));
      });
    });
  });
  panel.querySelectorAll('[data-ldv]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openLeadDetailDrawer(btn.getAttribute('data-ldv'));
    });
  });
  panel.querySelectorAll('tr.pl-row').forEach((row) => {
    row.addEventListener('click', () => {
      const id = row.getAttribute('data-plid');
      if (id) openLeadDetailDrawer(id);
    });
  });
  panel.querySelectorAll('.lead-card').forEach((card) => {
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/lead-id', card.getAttribute('data-lead-id'));
      e.dataTransfer.effectAllowed = 'move';
    });
  });
  panel.querySelectorAll('.cs-kanban-col').forEach((col) => {
    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    col.addEventListener('drop', (e) => {
      e.preventDefault();
      const id = e.dataTransfer.getData('text/lead-id');
      if (!id) return;
      const lane = col.getAttribute('data-drop-lane');
      const sub = col.getAttribute('data-drop-sub');
      const stNew = laneToStatus(Number(lane, 10), sub);
      api(`/api/admin/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ status: stNew }) })
        .then(() => {
          toast('Lead moved', 'success');
          return loadAll();
        })
        .catch((err) => toast(err.message, 'error'));
    });
  });
  panel.querySelectorAll('.lead-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      openLeadDetailDrawer(card.getAttribute('data-lead-id'));
    });
  });
  panel.querySelector('[data-lp=prev]')?.addEventListener('click', () => {
    st.page = Math.max(1, st.page - 1);
    renderLeads();
  });
  panel.querySelector('[data-lp=next]')?.addEventListener('click', () => {
    st.page = Math.min(totalPages, st.page + 1);
    renderLeads();
  });
}

function clientNotesKey(id) {
  return `cs_client_notes:${id}`;
}

function openNewClientDrawer() {
  const { close, root } = openDrawer({
    title: 'Add a new client',
    body: `<form id="fNewCli" class="adm-form-stack">
        <div class="form-group"><label for="ncEmail">Email *</label><input class="adm-inp" id="ncEmail" name="email" type="email" required /></div>
        <div class="form-group"><label for="ncFn">Full name *</label><input class="adm-inp" id="ncFn" name="full_name" required /></div>
        <div class="form-group"><label for="ncCo">Company</label><input class="adm-inp" id="ncCo" name="company" /></div>
        <div class="form-group"><label for="ncPh">Phone</label><input class="adm-inp" id="ncPh" name="phone" type="tel" /></div>
        <div class="form-group"><label for="ncWw">Website</label><input class="adm-inp" id="ncWw" name="website" type="url" placeholder="https://…" /></div>
        <div class="form-group"><label for="ncTz">Timezone</label><input class="adm-inp" id="ncTz" name="timezone" list="ncTzDl" placeholder="e.g. America/New_York" autocomplete="off" /></div>
        ${timezoneDatalistHtml('ncTzDl')}
      </form>`,
    footer: '<button type="button" class="btn-secondary" id="ncCancel">Cancel</button> <button type="button" class="btn-primary" id="ncGo">Create account</button>',
  });
  root.querySelector('#ncCancel')?.addEventListener('click', close);
  root.querySelector('#ncGo')?.addEventListener('click', () => {
    const f = root.querySelector('#fNewCli');
    if (!f.checkValidity()) {
      f.reportValidity();
      return;
    }
    const fd = new FormData(f);
    const body = {
      email: fd.get('email'),
      full_name: fd.get('full_name') || '',
      company: fd.get('company') || '',
      phone: fd.get('phone') || '',
      website: fd.get('website') || '',
      timezone: fd.get('timezone') || '',
    };
    withBusy(
      root.querySelector('#ncGo'),
      api('/api/admin/clients', { method: 'POST', body: JSON.stringify(body) })
    )
      .then(() => {
        toast('Client created', 'success');
        close();
        return loadAll();
      })
      .catch((er) => toast(er.message, 'error'));
  });
}

function openClientDrawer(id) {
  api(`/api/admin/clients/${id}`)
    .then((d) => {
      const c = d.client;
      const projs = d.projects || [];
      const invs = (state.invoices || []).filter((i) => i.client_id === id);
      const paid = invs.filter((i) => (i.status || '') === 'paid').reduce((a, i) => a + Number(i.amount || 0), 0);
      const out = invs.filter((i) => (i.status || 'pending') !== 'paid').reduce((a, i) => a + Number(i.amount || 0), 0);
      const nk = clientNotesKey(id);
      let notes = '';
      try {
        notes = localStorage.getItem(nk) || '';
      } catch {
        /* */
      }
      const invRows = invs
        .map(
          (i) =>
            `<tr><td>$${Number(i.amount).toFixed(2)}</td><td>${invStatusBadge(i.status)}</td><td>${esc(i.project_name || '—')}</td><td>${
              i.due_date || '—'
            }</td></tr>`
        )
        .join('');
      const prRows = projs
        .map(
          (p) =>
            `<tr><td>${esc(p.name)}</td><td>${phBadge(p.status)}</td><td><a class="tbl-link" href="site-builder.html?project=${esc(
              p.id
            )}" target="_blank" rel="noopener">Builder</a></td></tr>`
        )
        .join('');
      const hostRows = projs
        .map(
          (p) =>
            `<tr><td>${esc(p.name)}</td><td>${esc(p.custom_domain || '—')}</td><td>${phBadge(p.status)}</td><td><a class="btn-secondary btn-sm" style="text-decoration:none;display:inline-block" href="site-builder.html?project=${esc(
              p.id
            )}" target="_blank" rel="noopener">Manage</a></td></tr>`
        )
        .join('');

      const { close, root } = openDrawer({
        title: c.full_name || c.email,
        body: `<div class="cs-dtabs" role="tablist" style="margin-top:0">
            <button type="button" class="cs-dtab active" data-dtabp="ov">Overview</button>
            <button type="button" class="cs-dtab" data-dtabp="pr">Projects</button>
            <button type="button" class="cs-dtab" data-dtabp="in">Invoices</button>
            <button type="button" class="cs-dtab" data-dtabp="ho">Hosting</button>
            <button type="button" class="cs-dtab" data-dtabp="no">Notes</button>
          </div>
          <div class="cs-dtab-pan open" data-dtabp="ov" style="display:block">
            <p style="margin:0 0 12px" class="phase-note">Email: <strong>${esc(c.email)}</strong> <span class="badge badge-active" style="margin-left:6px">Active</span></p>
            <div class="form-group"><label for="cdFn">Full name</label><input class="adm-inp" id="cdFn" value="${esc(c.full_name || '')}" /></div>
            <div class="form-group"><label for="cdCo">Company</label><input class="adm-inp" id="cdCo" value="${esc(c.company || '')}" /></div>
            <div class="form-group"><label for="cdPh">Phone</label><input class="adm-inp" id="cdPh" value="${esc(c.phone || '')}" /></div>
            <div class="form-group"><label for="cdWw">Website</label><input class="adm-inp" id="cdWw" value="${esc(c.website || '')}" type="url" /></div>
            <div class="form-group"><label for="cdTz">Timezone</label><input class="adm-inp" id="cdTz" value="${esc(c.timezone || '')}" list="cdTzDl" placeholder="e.g. America/New_York" autocomplete="off" /></div>
            ${timezoneDatalistHtml('cdTzDl')}
            <button type="button" class="btn-primary" id="cdSave">Save changes</button>
          </div>
          <div class="cs-dtab-pan" data-dtabp="pr" style="display:none">
            <p style="margin:0 0 8px" class="phase-note">Linked projects: <strong>${projs.length}</strong></p>
            <div class="data-table-wrap" style="margin-bottom:8px">
              <table class="data-table" style="cursor:default"><thead><tr><th>Project</th><th>Phase</th><th></th></tr></thead><tbody>
                ${
                  projs.length
                    ? prRows
                    : '<tr><td colspan="3" class="phase-note">No projects yet. Add one in the Projects tab.</td></tr>'
                }
              </tbody></table>
            </div>
            <button type="button" class="btn-secondary" id="cdNewP">+ New project (opens Projects →)</button>
          </div>
          <div class="cs-dtab-pan" data-dtabp="in" style="display:none">
            <p class="phase-note" style="margin-top:0">Total paid: <strong>$${paid.toFixed(2)}</strong> · Outstanding: <strong>$${out.toFixed(
          2
        )}</strong></p>
            <div class="data-table-wrap"><table class="data-table" style="cursor:default"><thead><tr><th>Amount</th><th>Status</th><th>Project</th><th>Due</th></tr></thead><tbody>
              ${invs.length ? invRows : '<tr><td colspan="4" class="phase-note">No invoices yet.</td></tr>'}
            </tbody></table></div>
            <button type="button" class="btn-secondary" id="cdNewI" style="margin-top:8px">+ New invoice (opens Invoices →)</button>
          </div>
          <div class="cs-dtab-pan" data-dtabp="ho" style="display:none">
            <div class="data-table-wrap"><table class="data-table" style="cursor:default"><thead><tr><th>Project</th><th>Domain</th><th>Phase</th><th></th></tr></thead><tbody>
              ${
                projs.length
                  ? hostRows
                  : '<tr><td colspan="4" class="phase-note">No projects — add a project to set hosting.</td></tr>'
              }
            </tbody></table></div>
          </div>
          <div class="cs-dtab-pan" data-dtabp="no" style="display:none">
            <p class="phase-note" style="margin-top:0">Internal notes (saved in this browser only)</p>
            <textarea class="adm-inp" id="cdNotes" rows="8" style="width:100%">${esc(notes)}</textarea>
            <p class="phase-note" id="cdNotesHint" style="display:none">Saved.</p>
          </div>`,
        footer: `<button type="button" class="btn-secondary" data-cd-close>Close</button>
          <button type="button" class="btn-danger" id="cdDel" style="margin-left:auto">Delete client</button>`,
      });

      const panSwitch = (name) => {
        root.querySelectorAll('.cs-dtab').forEach((b) => b.classList.toggle('active', b.getAttribute('data-dtabp') === name));
        root.querySelectorAll('.cs-dtab-pan').forEach((pan) => {
          pan.style.display = pan.getAttribute('data-dtabp') === name ? 'block' : 'none';
        });
      };
      root.querySelectorAll('.cs-dtab').forEach((b) => {
        b.addEventListener('click', () => panSwitch(b.getAttribute('data-dtabp')));
      });
      root.querySelector('[data-cd-close]')?.addEventListener('click', () => close());
      root.querySelector('#cdSave')?.addEventListener('click', () => {
        api(`/api/admin/clients/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            full_name: root.querySelector('#cdFn')?.value,
            company: root.querySelector('#cdCo')?.value || null,
            phone: root.querySelector('#cdPh')?.value || null,
            website: root.querySelector('#cdWw')?.value || null,
            timezone: root.querySelector('#cdTz')?.value || null,
          }),
        })
          .then(() => {
            toast('Client updated', 'success');
            return loadAll();
          })
          .catch((e) => toast(e.message, 'error'));
      });
      root.querySelector('#cdNewP')?.addEventListener('click', () => {
        state._prefillClientId = id;
        close();
        showTab('projects');
        renderProjects();
      });
      root.querySelector('#cdNewI')?.addEventListener('click', () => {
        state._prefillClientId = id;
        close();
        showTab('invoices');
        renderInvoices();
      });
      const ta = root.querySelector('#cdNotes');
      ta?.addEventListener('blur', () => {
        try {
          localStorage.setItem(nk, ta.value);
          const h = root.querySelector('#cdNotesHint');
          if (h) {
            h.style.display = 'block';
            setTimeout(() => {
              h.style.display = 'none';
            }, 1500);
          }
        } catch {
          /* */
        }
      });
      root.querySelector('#cdDel')?.addEventListener('click', () => {
        confirmDialog('Delete client', 'Removes the client from Auth and the portal. This cannot be undone.', () => {
          api(`/api/admin/clients/${id}`, { method: 'DELETE' })
            .then(() => {
              toast('Client deleted', 'success');
              close();
              return loadAll();
            })
            .catch((e) => toast(e.message, 'error'));
        });
      });
    })
    .catch((e) => toast(e.message, 'error'));
}

/* ---------- Clients ---------- */
function renderClients() {
  const st = (state.table.clients = state.table.clients || { q: '', sort: 'email', dir: 'asc', page: 1 });
  let rows = filterRows(state.clients, st.q, ['email', 'full_name', 'company', 'phone', 'website']);
  rows = sortRows(rows, st.sort, st.dir);
  const { slice, page, totalPages } = paginate(rows, st.page, PER);

  getEl('panel-clients').innerHTML = `
    <div class="card" style="margin-bottom:0">
      <div class="card-header" style="border:0">
        <span class="card-title">All clients</span>
      </div>
      <div class="adm-table-tools">
        <input type="search" class="adm-inp" data-cq placeholder="Filter clients…" value="${esc(st.q)}" style="max-width:22rem" />
      </div>
      <div class="data-table-wrap" style="border:0;box-shadow:none">
        <table class="data-table cs-cli-tbl" style="cursor:default">
          <thead>
            <tr>
              <th>Client</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Projects</th>
              <th>Status</th>
              <th style="text-align:right">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${slice
              .map((c) => {
                const nP = state.projects.filter((p) => p.client_id === c.id).length;
                return `<tr>
                <td>
                  <div class="cs-cli-cell">
                    <div class="cs-cli-av" style="background:${clientGradientForId(c.id)}">${esc(clientInitials(c))}</div>
                    <div>
                      <div class="cs-cli-name">${esc(c.full_name || c.email || '—')}</div>
                      <div class="cs-cli-co">${
                        c.company && String(c.company).trim()
                          ? esc(c.company)
                          : '<span class="cs-table-empty" aria-label="No company">—</span>'
                      }</div>
                    </div>
                  </div>
                </td>
                <td>${esc(c.email)}</td>
                <td>${esc(c.phone || '—')}</td>
                <td><button type="button" class="badge badge-active" data-fpc="${esc(c.id)}" style="border:0;cursor:pointer;font:inherit">${nP} project${
                  nP === 1 ? '' : 's'
                }</button></td>
                <td><span class="badge badge-active">Active</span></td>
                <td style="text-align:right">
                  <button type="button" class="btn-secondary btn-sm" data-viewc="${esc(c.id)}">View</button>
                </td>
              </tr>`;
              })
              .join('')}
          </tbody>
        </table>
      </div>
      <div class="adm-pager">
        <span>Page ${page} / ${totalPages}</span>
        <button type="button" class="btn-secondary btn-sm" data-cp="prev" ${page <= 1 ? 'disabled' : ''}>Prev</button>
        <button type="button" class="btn-secondary btn-sm" data-cp="next" ${page >= totalPages ? 'disabled' : ''}>Next</button>
      </div>
    </div>`;

  const p = getEl('panel-clients');
  p.querySelector('[data-cq]')?.addEventListener('input', (e) => {
    st.q = e.target.value;
    st.page = 1;
    renderClients();
  });
  p.querySelectorAll('[data-viewc]').forEach((b) => {
    b.addEventListener('click', () => openClientDrawer(b.getAttribute('data-viewc')));
  });
  p.querySelectorAll('[data-fpc]').forEach((b) => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const cid = b.getAttribute('data-fpc');
      state.ui.projectClientId = cid;
      showTab('projects');
    });
  });
  p.querySelector('[data-cp=prev]')?.addEventListener('click', () => {
    st.page = Math.max(1, st.page - 1);
    renderClients();
  });
  p.querySelector('[data-cp=next]')?.addEventListener('click', () => {
    st.page = Math.min(totalPages, st.page + 1);
    renderClients();
  });
}

/* ---------- Projects + workspace ---------- */
function renderProjects() {
  const st = (state.table.projects = state.table.projects || { q: '', page: 1, sort: 'name', dir: 'asc' });
  let list = state.projects;
  if (state.ui && state.ui.projectClientId) {
    list = state.projects.filter((p) => p.client_id === state.ui.projectClientId);
  }
  let rows = filterRows(list, st.q, ['name', 'status', 'website_type', 'client.email']);
  rows = sortRows(rows, st.sort, st.dir, (r) => {
    if (st.sort === 'client.email') return (r.client && r.client.email) || '';
    return r[st.sort];
  });
  const { slice, page, totalPages } = paginate(rows, st.page, PER);
  const selPrj =
    (state._lastActProject && findProject(state._lastActProject) && state._lastActProject) ||
    (state.projects.length === 1 ? state.projects[0].id : '') ||
    '';

  const plItems = rows.length
    ? rows
        .map((p) => {
          const c = p.client || {};
          return `<button type="button" class="cs-proj-tile${p.id === selPrj ? ' is-sel' : ''}" data-pselect="${esc(p.id)}">
        <span class="cs-proj-tile-n">${esc(p.name)}</span>
        <span class="cs-proj-tile-c">${esc(c.email || c.full_name || '—')}</span>
        <span class="cs-proj-tile-ph">${phBadge(p.status)}</span>
      </button>`;
        })
        .join('')
    : '<p class="phase-note" style="padding:0.5rem 0.25rem">No projects — create one below.</p>';
  const stepKeys = [
    { k: 'discovery', l: 'Discovery' },
    { k: 'design', l: 'Design' },
    { k: 'development', l: 'Development' },
    { k: 'review', l: 'Review' },
    { k: 'live', l: 'Live' },
  ];
  const stPh = (findProject(selPrj) && findProject(selPrj).status) || 'discovery';
  const stepper = stepKeys
    .map(
      (s, idx) => `
    <div class="cs-proj-st ${stPh === s.k ? 'is-cur' : ''} ${(findProject(selPrj) && stepKeys.findIndex((x) => x.k === (findProject(selPrj).status || 'discovery')) > idx) ? 'is-past' : ''}" data-setphase="${s.k}" title="Set to ${esc(s.l)}">
      <div class="cs-proj-st-dot${stPh === s.k ? ' is-on' : ''}"></div>
      <span class="cs-proj-st-lb">${esc(s.l)}</span>
      ${idx < stepKeys.length - 1 ? '<span class="cs-proj-st-line" aria-hidden="true"></span>' : ''}
    </div>`
    )
    .join('');

  document.getElementById('panel-projects').innerHTML = `
    ${
      state.ui && state.ui.projectClientId
        ? `<div class="phase-note" style="margin:0 0 1rem;padding:10px 14px;background:var(--cs-accent-light);border:1px solid var(--cs-border);border-radius:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <span>Showing projects for one client</span>
            <button type="button" class="btn-secondary btn-sm" id="clrPCf">Clear filter</button>
          </div>`
        : ''
    }
    <div class="cs-proj-workspace">
      <aside class="cs-proj-aside" aria-label="Project list">
        <div class="cs-proj-srch">
          <input type="search" class="adm-inp" data-pq placeholder="Search projects…" value="${esc(st.q)}" style="width:100%" />
        </div>
        <button type="button" class="btn-primary btn-sm" id="wsScrollNew" style="width:100%;margin:8px 0">+ New project</button>
        <div class="cs-proj-scrl">${plItems}</div>
      </aside>
      <div class="cs-proj-main">
    <div class="adm-card" style="margin:0 0 1rem 0">
      <h2 style="margin-top:0">Project workspace</h2>
      <p class="phase-note">Select a project in the list. Use tabs for updates, files, and billing.</p>
        <div class="form-group" style="max-width:100%">
          <label class="visually-hidden" for="wsProject">Active project</label>
          <select id="wsProject" class="ws-prj" style="max-width:100%"><option value="">— Select a project —</option>${projectOptions()}</select>
        </div>
        <p id="wsCtx" class="phase-note" style="min-height:1.5em"></p>
        <div class="cs-proj-st-wrap" id="wsStepperWrap" role="group" aria-label="Phase">
          ${selPrj && findProject(selPrj) ? stepper : '<p class="phase-note" style="margin:0">Select a project to set phase.</p>'}
        </div>
        <div class="cs-dtabs" role="tablist" style="margin:16px 0 0 0">
          <button type="button" class="cs-dtab active" data-wst="ov" role="tab" aria-selected="true">Overview</button>
          <button type="button" class="cs-dtab" data-wst="up" role="tab" aria-selected="false">Updates</button>
          <button type="button" class="cs-dtab" data-wst="fi" role="tab" aria-selected="false">Files</button>
          <button type="button" class="cs-dtab" data-wst="bi" role="tab" aria-selected="false">Billing</button>
        </div>
        <div class="cs-ws-pan" data-wsp="ov" style="display:block">
        <div class="form-group">
          <label for="wsIntNotes">Internal notes (team only)</label>
          <textarea id="wsIntNotes" rows="3" class="adm-inp" placeholder="Saves to project…" style="width:100%"></textarea>
        </div>
        <div class="form-group" style="display:flex;flex-wrap:wrap;gap:0.75rem;align-items:end">
          <div style="flex:1;min-width:10rem">
            <label for="wsPhase">Phase (dropdown)</label>
            <select id="wsPhase" class="ws-ph">
              <option value="discovery">Discovery</option>
              <option value="design">Design</option>
              <option value="development">Development</option>
              <option value="review">Review</option>
              <option value="live">Live</option>
            </select>
          </div>
          <button type="button" class="btn btn-outline" id="wsSetPh">Apply phase</button>
        </div>
        </div>
        <div class="cs-ws-pan" data-wsp="up" style="display:none">
        <h4 style="font-size:14px;margin:0 0 8px 0" id="wsUpdH">Recent updates to client</h4>
        <div id="wsUpdList" class="cs-upd-feed" role="log">—</div>
        <div class="form-group" style="margin-top:1rem">
          <label for="wsUpd">Post update to client dashboard</label>
          <textarea id="wsUpd" class="adm-inp" rows="3" maxlength="5000" placeholder="Milestone, deliverable, next step…"></textarea>
        </div>
        <div class="cs-upd-foot" style="display:flex;align-items:center;flex-wrap:wrap;gap:0.75rem;margin:0.5rem 0 0 0">
          <p class="adm-hint-below" style="margin:0" aria-live="polite" id="wsUpdCWrap"><span id="wsUpdC">0</span> <span class="cs-char-limit">/ 5000 characters</span></p>
          <button type="button" class="btn btn-primary" id="wsPost" style="max-width:16rem">Post update</button>
        </div>
        </div>
        <div class="cs-ws-pan" data-wsp="fi" style="display:none">
        <h4 style="font-size:14px;margin:0 0 8px 0">Upload</h4>
        <div class="adm-drop" id="wsDrop">Drag files here or <label style="color:#6366f1;cursor:pointer"><input type="file" id="wsFile" style="display:none" /> browse</label></div>
        <p class="adm-hint-below" id="wsFname">No file selected</p>
        <button type="button" class="btn btn-outline" id="wsUpload">Upload to project</button>
        <p class="phase-note" style="margin:1rem 0 0.25rem">Or add a <strong>public https</strong> file URL:</p>
        <div class="form-group" style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:flex-end;max-width:32rem">
          <div style="flex:1;min-width:12rem">
            <label for="wsFileUrl">File URL</label>
            <input type="url" id="wsFileUrl" placeholder="https://…" style="width:100%;margin-top:0.25rem" />
          </div>
          <div style="min-width:9rem">
            <label for="wsFileUrlName">Display name</label>
            <input type="text" id="wsFileUrlName" placeholder="e.g. contract.pdf" style="width:100%;margin-top:0.25rem" />
          </div>
        </div>
        <button type="button" class="btn btn-outline" id="wsAddFileUrl" style="margin-top:0.5rem">Add file link</button>
        <h4 style="margin:1.25rem 0 0.5rem">Files for this project</h4>
        <div id="wsFileList" class="phase-note">Select a project to see its files.</div>
        </div>
        <div class="cs-ws-pan" data-wsp="bi" style="display:none">
        <h4 style="font-size:14px;margin:0 0 8px 0">Billing (this project)</h4>
        <div id="wsBill" class="phase-note">Select a project.</div>
        </div>
      </div>
    </div>
    </div>
    <div class="adm-card">
      <h2>Create new project</h2>
      <form id="formNewProj" class="adm-form-stack" style="max-width:28rem">
        <div class="form-group"><label for="fnpClient">Client *</label><select id="fnpClient" name="client_id" required class="adm-inp"><option value="">Select…</option>${clientOptions()}</select></div>
        <div class="form-group"><label for="fnpName">Project name *</label><input class="adm-inp" id="fnpName" name="name" required /></div>
        <div class="form-group"><label for="fnpWtype">Website type</label><input class="adm-inp" id="fnpWtype" name="website_type" /></div>
        <div class="form-group"><label for="fnpPhase">Phase</label><select id="fnpPhase" name="status" class="adm-inp">
          <option value="discovery">Discovery</option><option value="design">Design</option><option value="development">Development</option><option value="review">Review</option><option value="live">Live</option>
        </select></div>
        <div class="form-group"><label for="fnpNotes">Internal notes</label><textarea class="adm-inp" id="fnpNotes" name="internal_notes" rows="2"></textarea></div>
        <button type="submit" class="btn btn-primary" style="width:100%">Create project</button>
      </form>
    </div>`;

  const p = document.getElementById('panel-projects');
  p.querySelector('#clrPCf')?.addEventListener('click', () => {
    state.ui.projectClientId = null;
    renderProjects();
  });
  if (state._prefillClientId) {
    const ns = p.querySelector('#fnpClient');
    if (ns) ns.value = state._prefillClientId;
    state._prefillClientId = null;
  }
  const wsP = p.querySelector('#wsProject');
  if (wsP) {
    wsP.value = selPrj;
    wsP.addEventListener('change', () => {
      state._lastActProject = wsP.value;
      syncWs();
    });
  }
  const loadProjUpdates = () => {
    const id = p.querySelector('#wsProject')?.value;
    const ul = p.querySelector('#wsUpdList');
    if (!ul) return;
    if (!id) {
      ul.innerHTML = '<p class="phase-note" style="margin:0">Select a project.</p>';
      return;
    }
    ul.textContent = 'Loading…';
    api(`/api/admin/project-updates?project_id=${encodeURIComponent(id)}`)
      .then((d) => {
        const upd = d.updates || [];
        ul.innerHTML = upd.length
          ? `<ul class="cs-upd-ul" style="list-style:none;padding:0;margin:0">${upd
              .map(
                (u) =>
                  `<li class="cs-upd-li" style="border-bottom:1px solid var(--cs-border);padding:10px 0">
            <div style="font-size:11px;color:var(--cs-text-muted);margin-bottom:4px">${u.created_at ? formatRelative(u.created_at) : '—'}</div>
            <div style="font-size:14px;white-space:pre-wrap">${esc(u.message)}</div>
          </li>`
              )
              .join('')}</ul>`
          : '<p class="phase-note" style="margin:0">No updates posted yet.</p>';
      })
      .catch(() => {
        ul.innerHTML = '<p class="phase-note" style="margin:0">Could not load updates.</p>';
      });
  };
  const fillProjBilling = () => {
    const id = p.querySelector('#wsProject')?.value;
    const box = p.querySelector('#wsBill');
    if (!box) return;
    if (!id) {
      box.textContent = 'Select a project.';
      return;
    }
    const pr = findProject(id);
    const invs = (state.invoices || []).filter((i) => i.project_id === id);
    const paid = invs.filter((i) => (i.status || '') === 'paid').reduce((a, i) => a + Number(i.amount || 0), 0);
    const out = invs.filter((i) => (i.status || 'pending') !== 'paid').reduce((a, i) => a + Number(i.amount || 0), 0);
    const te = (state.timeEntries || []).filter((t) => t.project_id === id);
    const hrs = te.reduce((a, t) => a + (Number(t.hours) || 0), 0);
    const rate = getDefaultHourlyRate();
    const tot = invs.reduce((a, i) => a + Number(i.amount || 0), 0);
    box.innerHTML = `<p style="margin:0 0 8px 0">Total invoiced: <strong>$${tot.toFixed(2)}</strong> · Paid: <strong>$${paid.toFixed(2)}</strong> · Outstanding: <strong>$${out.toFixed(2)}</strong></p>
      <p style="margin:0 0 8px 0">Time logged: <strong>${hrs.toFixed(2)}</strong> h · Est. billable: <strong>$${(hrs * rate).toFixed(2)}</strong></p>
      <button type="button" class="btn-secondary btn-sm" id="wsInvFromProj">+ Create invoice for this project</button>`;
    box.querySelector('#wsInvFromProj')?.addEventListener('click', () => {
      if (!pr) return;
      state._prefillClientId = pr.client_id;
      state._prefillInvoice = {
        client_id: pr.client_id,
        project_id: id,
        line_desc: `Services — ${pr.name || 'Project'}`,
        amount: Math.max(0, hrs * rate),
        description: `Time and materials — ${pr.name || 'project'}`,
      };
      showTab('invoices');
      setTimeout(() => getEl('invFormCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    });
  };
  const syncWs = () => {
    const id = p.querySelector('#wsProject')?.value;
    state._lastActProject = id;
    const pr = findProject(id);
    const el = p.querySelector('#wsCtx');
    const ph = p.querySelector('#wsPhase');
    const notes = p.querySelector('#wsIntNotes');
    if (el) {
      if (pr) {
        el.innerHTML = `Selected: <strong>${esc(pr.name)}</strong> · Client: <strong>${
          pr.client && pr.client.email ? esc(pr.client.email) : '—'
        }</strong> · ${phBadge(pr.status || 'discovery')}`;
      } else {
        el.textContent = 'Select a project';
      }
    }
    if (pr && ph) {
      ph.value = pr.status || 'discovery';
    }
    if (notes) {
      notes.value = pr && pr.internal_notes != null ? pr.internal_notes : '';
    }
    loadWsFiles();
    loadProjUpdates();
    fillProjBilling();
  };
  const loadWsFiles = () => {
    const id = p.querySelector('#wsProject')?.value;
    const box = p.querySelector('#wsFileList');
    if (!box) return;
    if (!id) {
      box.innerHTML = '<p class="phase-note">Select a project to see its files.</p>';
      return;
    }
    box.textContent = 'Loading…';
    api(`/api/admin/by-project/${id}/files`)
      .then((d) => {
        const files = d.files || [];
        box.innerHTML = files.length
          ? `<table><thead><tr><th>File</th><th>Uploaded</th><th></th></tr></thead><tbody>
            ${files
              .map(
                (f) => `<tr>
            <td><a href="${esc(f.file_url)}" target="_blank" rel="noopener">${esc(f.file_name)}</a></td>
            <td>${f.uploaded_at ? new Date(f.uploaded_at).toLocaleString() : '—'}</td>
            <td><button type="button" class="btn btn-sm" style="color:#b91c1c" data-delf="${esc(f.id)}">Delete</button></td>
          </tr>`
              )
              .join('')}
            </tbody></table>`
          : '<p class="phase-note">No files yet for this project.</p>';
        box.querySelectorAll('[data-delf]').forEach((b) => {
          b.addEventListener('click', () => {
            const fid = b.getAttribute('data-delf');
            confirmDialog('Delete file', 'Remove this file record?', () => {
              api(`/api/admin/files/${fid}`, { method: 'DELETE' })
                .then(() => {
                  toast('File removed', 'success');
                  loadWsFiles();
                })
                .catch((e) => toast(e.message, 'error'));
            });
          });
        });
      })
      .catch(() => {
        box.innerHTML =
          '<p class="phase-note" role="alert">Could not load files. Check your connection, then pick the project again or refresh the page.</p>';
      });
  };
  p.querySelector('#wsPost')?.addEventListener('click', () => {
    const pid = p.querySelector('#wsProject')?.value;
    const msg = p.querySelector('#wsUpd')?.value?.trim();
    if (!msg) {
      toast('Enter an update', 'error');
      return;
    }
    withBusy(
      p.querySelector('#wsPost'),
      api('/api/admin/project-updates', { method: 'POST', body: JSON.stringify({ project_id: pid, message: msg }) })
    )
      .then(() => {
        toast('Update posted', 'success');
        p.querySelector('#wsUpd').value = '';
        p.querySelector('#wsUpdC').textContent = '0';
        loadAll();
      })
      .catch((e) => toast(e.message, 'error'));
  });
  p.querySelector('#wsSetPh')?.addEventListener('click', () => {
    const pid = p.querySelector('#wsProject')?.value;
    const stp = p.querySelector('#wsPhase')?.value;
    withBusy(
      p.querySelector('#wsSetPh'),
      api(`/api/admin/entity/project/${pid}`, { method: 'PATCH', body: JSON.stringify({ status: stp }) })
    )
      .then(() => {
        toast('Phase updated', 'success');
        return loadAll();
      })
      .catch((e) => toast(e.message, 'error'));
  });
  const fi = p.querySelector('#wsFile');
  p.querySelector('#wsDrop')?.addEventListener('dragover', (e) => {
    e.preventDefault();
    p.querySelector('#wsDrop').classList.add('drag');
  });
  p.querySelector('#wsDrop')?.addEventListener('dragleave', () => p.querySelector('#wsDrop')?.classList.remove('drag'));
  p.querySelector('#wsDrop')?.addEventListener('drop', (e) => {
    e.preventDefault();
    p.querySelector('#wsDrop')?.classList.remove('drag');
    if (e.dataTransfer.files[0]) {
      fi.files = e.dataTransfer.files;
      p.querySelector('#wsFname').textContent = e.dataTransfer.files[0].name;
    }
  });
  fi?.addEventListener('change', () => {
    p.querySelector('#wsFname').textContent = fi.files[0] ? fi.files[0].name : 'No file selected';
  });
  p.querySelector('#wsUpload')?.addEventListener('click', () => {
    const pid = p.querySelector('#wsProject')?.value;
    const pr = findProject(pid);
    if (!pr || !fi?.files[0]) {
      toast('Select project and file', 'error');
      return;
    }
    const cid = pr.client_id;
    const fd = new FormData();
    fd.append('file', fi.files[0]);
    withBusy(
      p.querySelector('#wsUpload'),
      api(`/api/admin/projects/${cid}/files`, { method: 'POST', body: fd })
    )
      .then(() => {
        toast('Uploaded', 'success');
        fi.value = '';
        p.querySelector('#wsFname').textContent = 'No file selected';
        loadWsFiles();
      })
      .catch((e) => toast(e.message, 'error'));
  });
  p.querySelector('#wsAddFileUrl')?.addEventListener('click', () => {
    const pid = p.querySelector('#wsProject')?.value;
    const pr = findProject(pid);
    const u = p.querySelector('#wsFileUrl')?.value?.trim();
    if (!pr || !u) {
      toast('Select a project and enter a file URL', 'error');
      return;
    }
    if (!/^https?:\/\//i.test(u)) {
      toast('URL must start with http:// or https://', 'error');
      return;
    }
    const cid = pr.client_id;
    const body = { file_url: u, file_name: p.querySelector('#wsFileUrlName')?.value?.trim() || null };
    withBusy(
      p.querySelector('#wsAddFileUrl'),
      api(`/api/admin/projects/${cid}/file-link`, { method: 'POST', body: JSON.stringify(body) })
    )
      .then(() => {
        toast('File link added', 'success');
        p.querySelector('#wsFileUrl').value = '';
        p.querySelector('#wsFileUrlName').value = '';
        loadWsFiles();
        return loadAll();
      })
      .catch((e) => toast(e.message, 'error'));
  });
  p.querySelector('#wsUpd')?.addEventListener('input', (e) => {
    p.querySelector('#wsUpdC').textContent = String(e.target.value.length);
  });
  p.querySelector('#wsIntNotes')?.addEventListener('blur', (e) => {
    const pid = p.querySelector('#wsProject')?.value;
    if (!pid) return;
    const v = e.target.value;
    api(`/api/admin/entity/project/${pid}`, {
      method: 'PATCH',
      body: JSON.stringify({ internal_notes: v && String(v).trim() ? String(v) : null }),
    })
      .then(() => {
        const pr = findProject(pid);
        if (pr) pr.internal_notes = v;
      })
      .catch(() => {});
  });
  p.querySelectorAll('[data-pselect]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-pselect');
      const sel = p.querySelector('#wsProject');
      if (sel) sel.value = id;
      state._lastActProject = id;
      p.querySelectorAll('.cs-proj-tile').forEach((t) => t.classList.toggle('is-sel', t.getAttribute('data-pselect') === id));
      syncWs();
    });
  });
  p.querySelector('#wsScrollNew')?.addEventListener('click', () => {
    p.querySelector('#formNewProj')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    p.querySelector('#fnpName')?.focus();
  });
  p.querySelectorAll('[data-wst]').forEach((bt) => {
    bt.addEventListener('click', () => {
      const k = bt.getAttribute('data-wst');
      p.querySelectorAll('[data-wst]').forEach((x) => {
        x.classList.toggle('active', x.getAttribute('data-wst') === k);
        x.setAttribute('aria-selected', x.getAttribute('data-wst') === k ? 'true' : 'false');
      });
      p.querySelectorAll('.cs-ws-pan').forEach((pan) => {
        pan.style.display = pan.getAttribute('data-wsp') === k ? 'block' : 'none';
      });
    });
  });
  p.querySelectorAll('[data-setphase]').forEach((b) => {
    b.addEventListener('click', () => {
      const stp = b.getAttribute('data-setphase');
      const pid = p.querySelector('#wsProject')?.value;
      if (!pid || !stp) return;
      const ph = p.querySelector('#wsPhase');
      if (ph) ph.value = stp;
      api(`/api/admin/entity/project/${pid}`, { method: 'PATCH', body: JSON.stringify({ status: stp }) })
        .then(() => {
          toast('Phase updated', 'success');
          return loadAll();
        })
        .catch((e) => toast(e.message, 'error'));
    });
  });
  syncWs();

  p.querySelector('#formNewProj')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const body = {
      client_id: f.get('client_id'),
      name: f.get('name'),
      website_type: f.get('website_type') || null,
      status: f.get('status') || 'discovery',
      internal_notes: f.get('internal_notes') || null,
    };
    withBusy(
      e.target.querySelector('button'),
      api('/api/admin/projects', { method: 'POST', body: JSON.stringify(body) })
    )
      .then(() => {
        toast('Project created', 'success');
        e.target.reset();
        return loadAll();
      })
      .catch((er) => toast(er.message, 'error'));
  });
  p.querySelector('[data-pq]')?.addEventListener('input', (e) => {
    state.table.projects.q = e.target.value;
    state.table.projects.page = 1;
    renderProjects();
  });
  p.querySelectorAll('[data-edp]').forEach((b) => {
    b.addEventListener('click', () => {
      const pr = findProject(b.getAttribute('data-edp'));
      if (!pr) return;
      const eid = `epn${String(pr.id).replace(/[^a-zA-Z0-9]/g, '')}`;
      const html = `<h3 style="margin-top:0">Edit project</h3>
        <form id="epf" class="adm-form-stack">
          <div class="form-group"><label for="${eid}-name">Name</label><input class="adm-inp" id="${eid}-name" name="name" value="${esc(pr.name)}" required /></div>
          <div class="form-group"><label for="${eid}-wt">Type</label><input class="adm-inp" id="${eid}-wt" name="website_type" value="${esc(pr.website_type || '')}" /></div>
          <div class="form-group"><label for="${eid}-n">Internal notes</label><textarea class="adm-inp" id="${eid}-n" name="internal_notes" rows="2">${esc(pr.internal_notes || '')}</textarea></div>
          <button type="submit" class="btn btn-primary">Save</button>
        </form>`;
      const { close, root } = openModal(html);
      root.querySelector('#epf').addEventListener('submit', (ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        api(`/api/admin/entity/project/${pr.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: fd.get('name'),
            website_type: fd.get('website_type') || null,
            internal_notes: fd.get('internal_notes') || null,
          }),
        })
          .then(() => {
            toast('Saved', 'success');
            close();
            return loadAll();
          })
          .catch((e) => toast(e.message, 'error'));
      });
    });
  });
  p.querySelectorAll('[data-delp]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-delp');
      confirmDialog('Delete project', 'Removes the project and related data. Continue?', () => {
        api(`/api/admin/entity/project/${id}`, { method: 'DELETE' })
          .then(() => {
            toast('Project deleted', 'success');
            return loadAll();
          })
          .catch((e) => toast(e.message, 'error'));
      });
    });
  });
  p.querySelectorAll('[data-prname]').forEach((b) => {
    b.addEventListener('click', () => {
      p.querySelector('#wsProject').value = b.getAttribute('data-prname');
      p.querySelector('#wsProject').dispatchEvent(new Event('change'));
      showTab('projects');
    });
  });
  p.querySelector('[data-pp=prev]')?.addEventListener('click', () => {
    st.page = Math.max(1, st.page - 1);
    renderProjects();
  });
  p.querySelector('[data-pp=next]')?.addEventListener('click', () => {
    st.page = Math.min(totalPages, st.page + 1);
    renderProjects();
  });
}

/* ---------- Invoices ---------- */
function renderInvoices() {
  const st = (state.table.invoices = state.table.invoices || { q: '', page: 1, sort: 'created_at', dir: 'desc' });
  let rows = filterRows(state.invoices, st.q, ['description', 'status', 'client_label', 'project_name', 'amount']);
  rows = sortRows(rows, st.sort, st.dir, (r) => (st.sort === 'amount' ? Number(r.amount) : r[st.sort]));
  const { slice, page, totalPages } = paginate(rows, st.page, PER);

  const invCount = rows.length;
  document.getElementById('panel-invoices').innerHTML = `
    <div class="cs-inv-grid">
      <div class="card" id="invFormCard" style="margin:0">
        <div class="card-header" style="border:0">
          <span class="card-title">Create invoice</span>
        </div>
        <p class="phase-note" style="margin:0 0 12px 0">Line item amounts update the total automatically. Total is read-only.</p>
        <form id="formInv" class="adm-form-stack" style="max-width:100%">
          <div class="form-group"><label for="invc">Client *</label><select name="client_id" id="invc" class="adm-inp" required><option value="">—</option>${clientOptions()}</select></div>
          <div class="form-group"><label for="invp">Project (optional)</label><select name="project_id" id="invp" class="adm-inp"><option value="">—</option>${projectOptions()}</select></div>
          <fieldset class="cs-inv-lineitems" style="border:1px solid var(--cs-border);border-radius:10px;padding:0.75rem 1rem;margin:0 0 0.75rem 0">
            <legend class="phase-note" style="font-weight:600;padding:0 0.25rem">Line items</legend>
            <p class="phase-note" style="margin:0 0 0.75rem 0">Each amount is summed into the total below (total is read-only).</p>
            <div id="lineItems">
              <div class="form-group li-row" data-idx="0">
                <label for="invld0">Description</label>
                <input class="adm-inp" id="invld0" name="l_desc" placeholder="Description" />
                <label for="invla0" style="margin-top:0.5rem">Amount (USD)</label>
                <input class="adm-inp invoice-amount-field" id="invla0" name="l_amt" type="number" step="0.01" min="0" inputmode="decimal" placeholder="0.00" />
              </div>
            </div>
            <button type="button" class="btn-secondary btn-sm" id="addLine" style="margin-top:0.25rem">+ Add line</button>
          </fieldset>
          <div class="form-group"><label for="invoice-total">Total (USD) <span class="phase-note" style="font-weight:500">(auto-calculated)</span></label>
            <input name="amount" type="text" id="invoice-total" inputmode="decimal" required readonly class="adm-inp" style="font-weight:700;font-size:1.1rem;background:var(--cs-surface-2)" value="0.00" aria-readonly="true" /></div>
          <div class="form-group"><label for="invDesc">Description (summary, optional)</label><input class="adm-inp" id="invDesc" name="description" placeholder="e.g. February milestone" /></div>
          <div class="form-group"><label for="invDue">Due date</label><input class="adm-inp" id="invDue" name="due_date" type="date" /></div>
          <button type="submit" class="btn-primary" style="width:100%">Create invoice</button>
        </form>
      </div>
      <div class="card" style="margin:0;min-width:0">
        <div class="card-header">
          <span class="card-title">All invoices</span>
          <span class="phase-note" style="margin:0;font-weight:500">${invCount} record${invCount === 1 ? '' : 's'}</span>
        </div>
        <div class="adm-table-tools" style="margin-top:0"><input class="adm-inp" type="search" data-iq value="${esc(st.q)}" placeholder="Search client, project, amount…" style="max-width:20rem" /></div>
        <div class="data-table-wrap" style="border:0">
        <table class="data-table cs-cli-tbl">
          <thead>
            <tr>
              <th>Client</th><th>Amount</th><th>Status</th><th>Project</th><th>Due</th><th>Created</th><th style="text-align:right">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${slice
              .map(
                (i) => `<tr>
              <td>${esc(i.client_label || '—')}</td>
              <td>$${Number(i.amount).toFixed(2)}</td>
              <td>${invStatusBadge(i.status)}</td>
              <td>${esc(i.project_name || '—')}</td>
              <td>${i.due_date || '—'}</td>
              <td>${i.created_at ? new Date(i.created_at).toLocaleString() : '—'}</td>
              <td style="text-align:right;white-space:nowrap">
                <span class="cs-act-icons">
                <button type="button" class="btn-ghost btn-sm" title="View" data-vwinv="${esc(i.id)}" aria-label="View">👁</button>
                <button type="button" class="btn-ghost btn-sm" title="Send email" data-sndinv="${esc(i.id)}" aria-label="Send">✉</button>
                <button type="button" class="btn-ghost btn-sm" title="Mark paid" data-markpaid="${esc(i.id)}" ${
  i.status === 'paid' ? 'disabled' : ''
} aria-label="Mark paid">✓</button>
                <button type="button" class="btn-ghost btn-sm" title="Stripe pay link" data-payinv="${esc(i.id)}" ${
  i.status === 'paid' ? 'disabled' : ''
} aria-label="Pay link">💳</button>
                <button type="button" class="btn-ghost btn-sm" title="Delete" style="color:var(--cs-danger)" data-delinv="${esc(i.id)}" aria-label="Delete">🗑</button>
                </span>
              </td>
            </tr>`
              )
              .join('')}
          </tbody>
        </table>
        </div>
        <div class="adm-pager">
        <span>Page ${page} / ${totalPages}</span>
        <button type="button" data-ip="prev" class="btn-secondary btn-sm" ${page <= 1 ? 'disabled' : ''}>Prev</button>
        <button type="button" data-ip="next" class="btn-secondary btn-sm" ${page >= totalPages ? 'disabled' : ''}>Next</button>
      </div>
      </div>
    </div>`;

  const p = document.getElementById('panel-invoices');
  if (state._prefillClientId) {
    const invc = p.querySelector('#invc');
    if (invc) invc.value = state._prefillClientId;
    state._prefillClientId = null;
  }
  const recalc = () => {
    let t = 0;
    p.querySelectorAll('.li-row').forEach((row) => {
      const v = row.querySelector('input[name=l_amt]')?.value;
      t += Number(v) || 0;
    });
    const invt = p.querySelector('#invoice-total');
    if (invt) invt.value = t.toFixed(2);
  };
  if (state._prefillInvoice) {
    const pf = state._prefillInvoice;
    if (p.querySelector('#invc') && pf.client_id) p.querySelector('#invc').value = pf.client_id;
    if (p.querySelector('#invp') && pf.project_id) p.querySelector('#invp').value = pf.project_id;
    if (p.querySelector('#invDesc') && pf.description) p.querySelector('#invDesc').value = pf.description;
    const li = p.querySelector('#lineItems .li-row');
    if (li) {
      const d = li.querySelector('input[name=l_desc]');
      const a = li.querySelector('input[name=l_amt]');
      if (d && pf.line_desc) d.value = pf.line_desc;
      if (a && pf.amount != null) a.value = String(Number(pf.amount).toFixed(2));
    }
    recalc();
    state._prefillInvoice = null;
  }
  p.querySelector('#addLine')?.addEventListener('click', () => {
    const c = p.querySelector('#lineItems');
    const idx = c ? c.querySelectorAll('.li-row').length : 0;
    const d = document.createElement('div');
    d.className = 'form-group li-row';
    d.setAttribute('data-idx', String(idx));
    d.innerHTML = `<label for="invld${idx}">Description</label><input class="adm-inp" id="invld${idx}" name="l_desc" placeholder="Description" />
      <label for="invla${idx}" style="margin-top:0.5rem">Amount (USD)</label><input class="adm-inp invoice-amount-field" id="invla${idx}" name="l_amt" type="number" step="0.01" min="0" inputmode="decimal" placeholder="0.00" />`;
    c.appendChild(d);
    recalc();
  });
  const onLineItemChange = () => recalc();
  p.querySelector('#lineItems')?.addEventListener('input', onLineItemChange);
  p.querySelector('#lineItems')?.addEventListener('change', onLineItemChange);
  p.querySelector('#formInv')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const lines = [];
    f.querySelectorAll('.li-row').forEach((row) => {
      const d = row.querySelector('input[name=l_desc]')?.value;
      const a = row.querySelector('input[name=l_amt]')?.value;
      if (d && a != null) {
        lines.push({ description: d, amount: Number(a) });
      }
    });
    const total = Number(f.querySelector('#invoice-total').value) || 0;
    if (!f.querySelector('#invc').value || !total) {
      toast('Client and total required', 'error');
      return;
    }
    const body = {
      client_id: f.querySelector('#invc').value,
      project_id: f.querySelector('#invp').value || null,
      amount: total,
      line_items: lines,
      description: f.querySelector('#invDesc')?.value || null,
      due_date: f.querySelector('#invDue')?.value || null,
    };
    withBusy(
      f.querySelector('button[type=submit]'),
      api('/api/admin/invoices', { method: 'POST', body: JSON.stringify(body) })
    )
      .then(() => {
        toast('Invoice created', 'success');
        f.reset();
        return loadAll();
      })
      .catch((er) => toast(er.message, 'error'));
  });
  p.querySelectorAll('[data-vwinv]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-vwinv');
      const inv = state.invoices.find((x) => x.id === id);
      if (!inv) return;
      const lines = Array.isArray(inv.line_items) ? inv.line_items : [];
      const linesHtml = lines.length
        ? lines
            .map(
              (li) =>
                `<tr><td>${esc(li.description || '')}</td><td style="text-align:right">$${Number(li.amount).toFixed(
                  2
                )}</td></tr>`
            )
            .join('')
        : '<tr><td colspan="2" class="phase-note">No line items on file (older invoices may only show a total)</td></tr>';
      openModal(
        `<h3 style="margin-top:0">Invoice</h3>
        <p><strong>Total:</strong> $${Number(inv.amount).toFixed(2)} &nbsp; <strong>Status:</strong> ${esc(
          inv.status
        )} &nbsp; <strong>Due:</strong> ${esc(inv.due_date || '—')}</p>
        ${inv.description ? `<p class="phase-note">${esc(inv.description)}</p>` : ''}
        <div style="overflow-x:auto"><table style="width:100%;font-size:0.9rem;border-collapse:collapse"><thead><tr><th style="text-align:left;border-bottom:1px solid #e2e8f0;padding:0.35rem 0">Line</th><th style="text-align:right;border-bottom:1px solid #e2e8f0;padding:0.35rem 0">Amount</th></tr></thead><tbody>${linesHtml}</tbody></table></div>
        <p style="margin-top:1rem"><button type="button" class="btn btn-primary" data-close-modal>Close</button></p>`,
        null
      );
    });
  });
  p.querySelectorAll('[data-markpaid]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-markpaid');
      api(`/api/admin/invoices/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'paid' }) })
        .then(() => {
          toast('Marked paid', 'success');
          return loadAll();
        })
        .catch((e) => toast(e.message, 'error'));
    });
  });
  p.querySelectorAll('[data-payinv]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-payinv');
      withBusy(
        b,
        api(`/api/admin/invoices/${id}/stripe-checkout`, { method: 'POST', body: JSON.stringify({}) })
      )
        .then((r) => {
          if (r && r.url) {
            window.open(r.url, '_blank', 'noopener,noreferrer');
            toast('Opening Stripe Checkout…', 'success');
          }
        })
        .catch((e) => toast(e.message, 'error'));
    });
  });
  p.querySelectorAll('[data-sndinv]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-sndinv');
      api(`/api/admin/invoices/${id}/send`, { method: 'POST' })
        .then((r) => {
          toast(r.sent ? 'Email sent' : 'Resend not configured — check .env', r.sent ? 'success' : 'warning');
          return loadAll();
        })
        .catch((e) => toast(e.message, 'error'));
    });
  });
  p.querySelectorAll('[data-delinv]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-delinv');
      confirmDialog('Delete invoice', 'Remove this invoice record?', () => {
        api(`/api/admin/invoices/${id}`, { method: 'DELETE' })
          .then(() => {
            toast('Deleted', 'success');
            return loadAll();
          })
          .catch((e) => toast(e.message, 'error'));
      });
    });
  });
  p.querySelector('[data-iq]')?.addEventListener('input', (e) => {
    state.table.invoices.q = e.target.value;
    state.table.invoices.page = 1;
    renderInvoices();
  });
  p.querySelector('[data-ip=prev]')?.addEventListener('click', () => {
    st.page = Math.max(1, st.page - 1);
    renderInvoices();
  });
  p.querySelector('[data-ip=next]')?.addEventListener('click', () => {
    st.page = Math.min(totalPages, st.page + 1);
    renderInvoices();
  });
  recalc();
}

/* ---------- Files tab ---------- */
function renderFilesTab() {
  const hasProjects = state.projects && state.projects.length;
  document.getElementById('panel-files').innerHTML = `
    <div class="adm-card">
      <h2>Files by project</h2>
      <p class="phase-note" style="margin:0 0 1rem 0">Choose a project, then upload with the drop zone or list downloads below.</p>
      ${
        hasProjects
          ? `<div class="form-group" style="max-width:24rem">
        <label for="fTabP">Project</label>
        <select id="fTabP" class="adm-inp"><option value="">— Select a project —</option>${projectOptions()}</select>
      </div>
      <div class="cs-file-drop" id="fTabDrop" role="button" tabindex="0" aria-label="File upload zone">
        <div class="cs-file-drop-ic" aria-hidden="true">📤</div>
        <p style="margin:0;font-weight:600">Drop a file or click to upload</p>
        <p class="phase-note" style="margin:0.35rem 0 0 0">PDF, images, documents — size limits from your host.</p>
        <input type="file" id="fTabFi" hidden />
        <p class="cs-file-fname" id="fTabFname" aria-live="polite">No file selected</p>
        <button type="button" class="btn btn-primary" id="fTabUp" style="margin-top:0.5rem" disabled>Upload to project</button>
      </div>`
          : '<p class="phase-note" role="status">No projects yet. Create a project under <strong>Projects</strong> first.</p>'
      }
      <p class="cs-file-cnt" id="fTabCnt" style="display:none" aria-live="polite"></p>
      <div id="fTabL" class="cs-file-list-wrap"></div>
    </div>`;
  const loadF = () => {
    const id = document.getElementById('fTabP')?.value;
    const box = document.getElementById('fTabL');
    const cnt = document.getElementById('fTabCnt');
    if (!box) return;
    if (!id) {
      box.innerHTML = '<p class="phase-note">Select a project to list files and enable uploads.</p>';
      if (cnt) {
        cnt.style.display = 'none';
        cnt.textContent = '';
      }
      return;
    }
    box.textContent = 'Loading…';
    api(`/api/admin/by-project/${id}/files`)
      .then((d) => {
        const files = d.files || [];
        if (cnt) {
          cnt.style.display = 'block';
          cnt.textContent = files.length
            ? `${files.length} file${files.length === 1 ? '' : 's'} for this project`
            : 'No files for this project yet';
        }
        box.innerHTML = files.length
          ? `<div style="overflow-x:auto"><table class="data-table"><thead><tr><th>File</th><th>When</th><th style="text-align:right">Get</th></tr></thead><tbody>
            ${files
              .map(
                (f) => `<tr><td><span class="cs-file-type" aria-hidden="true">📎</span> ${esc(f.file_name || 'File')}</td><td style="color:var(--cs-text-secondary);font-size:13px">${
                  f.uploaded_at ? new Date(f.uploaded_at).toLocaleString() : '—'
                }</td><td style="text-align:right"><a class="btn-secondary btn-sm" href="${esc(
                  f.file_url
                )}" target="_blank" rel="noopener">Download</a></td></tr>`
              )
              .join('')}
            </tbody></table></div>`
          : '<p class="phase-note">No files for this project yet. Upload one above.</p>';
      })
      .catch(() => {
        box.textContent = 'Failed to load';
      });
  };
  const wireUp = () => {
    const fi = document.getElementById('fTabFi');
    const dr = document.getElementById('fTabDrop');
    const up = document.getElementById('fTabUp');
    const fn = document.getElementById('fTabFname');
    const syncUp = () => {
      const pid = document.getElementById('fTabP')?.value;
      if (up) up.disabled = !(pid && fi?.files?.length);
    };
    const setFile = (file) => {
      if (!file || !fi) return;
      const dt = new DataTransfer();
      dt.items.add(file);
      fi.files = dt.files;
      if (fn) fn.textContent = file.name;
      syncUp();
    };
    dr?.addEventListener('click', () => fi?.click());
    dr?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fi?.click();
      }
    });
    dr?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dr.classList.add('drag');
    });
    dr?.addEventListener('dragleave', () => dr.classList.remove('drag'));
    dr?.addEventListener('drop', (e) => {
      e.preventDefault();
      dr.classList.remove('drag');
      if (e.dataTransfer?.files[0]) setFile(e.dataTransfer.files[0]);
    });
    fi?.addEventListener('change', () => {
      if (fi.files[0] && fn) fn.textContent = fi.files[0].name;
      syncUp();
    });
    document.getElementById('fTabP')?.addEventListener('change', () => {
      loadF();
      syncUp();
    });
    up?.addEventListener('click', () => {
      const pid = document.getElementById('fTabP')?.value;
      const pr = findProject(pid);
      if (!pr || !fi?.files[0]) {
        toast('Select a project and a file', 'error');
        return;
      }
      const fd = new FormData();
      fd.append('file', fi.files[0]);
      withBusy(
        up,
        api(`/api/admin/projects/${pr.client_id}/files`, { method: 'POST', body: fd })
      )
        .then(() => {
          toast('Uploaded', 'success');
          fi.value = '';
          if (fn) fn.textContent = 'No file selected';
          syncUp();
          return loadF();
        })
        .catch((e) => toast(e.message, 'error'));
    });
    syncUp();
  };
  document.addEventListener('adm:files-panel', loadF, { once: true });
  if (hasProjects) {
    wireUp();
    loadF();
  } else {
    const box = document.getElementById('fTabL');
    if (box) box.innerHTML = '';
  }
}

/* ---------- Messages ---------- */
function renderMessages() {
  const q = (state.ui.msgQ || '').trim().toLowerCase();
  let projs = state.projects || [];
  if (q) {
    projs = projs.filter((p) => {
      const nm = (p.name || '').toLowerCase();
      const c = state.clients.find((cl) => cl.id === p.client_id);
      const ce = (c && c.email) || '';
      const cf = (c && c.full_name) || '';
      return nm.includes(q) || ce.toLowerCase().includes(q) || cf.toLowerCase().includes(q);
    });
  }
  const allMsgs = state.messages || [];
  const mySub = parseJwtSub();
  if (!state.ui.msgProjectId && projs.length) {
    const withMsg = projs.find((p) => allMsgs.some((m) => m.project_id === p.id));
    state.ui.msgProjectId = (withMsg || projs[0]).id;
  }
  if (state.ui.msgProjectId && projs.length && !projs.some((p) => p.id === state.ui.msgProjectId)) {
    state.ui.msgProjectId = projs[0].id;
  }
  const sel = state.ui.msgProjectId;
  const selProj = sel ? projs.find((p) => p.id === sel) || findProject(sel) : null;
  const selClientName = selProj ? clientDisplayName(selProj.client_id) : '—';

  const threads = projs
    .map((p) => {
      const pmsgs = allMsgs.filter((m) => m.project_id === p.id);
      const lastAt = pmsgs.length
        ? Math.max(...pmsgs.map((m) => new Date(m.created_at).getTime()))
        : 0;
      const last = pmsgs
        .slice()
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
      return { p, lastAt, preview: last?.content || 'No messages yet', time: last?.created_at };
    })
    .sort((a, b) => b.lastAt - a.lastAt);
  const thread = sel
    ? allMsgs
        .filter((m) => m.project_id === sel)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    : [];
  const bubbles = thread
    .map((m) => {
      const mine = mySub && m.sender_id && m.sender_id === mySub;
      const t = m.created_at ? new Date(m.created_at).toLocaleString() : '—';
      const who = mine ? 'You' : 'Team';
      return `<div class="cs-msg-bubble ${mine ? 'is-mine' : 'is-them'}" role="listitem">
        <div class="cs-msg-bubble-who">${esc(who)}</div>
        <div class="cs-msg-bubble-txt">${esc(m.content)}</div>
        <div class="cs-msg-bubble-meta">${formatRelative(m.created_at)}</div>
      </div>`;
    })
    .join('');
  const threadList = projs.length
    ? threads
        .map(({ p, preview, time }) => {
          const ptxt = String(preview || '')
            .replace(/\s+/g, ' ')
            .trim();
          const pshort = ptxt.length > 40 ? `${ptxt.slice(0, 40)}…` : ptxt;
          const cname = clientDisplayName(p.client_id);
          return `
      <button type="button" class="cs-msg-thread${p.id === sel ? ' is-active' : ''}" data-thrid="${esc(p.id)}">
        <span class="cs-msg-thread-t">${esc(p.name || 'Project')}</span>
        <span class="cs-msg-thread-sub">${esc(cname)}</span>
        <span class="cs-msg-thread-p">${esc(pshort)}</span>
        <span class="cs-msg-thread-w">${time ? formatRelative(time) : '—'}</span>
      </button>`;
        })
        .join('')
    : '<p class="phase-note" style="padding:1rem">No projects — create a project first.</p>';
  const mainInner = sel
    ? `<div class="cs-msg-hd">
        <div>
          <div class="cs-msg-hd-title">${esc(selProj?.name || 'Project')}</div>
          <div class="cs-msg-hd-sub">Client: <strong>${esc(selClientName)}</strong></div>
        </div>
        <a class="btn-secondary btn-sm" href="site-builder.html?project=${esc(
          sel
        )}" target="_blank" rel="noopener" style="text-decoration:none;white-space:nowrap">Open project →</a>
      </div>
        <div class="cs-msg-bubbles" id="msgBub" role="list">${bubbles || '<p class="phase-note" style="padding:1.5rem;margin:0">No messages in this thread yet.</p>'}</div>
        <div class="cs-msg-composer">
          <div class="form-group" style="margin:0">
            <label for="msgB">Message</label>
            <textarea id="msgB" class="adm-inp" rows="2" maxlength="4000" style="width:100%" placeholder="Type a message… (Ctrl+Enter to send)"></textarea>
            <div class="adm-hint-below"><span id="msgC">0</span> <span class="cs-char-limit">/ 4000 characters</span></div>
          </div>
          <button type="button" class="btn btn-primary" id="msgS">Send</button>
        </div>`
    : `<div class="cs-msg-empty">
        <p style="margin:0;font-size:16px;font-weight:600">Select a project</p>
        <p class="phase-note" style="margin:8px 0 0 0">Choose a thread on the left to view the message history.</p>
      </div>`;
  document.getElementById('panel-messages').innerHTML = `
    <div class="cs-msg-split">
      <aside class="cs-msg-threads" aria-label="Project threads">
        <div class="cs-msg-threads-hd">Inbox</div>
        <div class="cs-msg-srch">
          <input type="search" class="adm-inp" id="msgQInp" placeholder="Search by project or client…" value="${esc(state.ui.msgQ || '')}" style="width:100%" />
        </div>
        <div class="cs-msg-thread-list">${threadList}</div>
      </aside>
      <div class="cs-msg-main">
        ${mainInner}
      </div>
    </div>`;
  const p = document.getElementById('panel-messages');
  p.querySelector('#msgQInp')?.addEventListener('input', (e) => {
    state.ui.msgQ = e.target.value;
    renderMessages();
  });
  const sc = p.querySelector('#msgBub');
  if (sc) sc.scrollTop = sc.scrollHeight;
  p.querySelectorAll('.cs-msg-thread').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-thrid');
      if (id) {
        state.ui.msgProjectId = id;
        renderMessages();
      }
    });
  });
  const sendMsg = () => {
    const project_id = state.ui.msgProjectId;
    const content = p.querySelector('#msgB')?.value?.trim();
    if (!project_id) {
      toast('Select a project thread', 'error');
      return;
    }
    if (!content) {
      toast('Enter a message', 'error');
      return;
    }
    withBusy(
      p.querySelector('#msgS'),
      api('/api/admin/messages', { method: 'POST', body: JSON.stringify({ project_id, content }) })
    )
      .then(() => {
        toast('Message sent', 'success');
        p.querySelector('#msgB').value = '';
        p.querySelector('#msgC').textContent = '0';
        loadAll();
      })
      .catch((e) => toast(e.message, 'error'));
  };
  p.querySelector('#msgB')?.addEventListener('input', (e) => {
    const el = p.querySelector('#msgC');
    if (el) el.textContent = String(e.target.value.length);
  });
  p.querySelector('#msgB')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      sendMsg();
    }
  });
  p.querySelector('#msgS')?.addEventListener('click', sendMsg);
}

/* ---------- Time ---------- */
function renderTime() {
  if (!['week', 'month', 'all'].includes(state.ui.timePeriod)) state.ui.timePeriod = 'month';
  const period = state.ui.timePeriod;
  const rate = getDefaultHourlyRate();
  const allEntries = state.timeEntries || [];
  const entries = allEntries.filter((t) => timeEntryInPeriod(t.worked_date, period));
  const byProject = new Map();
  for (const t of entries) {
    const id = t.project_id || 'none';
    const h = Number(t.hours) || 0;
    byProject.set(id, (byProject.get(id) || 0) + h);
  }
  const summaryRows = [...byProject.entries()]
    .filter(([k]) => k !== 'none')
    .map(
      ([pid, hours]) =>
        `<tr><td>${projectNameOrDash(pid)}</td><td><strong>${hours.toFixed(2)}</strong> h</td><td style="text-align:right">$${(hours * rate).toFixed(2)}</td></tr>`
    )
    .join('');
  const totalH = entries.reduce((a, t) => a + (Number(t.hours) || 0), 0);
  const billable = totalH * rate;
  const periodLabel = period === 'week' ? 'this week' : period === 'month' ? 'this month' : 'all time';
  const summaryTable =
    summaryRows ||
    `<tr><td colspan="3" class="phase-note">No time in ${period === 'all' ? 'the log' : periodLabel} — add hours or change the period filter.</td></tr>`;
  const today = new Date().toISOString().slice(0, 10);
  const pdActive = (p) => (state.ui.timePeriod === p ? 'is-active' : '');

  document.getElementById('panel-time').innerHTML = `
    <div class="adm-card">
      <h2>Log time</h2>
      <form id="formTime" class="adm-form-stack" style="max-width:22rem">
        <div class="form-group"><label for="teProj">Project *</label><select id="teProj" class="adm-inp" name="project_id" required><option value="">—</option>${projectOptions()}</select></div>
        <div class="form-group"><label for="teDate">Date</label><input class="adm-inp" id="teDate" name="worked_date" type="date" value="${esc(today)}" required /></div>
        <div class="form-group"><label for="teHrs">Hours *</label><input class="adm-inp" id="teHrs" name="hours" type="number" min="0.25" step="0.25" required /></div>
        <div class="form-group"><label for="teDesc">Description</label><input class="adm-inp" id="teDesc" name="description" placeholder="What you worked on" /></div>
        <button type="submit" class="btn btn-primary" style="width:100%">Log</button>
      </form>
    </div>
    <div class="adm-card">
      <h2>Default hourly rate (USD)</h2>
      <p class="phase-note" style="margin:0 0 0.5rem 0">Used to estimate billable totals on this page (stored in your browser only).</p>
      <div class="form-group" style="max-width:10rem">
        <label for="timeRate">Rate / hr</label>
        <input type="number" id="timeRate" min="1" step="1" class="adm-inp" value="${esc(String(rate))}" />
      </div>
    </div>
    <div class="adm-card">
      <h2>Summary</h2>
      <div class="cs-time-filters" role="group" aria-label="Time period">
        <button type="button" class="btn-secondary btn-sm ${pdActive('week')}" data-tper="week">This week</button>
        <button type="button" class="btn-secondary btn-sm ${pdActive('month')}" data-tper="month">This month</button>
        <button type="button" class="btn-secondary btn-sm ${pdActive('all')}" data-tper="all">All time</button>
      </div>
      <p class="phase-note" style="margin:0.75rem 0 0.5rem 0">Hours and billable amounts for <strong>${esc(periodLabel)}</strong> (from entries loaded in this session).</p>
      <p style="font-size:1.05rem;margin-bottom:0.5rem"><strong>${totalH.toFixed(2)}</strong> hours · <strong>$${billable.toFixed(2)}</strong> billable @ $${rate.toFixed(0)}/hr</p>
      <div style="overflow-x:auto;max-width:100%">
        <table class="data-table">
          <thead><tr><th>Project</th><th>Hours</th><th style="text-align:right">Est. billable</th></tr></thead>
          <tbody>${summaryTable}</tbody>
        </table>
      </div>
      <p style="margin:1rem 0 0 0">
        <button type="button" class="btn-primary" id="timeToInv">Create invoice from this summary</button>
      </p>
    </div>
    <div class="adm-card">
      <h2>Recent time entries</h2>
      <div style="overflow-x:auto">
        <table class="data-table">
          <thead><tr><th>Date</th><th>Project</th><th>Hours</th><th>Description</th></tr></thead>
          <tbody>
            ${entries
              .slice(0, 50)
              .map(
                (t) => `<tr>
              <td>${t.worked_date || '—'}</td>
              <td>${projectNameOrDash(t.project_id)}</td>
              <td>${t.hours != null ? esc(String(t.hours)) : '—'}</td>
              <td>${esc(t.description || '—')}</td>
            </tr>`
              )
              .join('') || '<tr><td colspan="4" class="phase-note">No entries in this period</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
  const p = document.getElementById('panel-time');
  p.querySelector('#timeRate')?.addEventListener('change', (e) => {
    const n = Number(e.target.value);
    if (Number.isFinite(n) && n > 0) {
      setDefaultHourlyRate(n);
      renderTime();
    }
  });
  p.querySelectorAll('[data-tper]').forEach((b) => {
    b.addEventListener('click', () => {
      state.ui.timePeriod = b.getAttribute('data-tper') || 'month';
      renderTime();
    });
  });
  p.querySelector('#timeToInv')?.addEventListener('click', () => {
    if (totalH <= 0) {
      toast('No hours in this period to bill', 'error');
      return;
    }
    const pids = [...byProject.keys()].filter((k) => k !== 'none');
    const line_desc = `Professional services — ${periodLabel} (${totalH.toFixed(2)} h)`;
    const pr = pids.length === 1 ? findProject(pids[0]) : null;
    const clientId = pr && pr.client_id;
    const projectId = pr && pr.id;
    if (!clientId) {
      toast('Use a single project in this period, or pick a client on the Invoices form after switching tabs.', 'warning');
    }
    state._prefillInvoice = {
      client_id: clientId || null,
      project_id: projectId || null,
      line_desc,
      amount: billable,
      description: `Time & materials, ${periodLabel}, ${totalH.toFixed(2)} h @ $${rate}/hr`,
    };
    showTab('invoices');
    setTimeout(() => {
      getEl('invFormCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      getEl('invc')?.focus();
    }, 80);
  });
  document.getElementById('formTime')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const body = {
      project_id: f.get('project_id'),
      hours: f.get('hours'),
      description: f.get('description') || null,
      worked_date: f.get('worked_date') || null,
    };
    withBusy(
      e.target.querySelector('button'),
      api('/api/admin/time-entries', { method: 'POST', body: JSON.stringify(body) })
    )
      .then(() => {
        toast('Time logged', 'success');
        e.target.reset();
        const td = e.target.querySelector('input[name=worked_date]');
        if (td) td.value = new Date().toISOString().slice(0, 10);
        return loadAll();
      })
      .catch((er) => toast(er.message, 'error'));
  });
}

/* ---------- Contracts ---------- */
function initQuillContract() {
  const el = document.getElementById('quillContract');
  if (!el || !window.Quill) return null;
  const q = new Quill('#quillContract', {
    theme: 'snow',
    modules: {
      toolbar: [
        [{ header: [1, 2, false] }],
        ['bold', 'italic', 'underline', 'link'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['clean'],
      ],
    },
    placeholder: 'Write the project scope, deliverables, payment terms, and timelines here…',
  });
  el.__q = q;
  return q;
}
function openContractPreview(c) {
  if (!c) return;
  const raw = (c.body && String(c.body).trim()) || '';
  const isHtml = /<\s*p[\s>]|<\s*div[\s>]|<\s*h[1-6][\s>]|<\s*ol[\s>]|<\s*ul[\s>]/i.test(raw);
  if (isHtml) {
    const { root } = openModal(
      `<h3 style="margin-top:0">${esc(c.title || 'Contract')}</h3>
        <p class="phase-note" style="margin:0 0 0.5rem">Status: ${esc(c.status || '—')}</p>
        <div class="ql-snow" style="max-height:60vh;overflow:auto;text-align:left;border:1px solid var(--cs-border);border-radius:0.5rem"><div class="ql-editor" id="ctViewHtml"></div></div>
        <p style="margin-top:0.75rem"><button type="button" class="btn btn-primary" data-close-modal>Close</button></p>`,
      null
    );
    const elH = root.querySelector('#ctViewHtml');
    if (elH) elH.innerHTML = raw || '<p class="phase-note">— (no text saved yet)</p>';
  } else {
    openModal(
      `<h3 style="margin-top:0">${esc(c.title || 'Contract')}</h3>
        <p class="phase-note" style="margin:0 0 0.5rem">Status: ${esc(c.status || '—')}</p>
        <pre style="white-space:pre-wrap;font-size:0.9rem;max-height:60vh;overflow:auto;text-align:left;background:var(--cs-surface-2);padding:1rem;border-radius:0.5rem">${raw ? esc(raw) : '— (no text saved yet)'}</pre>
        <p style="margin-top:0.75rem"><button type="button" class="btn btn-primary" data-close-modal>Close</button></p>`,
      null
    );
  }
}
function setQuillBody(quill, html) {
  if (!quill) return;
  const h = (html && String(html).trim()) || '';
  try {
    quill.setContents([{ insert: '\n' }], 'silent');
    if (h) quill.clipboard.dangerouslyPasteHTML(0, h, 'user');
  } catch {
    try {
      quill.root.innerHTML = h || '<p><br></p>';
    } catch {
      quill.setContents([{ insert: '\n' }]);
    }
  }
}
function renderContracts() {
  if (state.ui.contractSel && !state.contracts.some((c) => c.id === state.ui.contractSel)) {
    state.ui.contractSel = null;
  }
  const selId = state.ui.contractSel;
  const ed = selId ? state.contracts.find((c) => c.id === selId) : null;
  const isNew = !ed;
  const curSt = ed ? (ed.status || 'draft') : 'draft';
  const stOpts = ['draft', 'sent', 'signed', 'void']
    .map((s) => `<option value="${s}"${curSt === s ? ' selected' : ''}>${s}</option>`)
    .join('');
  const list =
    (state.contracts || []).map((c) => {
      const st = c.status || 'draft';
      const bcls =
        st === 'signed'
          ? 'badge-paid'
          : st === 'sent'
            ? 'badge-sent'
            : st === 'void'
              ? 'badge-overdue'
              : 'badge-draft';
      return `<button type="button" class="cs-contract-card${c.id === selId ? ' is-active' : ''}" data-ctid="${esc(
        c.id
      )}">
        <span class="cs-contract-card-t">${esc(c.title || 'Untitled')}</span>
        <span class="cs-contract-card-c">${esc(clientDisplayName(c.client_id))}</span>
        <span class="cs-contract-card-s"><span class="badge ${bcls}">${esc(st)}</span></span>
        <span class="cs-contract-card-d">${c.created_at ? formatRelative(c.created_at) : '—'}</span>
      </button>`;
    }).join('') || '<p class="phase-note" style="padding:0.75rem 1rem">No saved contracts yet. Use <strong>New contract</strong> to add one.</p>';
  document.getElementById('panel-contracts').innerHTML = `
    <div class="cs-contract-split">
      <aside class="cs-contract-list" aria-label="Contracts">
        <div class="cs-contract-list-hd">Contracts</div>
        <button type="button" class="cs-contract-new" id="ctNew">+ New contract</button>
        <div class="cs-contract-cards">${list}</div>
      </aside>
      <div class="cs-contract-editor">
        <form id="formContract" class="adm-form-stack">
          ${ed ? `<input type="hidden" name="contract_id" value="${esc(ed.id)}" />` : ''}
          <div class="form-group">
            ${isNew ? '<label for="ctClient">Client *</label>' : '<span class="phase-note" id="ctClientLabelWrap" style="display:block;font-weight:600;margin:0 0 0.5rem 0">Client</span>'}
            ${
              isNew
                ? `<select id="ctClient" class="adm-inp" name="client_id" required><option value="">—</option>${clientOptions()}</select>`
                : `<p class="phase-note" style="margin:0 0 0.5rem 0"><strong id="ctClientLabel">${esc(
                    clientDisplayName(ed.client_id)
                  )}</strong> — client is fixed for this record.</p>
                <input type="hidden" name="client_id" value="${esc(ed.client_id)}" />`
            }
          </div>
          <div class="form-group">
            <label for="ctProj">Project</label>
            <select id="ctProj" class="adm-inp" name="project_id"><option value="">—</option>${projectOptions(ed && ed.project_id)}</select>
          </div>
          <div class="form-group"><label for="ctTitle">Title *</label><input class="adm-inp" id="ctTitle" name="title" required value="${ed ? esc(ed.title) : ''}" /></div>
          <div class="form-group"><label for="ctStatus">Status</label>
            <select id="ctStatus" class="adm-inp" name="status">${stOpts}</select>
          </div>
          <div class="form-group"><label for="quillContract">Contract / proposal</label>
            <div id="quillContract" class="cs-quill" tabindex="0" role="textbox" aria-multiline="true"></div>
          </div>
          <div class="form-group"><label for="ctFileUrl">File URL (signed PDF, etc.)</label><input class="adm-inp" id="ctFileUrl" name="file_url" type="url" placeholder="https://…" value="${ed && ed.file_url ? esc(ed.file_url) : ''}" /></div>
          <div class="cs-contract-actions">
            <button type="submit" class="btn btn-primary" id="ctSave">Save</button>
            <button type="button" class="btn btn-outline" id="ctPreview">Preview</button>
            <button type="button" class="btn btn-outline" id="ctSend"${isNew ? ' disabled' : ''}>Send to client</button>
            <button type="button" class="btn" id="ctDelete" style="color:#b91c1c; margin-left:auto"${isNew ? ' disabled' : ''}>Delete</button>
          </div>
        </form>
      </div>
    </div>`;
  setTimeout(() => {
    const quill = initQuillContract();
    if (ed) setQuillBody(quill, ed.body);
  }, 0);
  const p = document.getElementById('panel-contracts');
  p.querySelector('#ctNew')?.addEventListener('click', () => {
    state.ui.contractSel = null;
    renderContracts();
  });
  p.querySelectorAll('[data-ctid]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-ctid');
      if (id) {
        state.ui.contractSel = id;
        renderContracts();
      }
    });
  });
  const doSave = (e) => {
    e.preventDefault();
    const f = p.querySelector('#formContract');
    if (!f) return;
    const qel = document.getElementById('quillContract');
    const quill = qel && qel.__q;
    const text = quill ? quill.getText().trim() : '';
    const htmlBody = quill && text ? quill.root.innerHTML : null;
    const cid = f.querySelector('[name=contract_id]')?.value;
    const subBtn = f.querySelector('#ctSave');
    if (cid) {
      withBusy(
        subBtn,
        api(`/api/admin/contracts/${cid}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: f.querySelector('[name=title]')?.value,
            status: f.querySelector('[name=status]')?.value,
            file_url: f.querySelector('[name=file_url]')?.value || null,
            project_id: f.querySelector('[name=project_id]')?.value || null,
            body: htmlBody,
          }),
        })
      )
        .then(() => {
          toast('Contract updated', 'success');
          return loadAll();
        })
        .catch((er) => toast(er.message, 'error'));
    } else {
      withBusy(
        subBtn,
        api('/api/admin/contracts', {
          method: 'POST',
          body: JSON.stringify({
            client_id: f.querySelector('[name=client_id]')?.value,
            project_id: f.querySelector('[name=project_id]')?.value || null,
            title: f.querySelector('[name=title]')?.value,
            status: f.querySelector('[name=status]')?.value,
            file_url: f.querySelector('[name=file_url]')?.value || null,
            body: htmlBody,
          }),
        })
      )
        .then((r) => {
          toast('Contract saved', 'success');
          if (r && r.contract && r.contract.id) state.ui.contractSel = r.contract.id;
          return loadAll();
        })
        .catch((er) => toast(er.message, 'error'));
    }
  };
  p.querySelector('#formContract')?.addEventListener('submit', doSave);
  p.querySelector('#ctPreview')?.addEventListener('click', () => {
    const f = p.querySelector('#formContract');
    if (!f) return;
    const qel = document.getElementById('quillContract');
    const quill = qel && qel.__q;
    const text = quill ? quill.getText().trim() : '';
    const body = quill && text ? quill.root.innerHTML : '';
    const title = f.querySelector('[name=title]')?.value || 'Contract';
    const st = f.querySelector('[name=status]')?.value || 'draft';
    const cid = f.querySelector('[name=contract_id]')?.value;
    if (ed && cid) {
      openContractPreview({ ...ed, title, body, status: st });
    } else {
      openContractPreview({ title, body, status: st });
    }
  });
  p.querySelector('#ctDelete')?.addEventListener('click', () => {
    if (!ed) return;
    confirmDialog('Delete', 'Delete this contract record?', () => {
      api(`/api/admin/contracts/${ed.id}`, { method: 'DELETE' })
        .then(() => {
          toast('Deleted', 'success');
          state.ui.contractSel = null;
          return loadAll();
        })
        .catch((e) => toast(e.message, 'error'));
    });
  });
  p.querySelector('#ctSend')?.addEventListener('click', () => {
    if (!ed) {
      toast('Save the contract first', 'error');
      return;
    }
    const btn = p.querySelector('#ctSend');
    withBusy(
      btn,
      api(`/api/admin/contracts/${ed.id}/send`, { method: 'POST' })
        .then((r) => {
          toast(
            r.sent ? 'Email sent' : 'Could not send — check Resend and client email',
            r.sent ? 'success' : 'warning'
          );
          return loadAll();
        })
        .catch((e) => toast(e.message, 'error'))
    );
  });
}

/* ---------- Settings ---------- */
function renderSettings() {
  getEl('panel-settings').innerHTML = '<p class="phase-note" style="margin:0">Loading…</p>';
  api('/api/admin/integrations')
    .then((d) => {
      const re = d.resend
        ? '<span class="badge badge-paid" style="margin-left:6px">Connected</span>'
        : '<span class="badge badge-overdue" style="margin-left:6px">Not configured</span>';
      const st = d.stripe
        ? '<span class="badge badge-paid" style="margin-left:6px">Connected</span>'
        : '<span class="phase-note" style="margin-left:6px">Not set</span> — <a href="https://dashboard.stripe.com" target="_blank" rel="noopener">Stripe dashboard</a>';
      getEl('panel-settings').innerHTML = `
    <div class="card cs-settings-sec" style="margin-bottom:0">
      <p class="cs-set-hint" style="margin:0 0 1.25rem 0">Agency profile and live integration status. Secrets stay in Railway / server env; this page shows what the server sees (not the secret values themselves).</p>
      <div style="display:grid;gap:1.75rem;max-width:44rem">
        <section>
          <h3 style="font-size:16px;margin:0 0 0.5rem 0">Agency info</h3>
          <p class="phase-note" style="margin:0">Company name, address, and public URLs for invoices: use <code>.env</code> / deployment variables and the marketing site as needed.</p>
        </section>
        <section>
          <h3 style="font-size:16px;margin:0 0 0.5rem 0">Billing defaults</h3>
          <p class="phase-note" style="margin:0">Default hourly rate in <strong>Time &amp; Billing</strong> is stored in this browser. Invoice numbering and due days are configured in your database / invoice workflow for now.</p>
        </section>
        <section>
          <h3 style="font-size:16px;margin:0 0 0.5rem 0">Email (Resend)</h3>
          <p class="phase-note" style="margin:0">Resend ${re} · <code>FROM_EMAIL</code> on server: <strong>${
        d.fromEmail || '—'
      }</strong></p>
        </section>
        <section>
          <h3 style="font-size:16px;margin:0 0 0.5rem 0">Payments (Stripe)</h3>
          <p class="phase-note" style="margin:0">Stripe ${st}</p>
        </section>
        <section>
          <h3 style="font-size:16px;margin:0 0 0.5rem 0">Public site URL</h3>
          <p class="phase-note" style="margin:0">Configured as <code>${esc(d.publicUrl || '—')}</code> (used in client emails and portal links).</p>
        </section>
        <section>
          <h3 style="font-size:16px;margin:0 0 0.5rem 0">Calendly &amp; phone (site-wide)</h3>
          <p class="phase-note" style="margin:0">Update placeholder links and numbers in your HTML or add a small config script — see <a href="docs/LAUNCH-PHASES.md" target="_blank" rel="noopener">Launch phases</a>.</p>
        </section>
        <section>
          <h3 style="font-size:16px;margin:0 0 0.5rem 0">Danger zone</h3>
          <p class="phase-note" style="margin:0">There is no bulk delete here. Remove test records in Supabase or with per-entity actions in the admin.</p>
        </section>
      </div>
    </div>`;
    })
    .catch(() => {
      getEl('panel-settings').innerHTML = '<p class="phase-note" style="margin:0">Could not load integration status. Check that you are signed in and the server is running.</p>';
    });
}

/* ---------- Activity ---------- */
function renderActivity() {
  const raw = state.activity || [];
  const ev = raw.slice(0, 100);
  if (!ev.length) {
    getEl('panel-activity').innerHTML = `
    <div class="card" style="margin-bottom:0">
      <div class="card-header" style="border:0">
        <span class="card-title">Activity</span>
      </div>
      <p class="phase-note" style="margin:0">No activity recorded yet. Sign in, create projects, send invoices, and actions will appear here with plain-language descriptions.</p>
    </div>`;
    return;
  }
  const sorted = [...ev].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const blocks = [];
  let lastDay = null;
  sorted.forEach((a) => {
    const day = activityDateLabel(a.created_at);
    if (day !== lastDay) {
      blocks.push(`<li class="cs-act-day" role="presentation" style="list-style:none;padding:12px 0 6px 0;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--cs-text-muted);border-bottom:1px solid var(--cs-border)">${esc(
        day
      )}</li>`);
      lastDay = day;
    }
    const f = formatActivityEvent(a);
    blocks.push(`<li class="activity-item" style="display:flex;gap:14px;align-items:flex-start;list-style:none;border-bottom:1px solid var(--cs-border);padding:14px 0" role="listitem">
            <div class="activity-icon" style="width:32px;height:32px;border-radius:50%;background:var(--cs-accent-light);color:var(--cs-accent);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;margin-top:2px">${f.icon}</div>
            <div class="activity-content" style="flex:1;min-width:0">
              <div class="activity-text" style="font-size:13px;line-height:1.5;color:var(--cs-text);margin:0">${f.text}</div>
              <div class="activity-time" style="font-size:11px;margin-top:4px;color:var(--cs-text-muted)">${a.created_at ? formatRelative(a.created_at) : '—'}</div>
            </div>
          </li>`);
  });
  getEl('panel-activity').innerHTML = `
    <div class="card" style="margin-bottom:0">
      <div class="card-header" style="border:0">
        <span class="card-title">Activity (recent 100)</span>
      </div>
      <div style="max-height:70vh;overflow:auto">
        <ul style="list-style:none;padding:0;margin:0" role="list">
          ${blocks.join('')}
        </ul>
      </div>
    </div>`;
}

function renderAll() {
  renderDashboard();
  renderLeads();
  renderClients();
  renderProjects();
  renderInvoices();
  renderFilesTab();
  renderMessages();
  renderTime();
  renderContracts();
  renderActivity();
  renderSettings();
  showTab(state.currentTab);
}

function initUserMenu() {
  const m = getEl('csUserMenu');
  const a = getEl('csUserAvatar');
  const dd = getEl('csUserMenuDd');
  if (!m || !a) return;
  a.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = !m.classList.contains('open');
    m.classList.toggle('open', open);
    a.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (dd) {
      if (open) dd.removeAttribute('hidden');
      else dd.setAttribute('hidden', '');
    }
  });
  document.addEventListener('click', (e) => {
    if (!m.contains(e.target)) {
      m.classList.remove('open');
      a.setAttribute('aria-expanded', 'false');
      if (dd) dd.setAttribute('hidden', '');
    }
  });
}

function wireMainNav() {
  const onNav = (e) => {
    const t = e.target.closest('button[data-tab]');
    if (!t) return;
    if (!t.closest('#csNav') && !t.closest('#admBottomBar')) return;
    const name = t.getAttribute('data-tab');
    if (!name) return;
    state.currentTab = name;
    showTab(name);
    if (name === 'files') {
      setTimeout(() => document.dispatchEvent(new CustomEvent('adm:files-panel')), 0);
    }
  };
  getEl('csNav')?.addEventListener('click', onNav);
  getEl('admBottomBar')?.addEventListener('click', onNav);
}

wireMainNav();

getEl('admHamburger')?.addEventListener('click', (e) => {
  e.stopPropagation();
  getEl('admSidebar')?.classList.add('open');
  getEl('admSbOverlay')?.removeAttribute('hidden');
});
getEl('admSbOverlay')?.addEventListener('click', () => {
  getEl('admSidebar')?.classList.remove('open');
  getEl('admSbOverlay')?.setAttribute('hidden', '');
});

getEl('csQaClient')?.addEventListener('click', () => {
  showTab('clients');
  setTimeout(() => openNewClientDrawer(), 0);
});
getEl('csQaLead')?.addEventListener('click', () => {
  showTab('pipeline');
  setTimeout(() => openAddLeadDrawer(), 0);
});
getEl('csQaInv')?.addEventListener('click', () => {
  showTab('invoices');
  setTimeout(() => {
    getEl('invFormCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    getEl('invc')?.focus();
  }, 50);
});

document.getElementById('admLogout')?.addEventListener('click', (e) => {
  e.preventDefault();
  clearAuth();
  location.href = '/client-portal.html?agency=1';
});

if (typeof globalThis !== 'undefined') {
  globalThis.__csAdmin = { showTab, openNewClientDrawer, openAddLeadDrawer };
}

/** Wait for auth-bootstrap (Supabase URL/code → localStorage) before reading getToken() — otherwise admin shows "Not signed in" during OAuth return. */
(async function initAdminForSession() {
  try {
    const p = window.__csAuthReady;
    if (p && typeof p.then === 'function') {
      await Promise.race([
        p,
        new Promise((resolve) => setTimeout(resolve, 12000)),
      ]);
    }
  } catch (e) {
    console.warn('auth-bootstrap', e);
  }
  let tok = getToken();
  for (let i = 0; i < 20 && !tok; i += 1) {
    await new Promise((r) => setTimeout(r, 40));
    tok = getToken();
  }
  if (tok) {
    try {
      initToast();
      initUserMenu();
      const app = getEl('admApp');
      const out = getEl('admSignedOut');
      if (out) out.style.display = 'none';
      if (app) app.style.display = 'flex';
      window.scrollTo(0, 0);
      state.currentTab = readTabFromUrl();
      showTab(state.currentTab);
      const pDash = getEl('panel-dashboard');
      if (pDash) {
        if (state.currentTab === 'dashboard') pDash.innerHTML = dashboardPanelSkeleton();
      } else console.error('panel-dashboard missing');
      checkDbHealth();
      loadAll();
      fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + tok } })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!d) return;
          const u = d.user;
          if (!u) return;
          const el = getEl('admAvatarInitials');
          if (!el) return;
          if (u.full_name && u.full_name.trim()) {
            const parts = u.full_name.trim().split(/\s+/);
            el.textContent =
              parts.length > 1
                ? (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
                : u.full_name.slice(0, 2).toUpperCase();
            return;
          }
          if (u.email) {
            el.textContent = u.email
              .split('@')[0]
              .slice(0, 2)
              .toUpperCase();
          }
        })
        .catch(() => {});
    } catch (e) {
      console.error('Admin init failed', e);
      const app = getEl('admApp');
      const out = getEl('admSignedOut');
      if (app) app.style.display = 'none';
      if (out) {
        out.style.display = 'block';
        out.innerHTML = `<p style="margin:0 0 0.5rem 0">Something went wrong loading the admin. Try a <strong>hard refresh</strong> (Ctrl+Shift+R).</p><p class="phase-note" style="margin:0">Error: ${esc(
          e && e.message ? e.message : String(e)
        )}</p><p style="margin:0.75rem 0 0 0"><a href="/client-portal.html?agency=1" class="cs-link-a" style="font-weight:600">Client portal</a></p>`;
      }
    }
  } else {
    const app = getEl('admApp');
    const out = getEl('admSignedOut');
    if (app) app.style.display = 'none';
    if (out) out.style.display = 'block';
  }
})();

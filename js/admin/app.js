'use strict';

import { initToast, toast } from './toast.js';
import { api, withBusy } from './api.js';
import { getToken, clearAuth } from './config.js';
import { filterRows, sortRows, paginate } from './table-helpers.js';

const PER = 25;

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
  ui: { projectClientId: null },
  _prefillClientId: null,
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

function getGreeting() {
  const h = new Date().getHours();
  const name = parseDisplayName();
  if (h < 12) return `Good morning, ${name} 👋`;
  if (h < 17) return `Good afternoon, ${name} 👋`;
  return `Good evening, ${name} 👋`;
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
  dashboard: { section: 'Dashboard', page: 'Dashboard', greet: true, act: '' },
  leads: { section: 'Pipeline', page: 'Pipeline', greet: false, act: '<button type="button" class="btn-primary" id="hdrAddLead">+ Add lead</button>' },
  clients: { section: 'Clients', page: 'Clients', greet: false, act: '<button type="button" class="btn-primary" id="hdrNewClient">+ New client</button>' },
  projects: { section: 'Projects', page: 'Projects', greet: false, act: '' },
  invoices: { section: 'Invoices', page: 'Invoices', greet: false, act: '' },
  files: { section: 'Files', page: 'Files', greet: false, act: '' },
  messages: { section: 'Messages', page: 'Messages', greet: false, act: '' },
  time: { section: 'Time & Billing', page: 'Time & Billing', greet: false, act: '' },
  contracts: { section: 'Contracts', page: 'Contracts', greet: false, act: '' },
  activity: { section: 'Activity', page: 'Activity', greet: false, act: '' },
  settings: { section: 'Settings', page: 'Settings', greet: false, act: '' },
};

function setUserAvatar() {
  const el = getEl('csUserAvatar');
  if (!el) return;
  const n = parseDisplayName();
  el.textContent = n.slice(0, 2).toUpperCase();
}

function wireHeaderActions(tab) {
  if (tab === 'leads') {
    getEl('hdrAddLead')?.addEventListener('click', () => openAddLeadDrawer());
  }
  if (tab === 'clients') {
    getEl('hdrNewClient')?.addEventListener('click', () => openNewClientDrawer());
  }
}

function updatePageHeader(tab) {
  const c = TAB_CHROME[tab] || { section: tab, page: tab, greet: false, act: '' };
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
}

function openDrawer({ title, body, footer, onClose }) {
  const root = getEl('admDrawerRoot');
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
  if (aLow.includes('sign_in') || a === 'auth.signin') {
    return { icon: '🔑', text: 'You signed in', rel };
  }
  if (a === 'project_created' || a === 'project.create') {
    return { icon: '📁', text: `Created project “${esc(meta.name || 'Project')}”`, rel };
  }
  if (a === 'lead.create' || a === 'lead_submitted') {
    return { icon: '📬', text: `New lead — ${esc(meta.email || 'from form')}`, rel };
  }
  if (a === 'lead.update') {
    return { icon: '🔄', text: 'Lead status updated', rel };
  }
  if (a === 'client.update' || a === 'client.create') {
    return { icon: '👤', text: 'Client details updated', rel };
  }
  if (a === 'client.delete') {
    return { icon: '👤', text: 'Client removed', rel };
  }
  if (a === 'invoice.create' || a === 'invoice_created') {
    return { icon: '💳', text: 'Invoice created', rel };
  }
  if (a === 'invoice.update' || a === 'invoice.paid' || a === 'invoice_paid') {
    return { icon: '✅', text: 'Invoice updated', rel };
  }
  if (a === 'invoice.send' || a === 'invoice_sent') {
    return { icon: '✉️', text: 'Invoice email sent to client', rel };
  }
  if (a === 'message.send' || a === 'message_sent') {
    return { icon: '💬', text: 'Message sent to client on project', rel };
  }
  if (a === 'time.log' || a === 'time_logged') {
    return { icon: '⏱', text: `Logged ${esc(String(meta.hours || ''))} hrs on a project`, rel };
  }
  if (a === 'contract.create') {
    return { icon: '📄', text: 'Contract created', rel };
  }
  if (a === 'contract.send' || a === 'contract_sent') {
    return { icon: '📄', text: 'Contract sent to client', rel };
  }
  if (a === 'file.delete' || a === 'file.link' || a === 'file_uploaded') {
    return { icon: '📎', text: 'Project file changed', rel };
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
  document.querySelectorAll('button.cs-nav-item[data-tab]').forEach((b) => {
    const on = b.getAttribute('data-tab') === name;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  document.querySelectorAll('.adm-panel[data-panel]').forEach((p) => {
    const on = p.getAttribute('data-panel') === name;
    p.classList.toggle('is-visible', on);
    p.toggleAttribute('hidden', !on);
  });
  updatePageHeader(name);
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
}

function openModal(html, onClose) {
  const root = document.getElementById('admModalRoot');
  root.innerHTML = `<div class="adm-modal-backdrop" role="dialog"><div class="adm-modal">${html}</div></div>`;
  const bd = root.querySelector('.adm-modal-backdrop');
  const close = () => {
    root.innerHTML = '';
    if (onClose) onClose();
  };
  bd.addEventListener('click', (e) => {
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
  root.querySelector('#admConfirmGo').addEventListener('click', () => {
    onConfirm();
    close();
  });
}

let loadPromise;
async function checkDbHealth() {
  const el = document.getElementById('admDbBanner');
  if (!el) return;
  try {
    const d = await api('/api/admin/db-health');
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
  } catch (e) {
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
  renderAll();
}

function projectOptions() {
  return state.projects
    .map(
      (p) =>
        `<option value="${esc(p.id)}">${esc(p.name)} — ${esc((p.client && p.client.email) || '')}</option>`
    )
    .join('');
}

function clientOptions() {
  return state.clients
    .map(
      (c) =>
        `<option value="${esc(c.id)}">${esc(c.email)}${c.company ? ' — ' + esc(c.company) : ''}</option>`
    )
    .join('');
}

function findProject(id) {
  return state.projects.find((p) => p.id === id);
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
        <div class="cs-kpi-pills" style="margin-top:6px">
          <span class="badge badge-discovery">D ${byPh('discovery')}</span>
          <span class="badge badge-design">De ${byPh('design')}</span>
          <span class="badge badge-dev">Dev ${byPh('development')}</span>
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
    showTab('leads');
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
    <div class="lc-sub">${esc(L.company || '—')}</div>
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
        <div class="form-group"><label>Name *</label><input class="adm-inp" name="name" required /></div>
        <div class="form-group"><label>Email *</label><input class="adm-inp" name="email" type="email" required /></div>
        <div class="form-group"><label>Company</label><input class="adm-inp" name="company" /></div>
        <div class="form-group"><label>Source</label><input class="adm-inp" name="source" placeholder="e.g. LinkedIn" /></div>
        <div class="form-group"><label>Notes</label><textarea class="adm-inp" name="message" rows="3" placeholder="Context for your team…"></textarea></div>
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
    body: `<div class="form-group"><label>Status</label>
      <select class="adm-inp" id="ldSt">${LEAD_STATUSES.map((s) => `<option value="${esc(s)}" ${L.status === s ? 'selected' : ''}>${esc(
        s
      )}</option>`).join('')}</select>
      <p class="phase-note" style="margin:0.35rem 0 0">Saves as soon as you change the dropdown.</p></div>
      <div class="form-group"><label>Name</label><input class="adm-inp" id="ldName" value="${esc(L.name)}" /></div>
      <div class="form-group"><label>Email</label><input class="adm-inp" id="ldEmail" type="email" value="${esc(L.email)}" /></div>
      <div class="form-group"><label>Company</label><input class="adm-inp" id="ldCo" value="${esc(L.company || '')}" /></div>
      <div class="form-group"><label>Phone</label><input class="adm-inp" id="ldPh" value="${esc(L.phone || '')}" /></div>
      <div class="form-group"><label>Source</label><input class="adm-inp" id="ldSo" value="${esc(leadSrc(L))}" readonly style="opacity:0.9" /></div>
      <div class="form-group"><label>Notes</label><textarea class="adm-inp" id="ldMsg" rows="4">${esc(L.message || '')}</textarea></div>
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
          toast('Converted. Welcome email sends when Resend is configured.', 'success');
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
                <td>${esc(L.company || '—')}</td>
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

  getEl('panel-leads').innerHTML = `
    <div class="cs-lead-toolbar">
      <div class="adm-table-tools" style="margin:0;flex:1;min-width:12rem">
        <input type="search" class="adm-inp" data-leads-search placeholder="Search name, email, company, status…" value="${esc(st.q)}" style="max-width:20rem" />
      </div>
      <div class="cs-seg" role="group" aria-label="View">
        <button type="button" class="${st.view === 'kanban' ? 'active' : ''}" data-lv="kanban">Board</button>
        <button type="button" class="${st.view === 'table' ? 'active' : ''}" data-lv="table">Table</button>
      </div>
    </div>
    <div id="leadsViewKan" class="card" style="margin-bottom:0;${st.view === 'table' ? 'display:none' : ''}">${kanban}</div>
    <div id="leadsViewTbl" class="card" style="margin-bottom:0;${st.view === 'kanban' ? 'display:none' : ''}">${table}</div>`;

  const panel = getEl('panel-leads');
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
            toast('Converted. Welcome email sends when Resend is set up.', 'success');
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
    title: 'New client',
    body: `<p class="phase-note" style="margin-top:0">Creates a portal account. A welcome email is sent when the server is configured with Resend and email settings.</p>
      <form id="fNewCli" class="adm-form-stack">
        <div class="form-group"><label>Email *</label><input class="adm-inp" name="email" type="email" required /></div>
        <div class="form-group"><label>Full name *</label><input class="adm-inp" name="full_name" required /></div>
        <div class="form-group"><label>Company</label><input class="adm-inp" name="company" /></div>
        <div class="form-group"><label>Phone</label><input class="adm-inp" name="phone" type="tel" /></div>
        <div class="form-group"><label>Website</label><input class="adm-inp" name="website" type="url" placeholder="https://…" /></div>
        <div class="form-group"><label>Timezone</label><input class="adm-inp" name="timezone" placeholder="e.g. America/New_York" /></div>
        <label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer">
          <input type="checkbox" name="invite" checked disabled style="cursor:not-allowed" />
          <span>Send welcome email (when Resend is configured)</span>
        </label>
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
            <div class="form-group"><label>Full name</label><input class="adm-inp" id="cdFn" value="${esc(c.full_name || '')}" /></div>
            <div class="form-group"><label>Company</label><input class="adm-inp" id="cdCo" value="${esc(c.company || '')}" /></div>
            <div class="form-group"><label>Phone</label><input class="adm-inp" id="cdPh" value="${esc(c.phone || '')}" /></div>
            <div class="form-group"><label>Website</label><input class="adm-inp" id="cdWw" value="${esc(c.website || '')}" type="url" /></div>
            <div class="form-group"><label>Timezone</label><input class="adm-inp" id="cdTz" value="${esc(c.timezone || '')}" /></div>
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
                      <div class="cs-cli-co">${esc(c.company || '—')}</div>
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

  document.getElementById('panel-projects').innerHTML = `
    ${
      state.ui && state.ui.projectClientId
        ? `<div class="phase-note" style="margin:0 0 1rem;padding:10px 14px;background:var(--cs-accent-light);border:1px solid var(--cs-border);border-radius:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <span>Showing projects for one client</span>
            <button type="button" class="btn-secondary btn-sm" id="clrPCf">Clear filter</button>
          </div>`
        : ''
    }
    <div class="adm-card">
      <h2>Workspace — updates, phase, files</h2>
      <p class="phase-note">Select the <strong>project</strong> (not just the client) so the correct engagement is updated when a client has multiple projects.</p>
      <div class="adm-form-stack" style="max-width:36rem">
        <div class="form-group">
          <label>Project *</label>
          <select id="wsProject" class="ws-prj"><option value="">— Select a project —</option>${projectOptions()}</select>
        </div>
        <p id="wsCtx" class="phase-note" style="min-height:1.5em"></p>
        <div class="form-group">
          <label>Post update to client dashboard</label>
          <textarea id="wsUpd" rows="3" maxlength="5000" placeholder="Milestone, deliverable, next step…"></textarea>
          <div class="adm-hint-below"><span id="wsUpdC">0</span> / 5000 · <button type="button" class="tbl-link" id="wsPrevT">Preview</button></div>
        </div>
        <div id="wsPrev" style="display:none;border:1px solid #e2e8f0;padding:0.75rem;border-radius:0.5rem;margin-bottom:0.5rem;font-size:0.9rem"></div>
        <button type="button" class="btn btn-primary" id="wsPost" style="width:100%;max-width:16rem">Post update</button>
        <hr style="border:0;border-top:1px solid #e2e8f0;margin:1.5rem 0" />
        <h3 style="font-size:1rem;margin:0 0 0.5rem">Change phase</h3>
        <div class="form-group" style="display:flex;flex-wrap:wrap;gap:0.75rem;align-items:end">
          <div style="flex:1;min-width:10rem">
            <label>Phase</label>
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
        <hr style="border:0;border-top:1px solid #e2e8f0;margin:1.5rem 0" />
        <h3 style="font-size:1rem;margin:0 0 0.5rem">Upload file</h3>
        <div class="adm-drop" id="wsDrop">Drag files here or <label style="color:#6366f1;cursor:pointer"><input type="file" id="wsFile" style="display:none" /> browse</label></div>
        <p class="adm-hint-below" id="wsFname">No file selected</p>
        <button type="button" class="btn btn-outline" id="wsUpload">Upload to project</button>
        <p class="phase-note" style="margin:1rem 0 0.25rem">Or paste a <strong>public https</strong> file URL (e.g. cloud link) if Storage upload is not set up yet:</p>
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
    </div>
    <div class="adm-card">
      <h2>All projects</h2>
      <div class="adm-table-tools"><input type="search" data-pq placeholder="Search…" value="${esc(st.q)}" /></div>
      <div style="overflow-x:auto">
        <table>
          <thead>
            <tr>
              <th>Project</th><th>Client</th><th>Created</th><th>Phase</th><th>Type</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${slice
              .map(
                (p) => {
                  const c = p.client || {};
                  return `<tr>
                <td><button type="button" class="tbl-link" data-prname="${esc(p.id)}">${esc(p.name)}</button></td>
                <td>${esc(c.email || '—')}</td>
                <td>${p.created_at ? new Date(p.created_at).toLocaleString() : '—'}</td>
                <td>${phBadge(p.status)}</td>
                <td>${esc(p.website_type || '—')}</td>
                <td>
                  <button type="button" class="btn btn-sm btn-outline" data-edp="${esc(p.id)}">Edit</button>
                  <button type="button" class="btn btn-sm" style="color:#b91c1c" data-delp="${esc(p.id)}">Delete</button>
                </td>
              </tr>`;
                }
              )
              .join('')}
          </tbody>
        </table>
      </div>
      <div class="adm-pager">
        <span>Page ${page} / ${totalPages}</span>
        <button type="button" data-pp="prev" class="btn btn-sm" ${page <= 1 ? 'disabled' : ''}>Prev</button>
        <button type="button" data-pp="next" class="btn btn-sm" ${page >= totalPages ? 'disabled' : ''}>Next</button>
      </div>
    </div>
    <div class="adm-card">
      <h2>Create new project</h2>
      <form id="formNewProj" class="adm-form-stack" style="max-width:28rem">
        <div class="form-group"><label>Client *</label><select name="client_id" required><option value="">Select…</option>${clientOptions()}</select></div>
        <div class="form-group"><label>Project name *</label><input name="name" required /></div>
        <div class="form-group"><label>Website type</label><input name="website_type" /></div>
        <div class="form-group"><label>Phase</label><select name="status">
          <option value="discovery">Discovery</option><option value="design">Design</option><option value="development">Development</option><option value="review">Review</option><option value="live">Live</option>
        </select></div>
        <div class="form-group"><label>Internal notes</label><textarea name="internal_notes" rows="2"></textarea></div>
        <button type="submit" class="btn btn-primary" style="width:100%">Create project</button>
      </form>
    </div>`;

  const p = document.getElementById('panel-projects');
  p.querySelector('#clrPCf')?.addEventListener('click', () => {
    state.ui.projectClientId = null;
    renderProjects();
  });
  if (state._prefillClientId) {
    const ns = p.querySelector('#formNewProj select[name=client_id]');
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
  const syncWs = () => {
    const id = p.querySelector('#wsProject')?.value;
    state._lastActProject = id;
    const pr = findProject(id);
    const el = p.querySelector('#wsCtx');
    const ph = p.querySelector('#wsPhase');
    if (el) {
      if (pr) {
        el.innerHTML = `Selected: <strong>${esc(pr.name)}</strong> · Current phase: ${phBadge(pr.status || 'discovery')}`;
      } else {
        el.textContent = 'Select a project';
      }
    }
    if (pr && ph) {
      ph.value = pr.status || 'discovery';
    }
    loadWsFiles();
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
  p.querySelector('#wsPrevT')?.addEventListener('click', () => {
    const t = p.querySelector('#wsUpd')?.value || '';
    const pr = p.querySelector('#wsPrev');
    if (pr.style.display === 'block') {
      pr.style.display = 'none';
    } else {
      pr.style.display = 'block';
      pr.textContent = t || '(empty)';
    }
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
      const html = `<h3 style="margin-top:0">Edit project</h3>
        <form id="epf" class="adm-form-stack">
          <div class="form-group"><label>Name</label><input name="name" value="${esc(pr.name)}" required /></div>
          <div class="form-group"><label>Type</label><input name="website_type" value="${esc(pr.website_type || '')}" /></div>
          <div class="form-group"><label>Internal notes</label><textarea name="internal_notes" rows="2">${esc(pr.internal_notes || '')}</textarea></div>
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

  document.getElementById('panel-invoices').innerHTML = `
    <div class="adm-card">
      <h2>Create invoice</h2>
      <form id="formInv" class="adm-form-stack" style="max-width:32rem">
        <div class="form-group"><label>Client *</label><select name="client_id" id="invc" required><option value="">—</option>${clientOptions()}</select></div>
        <div class="form-group"><label>Project (optional)</label><select name="project_id" id="invp"><option value="">—</option>${projectOptions()}</select></div>
        <div id="lineItems"><div class="form-group li-row" data-idx="0"><label>Line item</label><input name="l_desc" placeholder="Description" /><input name="l_amt" type="number" step="0.01" min="0" placeholder="Amount" style="margin-top:0.5rem" /></div></div>
        <button type="button" class="btn btn-outline btn-sm" id="addLine" style="margin-bottom:0.75rem">+ Add line</button>
        <p class="hint" style="margin:0 0 0.5rem">Total updates automatically from line item amounts below.</p>
        <div class="form-group"><label>Total (USD) * <span class="phase-note" style="font-weight:400">(auto)</span></label><input name="amount" type="number" id="invt" step="0.01" min="0" required readonly /></div>
        <div class="form-group"><label>Description (summary, optional)</label><input name="description" placeholder="e.g. February milestone" /></div>
        <div class="form-group"><label>Due date</label><input name="due_date" type="date" /></div>
        <button type="submit" class="btn btn-primary" style="width:100%">Create invoice</button>
      </form>
    </div>
    <div class="adm-card">
      <h2>Invoices</h2>
      <div class="adm-table-tools"><input type="search" data-iq value="${esc(st.q)}" placeholder="Search…" /></div>
      <div style="overflow-x:auto">
        <table>
          <thead>
            <tr>
              <th>Amount</th><th>Project</th><th>Status</th><th>Due</th><th>Created</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${slice
              .map(
                (i) => `<tr>
              <td>$${Number(i.amount).toFixed(2)}</td>
              <td>${esc(i.project_name || (i.project_id ? '—' : '—'))}</td>
              <td>${invStatusBadge(i.status)}</td>
              <td>${i.due_date || '—'}</td>
              <td>${i.created_at ? new Date(i.created_at).toLocaleString() : '—'}</td>
              <td>
                <button type="button" class="btn btn-sm btn-outline" data-vwinv="${esc(i.id)}">View</button>
                <button type="button" class="btn btn-sm btn-outline" data-markpaid="${esc(i.id)}" ${
  i.status === 'paid' ? 'disabled' : ''
}>Mark paid</button>
                <button type="button" class="btn btn-sm btn-outline" data-payinv="${esc(i.id)}" ${
  i.status === 'paid' ? 'disabled' : ''
}>Pay link (Stripe)</button>
                <button type="button" class="btn btn-sm btn-outline" data-sndinv="${esc(i.id)}">Send email</button>
                <button type="button" class="btn btn-sm" style="color:#b91c1c" data-delinv="${esc(i.id)}">Delete</button>
              </td>
            </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
      <div class="adm-pager">
        <span>Page ${page} / ${totalPages}</span>
        <button type="button" data-ip="prev" class="btn btn-sm" ${page <= 1 ? 'disabled' : ''}>Prev</button>
        <button type="button" data-ip="next" class="btn btn-sm" ${page >= totalPages ? 'disabled' : ''}>Next</button>
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
    const invt = p.querySelector('#invt');
    if (invt) invt.value = t.toFixed(2);
  };
  p.querySelector('#addLine')?.addEventListener('click', () => {
    const c = p.querySelector('#lineItems');
    const d = document.createElement('div');
    d.className = 'form-group li-row';
    d.innerHTML = `<label>Line item</label><input name="l_desc" placeholder="Description" /><input name="l_amt" type="number" step="0.01" min="0" placeholder="Amount" style="margin-top:0.5rem" />`;
    c.appendChild(d);
    recalc();
  });
  p.querySelector('#lineItems')?.addEventListener('input', (e) => {
    if (e.target && e.target.matches && e.target.matches('input[name=l_amt]')) recalc();
  });
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
    const total = Number(f.querySelector('#invt').value) || 0;
    if (!f.querySelector('#invc').value || !total) {
      toast('Client and total required', 'error');
      return;
    }
    const body = {
      client_id: f.querySelector('#invc').value,
      project_id: f.querySelector('#invp').value || null,
      amount: total,
      line_items: lines,
      description: f.querySelector('[name=description]')?.value || null,
      due_date: f.querySelector('[name=due_date]')?.value || null,
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
      <p class="phase-note">Pick a project to list uploads. You can also upload from the <strong>Projects</strong> tab.</p>
      ${
        hasProjects
          ? `<div class="form-group" style="max-width:24rem">
        <label>Project</label>
        <select id="fTabP"><option value="">— Select a project —</option>${projectOptions()}</select>
      </div>`
          : '<p class="phase-note" role="status">No projects yet. Create a project under <strong>Projects</strong> first.</p>'
      }
      <div id="fTabL"></div>
    </div>`;
  const loadF = () => {
    const id = document.getElementById('fTabP')?.value;
    const box = document.getElementById('fTabL');
    if (!box) return;
    if (!id) {
      box.innerHTML = '<p class="phase-note">Select a project above to list files.</p>';
      return;
    }
    box.textContent = 'Loading…';
    api(`/api/admin/by-project/${id}/files`)
      .then((d) => {
        const files = d.files || [];
        box.innerHTML = files.length
          ? `<table><thead><tr><th>File</th><th>When</th></tr></thead><tbody>
            ${files
              .map(
                (f) => `<tr><td><a href="${esc(f.file_url)}" target="_blank" rel="noopener">${esc(
                  f.file_name
                )}</a></td><td>${f.uploaded_at ? new Date(f.uploaded_at).toLocaleString() : '—'}</td></tr>`
              )
              .join('')}
            </tbody></table>`
          : '<p class="phase-note">No files.</p>';
      })
      .catch(() => {
        box.textContent = 'Failed to load';
      });
  };
  document.getElementById('fTabP')?.addEventListener('change', loadF);
  document.addEventListener('adm:files-panel', loadF, { once: true });
  if (hasProjects) loadF();
  else {
    const box = document.getElementById('fTabL');
    if (box) box.innerHTML = '';
  }
}

/* ---------- Messages ---------- */
function renderMessages() {
  const recent = (state.messages || []).slice(0, 30);
  const recentHtml = recent.length
    ? recent
        .map(
          (m) => `<li style="border-bottom:1px solid #f1f5f9;padding:0.5rem 0">
          <div style="font-size:0.8rem;color:#94a3b8">${m.created_at ? new Date(m.created_at).toLocaleString() : '—'}
            · <strong>${esc(m.project_name || 'Project')}</strong></div>
          <div style="margin-top:0.25rem;white-space:pre-wrap;font-size:0.9rem">${esc(m.content)}</div>
        </li>`
        )
        .join('')
    : '<li class="phase-note" style="list-style:none">No messages yet.</li>';
  document.getElementById('panel-messages').innerHTML = `
    <div class="adm-card">
      <h2>Message client (project thread)</h2>
      <p class="phase-note">Messages appear in the client dashboard for the selected project.</p>
      <div class="form-group">
        <label>Project *</label>
        <select id="msgP">${projectOptions()}</select>
      </div>
      <div class="form-group">
        <label>Message</label>
        <textarea id="msgB" rows="3" maxlength="4000" style="width:100%"></textarea>
        <div class="adm-hint-below"><span id="msgC">0</span> / 4000</div>
      </div>
      <button type="button" class="btn btn-primary" id="msgS">Send</button>
    </div>
    <div class="adm-card">
      <h2>Recent messages</h2>
      <p class="phase-note" style="margin-bottom:0.75rem">Last 30 team messages, newest first (grouped by time).</p>
      <ul style="list-style:none;padding:0;margin:0;max-height:50vh;overflow:auto">${recentHtml}</ul>
    </div>`;
  const p = document.getElementById('panel-messages');
  p.querySelector('#msgB')?.addEventListener('input', (e) => {
    p.querySelector('#msgC').textContent = String(e.target.value.length);
  });
  p.querySelector('#msgS')?.addEventListener('click', () => {
    const project_id = p.querySelector('#msgP')?.value;
    const content = p.querySelector('#msgB')?.value?.trim();
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
  });
}

/* ---------- Time ---------- */
function renderTime() {
  const entries = state.timeEntries || [];
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
        `<tr><td>${projectNameOrDash(pid)}</td><td><strong>${hours.toFixed(2)}</strong> h</td></tr>`
    )
    .join('');
  const totalH = entries.reduce((a, t) => a + (Number(t.hours) || 0), 0);
  const summaryTable =
    summaryRows || '<tr><td colspan="2" class="phase-note">No time logged yet — add hours above.</td></tr>';

  document.getElementById('panel-time').innerHTML = `
    <div class="adm-card">
      <h2>Log time</h2>
      <form id="formTime" class="adm-form-stack" style="max-width:22rem">
        <div class="form-group"><label>Project *</label><select name="project_id" required><option value="">—</option>${projectOptions()}</select></div>
        <div class="form-group"><label>Date</label><input name="worked_date" type="date" required /></div>
        <div class="form-group"><label>Hours *</label><input name="hours" type="number" min="0.25" step="0.25" required /></div>
        <div class="form-group"><label>Description</label><input name="description" placeholder="What you worked on" /></div>
        <button type="submit" class="btn btn-primary" style="width:100%">Log</button>
      </form>
    </div>
    <div class="adm-card">
      <h2>Summary</h2>
      <p class="phase-note" style="margin-bottom:0.5rem">Totals from <strong>loaded entries</strong> (up to 500 from the server).</p>
      <p style="font-size:1.1rem;margin-bottom:0.75rem"><strong>All projects:</strong> ${totalH.toFixed(2)} hours</p>
      <div style="overflow-x:auto;max-width:32rem">
        <table>
          <thead><tr><th>Project</th><th>Hours</th></tr></thead>
          <tbody>${summaryTable}</tbody>
        </table>
      </div>
    </div>
    <div class="adm-card">
      <h2>Time entries (recent)</h2>
      <div style="overflow-x:auto">
        <table>
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
              .join('') || '<tr><td colspan="4" class="phase-note">No entries yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
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
        return loadAll();
      })
      .catch((er) => toast(er.message, 'error'));
  });
}

/* ---------- Contracts ---------- */
function renderContracts() {
  document.getElementById('panel-contracts').innerHTML = `
    <div class="adm-card">
      <h2>Add contract / proposal</h2>
      <form id="formContract" class="adm-form-stack" style="max-width:26rem">
        <div class="form-group"><label>Client *</label><select name="client_id" required><option>—</option>${clientOptions()}</select></div>
        <div class="form-group"><label>Project</label><select name="project_id"><option value="">—</option>${projectOptions()}</select></div>
        <div class="form-group"><label>Title *</label><input name="title" required /></div>
        <div class="form-group"><label>Status</label>
          <select name="status"><option value="draft">Draft</option><option value="sent">Sent</option><option value="signed">Signed</option><option value="void">Void</option></select>
        </div>
        <div class="form-group"><label>Contract / proposal text</label><textarea name="body" rows="6" placeholder="Write the project scope, deliverables, payment terms, and any other agreements here..."></textarea></div>
        <div class="form-group"><label>File URL (signed PDF, etc.)</label><input name="file_url" type="url" placeholder="https://…" /></div>
        <button type="submit" class="btn btn-primary" style="width:100%">Save</button>
      </form>
    </div>
    <div class="adm-card">
      <h2>Contracts</h2>
      <div style="overflow-x:auto">
        <table>
          <thead><tr><th>Title</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>
            ${state.contracts
              .map(
                (c) => `<tr>
              <td>${esc(c.title)}${c.body ? ` <span class="phase-note" style="font-size:0.75rem">(has text)</span>` : ''}</td>
              <td>${esc(c.status)}</td>
              <td>${c.created_at ? new Date(c.created_at).toLocaleString() : '—'}</td>
              <td>
                <button type="button" class="btn btn-sm btn-outline" data-vwct="${esc(c.id)}">View</button>
                <button type="button" class="btn btn-sm btn-outline" data-edct="${esc(c.id)}">Edit</button>
                <button type="button" class="btn btn-sm btn-outline" data-sndct="${esc(c.id)}">Send to client</button>
                ${c.file_url ? `<a href="${esc(c.file_url)}" target="_blank" rel="noopener" class="btn btn-sm btn-outline">File</a>` : ''}
                <button type="button" class="btn btn-sm" data-delct="${esc(c.id)}" style="color:#b91c1c">Delete</button>
              </td>
            </tr>`
              )
              .join('') || '<tr><td colspan="4">No contracts yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
  document.getElementById('formContract')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const body = {
      client_id: f.get('client_id'),
      project_id: f.get('project_id') || null,
      title: f.get('title'),
      status: f.get('status'),
      file_url: f.get('file_url') || null,
      body: f.get('body') || null,
    };
    withBusy(
      e.target.querySelector('button'),
      api('/api/admin/contracts', { method: 'POST', body: JSON.stringify(body) })
    )
      .then(() => {
        toast('Contract saved', 'success');
        e.target.reset();
        return loadAll();
      })
      .catch((er) => toast(er.message, 'error'));
  });
  document.querySelectorAll('[data-delct]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-delct');
      confirmDialog('Delete', 'Delete this contract record?', () => {
        api(`/api/admin/contracts/${id}`, { method: 'DELETE' })
          .then(() => {
            toast('Deleted', 'success');
            return loadAll();
          })
          .catch((e) => toast(e.message, 'error'));
      });
    });
  });
  document.querySelectorAll('[data-vwct]').forEach((b) => {
    b.addEventListener('click', () => {
      const c = state.contracts.find((x) => x.id === b.getAttribute('data-vwct'));
      if (!c) return;
      const body = (c.body && String(c.body).trim()) || '— (no text saved yet)';
      openModal(
        `<h3 style="margin-top:0">${esc(c.title)}</h3>
        <p class="phase-note" style="margin:0 0 0.5rem">Status: ${esc(c.status || '—')}</p>
        <pre style="white-space:pre-wrap;font-size:0.9rem;max-height:60vh;overflow:auto;text-align:left;background:#f8fafc;padding:1rem;border-radius:0.5rem">${esc(
          body
        )}</pre>
        <p style="margin-top:0.75rem"><button type="button" class="btn btn-primary" data-close-modal>Close</button></p>`,
        null
      );
    });
  });
  document.querySelectorAll('[data-edct]').forEach((b) => {
    b.addEventListener('click', () => {
      const c = state.contracts.find((x) => x.id === b.getAttribute('data-edct'));
      if (!c) return;
      const tid = `edct-title-${c.id}`;
      const bid = `edct-body-${c.id}`;
      const sid = `edct-st-${c.id}`;
      const { close, root } = openModal(
        `<h3 style="margin-top:0">Edit contract</h3>
        <div class="form-group"><label>Title</label><input type="text" id="${tid}" class="adm-inp" value="${esc(
          c.title
        )}" style="width:100%"/></div>
        <div class="form-group"><label>Status</label><select id="${sid}" style="width:100%">
          ${['draft', 'sent', 'signed', 'void']
            .map((s) => `<option value="${s}" ${c.status === s ? 'selected' : ''}>${s}</option>`)
            .join('')}
        </select></div>
        <div class="form-group"><label>Text</label><textarea id="${bid}" rows="10" style="width:100%;font-size:0.9rem">${esc(
          c.body || ''
        )}</textarea></div>
        <p><button type="button" class="btn btn-primary" id="edct-save">Save</button> <button type="button" class="btn btn-outline" data-close-modal>Cancel</button></p>`,
        null
      );
      root.querySelector('#edct-save')?.addEventListener('click', () => {
        const title = document.getElementById(tid)?.value;
        const body = document.getElementById(bid)?.value;
        const status = document.getElementById(sid)?.value;
        api(`/api/admin/contracts/${c.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ title, body, status }),
        })
          .then(() => {
            close();
            toast('Contract updated', 'success');
            return loadAll();
          })
          .catch((e) => toast(e.message, 'error'));
      });
    });
  });
  document.querySelectorAll('[data-sndct]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-sndct');
      withBusy(
        b,
        api(`/api/admin/contracts/${id}/send`, { method: 'POST' })
          .then((r) => {
            toast(r.sent ? 'Email sent' : 'Could not send — check Resend and client email', r.sent ? 'success' : 'warning');
            return loadAll();
          })
          .catch((e) => toast(e.message, 'error'))
      );
    });
  });
}

/* ---------- Settings ---------- */
function renderSettings() {
  getEl('panel-settings').innerHTML = `
    <div class="card cs-settings-sec" style="margin-bottom:0">
      <p class="cs-set-hint" style="margin:0 0 1.25rem 0">Agency defaults and integrations. Values marked “environment” are set on your host (Railway, etc.), not in this UI.</p>
      <div style="display:grid;gap:1.75rem;max-width:40rem">
        <section>
          <h3 style="font-size:16px;margin:0 0 0.5rem 0">Agency info</h3>
          <p class="phase-note" style="margin:0">Name, address, and branding on invoices and contracts: configure via your server env and site settings where applicable.</p>
        </section>
        <section>
          <h3 style="font-size:16px;margin:0 0 0.5rem 0">Billing defaults</h3>
          <p class="phase-note" style="margin:0">Default hourly rate and invoice terms will live here; today they are set per workflow (Time / Invoices tabs).</p>
        </section>
        <section>
          <h3 style="font-size:16px;margin:0 0 0.5rem 0">Email (Resend)</h3>
          <p class="phase-note" style="margin:0">Set <code>RESEND_API_KEY</code> and <code>FROM_EMAIL</code> in the server environment. Without them, transactional emails are skipped and the app still works.</p>
        </section>
        <section>
          <h3 style="font-size:16px;margin:0 0 0.5rem 0">Integrations</h3>
          <p class="phase-note" style="margin:0">Stripe, Calendly, and public URLs: see <a href="docs/LAUNCH-PHASES.md" target="_blank" rel="noopener">Launch phases</a> and your <code>.env</code> / Railway variables.</p>
        </section>
        <section>
          <h3 style="font-size:16px;margin:0 0 0.5rem 0">Danger zone</h3>
          <p class="phase-note" style="margin:0">Bulk demo data removal is not available here; delete or archive test records in Supabase or with per-entity actions.</p>
        </section>
      </div>
    </div>`;
}

/* ---------- Activity ---------- */
function renderActivity() {
  const ev = state.activity || [];
  const listHtml = ev.length
    ? ev
        .map((a) => {
          const f = formatActivityEvent(a);
          return `<li class="activity-item" style="display:flex;gap:14px;align-items:flex-start;list-style:none;border-bottom:1px solid var(--cs-border);padding:14px 0" role="listitem">
            <div class="activity-icon" style="width:32px;height:32px;border-radius:50%;background:var(--cs-accent-light);color:var(--cs-accent);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;margin-top:2px">${f.icon}</div>
            <div class="activity-content" style="flex:1;min-width:0">
              <div class="activity-text" style="font-size:13px;line-height:1.5;color:var(--cs-text);margin:0">${f.text}</div>
              <div class="activity-time" style="font-size:11px;margin-top:4px;color:var(--cs-text-muted)">${a.created_at ? formatRelative(a.created_at) : '—'}</div>
            </div>
          </li>`;
        })
        .join('')
    : '<li class="phase-note" style="list-style:none">No activity recorded yet. Actions you take in this admin (invoices, files, messages, etc.) will show up here.</li>';
  getEl('panel-activity').innerHTML = `
    <div class="card" style="margin-bottom:0">
      <div class="card-header" style="border:0">
        <span class="card-title">Activity (recent 100)</span>
      </div>
      <div style="max-height:70vh;overflow:auto">
        <ul style="list-style:none;padding:0;margin:0" role="list">
          ${listHtml}
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
  if (!m || !a) return;
  a.addEventListener('click', (e) => {
    e.stopPropagation();
    m.classList.toggle('open');
    a.setAttribute('aria-expanded', m.classList.contains('open') ? 'true' : 'false');
  });
  document.addEventListener('click', (e) => {
    if (!m.contains(e.target)) {
      m.classList.remove('open');
      a.setAttribute('aria-expanded', 'false');
    }
  });
}

document.getElementById('csNav')?.addEventListener('click', (e) => {
  const t = e.target.closest('button[data-tab]');
  if (!t) return;
  const name = t.getAttribute('data-tab');
  state.currentTab = name;
  showTab(name);
  if (name === 'files') {
    setTimeout(() => document.dispatchEvent(new CustomEvent('adm:files-panel')), 0);
  }
});

getEl('csQaClient')?.addEventListener('click', () => {
  showTab('clients');
  setTimeout(() => openNewClientDrawer(), 0);
});
getEl('csQaLead')?.addEventListener('click', () => {
  showTab('leads');
  setTimeout(() => openAddLeadDrawer(), 0);
});
getEl('csQaInv')?.addEventListener('click', () => {
  showTab('invoices');
});

document.getElementById('admLogout')?.addEventListener('click', (e) => {
  e.preventDefault();
  clearAuth();
  location.href = 'client-portal.html?agency=1';
});

if (getToken()) {
  initToast();
  initUserMenu();
  const app = getEl('admApp');
  const out = getEl('admSignedOut');
  if (out) out.style.display = 'none';
  if (app) app.style.display = 'flex';
  window.scrollTo(0, 0);
  showTab('dashboard');
  getEl('panel-dashboard').innerHTML = '<p class="phase-note" style="padding:2rem 0">Loading…</p>';
  checkDbHealth();
  loadAll();
} else {
  const app = getEl('admApp');
  const out = getEl('admSignedOut');
  if (app) app.style.display = 'none';
  if (out) out.style.display = 'block';
}

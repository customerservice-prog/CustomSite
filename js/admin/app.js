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
  contracts: [],
  timeEntries: [],
  table: {},
  currentTab: 'dashboard',
};

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function phBadge(phase) {
  const p = (phase || 'discovery').toLowerCase();
  return `<span class="badge badge-ph-${p}">${esc(p)}</span>`;
}

function invStatusBadge(st) {
  const s = (st || 'pending').toLowerCase();
  const map = { pending: 'Unpaid', paid: 'Paid', overdue: 'Overdue' };
  return `<span class="badge badge-inv-${s}">${esc(map[s] || s)}</span>`;
}

function showTab(name) {
  state.currentTab = name;
  document.querySelectorAll('#admTabs [data-tab]').forEach((b) => {
    const on = b.getAttribute('data-tab') === name;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  document.querySelectorAll('[data-panel]').forEach((p) => {
    const on = p.getAttribute('data-panel') === name;
    p.classList.toggle('is-visible', on);
    p.toggleAttribute('hidden', !on);
  });
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
    el.innerHTML = `<strong>Database is not set up or projects table is missing.</strong> <span>${esc(
      String(code)
    )}</span>${esc(hint)} <a href="docs/LAUNCH-PHASES.md" target="_blank" rel="noopener">Open Launch phases</a> — run <code>supabase/migrations/001_core.sql</code> (then 002, 003) in the Supabase SQL editor.`;
  } catch (e) {
    el.innerHTML = '';
    el.hidden = true;
  }
}

async function loadAll() {
  if (!getToken()) return;
  const h = { headers: { Authorization: `Bearer ${getToken()}` } };
  try {
    const [leadsR, clientsR, projectsR, invR, actR, contrR, timeR] = await Promise.all([
      api('/api/admin/leads', h).catch(() => ({ leads: [] })),
      api('/api/admin/clients', h).catch(() => ({ clients: [] })),
      api('/api/admin/projects', h).catch(() => ({ projects: [] })),
      api('/api/admin/invoices', h).catch(() => ({ invoices: [] })),
      api('/api/admin/activity', h).catch(() => ({ events: [] })),
      api('/api/admin/contracts', h).catch(() => ({ contracts: [] })),
      api('/api/admin/time-entries', h).catch(() => ({ entries: [] })),
    ]);
    state.leads = leadsR.leads || [];
    state.clients = clientsR.clients || [];
    state.projects = projectsR.projects || [];
    state.invoices = invR.invoices || [];
    state.activity = actR.events || [];
    state.contracts = contrR.contracts || [];
    state.timeEntries = timeR.entries || [];
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
function renderDashboard() {
  const open = state.projects.filter((p) => !['live'].includes(p.status));
  const byPh = (ph) => state.projects.filter((p) => p.status === ph).length;
  const unpaid = state.invoices
    .filter((i) => (i.status || 'pending') !== 'paid')
    .reduce((a, i) => a + Number(i.amount || 0), 0);
  const pipe = state.leads.filter((l) => !['Closed Won', 'Closed Lost'].includes(l.status)).length;
  const noDataYet =
    !state.leads.length && !state.clients.length && !state.projects.length && !(state.invoices && state.invoices.length);
  const emptyHelp = noDataYet
    ? `<div class="adm-diag" role="status">
  <div><strong>Dashboard is empty.</strong> That is normal for a new project. Add a lead under <strong>Leads</strong> to see counts update. If you expected data here, check <strong>Railway</strong> for <code style="font-size:0.8em">SUPABASE_URL</code>, <code style="font-size:0.8em">SUPABASE_ANON_KEY</code>, and <code style="font-size:0.8em">SUPABASE_SERVICE_ROLE_KEY</code> (same Supabase project as your tables) and run the schema in <a href="docs/LAUNCH-PHASES.md" target="_blank" rel="noopener">Launch phases</a>. The contact form uses the same database.</div>
</div>`
    : '';

  document.getElementById('panel-dashboard').innerHTML = `
    ${emptyHelp}
    <div class="adm-stats">
      <div class="adm-stat"><div class="n">${state.clients.length}</div><div class="l">Active clients</div></div>
      <div class="adm-stat"><div class="n">${open.length}</div><div class="l">Open projects</div></div>
      <div class="adm-stat"><div class="n">$${unpaid.toFixed(2)}</div><div class="l">Unpaid invoices (total)</div></div>
      <div class="adm-stat"><div class="n">${pipe}</div><div class="l">Leads in pipeline</div></div>
    </div>
    <div class="adm-card">
      <h2>Phases (counts)</h2>
      <div class="adm-phase-pills" style="display:flex;flex-wrap:wrap;gap:0.4rem;align-items:center">
        <span>Discovery <strong class="adm-pill n">${byPh('discovery')}</strong></span>
        <span>Design <strong class="adm-pill n">${byPh('design')}</strong></span>
        <span>Dev <strong class="adm-pill n">${byPh('development')}</strong></span>
        <span>Review <strong class="adm-pill n">${byPh('review')}</strong></span>
        <span>Live <strong class="adm-pill n">${byPh('live')}</strong></span>
      </div>
    </div>`;
}

/* ---------- Leads ---------- */
function renderLeads() {
  const st = (state.table.leads = state.table.leads || { q: '', sort: 'created_at', dir: 'desc', page: 1 });
  let rows = filterRows(state.leads, st.q, ['name', 'email', 'status', 'company']);
  rows = sortRows(rows, st.sort, st.dir, (r) => r[st.sort] || r.created_at);
  const { slice, page, totalPages } = paginate(rows, st.page, PER);

  const head = (key, label) => {
    const cur = st.sort === key;
    return `<th><button type="button" class="tbl-link" data-lsort="${key}">${esc(label)}${cur ? (st.dir === 'asc' ? ' ▲' : ' ▼') : ''}</button></th>`;
  };

  document.getElementById('panel-leads').innerHTML = `
    <div class="adm-card">
      <h2>Add lead manually</h2>
      <p class="hint">Use when a prospect reaches out on LinkedIn, email, or phone — not only from the site form.</p>
      <form id="formAddLead" class="adm-form-stack" style="max-width:32rem">
        <div class="form-group"><label>Name *</label><input name="name" required /></div>
        <div class="form-group"><label>Email *</label><input name="email" type="email" required /></div>
        <div class="form-group"><label>Company</label><input name="company" /></div>
        <div class="form-group"><label>Source</label><input name="source" placeholder="e.g. LinkedIn" /></div>
        <div class="form-group"><label>Notes</label><textarea name="message" rows="2"></textarea></div>
        <button type="submit" class="btn btn-primary">Add lead</button>
      </form>
    </div>
    <div class="adm-card">
      <h2>All leads</h2>
      <div class="adm-table-tools">
        <input type="search" data-leads-search placeholder="Search name, email, status…" value="${esc(st.q)}" />
      </div>
      <div style="overflow-x:auto">
        <table>
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
              .map((L) => {
                return `<tr data-lead-id="${esc(L.id)}">
                  <td>${esc(L.name)}</td>
                  <td>${esc(L.email)}</td>
                  <td>${esc(L.company || '—')}</td>
                  <td><select class="status-sel" data-lid="${esc(L.id)}">
                    ${['New', 'Contacted', 'Proposal Sent', 'Closed Won', 'Closed Lost']
                      .map(
                        (s) => `<option value="${esc(s)}" ${L.status === s ? 'selected' : ''}>${esc(s)}</option>`
                      )
                      .join('')}
                  </select></td>
                  <td>
                    <button type="button" class="btn btn-outline btn-sm" data-edlead="${esc(L.id)}">Edit</button>
                    <button type="button" class="btn btn-outline btn-sm" data-cvlead="${esc(L.id)}" ${
                  L.status === 'Closed Won' || L.status === 'Closed Lost' ? 'disabled' : ''
                }>Convert</button>
                    <button type="button" class="btn btn-outline btn-sm" data-dellead="${esc(L.id)}" style="color:#b91c1c">Delete</button>
                  </td>
                  <td>${L.created_at ? new Date(L.created_at).toLocaleString() : '—'}</td>
                </tr>`;
              })
              .join('')}
          </tbody>
        </table>
      </div>
      <div class="adm-pager">
        <span>Page ${page} / ${totalPages}</span>
        <button type="button" class="btn btn-sm btn-outline" data-lp="prev" ${page <= 1 ? 'disabled' : ''}>Prev</button>
        <button type="button" class="btn btn-sm btn-outline" data-lp="next" ${page >= totalPages ? 'disabled' : ''}>Next</button>
      </div>
    </div>`;

  const panel = document.getElementById('panel-leads');
  panel.querySelector('#formAddLead')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
      name: fd.get('name'),
      email: fd.get('email'),
      company: fd.get('company') || '',
      source: fd.get('source') || 'Manual',
      message: fd.get('message') || 'Added from admin',
    };
    withBusy(
      e.target.querySelector('button[type=submit]'),
      api('/api/admin/leads', { method: 'POST', body: JSON.stringify(body) })
    )
      .then(() => {
        toast('Lead added', 'success');
        e.target.reset();
        return loadAll();
      })
      .catch((err) => toast(err.message, 'error'));
  });
  panel.querySelector('[data-leads-search]')?.addEventListener('input', (e) => {
    state.table.leads.q = e.target.value;
    state.table.leads.page = 1;
    renderLeads();
  });
  panel.querySelectorAll('[data-lsort]').forEach((b) => {
    b.addEventListener('click', () => {
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
    sel.addEventListener('change', () => {
      const id = sel.getAttribute('data-lid');
      api(`/api/admin/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ status: sel.value }) })
        .then(() => toast('Status updated', 'success'))
        .catch((e) => toast(e.message, 'error'));
    });
  });
  panel.querySelectorAll('[data-cvlead]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-cvlead');
      const L = state.leads.find((x) => x.id === id);
      if (!L) return;
      confirmDialog('Convert lead', `Create a portal user for ${L.email} and a project?`, () => {
        api(`/api/admin/leads/${id}/convert`, { method: 'POST' })
          .then(() => {
            toast('Converted (welcome email if configured)', 'success');
            return loadAll();
          })
          .catch((e) => toast(e.message, 'error'));
      });
    });
  });
  panel.querySelectorAll('[data-dellead]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-dellead');
      confirmDialog('Delete lead', 'Permanently remove this lead?', () => {
        api(`/api/admin/leads/${id}`, { method: 'DELETE' })
          .then(() => {
            toast('Lead deleted', 'success');
            return loadAll();
          })
          .catch((e) => toast(e.message, 'error'));
      });
    });
  });
  panel.querySelectorAll('[data-edlead]').forEach((b) => {
    b.addEventListener('click', () => {
      const L = state.leads.find((x) => x.id === b.getAttribute('data-edlead'));
      if (!L) return;
      const html = `
        <h3 style="margin-top:0">Edit lead</h3>
        <form id="edLeadF" class="adm-form-stack">
          <div class="form-group"><label>Name</label><input name="name" value="${esc(L.name)}" required /></div>
          <div class="form-group"><label>Email</label><input name="email" value="${esc(L.email)}" required /></div>
          <div class="form-group"><label>Company</label><input name="company" value="${esc(L.company || '')}" /></div>
          <div class="form-group"><label>Message / notes</label><textarea name="message" rows="3">${esc(L.message || '')}</textarea></div>
          <button type="submit" class="btn btn-primary">Save</button>
        </form>`;
      const { close, root } = openModal(html);
      root.querySelector('#edLeadF').addEventListener('submit', (ev) => {
        ev.preventDefault();
        const f = new FormData(ev.target);
        api(`/api/admin/leads/${L.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: f.get('name'),
            email: f.get('email'),
            company: f.get('company'),
            message: f.get('message'),
          }),
        })
          .then(() => {
            toast('Lead saved', 'success');
            close();
            return loadAll();
          })
          .catch((e) => toast(e.message, 'error'));
      });
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

/* ---------- Clients ---------- */
function renderClients() {
  const st = (state.table.clients = state.table.clients || { q: '', sort: 'email', dir: 'asc', page: 1 });
  let rows = filterRows(state.clients, st.q, ['email', 'full_name', 'company', 'phone', 'website']);
  rows = sortRows(rows, st.sort, st.dir);
  const { slice, page, totalPages } = paginate(rows, st.page, PER);

  document.getElementById('panel-clients').innerHTML = `
    <div class="adm-card">
      <h2>Clients</h2>
      <div class="adm-table-tools">
        <input type="search" data-cq placeholder="Filter clients…" value="${esc(st.q)}" />
      </div>
      <div style="overflow-x:auto">
        <table>
          <thead>
            <tr>
              <th>Email</th><th>Name</th><th>Company</th><th>Phone</th><th>Website</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${slice
              .map(
                (c) => `<tr>
              <td>${esc(c.email)}</td>
              <td>${esc(c.full_name || '—')}</td>
              <td>${esc(c.company || '—')}</td>
              <td>${esc(c.phone || '—')}</td>
              <td>${c.website ? `<a href="${esc(c.website)}" target="_blank" rel="noopener">${esc(c.website)}</a>` : '—'}</td>
              <td>
                <button type="button" class="btn btn-sm btn-outline" data-viewc="${esc(c.id)}">View</button>
                <button type="button" class="btn btn-sm btn-outline" data-delc="${esc(c.id)}" style="color:#b91c1c">Delete</button>
              </td>
            </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
      <div class="adm-pager">
        <span>Page ${page} / ${totalPages}</span>
        <button type="button" class="btn btn-sm" data-cp="prev" ${page <= 1 ? 'disabled' : ''}>Prev</button>
        <button type="button" class="btn btn-sm" data-cp="next" ${page >= totalPages ? 'disabled' : ''}>Next</button>
      </div>
    </div>
    <div class="adm-card">
      <h2>Create client account</h2>
      <p class="hint">Creates Auth user + portal profile; welcome email sends when Resend is configured.</p>
      <form id="formNewClient" class="adm-form-stack" style="max-width:28rem">
        <div class="form-group"><label>Email *</label><input name="email" type="email" required /></div>
        <div class="form-group"><label>Full name</label><input name="full_name" /></div>
        <div class="form-group"><label>Company</label><input name="company" /></div>
        <div class="form-group"><label>Phone</label><input name="phone" type="tel" placeholder="+1…" /></div>
        <div class="form-group"><label>Website</label><input name="website" type="url" placeholder="https://…" /></div>
        <div class="form-group"><label>Timezone</label><input name="timezone" placeholder="e.g. America/New_York" /></div>
        <button type="submit" class="btn btn-primary" style="width:100%;margin-top:0.5rem">Create client</button>
      </form>
    </div>`;

  const p = document.getElementById('panel-clients');
  p.querySelector('#formNewClient')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const body = {
      email: f.get('email'),
      full_name: f.get('full_name') || '',
      company: f.get('company') || '',
      phone: f.get('phone') || '',
      website: f.get('website') || '',
      timezone: f.get('timezone') || '',
    };
    withBusy(
      e.target.querySelector('button'),
      api('/api/admin/clients', { method: 'POST', body: JSON.stringify(body) })
    )
      .then(() => {
        toast('Client created', 'success');
        e.target.reset();
        return loadAll();
      })
      .catch((er) => toast(er.message, 'error'));
  });
  p.querySelector('[data-cq]')?.addEventListener('input', (e) => {
    state.table.clients.q = e.target.value;
    state.table.clients.page = 1;
    renderClients();
  });
  p.querySelectorAll('[data-viewc]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-viewc');
      api(`/api/admin/clients/${id}`)
        .then(async (d) => {
          const c = d.client;
          const projs = d.projects || [];
          const invs = (state.invoices || []).filter((i) => i.client_id === id);
          const fileRows = [];
          for (const prj of projs) {
            try {
              const fr = await api(`/api/admin/by-project/${prj.id}/files`);
              (fr.files || []).forEach((f) => {
                fileRows.push({ project: prj.name, f });
              });
            } catch {
              /* */
            }
          }
          const invHtml = invs.length
            ? `<table class="adm-mini-tbl" style="width:100%;font-size:0.85rem;margin:0.5rem 0"><thead><tr><th>Amount</th><th>Status</th><th>Project</th></tr></thead><tbody>
                ${invs
                  .map(
                    (i) =>
                      `<tr><td>$${Number(i.amount).toFixed(2)}</td><td>${invStatusBadge(i.status)}</td><td>${esc(i.project_name || '—')}</td></tr>`
                  )
                  .join('')}</tbody></table>`
            : '<p class="phase-note" style="margin:0.5rem 0">No invoices yet.</p>';
          const fileHtml = fileRows.length
            ? `<ul style="padding-left:1.1rem;margin:0.35rem 0;max-height:8rem;overflow:auto;font-size:0.88rem">
                ${fileRows
                  .map(
                    (x) =>
                      `<li><a href="${esc(x.f.file_url)}" target="_blank" rel="noopener">${esc(x.f.file_name)}</a> <span class="phase-note">(${esc(x.project)})</span></li>`
                  )
                  .join('')}
              </ul>`
            : '<p class="phase-note" style="margin:0.5rem 0">No uploaded project files (upload from Projects tab).</p>';
          openModal(
            `<h3 style="margin-top:0">Client: ${esc(c.email)}</h3>
            <p><strong>Name:</strong> ${esc(c.full_name || '—')}</p>
            <p><strong>Company:</strong> ${esc(c.company || '—')}</p>
            <p><strong>Phone:</strong> ${esc(c.phone || '—')}</p>
            <p><strong>Website:</strong> ${c.website ? `<a href="${esc(c.website)}" target="_blank" rel="noopener">${esc(c.website)}</a>` : '—'}</p>
            <h4>Projects</h4>
            <ul style="padding-left:1.1rem;margin:0.5rem 0">
              ${projs.length ? projs.map((p) => `<li>${esc(p.name)} — ${phBadge(p.status)}</li>`).join('') : '<li>None yet</li>'}
            </ul>
            <h4>Invoices</h4>
            ${invHtml}
            <h4>Project files (deliverables)</h4>
            ${fileHtml}
            <div style="margin-top:0.75rem">
              <a class="btn btn-primary" href="site-builder.html?project=${projs[0] ? esc(projs[0].id) : ''}" data-close-modal style="display:inline-block">Open site builder</a>
            </div>
            <p class="phase-note" style="margin:0.5rem 0 0">${projs[0] ? 'Opens the first project in the site builder.' : 'Add a project first, then use Site builder.'}</p>
            <button type="button" class="btn btn-outline" data-close-modal style="margin-top:0.5rem">Close</button>`,
            null
          );
        })
        .catch((e) => toast(e.message, 'error'));
    });
  });
  p.querySelectorAll('[data-delc]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-delc');
      confirmDialog('Delete client', 'Removes the client from Auth and the portal. This cannot be undone.', () => {
        api(`/api/admin/clients/${id}`, { method: 'DELETE' })
          .then(() => {
            toast('Client deleted', 'success');
            return loadAll();
          })
          .catch((e) => toast(e.message, 'error'));
      });
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
  let rows = filterRows(state.projects, st.q, ['name', 'status', 'website_type', 'client.email']);
  rows = sortRows(rows, st.sort, st.dir, (r) => {
    if (st.sort === 'client.email') return (r.client && r.client.email) || '';
    return r[st.sort];
  });
  const { slice, page, totalPages } = paginate(rows, st.page, PER);
  const selPrj = state._lastActProject || (state.projects[0] && state.projects[0].id) || '';

  document.getElementById('panel-projects').innerHTML = `
    <div class="adm-card">
      <h2>Workspace — updates, phase, files</h2>
      <p class="phase-note">Select the <strong>project</strong> (not just the client) so the correct engagement is updated when a client has multiple projects.</p>
      <div class="adm-form-stack" style="max-width:36rem">
        <div class="form-group">
          <label>Project *</label>
          <select id="wsProject" class="ws-prj">${projectOptions()}</select>
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
        <h4 style="margin:1.25rem 0 0.5rem">Files for this project</h4>
        <div id="wsFileList" class="phase-note">Loading…</div>
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
    if (!id || !box) return;
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
        box.textContent = 'Could not load files';
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
        <div class="form-group"><label>Total (USD) *</label><input name="amount" type="number" id="invt" step="0.01" min="0" required readonly /></div>
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
                <button type="button" class="btn btn-sm btn-outline" data-markpaid="${esc(i.id)}" ${
  i.status === 'paid' ? 'disabled' : ''
}>Mark paid</button>
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
  const recalc = () => {
    let t = 0;
    p.querySelectorAll('.li-row').forEach((row) => {
      const v = row.querySelector('input[name=l_amt]')?.value;
      t += Number(v) || 0;
    });
    const invt = p.querySelector('#invt');
    if (invt) invt.value = t > 0 ? t.toFixed(2) : '';
  };
  p.querySelector('#addLine')?.addEventListener('click', () => {
    const c = p.querySelector('#lineItems');
    const d = document.createElement('div');
    d.className = 'form-group li-row';
    d.innerHTML = `<label>Line item</label><input name="l_desc" placeholder="Description" /><input name="l_amt" type="number" step="0.01" min="0" placeholder="Amount" style="margin-top:0.5rem" />`;
    c.appendChild(d);
    d.querySelector('input[name=l_amt]').addEventListener('input', recalc);
  });
  p.querySelectorAll('.li-row input[name=l_amt]').forEach((x) => x.addEventListener('input', recalc));
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
}

/* ---------- Files tab ---------- */
function renderFilesTab() {
  document.getElementById('panel-files').innerHTML = `
    <div class="adm-card">
      <h2>Files by project</h2>
      <p class="phase-note">Pick a project to list uploads. You can also upload from the <strong>Projects</strong> tab.</p>
      <div class="form-group" style="max-width:24rem">
        <label>Project</label>
        <select id="fTabP">${projectOptions()}</select>
      </div>
      <div id="fTabL"></div>
    </div>`;
  const loadF = () => {
    const id = document.getElementById('fTabP')?.value;
    const box = document.getElementById('fTabL');
    if (!id || !box) return;
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
  loadF();
}

/* ---------- Messages ---------- */
function renderMessages() {
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
  document.getElementById('panel-time').innerHTML = `
    <div class="adm-card">
      <h2>Log time</h2>
      <form id="formTime" class="adm-form-stack" style="max-width:22rem">
        <div class="form-group"><label>Project *</label><select name="project_id" required><option value="">—</option>${projectOptions()}</select></div>
        <div class="form-group"><label>Date</label><input name="worked_date" type="date" required /></div>
        <div class="form-group"><label>Hours *</label><input name="hours" type="number" min="0.25" step="0.25" required /></div>
        <div class="form-group"><label>Description</label><input name="description" /></div>
        <button type="submit" class="btn btn-primary" style="width:100%">Log</button>
      </form>
    </div>
    <div class="adm-card">
      <h2>Time entries (recent)</h2>
      <div style="overflow-x:auto">
        <table>
          <thead><tr><th>Date</th><th>Project</th><th>Hours</th><th>Description</th></tr></thead>
          <tbody>
            ${state.timeEntries
              .slice(0, 50)
              .map(
                (t) => `<tr>
              <td>${t.worked_date || '—'}</td>
              <td>${projectNameOrDash(t.project_id)}</td>
              <td>${t.hours != null ? esc(String(t.hours)) : '—'}</td>
              <td>${esc(t.description || '—')}</td>
            </tr>`
              )
              .join('') || '<tr><td colspan="4">No entries (run database migration to enable)</td></tr>'}
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
              <td>${esc(c.title)}</td>
              <td>${esc(c.status)}</td>
              <td>${c.created_at ? new Date(c.created_at).toLocaleString() : '—'}</td>
              <td>
                ${c.file_url ? `<a href="${esc(c.file_url)}" target="_blank" rel="noopener" class="btn btn-sm btn-outline">Link</a>` : '—'}
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
}

/* ---------- Activity ---------- */
function renderActivity() {
  document.getElementById('panel-activity').innerHTML = `
    <div class="adm-card">
      <h2>Activity (recent 100)</h2>
      <div style="max-height:70vh;overflow:auto;font-size:0.9rem">
        <ul style="list-style:none;padding:0;margin:0">
          ${(state.activity || [])
            .map(
              (a) => `<li style="border-bottom:1px solid #f1f5f9;padding:0.5rem 0">
            <time style="color:#94a3b8">${a.created_at ? new Date(a.created_at).toLocaleString() : '—'}</time>
            <div><strong>${esc(a.action)}</strong> ${a.entity_type ? '· ' + esc(a.entity_type) : ''}</div>
          </li>`
            )
            .join('') || '<li>Run the database migration to enable the activity log.</li>'}
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
  showTab(state.currentTab);
}

document.getElementById('admTabs')?.addEventListener('click', (e) => {
  const t = e.target.closest('[data-tab]');
  if (!t) return;
  const name = t.getAttribute('data-tab');
  state.currentTab = name;
  showTab(name);
  if (name === 'files') {
    setTimeout(() => document.dispatchEvent(new CustomEvent('adm:files-panel')), 0);
  }
});

document.getElementById('admLogout')?.addEventListener('click', (e) => {
  e.preventDefault();
  clearAuth();
  location.href = 'client-portal.html';
});

if (getToken()) {
  initToast();
  window.scrollTo(0, 0);
  showTab('dashboard');
  document.getElementById('panel-dashboard').innerHTML = '<p class="phase-note">Loading…</p>';
  checkDbHealth();
  loadAll();
} else {
  document.getElementById('admRoot').innerHTML = '<p class="container" style="padding:4rem 1rem">Not signed in.</p>';
}

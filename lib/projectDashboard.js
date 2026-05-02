'use strict';

const { normalizeCustomDomainHost } = require('./normalizeCustomDomainHost');

function withHttps(hostOrUrl) {
  if (!hostOrUrl || !String(hostOrUrl).trim()) return null;
  const t = String(hostOrUrl).trim();
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function computeEffectiveSiteStatus(project, m) {
  const fileCount = m?.site_file_count ?? 0;
  const dom = normalizeCustomDomainHost(project.custom_domain);
  const s = String(project.status || '').toLowerCase();
  const published = Boolean(project.published_at);
  const launched = Boolean(project.launched_at);
  const hasProdUrl = Boolean(project.railway_url_production && String(project.railway_url_production).trim());

  const isLive = published || launched || s === 'live' || (hasProdUrl && fileCount > 0);

  if (isLive && fileCount > 0) return 'live';
  if (dom && fileCount > 0) return 'review';
  if (fileCount > 0) return 'draft';
  return 'draft';
}

function computeDeliverableProgress(project, m) {
  let pct = 0;
  if (m?.has_index_html) pct += 20;
  const fullStack =
    Boolean(m?.has_index_html) && (m?.html_page_count ?? 0) >= 2 && Boolean(m?.has_css) && Boolean(m?.has_js);
  if (fullStack) pct += 20;
  if (normalizeCustomDomainHost(project.custom_domain)) pct += 15;

  const s = String(project.status || '').toLowerCase();
  const published =
    Boolean(project.published_at) ||
    Boolean(project.launched_at) ||
    s === 'live' ||
    Boolean(project.railway_url_production && String(project.railway_url_production).trim());
  if (published) pct += 25;

  const analyticsOn = Number(m?.pageviews_total ?? 0) > 0;
  if (analyticsOn) pct += 10;
  else if ((m?.video_count ?? 0) > 0) pct += 10;

  return Math.min(100, pct);
}

function resolveThumbnail(project, m) {
  const u = project.thumbnail_url && String(project.thumbnail_url).trim();
  if (u) return u;
  const yid = m?.first_youtube_id && String(m.first_youtube_id).trim();
  if (yid) return `https://img.youtube.com/vi/${yid}/mqdefault.jpg`;
  return null;
}

function resolveLiveUrl(project) {
  const explicit = project.live_url && String(project.live_url).trim();
  if (explicit) return withHttps(explicit);
  const dom = normalizeCustomDomainHost(project.custom_domain);
  if (dom) return `https://${dom}`;
  const r = project.railway_url_production && String(project.railway_url_production).trim();
  return withHttps(r);
}

function computeFocusLine(project, effective, m) {
  const domHost = normalizeCustomDomainHost(project.custom_domain);
  const liveUrl = resolveLiveUrl(project);
  const published =
    Boolean(project.published_at) ||
    Boolean(project.launched_at) ||
    String(project.status || '').toLowerCase() === 'live';
  const fileCount = m?.site_file_count ?? 0;

  if (effective === 'live' && published) {
    const host = domHost || (liveUrl ? liveUrl.replace(/^https?:\/\//i, '') : '');
    return `Live at ${host || 'production'} — monitoring performance and handling change requests.`;
  }

  if (domHost && fileCount > 0 && !published) {
    return 'Ready to deploy — publish from the Publish panel when DNS is ready.';
  }

  if (fileCount > 0) {
    return 'Site build in progress — pages, domain, and production deploy.';
  }

  return null;
}

function buildDashboardForProject(project, metricRow) {
  const m = metricRow || {};
  const effective = computeEffectiveSiteStatus(project, m);
  const deliverable_progress_pct = computeDeliverableProgress(project, m);
  const thumb = resolveThumbnail(project, m);
  const live_url_resolved = resolveLiveUrl(project);
  const focus_line = computeFocusLine(project, effective, m);

  return {
    last_studio_touch: m.last_studio_touch || null,
    site_file_count: m.site_file_count ?? 0,
    html_page_count: m.html_page_count ?? 0,
    video_count: m.video_count ?? 0,
    has_index_html: Boolean(m.has_index_html),
    has_css: Boolean(m.has_css),
    has_js: Boolean(m.has_js),
    pageviews_total: Number(m.pageviews_total ?? 0),
    pageviews_yesterday: Number(m.pageviews_yesterday ?? 0),
    live_visitors: Number(m.live_visitors ?? 0),
    deliverable_progress_pct,
    effective_site_status: effective,
    thumbnail_url_resolved: thumb,
    live_url_resolved,
    focus_line,
  };
}

async function fetchMetricsBatch(supabase, projectIds) {
  if (!projectIds.length) return new Map();
  const { data, error } = await supabase.rpc('project_dashboard_metrics_batch', {
    p_project_ids: projectIds,
  });
  if (error) {
    console.warn('[projectDashboard] metrics batch rpc failed', error.message);
    return new Map();
  }
  const map = new Map();
  for (const row of data || []) {
    map.set(row.project_id, row);
  }
  return map;
}

async function attachDashboardToProjects(supabase, projects) {
  const ids = (projects || []).map((p) => p.id).filter(Boolean);
  const map = await fetchMetricsBatch(supabase, ids);
  return (projects || []).map((p) => ({
    ...p,
    dashboard: buildDashboardForProject(p, map.get(p.id)),
  }));
}

async function attachDashboardToProject(supabase, project) {
  if (!project?.id) return project;
  const m = await fetchMetricsBatch(supabase, [project.id]);
  return { ...project, dashboard: buildDashboardForProject(project, m.get(project.id)) };
}

module.exports = {
  buildDashboardForProject,
  fetchMetricsBatch,
  attachDashboardToProject,
  attachDashboardToProjects,
  resolveLiveUrl,
};

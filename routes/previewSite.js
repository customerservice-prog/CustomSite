'use strict';

const { getService, isSupabaseConfigured } = require('../lib/supabase');
const devStore = require('../lib/devSiteFileStore');

function mimeForPath(p) {
  const lower = p.toLowerCase();
  if (lower.endsWith('.html')) return 'text/html; charset=utf-8';
  if (lower.endsWith('.css')) return 'text/css; charset=utf-8';
  if (lower.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (lower.endsWith('.svg')) return 'image/svg+xml; charset=utf-8';
  if (lower.endsWith('.json')) return 'application/json; charset=utf-8';
  if (lower.endsWith('.txt')) return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function handlePreview(req, res) {
  const raw = req.path.slice('/preview/'.length);
  const segments = raw.split('/').filter(Boolean);
  if (!segments.length) {
    res.status(404).type('html').send('<!DOCTYPE html><html><body>Missing project id</body></html>');
    return;
  }

  const projectId = segments[0];
  let filePath = segments.slice(1).join('/');
  if (!filePath || filePath.endsWith('/')) {
    filePath = filePath ? `${filePath.replace(/\/$/, '')}/index.html` : 'index.html';
  }

  if (filePath.includes('..')) {
    res.status(400).send('Invalid path');
    return;
  }

  if (!isSupabaseConfigured()) {
    const data = devStore.getFile(projectId, filePath);
    if (!data) {
      res.status(404).type('html').send(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Not found</title></head><body><p>No file <code>${escapeHtml(filePath)}</code>. Open <strong>Site builder</strong> and run <em>Init starter</em> or create this file.</p></body></html>`
      );
      return;
    }
    res.setHeader('Content-Type', mimeForPath(filePath));
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    if (data.content_encoding === 'base64') {
      res.send(Buffer.from(String(data.content), 'base64'));
      return;
    }
    res.send(data.content);
    return;
  }

  const supabase = getService();
  let row;
  let err;
  const q1 = await supabase
    .from('site_files')
    .select('content, content_encoding')
    .eq('project_id', projectId)
    .eq('path', filePath)
    .maybeSingle();
  row = q1.data;
  err = q1.error;
  if (err && /content_encoding/.test(String(err.message))) {
    const q2 = await supabase
      .from('site_files')
      .select('content')
      .eq('project_id', projectId)
      .eq('path', filePath)
      .maybeSingle();
    row = q2.data;
    err = q2.error;
  }

  if (err) {
    console.error(err);
    res.status(500).send('Error loading preview');
    return;
  }
  if (!row) {
    res.status(404).type('html').send(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Not found</title></head><body><p>No file <code>${escapeHtml(filePath)}</code>. Open <strong>Site builder</strong> and run <em>Init starter</em> or create this file.</p></body></html>`
    );
    return;
  }

  res.setHeader('Content-Type', mimeForPath(filePath));
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  if (row.content_encoding === 'base64') {
    res.send(Buffer.from(String(row.content), 'base64'));
    return;
  }
  res.send(row.content);
}

function previewSiteMiddleware(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (!req.path.startsWith('/preview/')) return next();
  handlePreview(req, res).catch(next);
}

module.exports = previewSiteMiddleware;

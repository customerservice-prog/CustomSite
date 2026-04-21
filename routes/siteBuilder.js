'use strict';

const express = require('express');
const { getService } = require('../lib/supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const MAX_FILE_BYTES = 2 * 1024 * 1024;

router.use(requireAuth, requireAdmin);

function normalizePath(p) {
  if (!p || typeof p !== 'string') return null;
  const s = p.replace(/\\/g, '/').trim();
  if (s.includes('..') || s.startsWith('/')) return null;
  return s;
}

const STARTER = {
  'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Client site</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="hero">
    <h1>Your website</h1>
    <p>Edit HTML, CSS, and JavaScript in the Site builder — no WordPress required.</p>
    <a class="btn" href="#contact">Get in touch</a>
  </header>
  <section id="contact" class="section">
    <h2>Contact</h2>
    <p>Replace this with your client content.</p>
  </section>
  <script src="app.js"></script>
</body>
</html>
`,
  'styles.css': `* { box-sizing: border-box; }
body { font-family: system-ui, -apple-system, sans-serif; margin: 0; color: #0f172a; line-height: 1.6; }
.hero { padding: 4rem 1.5rem; text-align: center; background: linear-gradient(135deg, #1e1b4b, #312e81); color: #fff; }
.hero h1 { font-size: clamp(2rem, 5vw, 3rem); margin: 0 0 1rem; }
.hero p { opacity: 0.9; max-width: 36rem; margin: 0 auto 1.5rem; }
.btn { display: inline-block; padding: 0.75rem 1.5rem; background: #6366f1; color: #fff; border-radius: 0.5rem; text-decoration: none; font-weight: 600; }
.section { padding: 3rem 1.5rem; max-width: 48rem; margin: 0 auto; }
`,
  'app.js': `document.querySelectorAll('a[href^="#"]').forEach(function (a) {
  a.addEventListener("click", function (e) {
    var id = a.getAttribute("href").slice(1);
    var el = document.getElementById(id);
    if (el) { e.preventDefault(); el.scrollIntoView({ behavior: "smooth" }); }
  });
});
console.log("Site ready");
`,
};

router.get('/projects/:projectId/site', async (req, res) => {
  try {
    const { projectId } = req.params;
    const supabase = getService();
    const { data, error } = await supabase
      .from('site_files')
      .select('path, updated_at')
      .eq('project_id', projectId)
      .order('path');
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ files: data || [] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/projects/:projectId/site/file', async (req, res) => {
  try {
    const { projectId } = req.params;
    const filePath = normalizePath(req.query.path);
    if (!filePath) return res.status(400).json({ error: 'Invalid path' });
    const supabase = getService();
    const { data, error } = await supabase
      .from('site_files')
      .select('content, updated_at')
      .eq('project_id', projectId)
      .eq('path', filePath)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Not found' });
    return res.json({ path: filePath, content: data.content, updated_at: data.updated_at });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.put('/projects/:projectId/site/file', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { path: rawPath, content } = req.body || {};
    const filePath = normalizePath(rawPath);
    if (!filePath) return res.status(400).json({ error: 'Invalid path' });
    const text = content == null ? '' : String(content);
    if (Buffer.byteLength(text, 'utf8') > MAX_FILE_BYTES) {
      return res.status(400).json({ error: 'File too large (max 2MB)' });
    }
    const supabase = getService();
    const now = new Date().toISOString();
    const { data: existing } = await supabase
      .from('site_files')
      .select('id')
      .eq('project_id', projectId)
      .eq('path', filePath)
      .maybeSingle();

    let data;
    let error;
    if (existing) {
      ({ data, error } = await supabase
        .from('site_files')
        .update({ content: text, updated_at: now })
        .eq('id', existing.id)
        .select()
        .single());
    } else {
      ({ data, error } = await supabase
        .from('site_files')
        .insert({
          project_id: projectId,
          path: filePath,
          content: text,
          updated_at: now,
        })
        .select()
        .single());
    }
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, file: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/projects/:projectId/site/file', async (req, res) => {
  try {
    const { projectId } = req.params;
    const filePath = normalizePath(req.query.path);
    if (!filePath) return res.status(400).json({ error: 'Invalid path' });
    const supabase = getService();
    const { error } = await supabase
      .from('site_files')
      .delete()
      .eq('project_id', projectId)
      .eq('path', filePath);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/projects/:projectId/site/init', async (req, res) => {
  try {
    const { projectId } = req.params;
    const supabase = getService();
    const now = new Date().toISOString();
    for (const [path, content] of Object.entries(STARTER)) {
      const { data: row } = await supabase
        .from('site_files')
        .select('id')
        .eq('project_id', projectId)
        .eq('path', path)
        .maybeSingle();
      if (row) {
        const { error } = await supabase
          .from('site_files')
          .update({ content, updated_at: now })
          .eq('id', row.id);
        if (error) return res.status(500).json({ error: error.message });
      } else {
        const { error } = await supabase.from('site_files').insert({
          project_id: projectId,
          path,
          content,
          updated_at: now,
        });
        if (error) return res.status(500).json({ error: error.message });
      }
    }
    return res.json({ success: true, paths: Object.keys(STARTER) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

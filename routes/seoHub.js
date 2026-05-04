'use strict';

const express = require('express');
const { getService, isSupabaseConfigured } = require('../lib/supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { collectSeoDataForProject } = require('../lib/seoHub/collectProject');

const router = express.Router();
router.use(requireAuth, requireAdmin);

function mig(err) {
  return /seo_projects|seo_checklist_progress|does not exist/i.test(String(err?.message || ''));
}

async function assertProjectExists(supabase, projectId) {
  const { data, error } = await supabase.from('projects').select('id, name').eq('id', projectId).maybeSingle();
  if (error) throw error;
  return data || null;
}

/** Latest rows by snapshot_date. */
async function fetchLatestSnapshots(supabase, projectId) {
  const { data: review } = await supabase
    .from('seo_review_snapshots')
    .select('*')
    .eq('project_id', projectId)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: gbp } = await supabase
    .from('seo_gbp_snapshots')
    .select('*')
    .eq('project_id', projectId)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: rankDateLatest } = await supabase
    .from('seo_rank_snapshots')
    .select('snapshot_date')
    .eq('project_id', projectId)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestRankDate = rankDateLatest?.snapshot_date || null;

  /** @type {Record<string, unknown>[] | null} */
  let rankRows = [];
  if (latestRankDate) {
    const { data } = await supabase
      .from('seo_rank_snapshots')
      .select('*')
      .eq('project_id', projectId)
      .eq('snapshot_date', latestRankDate)
      .order('keyword');
    rankRows = data || [];
  }

  return {
    reviews: review || null,
    gbp: gbp || null,
    ranks: rankRows,
    ranks_snapshot_date: latestRankDate,
  };
}

router.get('/seo/:projectId', async (req, res) => {
  try {
    if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Supabase not configured' });
    const { projectId } = req.params;
    const supabase = getService();

    const proj = await assertProjectExists(supabase, projectId);
    if (!proj) return res.status(404).json({ error: 'Project not found' });

    const { data: seoRow, error: se } = await supabase.from('seo_projects').select('*').eq('project_id', projectId).maybeSingle();
    if (se) {
      if (mig(se)) return res.status(503).json({ error: 'Run migration 022_seo_hub_tables.sql' });
      return res.status(500).json({ error: se.message });
    }

    let checklistRows = [];
    const { data: chk, error: cherr } = await supabase.from('seo_checklist_progress').select('*').eq('project_id', projectId);
    if (cherr) {
      if (mig(cherr)) return res.status(503).json({ error: 'Run migration 022_seo_hub_tables.sql' });
      return res.status(500).json({ error: cherr.message });
    }
    checklistRows = chk || [];

    const checklistMap = {};
    for (const row of checklistRows) {
      checklistMap[row.check_id] = {
        completed: Boolean(row.completed),
        completed_at: row.completed_at,
        auto_detected: Boolean(row.auto_detected),
        notes: row.notes,
      };
    }

    const snapshots = await fetchLatestSnapshots(supabase, projectId);

    return res.json({
      project: proj,
      seo: seoRow || null,
      checklist: checklistMap,
      snapshots,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/seo/:projectId/setup', async (req, res) => {
  try {
    if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Supabase not configured' });
    const { projectId } = req.params;
    const supabase = getService();

    const proj = await assertProjectExists(supabase, projectId);
    if (!proj) return res.status(404).json({ error: 'Project not found' });

    const b = req.body || {};
    const gbp_place_id = typeof b.gbp_place_id === 'string' ? b.gbp_place_id.trim() : null;
    const primary_keyword = typeof b.primary_keyword === 'string' ? b.primary_keyword.trim() : null;
    const target_city = typeof b.target_city === 'string' ? b.target_city.trim() : null;
    const secondary_keywords = Array.isArray(b.secondary_keywords) ? b.secondary_keywords.map((x) => String(x)) : [];
    const near_me_keywords = Array.isArray(b.near_me_keywords) ? b.near_me_keywords.map((x) => String(x)) : [];
    const review_goal = typeof b.review_goal === 'number' && Number.isFinite(b.review_goal) ? Math.floor(b.review_goal) : 50;
    const review_link = typeof b.review_link === 'string' ? b.review_link.trim() : null;
    const gbp_name = typeof b.gbp_name === 'string' ? b.gbp_name.trim() : null;
    const gbp_category = typeof b.gbp_category === 'string' ? b.gbp_category.trim() : null;

    const nowIso = new Date().toISOString();
    const { data: seoRow, error: upErr } = await supabase
      .from('seo_projects')
      .upsert(
        {
          project_id: projectId,
          gbp_place_id,
          primary_keyword,
          secondary_keywords,
          near_me_keywords,
          target_city,
          review_goal,
          review_link,
          gbp_name,
          gbp_category,
          updated_at: nowIso,
        },
        { onConflict: 'project_id' }
      )
      .select('*')
      .single();

    if (upErr) {
      if (mig(upErr)) return res.status(503).json({ error: 'Run migration 022_seo_hub_tables.sql' });
      return res.status(500).json({ error: upErr.message });
    }

    let collect = null;
    try {
      collect = await collectSeoDataForProject(supabase, seoRow);
    } catch (e) {
      collect = { errors: [{ step: 'collect', message: e instanceof Error ? e.message : String(e) }] };
    }

    return res.json({ seo: seoRow, collect_result: collect });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/seo/:projectId/checklist', async (req, res) => {
  try {
    if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Supabase not configured' });
    const { projectId } = req.params;
    const supabase = getService();

    const proj = await assertProjectExists(supabase, projectId);
    if (!proj) return res.status(404).json({ error: 'Project not found' });

    const b = req.body || {};
    const check_id = typeof b.check_id === 'string' ? b.check_id.trim() : '';
    const completed = Boolean(b.completed);
    const notes = typeof b.notes === 'string' ? b.notes : null;
    if (!check_id) return res.status(400).json({ error: 'check_id required' });

    const nowIso = new Date().toISOString();

    const { data: saved, error: upErr } = await supabase
      .from('seo_checklist_progress')
      .upsert(
        {
          project_id: projectId,
          check_id,
          completed,
          completed_at: completed ? nowIso : null,
          auto_detected: false,
          notes,
          updated_at: nowIso,
        },
        { onConflict: 'project_id,check_id' }
      )
      .select('*')
      .maybeSingle();

    if (upErr) {
      if (mig(upErr)) return res.status(503).json({ error: 'Run migration 022_seo_hub_tables.sql' });
      return res.status(500).json({ error: upErr.message });
    }

    return res.json({ checklist_item: saved });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/seo/:projectId/history', async (req, res) => {
  try {
    if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Supabase not configured' });
    const { projectId } = req.params;
    const supabase = getService();

    const proj = await assertProjectExists(supabase, projectId);
    if (!proj) return res.status(404).json({ error: 'Project not found' });

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 90);
    const sinceStr = since.toISOString().slice(0, 10);

    const { data: reviews, error: re } = await supabase
      .from('seo_review_snapshots')
      .select('snapshot_date, review_count, avg_rating, source, created_at')
      .eq('project_id', projectId)
      .gte('snapshot_date', sinceStr)
      .order('snapshot_date', { ascending: true });

    if (re) {
      if (mig(re)) return res.status(503).json({ error: 'Run migration 022_seo_hub_tables.sql' });
      return res.status(500).json({ error: re.message });
    }

    const { data: ranks, error: rke } = await supabase
      .from('seo_rank_snapshots')
      .select('snapshot_date, keyword, map_pack_position, local_pack_url, source, created_at')
      .eq('project_id', projectId)
      .gte('snapshot_date', sinceStr)
      .order('snapshot_date', { ascending: true });

    if (rke) {
      if (mig(rke)) return res.status(503).json({ error: 'Run migration 022_seo_hub_tables.sql' });
      return res.status(500).json({ error: rke.message });
    }

    return res.json({
      reviews: reviews || [],
      ranks: ranks || [],
      since: sinceStr,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = { seoHubRouter: router };

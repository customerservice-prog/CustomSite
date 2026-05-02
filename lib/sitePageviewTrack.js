'use strict';

const crypto = require('crypto');

/**
 * Anonymous analytics only: short hash of IP + User-Agent + server salt.
 * Not reversible to identify individuals — if clients ask “who visited,” answer: aggregate anonymous counts only.
 */
function visitorFingerprint(ip, ua) {
  const salt = String(process.env.CUSTOMSITE_ANALYTICS_SALT || 'customsite-analytics-v1').trim();
  return crypto
    .createHash('sha256')
    .update(`${ip || ''}\0${ua || ''}\0${salt}`)
    .digest('hex')
    .slice(0, 16);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ projectId: string, host: string, path: string, req: import('express').Request }} ctx
 */
async function insertSitePageview(supabase, ctx) {
  const ip =
    String(ctx.req.get('x-forwarded-for') || '')
      .split(',')[0]
      .trim() || ctx.req.ip || '';
  const ua = String(ctx.req.get('user-agent') || '').slice(0, 512);
  const ref = ctx.req.get('referer') || ctx.req.get('referrer') || null;
  const country = ctx.req.get('cf-ipcountry') || ctx.req.get('CF-IPCountry') || null;
  await supabase.from('site_pageviews').insert({
    project_id: ctx.projectId,
    custom_domain: ctx.host,
    path: ctx.path || '/',
    visitor_id: visitorFingerprint(ip, ua),
    country: country ? String(country).slice(0, 8) : null,
    referrer: ref ? String(ref).slice(0, 2048) : null,
    user_agent: ua || null,
  });
}

module.exports = {
  visitorFingerprint,
  insertSitePageview,
};

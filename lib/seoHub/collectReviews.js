'use strict';

const { utcDateString } = require('./utcToday');

/**
 * Fetch review count + average rating via Google Places API (Place Details).
 * @returns {{ review_count: number, avg_rating: number|null }}
 */
async function fetchPlaceReviews(apiKey, placeId) {
  const key = String(apiKey || '').trim();
  const pid = String(placeId || '').trim();
  if (!key || !pid) throw new Error('GOOGLE_PLACES_API_KEY and gbp_place_id required');

  const u = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  u.searchParams.set('place_id', pid);
  u.searchParams.set('fields', 'rating,user_ratings_total');
  u.searchParams.set('key', key);

  const res = await fetch(u.toString(), { headers: { Accept: 'application/json' } });
  const raw = /** @type {Record<string, unknown>} */ (await res.json());
  const status = String(raw.status || '');
  if (status === 'REQUEST_DENIED') {
    throw new Error(`Places API: ${raw.error_message || status}`);
  }
  if (!res.ok || status !== 'OK') {
    throw new Error(`Places API failure: ${status || res.status}`);
  }

  /** @type {Record<string, unknown>} */
  const result = typeof raw.result === 'object' && raw.result !== null ? raw.result : {};
  const rating = result.rating;
  const total = result.user_ratings_total;
  return {
    avg_rating: typeof rating === 'number' ? rating : null,
    review_count: typeof total === 'number' ? total : 0,
  };
}

/** Insert or replace today's google review snapshot; returns inserted row-ish summary. */
async function collectReviewsForProject(supabase, seoRow) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = seoRow?.gbp_place_id;
  if (!apiKey?.trim()) {
    return { skipped: true, reason: 'GOOGLE_PLACES_API_KEY unset' };
  }
  if (!String(placeId || '').trim()) {
    return { skipped: true, reason: 'gbp_place_id unset' };
  }

  const { review_count: reviewCount, avg_rating: avgRating } = await fetchPlaceReviews(apiKey, placeId);
  const snapshotDate = utcDateString();

  const { error } = await supabase.from('seo_review_snapshots').upsert(
    {
      project_id: seoRow.project_id,
      review_count: reviewCount,
      avg_rating: avgRating,
      snapshot_date: snapshotDate,
      source: 'google',
    },
    { onConflict: 'project_id,snapshot_date,source' }
  );
  if (error) throw new Error(error.message);
  return { ok: true, review_count: reviewCount, avg_rating: avgRating, snapshot_date: snapshotDate };
}

module.exports = { fetchPlaceReviews, collectReviewsForProject };

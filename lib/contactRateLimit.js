'use strict';

const WINDOW_MS = 15 * 60 * 1000;
const MAX = 8;
const byIp = new Map();

/**
 * @returns {boolean} true if request may proceed
 */
function allowRequest(ip) {
  const k = String(ip || '0').slice(0, 64);
  const now = Date.now();
  let rec = byIp.get(k);
  if (!rec || now - rec.t > WINDOW_MS) {
    byIp.set(k, { t: now, c: 1 });
    return true;
  }
  if (rec.c >= MAX) return false;
  rec.c += 1;
  return true;
}

module.exports = { allowRequest };

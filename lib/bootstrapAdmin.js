'use strict';

/**
 * Emails that get an admin `users` row on first create (from env, same as requireAuth).
 */
function isBootstrapAdminEmail(email) {
  if (!email) return false;
  const e = String(email).trim().toLowerCase();
  const single = String(process.env.INITIAL_ADMIN_EMAIL || '')
    .trim()
    .toLowerCase();
  if (single && e === single) return true;
  const list = String(process.env.BOOTSTRAP_ADMIN_EMAILS || '')
    .split(/[,;]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(e);
}

module.exports = { isBootstrapAdminEmail };

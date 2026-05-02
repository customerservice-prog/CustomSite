'use strict';

/**
 * Readable first name guess from email local-part (never use another user's / client DB row).
 * bryanpineda315@… → Bryan; jordan.blake@… → Jordan (first alphabetic run).
 */
function displayNameFromEmail(email) {
  const local = String(email || '').trim().split('@')[0];
  if (!local) return '';
  const m = local.match(/^([a-zA-Z]{2,})/);
  if (m) {
    const w = m[1];
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function resolveMeFullName(profile, authUser) {
  const dbName = profile && profile.full_name != null ? String(profile.full_name).trim() : '';
  if (dbName) return dbName;

  const meta =
    authUser && typeof authUser.user_metadata === 'object' ? authUser.user_metadata || {} : {};
  const metaName = String(meta.full_name || meta.name || '').trim();
  if (metaName) return metaName;

  const email = String((profile && profile.email) || (authUser && authUser.email) || '').trim();
  return displayNameFromEmail(email) || null;
}

module.exports = {
  displayNameFromEmail,
  resolveMeFullName,
};

'use strict';

export const TOKEN_KEY = 'customsite_access_token';
export const REFRESH_KEY = 'customsite_refresh_token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    /* ignore */
  }
}

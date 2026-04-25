'use strict';

export const TOKEN_KEY = 'customsite_access_token';
export const REFRESH_KEY = 'customsite_refresh_token';

export function getToken() {
  try {
    let t = localStorage.getItem(TOKEN_KEY);
    if (t) return t;
    t = sessionStorage.getItem(TOKEN_KEY);
    if (t) {
      try {
        localStorage.setItem(TOKEN_KEY, t);
      } catch {
        /* keep session-only; init still works */
      }
    }
    return t;
  } catch {
    return null;
  }
}

export function getRefreshToken() {
  try {
    let t = localStorage.getItem(REFRESH_KEY);
    if (t) return t;
    t = sessionStorage.getItem(REFRESH_KEY);
    if (t) {
      try {
        localStorage.setItem(REFRESH_KEY, t);
      } catch {
        /* */
      }
    }
    return t;
  } catch {
    return null;
  }
}

export function setSessionTokens(access, refresh) {
  try {
    if (access) {
      localStorage.setItem(TOKEN_KEY, access);
      try {
        sessionStorage.setItem(TOKEN_KEY, access);
      } catch {
        /* */
      }
    }
    if (refresh) {
      localStorage.setItem(REFRESH_KEY, refresh);
      try {
        sessionStorage.setItem(REFRESH_KEY, refresh);
      } catch {
        /* */
      }
    }
  } catch {
    /* ignore */
  }
}

export function clearAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
  } catch {
    /* ignore */
  }
}

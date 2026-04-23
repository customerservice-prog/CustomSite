'use strict';

export const TOKEN_KEY = 'customsite_access_token';
export const REFRESH_KEY = 'customsite_refresh_token';
export const RAILWAY_TOKEN_KEY = 'customsite_railway_api_token';
export const RAILWAY_TEAM_KEY = 'customsite_railway_team_id';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getRailwaySettings() {
  try {
    return {
      token: localStorage.getItem(RAILWAY_TOKEN_KEY) || '',
      teamId: localStorage.getItem(RAILWAY_TEAM_KEY) || '',
    };
  } catch {
    return { token: '', teamId: '' };
  }
}

export function setRailwaySettings(a) {
  try {
    if (a.token != null) localStorage.setItem(RAILWAY_TOKEN_KEY, a.token);
    if (a.teamId != null) localStorage.setItem(RAILWAY_TEAM_KEY, a.teamId);
  } catch {
    /* ignore */
  }
}

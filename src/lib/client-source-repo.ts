/**
 * Optional “client already has a repo” URL on new projects — used for import UX, not auto-clone.
 */

export function normalizeClientSourceRepoUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  let u = t.replace(/\s/g, '');
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    const url = new URL(u);
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

export type GithubRepoBundleLinks = {
  ownerRepo: string;
  browserUrl: string;
  zipMain: string;
  zipMaster: string;
};

/** Public GitHub.com only — returns null for GHE, gist, or invalid paths. */
export function parseGithubRepoBundleLinks(canonicalUrl: string): GithubRepoBundleLinks | null {
  try {
    const u = new URL(canonicalUrl);
    const host = u.hostname.toLowerCase();
    if (host !== 'github.com' && host !== 'www.github.com') return null;
    const parts = u.pathname.replace(/^\//, '').split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/i, '');
    if (!/^[\w.-]+$/i.test(owner) || !/^[\w.-]+$/i.test(repo)) return null;
    const browserUrl = `https://github.com/${owner}/${repo}`;
    return {
      ownerRepo: `${owner}/${repo}`,
      browserUrl,
      zipMain: `${browserUrl}/archive/refs/heads/main.zip`,
      zipMaster: `${browserUrl}/archive/refs/heads/master.zip`,
    };
  } catch {
    return null;
  }
}

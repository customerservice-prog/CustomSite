export type SiteFileType = 'html' | 'css' | 'js';

export type ProjectSiteFile = {
  id: string;
  name: string;
  content: string;
  type: SiteFileType;
  updatedAt: string;
};

export type ProjectSite = {
  projectId: string;
  files: ProjectSiteFile[];
};

export function inferFileType(name: string): SiteFileType {
  const n = name.toLowerCase();
  if (n.endsWith('.css')) return 'css';
  if (n.endsWith('.js') || n.endsWith('.mjs')) return 'js';
  return 'html';
}

export function newFile(name: string, content: string): ProjectSiteFile {
  const now = new Date().toISOString();
  return {
    id: name,
    name,
    content,
    type: inferFileType(name),
    updatedAt: now,
  };
}

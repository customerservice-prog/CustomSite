'use strict';

const { getTemplateFiles } = require('./siteTemplates');

/** projectId -> Map(path, { content, updated_at, content_encoding? }) */
const byProject = new Map();

function getMap(projectId) {
  if (!byProject.has(projectId)) {
    byProject.set(projectId, new Map());
  }
  return byProject.get(projectId);
}

function listPaths(projectId) {
  const m = getMap(projectId);
  return Array.from(m.keys())
    .sort()
    .map((path) => {
      const row = m.get(path);
      return { path, updated_at: row.updated_at, content_encoding: row.content_encoding || 'utf8' };
    });
}

function getFile(projectId, filePath) {
  return getMap(projectId).get(filePath) || null;
}

function setFile(projectId, filePath, content, encoding) {
  const now = new Date().toISOString();
  const row = { content: String(content), updated_at: now };
  if (encoding === 'base64') row.content_encoding = 'base64';
  getMap(projectId).set(filePath, row);
  return getMap(projectId).get(filePath);
}

function deleteFile(projectId, filePath) {
  return getMap(projectId).delete(filePath);
}

function initStarter(projectId, templateId) {
  const m = getMap(projectId);
  const now = new Date().toISOString();
  const files = getTemplateFiles(templateId);
  const keys = Object.keys(files);
  for (const p of keys) {
    m.set(p, { content: files[p], updated_at: now, content_encoding: 'utf8' });
  }
  return keys;
}

function clearAll() {
  byProject.clear();
}

module.exports = {
  listPaths,
  getFile,
  setFile,
  deleteFile,
  initStarter,
  clearAll,
};

'use strict';

const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { railwayGql, createProject, createCustomDomainForService } = require('./railwayGql');

const SLEEP = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {string} token
 * @param {string} railwayProjectId
 * @returns {Promise<{ id: string, name: string } | null>}
 */
async function getDefaultEnvironment(token, railwayProjectId) {
  const q = `
    query ProjectEnvs($id: String!) {
      project(id: $id) {
        environments {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    }
  `;
  const body = await railwayGql(token, q, { id: railwayProjectId });
  if (body.errors && body.errors.length) {
    console.warn('[railwayStaticDeploy] project environments query', body.errors.map((e) => e.message).join('; '));
    return null;
  }
  const edges = (body.data && body.data.project && body.data.project.environments && body.data.project.environments.edges) || [];
  const nodes = edges.map((e) => e.node).filter(Boolean);
  if (!nodes.length) return null;
  const prod = nodes.find((n) => String(n.name || '').toLowerCase() === 'production');
  return prod || nodes[0];
}

/**
 * @param {string} token
 * @param {{ projectId: string, name?: string }} input
 * @returns {Promise<{ id: string, name: string } | { error: string }>}
 */
async function createEmptyService(token, { projectId, name }) {
  const m = `
    mutation ServiceCreate($input: ServiceCreateInput!) {
      serviceCreate(input: $input) {
        id
        name
      }
    }
  `;
  const input = {
    projectId: String(projectId).trim(),
    name: (name && String(name).trim()) || `customsite-static-${Date.now().toString(36)}`,
  };
  const body = await railwayGql(token, m, { input });
  if (body.errors && body.errors.length) {
    return { error: body.errors.map((e) => e.message).join('; ') };
  }
  const s = body.data && body.data.serviceCreate;
  if (!s || !s.id) return { error: 'serviceCreate did not return an id' };
  return { id: s.id, name: s.name || input.name };
}

/**
 * @param {Array<{ path: string, content: string, encoding?: string }>} files
 * @param {string} destDir
 */
async function writeFilesToDir(files, destDir) {
  for (const f of files) {
    const rel = f.path.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!rel || rel.includes('..')) continue;
    const abs = path.join(destDir, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    const enc = f.encoding || 'utf8';
    if (enc === 'base64') {
      await fs.writeFile(abs, Buffer.from(f.content, 'base64'));
    } else {
      await fs.writeFile(abs, f.content, 'utf8');
    }
  }
}

function npxBinary() {
  return process.platform === 'win32' ? 'npx.cmd' : 'npx';
}

/**
 * Upload cwd to Railway (same as `railway up --ci`).
 * @param {{ cwd: string, token: string, projectId: string, environmentName: string, serviceName: string }} opts
 */
function runRailwayUpCi(opts) {
  return new Promise((resolve, reject) => {
    const args = [
      '@railway/cli@latest',
      'up',
      '--ci',
      '--no-gitignore',
      '--project',
      opts.projectId,
      '--environment',
      opts.environmentName,
      '--service',
      opts.serviceName,
    ];
    const proc = spawn(npxBinary(), args, {
      cwd: opts.cwd,
      env: { ...process.env, RAILWAY_TOKEN: opts.token, CI: '1', FORCE_COLOR: '0' },
      shell: process.platform === 'win32',
    });
    let stdout = '';
    let stderr = '';
    proc.stdout?.on('data', (d) => {
      stdout += d.toString();
    });
    proc.stderr?.on('data', (d) => {
      stderr += d.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else {
        const msg = (stderr || stdout || `exit ${code}`).slice(0, 8000);
        reject(new Error(`railway up failed (exit ${code}): ${msg}`));
      }
    });
  });
}

/**
 * Resolve public HTTPS URL for a service after deploy.
 * @param {string} token
 * @param {string} railwayProjectId
 * @param {string} serviceId
 * @returns {Promise<string | null>}
 */
async function resolveServicePublicUrl(token, railwayProjectId, serviceId) {
  const q = `
    query DeployUrl($pid: String!) {
      project(id: $pid) {
        services {
          edges {
            node {
              id
              serviceInstances {
                edges {
                  node {
                    latestDeployment {
                      status
                      staticUrl
                    }
                    domains {
                      domain
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
  const body = await railwayGql(token, q, { pid: railwayProjectId });
  if (body.errors && body.errors.length) return null;
  const edges = (body.data && body.data.project && body.data.project.services && body.data.project.services.edges) || [];
  for (const e of edges) {
    const node = e.node;
    if (!node || node.id !== serviceId) continue;
    const instEdges = (node.serviceInstances && node.serviceInstances.edges) || [];
    for (const ie of instEdges) {
      const n = ie.node;
      if (!n) continue;
      const dep = n.latestDeployment;
      if (dep && dep.staticUrl && String(dep.staticUrl).trim()) {
        const u = String(dep.staticUrl).trim();
        return u.startsWith('http') ? u : `https://${u}`;
      }
      const doms = n.domains || [];
      for (const d of doms) {
        if (d && d.domain && /\.railway\.app$/i.test(d.domain)) {
          return `https://${d.domain}`;
        }
      }
    }
  }
  return null;
}

/** Fallback when service-scoped domains are not yet visible in GraphQL. */
async function resolveFromProjectDeployments(token, railwayProjectId) {
  const q = `
    query DepUrl($id: String!) {
      project(id: $id) {
        deployments(first: 12) {
          edges {
            node {
              status
              staticUrl
            }
          }
        }
      }
    }
  `;
  const body = await railwayGql(token, q, { id: railwayProjectId });
  if (body.errors && body.errors.length) return null;
  const edges = (body.data && body.data.project && body.data.project.deployments && body.data.project.deployments.edges) || [];
  const prefer = (status) => status === 'SUCCESS' || status === 'DEPLOYING' || status === 'BUILDING';
  for (const e of edges) {
    const n = e.node;
    if (n && n.staticUrl && String(n.staticUrl).trim() && prefer(n.status)) {
      const u = String(n.staticUrl).trim();
      return u.startsWith('http') ? u : `https://${u}`;
    }
  }
  for (const e of edges) {
    const n = e.node;
    if (n && n.staticUrl && String(n.staticUrl).trim()) {
      const u = String(n.staticUrl).trim();
      return u.startsWith('http') ? u : `https://${u}`;
    }
  }
  return null;
}

/**
 * Poll GraphQL until we get an https URL or timeout.
 */
async function waitForPublicUrl(token, railwayProjectId, serviceId, { maxWaitMs = 180000, intervalMs = 4000 } = {}) {
  const deadline = Date.now() + maxWaitMs;
  let last = null;
  while (Date.now() < deadline) {
    last = await resolveServicePublicUrl(token, railwayProjectId, serviceId);
    if (last) return last;
    last = await resolveFromProjectDeployments(token, railwayProjectId);
    if (last) return last;
    await SLEEP(intervalMs);
  }
  return last;
}

function cnameTargetFromUrl(httpsUrl) {
  if (!httpsUrl) return null;
  try {
    const u = new URL(httpsUrl);
    return u.hostname || null;
  } catch {
    return null;
  }
}

/**
 * Full flow: new Railway project → env → empty service → write files → railway up --ci → poll URL.
 * @param {object} opts
 * @param {string} opts.token
 * @param {string} opts.teamId
 * @param {string} opts.displayName
 * @param {string} [opts.description]
 * @param {Array<{ path: string, content: string, encoding?: string }>} opts.files
 * @param {{ attachCustomDomain?: boolean, customDomain?: string | null }} [opts.domain]
 * @returns {Promise<{ ok: true, railwayProjectId: string, serviceId: string, serviceName: string, publicUrl: string, cnameTarget: string, customDomainDns?: object } | { ok: false, error: string, railwayProjectId?: string }>}
 */
async function provisionStaticDeploy(opts) {
  const { token, teamId, displayName, description, files, domain } = opts;
  const cproj = await createProject(token, {
    name: String(displayName || 'CustomSite site').slice(0, 64),
    teamId,
    description: description || 'CustomSite static site',
  });
  if (cproj.error) {
    return { ok: false, error: cproj.error };
  }
  const railwayProjectId = cproj.id;

  let env = await getDefaultEnvironment(token, railwayProjectId);
  if (!env || !env.id) {
    env = { id: '', name: 'production' };
  }
  const environmentName = env.name || 'production';

  const svcName = `site-${Date.now().toString(36)}`;
  const svc = await createEmptyService(token, { projectId: railwayProjectId, name: svcName });
  if (svc.error) {
    return { ok: false, error: svc.error, railwayProjectId };
  }
  const serviceId = svc.id;
  const serviceName = svc.name;

  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'customsite-railway-'));
  try {
    await writeFilesToDir(files, tmpRoot);
    const upMs = Math.min(Number(process.env.RAILWAY_UP_TIMEOUT_MS) || 720000, 900000);
    await Promise.race([
      runRailwayUpCi({
        cwd: tmpRoot,
        token,
        projectId: railwayProjectId,
        environmentName,
        serviceName,
      }),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`railway up timed out after ${upMs}ms`)), upMs);
      }),
    ]);
  } catch (e) {
    await fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      railwayProjectId,
    };
  }
  await fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => {});

  const publicUrl = await waitForPublicUrl(token, railwayProjectId, serviceId);
  if (!publicUrl) {
    return {
      ok: false,
      error:
        'Deploy uploaded but no public URL was returned yet. Open the Railway dashboard for this project, or wait and PATCH the project with railway_url_production from the service URL.',
      railwayProjectId,
      serviceId,
    };
  }

  const cnameTarget = cnameTargetFromUrl(publicUrl);
  let customDomainDns = null;
  if (domain && domain.attachCustomDomain && domain.customDomain) {
    const cd = await createCustomDomainForService(token, { serviceId, domain: domain.customDomain });
    if (!cd.error) {
      customDomainDns = { id: cd.id, domain: cd.domain, dnsRecords: cd.dnsRecords };
    } else {
      customDomainDns = { error: cd.error };
    }
  }

  return {
    ok: true,
    railwayProjectId,
    serviceId,
    serviceName,
    publicUrl,
    cnameTarget: cnameTarget || '',
    customDomainDns,
  };
}

module.exports = {
  provisionStaticDeploy,
  getDefaultEnvironment,
  createEmptyService,
  cnameTargetFromUrl,
  waitForPublicUrl,
};

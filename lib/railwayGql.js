'use strict';

/**
 * Minimal Railway GraphQL v2 client (https://backboard.railway.com/graphql/v2).
 * Used for test connection, project creation, and (optionally) domain helpers.
 */
const RAILWAY_ENDPOINT = 'https://backboard.railway.com/graphql/v2';

async function railwayGql(token, query, variables) {
  if (!token || typeof token !== 'string') {
    return { errors: [{ message: 'Missing Railway API token' }] };
  }
  const r = await fetch(RAILWAY_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables: variables || {} }),
  });
  const body = await r.json().catch(() => ({}));
  return body;
}

const ME_TEAMS = `
  query {
    me {
      id
      name
      email
    }
    teams {
      edges {
        node {
          id
          name
        }
      }
    }
  }
`;

async function testToken(token) {
  const body = await railwayGql(token, ME_TEAMS);
  if (body.errors && body.errors.length) {
    return { ok: false, error: body.errors.map((e) => e.message).join('; ') };
  }
  if (!body.data || !body.data.me) {
    return { ok: false, error: 'Unexpected Railway response' };
  }
  const teams = (body.data.teams && body.data.teams.edges) || [];
  return {
    ok: true,
    me: body.data.me,
    teams: teams.map((e) => e.node),
  };
}

const PROJECT_CREATE = `
  mutation($input: ProjectCreateInput!) {
    projectCreate(input: $input) {
      id
      name
      teamId
    }
  }
`;

/**
 * @returns {{ id: string, name: string } | { error: string }}
 */
async function createProject(token, { name, teamId, description }) {
  const input = {
    name: String(name).trim(),
    isPublic: false,
  };
  if (description) input.description = String(description);
  if (teamId) input.teamId = teamId;

  const body = await railwayGql(token, PROJECT_CREATE, { input });
  if (body.errors && body.errors.length) {
    return { error: body.errors.map((e) => e.message).join('; ') };
  }
  const p = body.data && body.data.projectCreate;
  if (!p || !p.id) {
    return { error: 'projectCreate did not return an id' };
  }
  return { id: p.id, name: p.name };
}

const CUSTOM_DOMAIN_CREATE = `
  mutation($input: CustomDomainCreateInput!) {
    customDomainCreate(input: $input) {
      id
      domain
      status {
        dnsRecords {
          recordType
          requiredValue
          fqdn
          status
          purpose
        }
      }
    }
  }
`;

/**
 * Attach a hostname to a Railway service (TLS + routing). Requires a valid Railway API token.
 * @returns {{ id: string, domain: string, dnsRecords: object[] } | { error: string }}
 */
async function createCustomDomainForService(token, { serviceId, domain }) {
  const d = String(domain || '')
    .trim()
    .toLowerCase();
  if (!d) return { error: 'domain is required' };
  if (!serviceId) return { error: 'serviceId is required' };
  const body = await railwayGql(token, CUSTOM_DOMAIN_CREATE, {
    input: { serviceId: String(serviceId).trim(), domain: d },
  });
  if (body.errors && body.errors.length) {
    return { error: body.errors.map((e) => e.message).join('; ') };
  }
  const row = body.data && body.data.customDomainCreate;
  if (!row || !row.id) {
    return { error: 'customDomainCreate did not return a row' };
  }
  const rec = (row.status && row.status.dnsRecords) || [];
  return {
    id: row.id,
    domain: row.domain || d,
    dnsRecords: Array.isArray(rec) ? rec : [],
  };
}

module.exports = {
  railwayGql,
  RAILWAY_ENDPOINT,
  testToken,
  createProject,
  createCustomDomainForService,
};

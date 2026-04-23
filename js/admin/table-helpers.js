'use strict';

export function filterRows(rows, q, keys) {
  if (!q || !String(q).trim()) return rows;
  const t = String(q).trim().toLowerCase();
  return rows.filter((r) =>
    keys.some((keyPath) => {
      const v = keyPath.split('.').reduce((o, x) => (o == null ? o : o[x]), r);
      return v != null && String(v).toLowerCase().includes(t);
    })
  );
}

export function sortRows(rows, key, dir, getVal) {
  const getter =
    getVal ||
    ((r) => {
      return key.split('.').reduce((o, x) => (o == null ? o : o[x]), r);
    });
  return [...rows].sort((a, b) => {
    const va = getter(a);
    const vb = getter(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === 'number' && typeof vb === 'number') {
      return dir === 'asc' ? va - vb : vb - va;
    }
    const sa = String(va);
    const sb = String(vb);
    if (/^\d{4}-\d{2}-\d{2}/.test(sa) && /^\d{4}-\d{2}-\d{2}/.test(sb)) {
      const da = new Date(sa).getTime();
      const dbt = new Date(sb).getTime();
      return dir === 'asc' ? da - dbt : dbt - da;
    }
    return dir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
  });
}

export function paginate(arr, page, perPage) {
  const p = Math.max(1, page);
  const start = (p - 1) * perPage;
  const totalPages = Math.max(1, Math.ceil((arr.length || 1) / perPage));
  return { page: p, totalPages, slice: arr.slice(start, start + perPage) };
}

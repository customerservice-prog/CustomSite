'use strict';

/** One-off helper: flatten `categories` from pasted videos.html into flat seed rows. */

const fs = require('fs');
const path = require('path');

const inPath = path.join(__dirname, '..', process.argv[2] || 'tmp-cestui-videos.html');
const outPath = path.join(__dirname, '..', 'data', 'cestui-videos.seed.json');

function main() {
  const html = fs.readFileSync(inPath, 'utf8');
  const idx = html.indexOf('const categories');
  if (idx < 0) {
    console.error('Missing const categories');
    process.exitCode = 1;
    return;
  }
  const lb = html.indexOf('[', idx);
  let depth = 0;
  let j = lb;
  for (; j < html.length; j += 1) {
    const c = html[j];
    if (c === '[') depth += 1;
    else if (c === ']') {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  const jsonStr = html.slice(lb, j + 1);
  let cats;
  try {
    cats = new Function(`return ${jsonStr}`)(); // eslint-disable-line no-new-func
  } catch (e) {
    console.error('Parse categories failed:', e.message);
    process.exitCode = 1;
    return;
  }
  if (!Array.isArray(cats)) {
    console.error('categories is not an array');
    process.exitCode = 1;
    return;
  }
  const seen = new Map();

  /** @type {{youtube_id:string,title:string,channel:string,category:string,category_label:string}} */
  function add(v, catSlug, catTitle) {
    if (!v || !v.id) return;
    const id = String(v.id).trim();
    if (!/^[-_\w]{11}$/.test(id)) return;
    if (seen.has(id)) return;
    seen.set(id, {
      youtube_id: id,
      title: String(v.title || '').trim(),
      channel: String(v.channel || '').trim(),
      category: String(catSlug || 'general').trim(),
      category_label: String(catTitle || catSlug || 'general').trim(),
    });
  }

  for (const c of cats || []) {
    const catSlug = c.id || 'general';
    const catTitle = c.title || c.label || catSlug;
    for (const v of c.videos || []) add(v, catSlug, catTitle);
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify([...seen.values()], null, 2)}\n`, 'utf8');
  console.log(`Wrote ${seen.size} unique videos → ${path.relative(process.cwd(), outPath)}`);
}

main();

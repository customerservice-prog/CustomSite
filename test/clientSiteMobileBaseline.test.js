'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { injectClientSiteMobileBaseline } = require('../lib/clientSiteMobileBaseline');

test('injectClientSiteMobileBaseline skips when already present', () => {
  const h = `<!DOCTYPE html><html><head><style id="data-cs-responsive-baseline">x{}</style></head><body></body></html>`;
  assert.equal(injectClientSiteMobileBaseline(h), h);
});

test('inject skips legacy data-cs-mobile-baseline id', () => {
  const h = `<html><head><style id="data-cs-mobile-baseline">{}</style></head><body></body></html>`;
  assert.equal(injectClientSiteMobileBaseline(h), h);
});

test('injectClientSiteMobileBaseline inserts style before closing head', () => {
  const h = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>X</title></head><body><p>x</p></body></html>`;
  const out = injectClientSiteMobileBaseline(h);
  assert.ok(out.includes('data-cs-responsive-baseline'));
  assert.ok(out.includes('max-width:100%'));
  const iStyle = out.indexOf('data-cs-responsive-baseline');
  const iHead = out.indexOf('</head>');
  assert.ok(iStyle !== -1 && iHead !== -1 && iStyle < iHead);
});

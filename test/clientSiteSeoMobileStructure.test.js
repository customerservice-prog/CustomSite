'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { applyClientSiteTechnicalSeo } = require('../lib/clientSiteSeo');
const { injectClientSiteMobileBaseline } = require('../lib/clientSiteMobileBaseline');

const ctx = {
  filePath: 'index.html',
  siteSettings: {},
  siteName: 'Demo',
  canonicalOrigin: 'https://example.com',
};

describe('client site mobile document shape', () => {
  test('applyClientSiteTechnicalSeo does not nest duplicate html when <html><body> lacks <head>', () => {
    const raw = '<!DOCTYPE html><html lang="en"><body><p>Hello</p></body></html>';
    const out = applyClientSiteTechnicalSeo(raw, ctx);
    const bodyOpens = (out.match(/<body\b/gi) || []).length;
    const htmlOpens = (out.match(/<html\b/gi) || []).length;
    assert.equal(htmlOpens, 1);
    assert.equal(bodyOpens, 1);
    assert.match(out, /viewport/i);
  });

  test('injectClientSiteMobileBaseline adds baseline when only html+body', () => {
    const raw = '<!DOCTYPE html><html><body><p>x</p></body></html>';
    const out = injectClientSiteMobileBaseline(raw);
    assert.ok(out.includes('data-cs-responsive-baseline'));
    assert.equal((out.match(/<html\b/gi) || []).length, 1);
  });
});

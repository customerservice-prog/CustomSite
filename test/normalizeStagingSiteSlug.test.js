'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { normalizeStagingSiteSlug } = require('../lib/normalizeStagingSiteSlug');

describe('normalizeStagingSiteSlug', () => {
  test('accepts valid slugs', () => {
    assert.strictEqual(normalizeStagingSiteSlug('Acme-Pizza'), 'acme-pizza');
    assert.strictEqual(normalizeStagingSiteSlug('cool-site-99'), 'cool-site-99');
  });

  test('rejects reserved and bad shapes', () => {
    assert.strictEqual(normalizeStagingSiteSlug('www'), null);
    assert.strictEqual(normalizeStagingSiteSlug('ab'), null);
    assert.strictEqual(normalizeStagingSiteSlug('no'), null);
    assert.strictEqual(normalizeStagingSiteSlug(''), null);
  });
});

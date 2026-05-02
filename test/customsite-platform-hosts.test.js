'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
  isPlatformHostname,
  customDomainLookupVariants,
  stripPort,
} = require('../lib/customsitePlatformHosts');

describe('customsitePlatformHosts', () => {
  test('stripPort removes port', () => {
    assert.equal(stripPort('EXAMPLE.com:8080'), 'example.com');
  });

  test('customDomainLookupVariants includes www and apex', () => {
    const v = customDomainLookupVariants('www.foo.com');
    assert.ok(v.includes('www.foo.com'));
    assert.ok(v.includes('foo.com'));
    const v2 = customDomainLookupVariants('bar.org');
    assert.ok(v2.includes('bar.org'));
    assert.ok(v2.includes('www.bar.org'));
  });

  test('isPlatformHostname treats localhost and railway as platform', () => {
    assert.equal(isPlatformHostname('localhost'), true);
    assert.equal(isPlatformHostname('foo.up.railway.app'), true);
  });

  test('isPlatformHostname treats unknown client host as non-platform', () => {
    assert.equal(isPlatformHostname('jordanmaxwell.org'), false);
  });
});

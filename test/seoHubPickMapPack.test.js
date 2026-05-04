'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { pickMapPackRank } = require('../lib/seoHub/collectRankings');

test('pickMapPackRank prefers place id in URL', () => {
  const items = [
    { rank_absolute: 3, url: '/search', type: 'foo' },
    { rank_absolute: 4, url: 'https://google.com/maps/place/?q=parking&query_place_id=ChIJabc123', type: 'maps_search' },
  ];
  const { position } = pickMapPackRank(items, 'ChIJabc123', '');
  assert.equal(position, 4);
});

test('pickMapPackRank fallback first low rank', () => {
  const items = [{ rank_absolute: 2, url: 'x', title: 'Other' }];
  const { position } = pickMapPackRank(items, null, '');
  assert.equal(position, 2);
});

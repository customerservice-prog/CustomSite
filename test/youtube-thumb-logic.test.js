'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { thumbnailBufferLooksUnavailable } = require('../lib/youtubeThumbnailLogic');

describe('youtubeThumbnailLogic', () => {
  it('treats empty buffer as unavailable', () => {
    assert.ok(thumbnailBufferLooksUnavailable(Buffer.alloc(0)));
  });

  it('allows valid JPEG buffers that are shorter than legacy 800-byte heuristic', () => {
    /** Real-world CDN responses can dip below arbitrary byte floors; magic bytes gate instead. */
    const buf = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]),
      Buffer.alloc(200, 1),
      Buffer.from([0xff, 0xd9]),
    ]);
    assert.ok(!thumbnailBufferLooksUnavailable(buf));
  });
});

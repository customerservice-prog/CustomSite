'use strict';

/**
 * Minimal JPEG dimension probe (baseline / progressive SOF markers).
 * @returns {{ width: number, height: number } | null}
 */
function jpegDimensions(buf) {
  if (!buf || buf.length < 10) return null;
  let i = 0;
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  i = 2;
  while (i < buf.length - 8) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const mk = buf[i + 1];
    if (mk === 0xd9) break; // EOI
    if (mk === 0xd8) {
      i += 2;
      continue;
    }
    const segLen = buf.readUInt16BE(i + 2);
    if (segLen < 2 || i + 2 + segLen > buf.length) break;
    /** SOF0 / SOF2 */
    if (mk === 0xc0 || mk === 0xc2) {
      const height = buf.readUInt16BE(i + 5);
      const width = buf.readUInt16BE(i + 7);
      return { width, height };
    }
    i += 2 + segLen;
  }
  return null;
}

module.exports = { jpegDimensions };

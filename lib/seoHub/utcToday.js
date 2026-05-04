'use strict';

/** YYYY-MM-DD in UTC — matches snapshot_date used by nightly crons. */
function utcDateString(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

module.exports = { utcDateString };

'use strict';

const VIDEO_ARCHIVE_BUCKET = String(process.env.CUSTOMSITE_VIDEO_ARCHIVE_BUCKET || 'video-archive').trim() || 'video-archive';

module.exports = { VIDEO_ARCHIVE_BUCKET };

'use strict';

const { getTemplateFiles } = require('./siteTemplates');

/** Default (basic) starter — shared with local dev in-memory store. */
const SITE_STARTER_FILES = getTemplateFiles('basic');

module.exports = { SITE_STARTER_FILES };

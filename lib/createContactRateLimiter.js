'use strict';

const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const Redis = require('ioredis');

let redisClient = null;
function getRedis() {
  const url = process.env.REDIS_URL;
  if (!url || !String(url).trim()) return null;
  if (!redisClient) {
    redisClient = new Redis(String(url).trim(), {
      maxRetriesPerRequest: 3,
    });
  }
  return redisClient;
}

const WINDOW_MS = 15 * 60 * 1000;
const MAX = 8;

function buildLimiter() {
  const opts = {
    windowMs: WINDOW_MS,
    max: MAX,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
    },
  };
  const client = getRedis();
  if (client) {
    opts.store = new RedisStore({
      sendCommand: (command, ...args) => client.call(command, ...args),
    });
  }
  return rateLimit(opts);
}

/** One shared limiter for POST /api/contact (memory, or Redis when REDIS_URL is set). */
module.exports = buildLimiter();

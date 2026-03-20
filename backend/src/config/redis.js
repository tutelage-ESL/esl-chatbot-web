'use strict';
// Redis config stub — swap in ioredis when Redis is available
const config = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};
// TODO: replace with actual Redis client (ioredis) when needed
const redisClient = null;
module.exports = { config, redisClient };

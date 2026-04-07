// Redis client placeholder
// Will be configured in a later phase with ioredis or similar

import { env } from "./env.ts";

export const redisConfig = {
  url: env.REDIS_URL,
};

// TODO: Initialize Redis client
// import Redis from "ioredis";
// export const redis = new Redis(redisConfig.url);

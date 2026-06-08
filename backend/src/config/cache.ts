import Redis from "ioredis";
import { env } from "./env.ts";
import { logger } from "./logger.ts";

// Key factories — the single source of truth for every cache key name
export const cacheKeys = {
  authUser:  (userId: string) => `user:auth:${userId}`,
  dashboard: (userId: string) => `user:dashboard:${userId}`,
} as const;

// TTLs in seconds — short enough to be a safety net, long enough to matter
export const cacheTTL = {
  authUser:  300, // 5 min — role/subscription changes visible within 5 min
  dashboard: 120, // 2 min — streak and due-vocab update frequently
} as const;

let client: Redis | null = null;
let available = false;

export async function connectRedis(): Promise<void> {
  // Never connect in test — all cache ops silently return null/undefined
  if (env.NODE_ENV === "test") return;

  client = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    connectTimeout: 5000,
  });

  client.on("error", (err: Error) => {
    if (available) {
      logger.warn("[redis] Connection error — cache disabled until reconnect", {
        error: err.message,
      });
    }
    available = false;
  });

  client.on("ready", () => {
    if (!available) logger.info("[redis] Reconnected and ready");
    available = true;
  });

  try {
    await client.connect();
    available = true;
    logger.info(`[redis] Connected to ${env.REDIS_URL.replace(/:[^:@]+@/, ":***@")}`);

    if (env.NODE_ENV === "production" && !env.REDIS_URL.startsWith("rediss://")) {
      logger.warn("[redis] WARNING: REDIS_URL is not using TLS (rediss://) in production. Upstash requires rediss://");
    }
  } catch (err) {
    available = false;
    logger.warn("[redis] Could not connect — cache disabled, all reads fall through to DB", {
      error: (err as Error).message,
    });
  }
}

export async function disconnectRedis(): Promise<void> {
  if (!client) return;
  try {
    await client.quit();
    logger.info("[redis] Disconnected");
  } catch {
    // Ignore errors during shutdown
  }
  client = null;
  available = false;
}

// ── Cache operations ─────────────────────────────────────────────────────────
// All three functions are silent no-ops when Redis is unavailable.
// Callers never see a Redis error — they just get null/undefined and fall through to DB.

export async function getCache<T>(key: string): Promise<T | null> {
  if (!available || !client) return null;
  try {
    const raw = await client.get(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.warn("[redis] getCache failed", { key, error: (err as Error).message });
    return null;
  }
}

export async function setCache(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!available || !client) return;
  try {
    await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (err) {
    logger.warn("[redis] setCache failed", { key, error: (err as Error).message });
  }
}

// Uses UNLINK (async non-blocking delete) instead of DEL — avoids blocking the Redis event loop
export async function deleteCache(...keys: string[]): Promise<void> {
  if (!available || !client || keys.length === 0) return;
  try {
    await client.unlink(...keys);
  } catch (err) {
    logger.warn("[redis] deleteCache failed", { keys, error: (err as Error).message });
  }
}

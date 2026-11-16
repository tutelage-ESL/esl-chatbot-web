// Redis client configuration — see src/config/cache.ts for the full cache implementation
// This file is kept as a thin re-export for backwards compatibility with any direct imports.
export { connectRedis, disconnectRedis } from "./cache.ts";

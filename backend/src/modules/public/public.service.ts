import { prisma } from "../../config/database.ts";
import { getCache, setCache, cacheKeys, cacheTTL } from "../../config/cache.ts";

export interface PublicStats {
  /** Active student accounts (internal/stealth accounts never count). */
  learners: number;
}

/** Numbers the public marketing site shows. Cached — the landing page is hit far more than it changes. */
export async function getPublicStats(): Promise<PublicStats> {
  const cached = await getCache<PublicStats>(cacheKeys.publicStats);
  if (cached) return cached;

  const learners = await prisma.user.count({ where: { role: "STUDENT", isActive: true, isInternal: false } });
  const stats = { learners };
  await setCache(cacheKeys.publicStats, stats, cacheTTL.publicStats);
  return stats;
}

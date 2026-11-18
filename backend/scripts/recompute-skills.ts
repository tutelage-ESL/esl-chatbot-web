// One-off backfill: recompute every learner's stored skill scores from their latest scored
// chat messages (metrics/skills.service.ts). The old per-session moving average started
// everyone at 0 and only moved on "End session", so stored values from before are wrong.
// Safe to re-run: it only rewrites derived numbers. Learners with no scored messages are untouched.
//
//   bun scripts/recompute-skills.ts            (uses DATABASE_URL)
import { prisma } from "../src/config/database.ts";
import { refreshStoredSkills } from "../src/modules/metrics/skills.service.ts";

const learners = await prisma.userMetrics.findMany({ select: { userId: true } });
for (const { userId } of learners) await refreshStoredSkills(userId);
console.log(`Recomputed skill scores for ${learners.length} learners.`);
await prisma.$disconnect();

import { prisma } from "../../config/database.ts";

/**
 * Skill scores (0–100) are the plain average of the learner's latest scored chat
 * messages: the AI scores grammar, vocabulary and fluency on every message (typed or
 * spoken), and Azure scores pronunciation on spoken ones (= speaking).
 *
 * Replaces the old per-session moving average, which started every learner at 0
 * (a first session of 80 showed as 12) and only moved when "End session" was pressed.
 */
export const SKILL_WINDOW = 40;

export type SkillSnapshot = {
  grammar: number | null;
  vocabulary: number | null;
  fluency: number | null;
  /** null until the learner has spoken in a voice chat with pronunciation scoring */
  speaking: number | null;
  /** Scored messages behind grammar/vocabulary/fluency (at most SKILL_WINDOW) */
  basedOnMessages: number;
  /** Spoken messages behind speaking (at most SKILL_WINDOW) */
  basedOnSpoken: number;
  /** Most common CEFR level the AI gave their latest messages; null = no data */
  level: string | null;
};

/** The level that appears most often (ties: the higher level, the learner's best recent work). */
export function mostCommonLevel(levels: string[]): string | null {
  const order = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const counts = new Map<string, number>();
  for (const l of levels) if (order.includes(l)) counts.set(l, (counts.get(l) ?? 0) + 1);
  let best: string | null = null;
  for (const [l, n] of counts) {
    const bn = best ? counts.get(best)! : 0;
    if (n > bn || (n === bn && best && order.indexOf(l) > order.indexOf(best))) best = l;
  }
  return best;
}

const avg = (xs: number[]) =>
  xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null;

export async function computeSkills(userId: string): Promise<SkillSnapshot> {
  const [written, spoken] = await Promise.all([
    prisma.messageEvaluation.findMany({
      where: { message: { userId } },
      orderBy: { createdAt: "desc" },
      take: SKILL_WINDOW,
      select: { grammarScore: true, vocabularyScore: true, fluencyScore: true, detectedCefrLevel: true },
    }),
    prisma.messageEvaluation.findMany({
      where: { message: { userId }, pronunciationScore: { not: null } },
      orderBy: { createdAt: "desc" },
      take: SKILL_WINDOW,
      select: { pronunciationScore: true },
    }),
  ]);
  return {
    grammar: avg(written.map((e) => e.grammarScore)),
    vocabulary: avg(written.map((e) => e.vocabularyScore)),
    fluency: avg(written.map((e) => e.fluencyScore)),
    speaking: avg(spoken.map((e) => e.pronunciationScore!)),
    basedOnMessages: written.length,
    basedOnSpoken: spoken.length,
    level: mostCommonLevel(written.map((e) => e.detectedCefrLevel)),
  };
}

/** Saves the snapshot on UserMetrics, so dashboards, digests and class lists read it cheaply. */
export async function refreshStoredSkills(userId: string): Promise<void> {
  const s = await computeSkills(userId);
  if (!s.basedOnMessages) return;
  await prisma.userMetrics.updateMany({
    where: { userId },
    data: {
      grammarSkill: s.grammar!,
      vocabularySkill: s.vocabulary!,
      fluencySkill: s.fluency!,
      ...(s.speaking !== null && { speakingSkill: s.speaking }),
      ...(s.level && { estimatedLevel: s.level }),
    },
  });
}


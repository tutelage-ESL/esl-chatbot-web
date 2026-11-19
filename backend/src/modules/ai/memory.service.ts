import { prisma } from "../../config/database.ts";
import { htmlToPlainText } from "../../utils/aiReplyFormat.ts";
import type { LearnerContext, LearnerMemory } from "./ai.types.ts";

// Two kinds of memory, like ChatGPT/Claude:
// - Inside a chat the tutor gets the WHOLE chat (all its messages), so it never forgets there.
// - Between chats it keeps one short list of important facts about the student
//   (LearnerProfile.aiMemory). The model itself decides what goes in and what comes out:
//   each reply returns `memory` = the complete new list, or null to keep it unchanged.
const MAX_FACTS = 15;
const FACT_MAX_CHARS = 150;

/** The model's list → clean, de-duplicated plain-text facts; null when it is not a list (keep memory as is). */
export function cleanFacts(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const seen = new Set<string>();
  const facts: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const fact = htmlToPlainText(item).slice(0, FACT_MAX_CHARS).trim();
    if (!fact || seen.has(fact.toLowerCase())) continue;
    seen.add(fact.toLowerCase());
    facts.push(fact);
  }
  return facts.slice(0, MAX_FACTS);
}

/** The student's first name and the tutor's long-term memory about them. */
export async function loadLearnerMemory(userId: string): Promise<LearnerMemory> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true, learnerProfile: { select: { aiMemory: true } } },
  });
  return {
    name: user?.displayName.trim().split(/\s+/)[0] || null,
    facts: cleanFacts(user?.learnerProfile?.aiMemory) ?? [],
  };
}

/** Saves the model's new memory list. Never fails the reply: a lost update only means one fact less. */
export async function saveLearnerMemory(userId: string, raw: unknown): Promise<void> {
  const facts = cleanFacts(raw);
  if (!facts) return;
  await prisma.learnerProfile.updateMany({ where: { userId }, data: { aiMemory: facts } }).catch((err) => {
    console.warn("[memory] save failed:", err instanceof Error ? err.message : err);
  });
}

/** The learner profile the prompt reads, with the memory attached (works without a profile too). */
export function withMemory(
  profile: Omit<LearnerContext, "memory"> | null,
  memory: LearnerMemory,
): LearnerContext {
  return { currentLevel: null, targetLevel: null, learningPurpose: null, aiPersonality: null, ...profile, memory };
}

import { describe, expect, it } from "bun:test";
import { buildSystemPrompt } from "../providers/prompt.ts";

const learner = (currentLevel: string | null, uiLanguage = "en") => ({
  currentLevel,
  targetLevel: null,
  learningPurpose: null,
  aiPersonality: null,
  uiLanguage,
});

describe("buildSystemPrompt level rules", () => {
  it("talks at a beginner's level for A1/A2", () => {
    for (const level of ["A1", "A2"]) {
      const p = buildSystemPrompt(learner(level));
      expect(p).toContain("The student is a BEGINNER");
      expect(p).not.toContain("slightly above");
    }
  });

  it("keeps the normal rules from B1 up", () => {
    const p = buildSystemPrompt(learner("B2"));
    expect(p).toContain("slightly above");
    expect(p).not.toContain("The student is a BEGINNER");
  });

  it("judges the level from the messages when it is unknown", () => {
    for (const p of [buildSystemPrompt(null), buildSystemPrompt(learner(null))]) {
      expect(p).toContain("level is unknown");
      expect(p).toContain("The student is a BEGINNER");
      expect(p).toContain("slightly above");
    }
  });

  it("names Kurdish as the native language when the app is in Kurdish", () => {
    expect(buildSystemPrompt(learner("A1", "ku"))).toContain("Native language: Kurdish (Sorani)\n");
  });
});

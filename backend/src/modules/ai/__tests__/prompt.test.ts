import { describe, expect, it } from "bun:test";
import { buildLiveInstruction, buildSystemPrompt } from "../providers/prompt.ts";

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

describe("buildSystemPrompt call mode", () => {
  it("asks for a short English spoken reply with no layout or Kurdish line", () => {
    const p = buildSystemPrompt(learner("A1", "ku"), { spoken: true });
    expect(p).toContain("LIVE VOICE CALL");
    expect(p).toContain("English only");
    expect(p).not.toContain("Kurdish Sorani (Arabic script)");
    expect(p).not.toContain("<ul> or <ol>");
    expect(p).toContain("The student is a BEGINNER");
  });

  it("writes Kurdish only when the student used it", () => {
    const p = buildSystemPrompt(learner("A1", "ku"));
    expect(p).toContain("Only when the student's message uses Kurdish");
    expect(p).toContain("no Kurdish at all");
    expect(p).not.toContain("For a beginner, or whenever");
  });

  it("keeps the text rules for typed chat", () => {
    const p = buildSystemPrompt(learner("A1", "ku"));
    expect(p).not.toContain("LIVE VOICE CALL");
    expect(p).toContain("Kurdish Sorani (Arabic script)");
  });
});

describe("buildSystemPrompt conversation first", () => {
  it("keeps talking, corrects at most one thing and never punctuation", () => {
    for (const p of [buildSystemPrompt(learner("A1")), buildSystemPrompt(learner("B2")), buildSystemPrompt(null)]) {
      expect(p).toContain("conversation partner first");
      expect(p).toContain("at most ONE small tip");
      expect(p).toContain("NEVER correct or mention punctuation");
      expect(p).toContain("Punctuation, capital letters and small typos are NOT errors");
    }
  });
});

describe("buildSystemPrompt sentence starters", () => {
  it("gives starters every reply at A1, only when stuck at A2, never from B1", () => {
    expect(buildSystemPrompt(learner("A1"))).toContain("plus a sentence starter or two choices");
    const a2 = buildSystemPrompt(learner("A2"));
    expect(a2).toContain("ONLY when the student");
    expect(a2).not.toContain("plus a sentence starter");
    const b1 = buildSystemPrompt(learner("B1"));
    expect(b1).toContain('No "Say: ..." lines or sentence starters by default');
    expect(b1).toContain("Only when they seem stuck");
  });
});

describe("Tutelage identity", () => {
  it("knows it is Tutelage AI and links only the Tutelage site", () => {
    for (const p of [buildSystemPrompt(learner("B1")), buildSystemPrompt(learner("A1"), { spoken: true })]) {
      expect(p).toContain("You are Tutelage AI");
      expect(p).toContain("founded in 2022 in Sulaimani");
      expect(p).toContain('<a href="https://www.tutelage.krd">tutelage.krd</a>');
    }
    const live = buildLiveInstruction(learner("B1"), "Ali");
    expect(live).toContain("founded in 2022 in Sulaimani");
    expect(live).toContain("tutelage dot K R D");
  });
});

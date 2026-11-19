import { describe, expect, it } from "bun:test";
import { cleanFacts, withMemory } from "../memory.service.ts";
import { buildLiveInstruction, buildSystemPrompt, memorySection } from "../providers/prompt.ts";

const memory = { name: "Karwan", facts: ["Works as a nurse in Erbil.", "Has a cat called Luna."] };

describe("tutor memory", () => {
  it("puts the name and the remembered facts in chat and call prompts", () => {
    for (const p of [buildSystemPrompt(withMemory(null, memory)), buildLiveInstruction(withMemory(null, memory), "Karwan")]) {
      expect(p).toContain("- Their account name: Karwan.");
      expect(p).toContain("- Works as a nurse in Erbil.\n- Has a cat called Luna.");
      expect(p).toContain("never invent memories");
    }
  });

  it("tells the model to keep memory unchanged by default and to store only lasting facts", () => {
    const p = buildSystemPrompt(withMemory(null, memory));
    expect(p).toContain('"memory": <null in almost every reply');
    expect(p).toContain("NEVER store small talk");
  });

  it("adds nothing when there is nothing to remember", () => {
    expect(memorySection({ name: null, facts: [] })).toBe("");
    expect(memorySection(null)).toBe("");
  });

  it("keeps memory unchanged unless the model sent a list", () => {
    expect(cleanFacts(null)).toBeNull();
    expect(cleanFacts("null")).toBeNull();
    expect(cleanFacts({ a: 1 })).toBeNull();
    expect(cleanFacts([])).toEqual([]); // the model may forget everything when asked
  });

  it("cleans the list: plain text, no blanks or repeats, capped", () => {
    expect(cleanFacts(["<p>Has a <strong>cat</strong></p>", "  ", 3, "has a CAT", "Likes tea"])).toEqual(["Has a cat", "Likes tea"]);
    expect(cleanFacts(Array.from({ length: 30 }, (_, i) => `fact ${i}`))).toHaveLength(15);
    expect(cleanFacts(["x".repeat(500)])![0]).toHaveLength(150);
  });
});

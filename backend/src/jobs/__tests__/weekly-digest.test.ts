import { describe, it, expect } from "bun:test";
import { isLocalSundayDigestHour } from "../weekly-digest.job.ts";
import { buildDigestHtml, esc } from "../weekly-digest.email.ts";

// ─── isLocalSundayDigestHour ──────────────────────────────────────────────────

describe("isLocalSundayDigestHour", () => {
  // Find a UTC instant that is Sunday 08:xx in Asia/Baghdad (UTC+3).
  // Baghdad is UTC+3, so Sunday 08:00 Baghdad = Saturday 05:00 UTC.
  // 2026-06-14 is a Sunday. 2026-06-14 08:00 Baghdad = 2026-06-14T05:00:00Z
  const sundayBaghdadUtc = new Date("2026-06-14T05:00:00Z");

  it("returns true when local time is Sunday 08:xx in Asia/Baghdad", () => {
    expect(isLocalSundayDigestHour("Asia/Baghdad", sundayBaghdadUtc)).toBe(true);
  });

  it("returns false for the same instant in Asia/Tokyo (UTC+9, which is Sunday 14:00)", () => {
    expect(isLocalSundayDigestHour("Asia/Tokyo", sundayBaghdadUtc)).toBe(false);
  });

  it("returns false one hour before Sunday 08:00 in Asia/Baghdad", () => {
    const before = new Date(sundayBaghdadUtc.getTime() - 60 * 60 * 1000); // 04:00 UTC = 07:00 Baghdad
    expect(isLocalSundayDigestHour("Asia/Baghdad", before)).toBe(false);
  });

  it("returns false on Saturday at the same UTC hour in Asia/Baghdad", () => {
    const saturday = new Date("2026-06-13T05:00:00Z"); // Saturday 08:00 Baghdad
    expect(isLocalSundayDigestHour("Asia/Baghdad", saturday)).toBe(false);
  });

  it("does not throw on an invalid IANA timezone — falls back to UTC", () => {
    // UTC 08:00 on a Sunday — if the guard works, it should return true (falls back to UTC)
    const sundayUtc8 = new Date("2026-06-14T08:00:00Z"); // Sunday 08:00 UTC
    expect(() => isLocalSundayDigestHour("Not/A/Timezone", sundayUtc8)).not.toThrow();
    // Falls back to UTC: Sunday 08:00 UTC → should match
    expect(isLocalSundayDigestHour("Not/A/Timezone", sundayUtc8)).toBe(true);
  });

  it("handles a half-hour offset timezone (Asia/Kathmandu, UTC+5:30)", () => {
    // Sunday 08:00 Kathmandu = Sunday 02:30 UTC (2026-06-14T02:30:00Z)
    const sundayKathmandu = new Date("2026-06-14T02:30:00Z");
    expect(isLocalSundayDigestHour("Asia/Kathmandu", sundayKathmandu)).toBe(true);
    // One hour later: Sunday 09:00 Kathmandu → should not match
    const after = new Date("2026-06-14T03:30:00Z");
    expect(isLocalSundayDigestHour("Asia/Kathmandu", after)).toBe(false);
  });
});

// ─── buildDigestHtml ──────────────────────────────────────────────────────────

const BASE_DATA = {
  displayName: "Ali",
  weeklyStudyMinutes: 90,
  weeklySessions: 3,
  weeklyMessages: 45,
  weeklyVocabPracticed: 12,
  streak: 7,
  activeGoals: [],
  vocabDue: 5,
  estimatedLevel: "B1",
  grammarSkill: 72,
  vocabularySkill: 68,
  fluencySkill: 55,
  skillDelta: null,
  appUrl: "http://localhost:3001",
};

describe("buildDigestHtml", () => {
  it("HTML-escapes goal descriptions containing injection characters", () => {
    const html = buildDigestHtml({
      ...BASE_DATA,
      activeGoals: [{ description: '<script>alert("xss")</script>', progress: 50, type: "GRAMMAR" }],
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders the no-activity nudge when weeklySessions is 0", () => {
    const html = buildDigestHtml({ ...BASE_DATA, weeklySessions: 0 });
    expect(html).toContain("didn't have any sessions last week");
  });

  it("does NOT render the no-activity nudge when there are sessions", () => {
    const html = buildDigestHtml({ ...BASE_DATA, weeklySessions: 3 });
    expect(html).not.toContain("didn't have any sessions last week");
  });

  it("omits the skill section entirely when all skill scores are 0", () => {
    const html = buildDigestHtml({
      ...BASE_DATA,
      grammarSkill: 0,
      vocabularySkill: 0,
      fluencySkill: 0,
    });
    expect(html).not.toContain("Skill scores");
    expect(html).not.toContain("Grammar");
  });

  it("renders the skill section when at least one skill score is non-zero", () => {
    const html = buildDigestHtml({ ...BASE_DATA, grammarSkill: 72 });
    expect(html).toContain("Skill scores");
    expect(html).toContain("Grammar");
  });

  it("omits skill delta when skillDelta is null", () => {
    const html = buildDigestHtml({ ...BASE_DATA, skillDelta: null });
    // The delta badge has the specific format "(+N this week)" or "(-N this week)"
    expect(html).not.toContain("this week)</span>");
  });

  it("renders positive delta with green colour and +N label", () => {
    const html = buildDigestHtml({
      ...BASE_DATA,
      grammarSkill: 80,
      skillDelta: { grammar: 70, vocabulary: 68, fluency: 55 },
    });
    expect(html).toContain("+10 this week");
    expect(html).toContain("color:#16a34a");
  });

  it("renders negative delta with red colour", () => {
    const html = buildDigestHtml({
      ...BASE_DATA,
      grammarSkill: 60,
      skillDelta: { grammar: 70, vocabulary: 68, fluency: 55 },
    });
    expect(html).toContain("-10 this week");
    expect(html).toContain("color:#dc2626");
  });

  it("truncates long goal descriptions to 80 chars + ellipsis", () => {
    const longDesc = "A".repeat(100);
    const html = buildDigestHtml({
      ...BASE_DATA,
      activeGoals: [{ description: longDesc, progress: 20, type: "VOCABULARY" }],
    });
    expect(html).toContain("A".repeat(80) + "…");
    expect(html).not.toContain("A".repeat(81));
  });

  it("includes the CTA button link", () => {
    const html = buildDigestHtml({ ...BASE_DATA, appUrl: "http://localhost:3001" });
    expect(html).toContain("http://localhost:3001");
    expect(html).toContain("Continue learning");
  });

  it("includes the opt-out footer note", () => {
    const html = buildDigestHtml(BASE_DATA);
    expect(html).toContain("Settings → Profile");
  });
});

// ─── esc ──────────────────────────────────────────────────────────────────────

describe("esc", () => {
  it("escapes all five HTML special characters", () => {
    expect(esc('& < > " \'')).toBe("&amp; &lt; &gt; &quot; &#39;");
  });

  it("returns plain strings unchanged", () => {
    expect(esc("Hello World")).toBe("Hello World");
  });
});

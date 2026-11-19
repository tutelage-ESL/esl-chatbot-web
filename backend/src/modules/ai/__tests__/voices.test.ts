import { describe, expect, it } from "bun:test";
import { liveSpeechConfig, microsoftVoice, OPENAI_VOICE, speechLanguage, tutorVoiceOf } from "../voices.ts";
import { buildLiveInstruction, buildSystemPrompt } from "../providers/prompt.ts";

const learner = (tutorAccent: string | null) => ({
  currentLevel: "B1", targetLevel: null, learningPurpose: null, aiPersonality: null, uiLanguage: "en", tutorAccent,
});

describe("tutor voice", () => {
  it("defaults to an American female voice", () => {
    expect(tutorVoiceOf(null)).toEqual({ accent: "US", gender: "FEMALE" });
    expect(microsoftVoice(tutorVoiceOf(null))).toBe("en-US-JennyNeural");
  });

  it("maps every choice to a Microsoft voice of that accent", () => {
    expect(microsoftVoice({ accent: "US", gender: "MALE" })).toBe("en-US-GuyNeural");
    expect(microsoftVoice({ accent: "GB", gender: "FEMALE" })).toBe("en-GB-SoniaNeural");
    expect(microsoftVoice({ accent: "GB", gender: "MALE" })).toBe("en-GB-RyanNeural");
    expect(OPENAI_VOICE.MALE).toBe("onyx");
    expect(speechLanguage("GB")).toBe("en-GB");
  });

  it("uses the British voice library only on the live model that accepts it", () => {
    const gb = { accent: "GB" as const, gender: "MALE" as const };
    expect(liveSpeechConfig("gemini-3.8-live", gb)).toEqual({ languageCode: "en-GB", voiceConfig: { prebuiltVoiceConfig: { voiceName: "en-gb-assistant-2" } } });
    expect(liveSpeechConfig("gemini-3.1-flash-live-preview", gb).voiceConfig.prebuiltVoiceConfig.voiceName).toBe("achird");
    expect(liveSpeechConfig("gemini-3.1-flash-live-preview", gb).languageCode).toBe("en-GB");
  });

  it("writes British or American English to match", () => {
    expect(buildSystemPrompt(learner("GB"))).toContain("Use British English");
    expect(buildSystemPrompt(learner(null))).toContain("Use American English");
    expect(buildLiveInstruction(learner("GB"), null)).toContain("standard British accent");
    expect(buildLiveInstruction(learner("US"), null)).toContain("standard American accent");
  });
});

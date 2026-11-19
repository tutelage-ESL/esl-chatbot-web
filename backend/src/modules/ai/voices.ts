import type { TutorAccent, VoiceGender } from "@prisma/client";

// The tutor's voice, chosen by the student (LearnerProfile.tutorAccent / tutorVoice).
// One place maps that choice to each provider's voice, so they all agree.
export interface TutorVoiceChoice {
  accent: TutorAccent;
  gender: VoiceGender;
}

export const DEFAULT_TUTOR_VOICE: TutorVoiceChoice = { accent: "US", gender: "FEMALE" };

/** From a learner profile row (or none) to a choice; missing values fall back to the default. */
export function tutorVoiceOf(profile: { tutorAccent?: TutorAccent | null; tutorVoice?: VoiceGender | null } | null): TutorVoiceChoice {
  return {
    accent: profile?.tutorAccent ?? DEFAULT_TUTOR_VOICE.accent,
    gender: profile?.tutorVoice ?? DEFAULT_TUTOR_VOICE.gender,
  };
}

export const speechLanguage = (accent: TutorAccent) => (accent === "GB" ? "en-GB" : "en-US");

// Microsoft neural voices: Azure TTS in production, Edge TTS in dev (same voice names).
const MICROSOFT_VOICE: Record<TutorAccent, Record<VoiceGender, string>> = {
  US: { FEMALE: "en-US-JennyNeural", MALE: "en-US-GuyNeural" },
  GB: { FEMALE: "en-GB-SoniaNeural", MALE: "en-GB-RyanNeural" },
};
export const microsoftVoice = (v: TutorVoiceChoice) => MICROSOFT_VOICE[v.accent][v.gender];

// OpenAI TTS (Premium chat) has no British voices: British always uses the Microsoft voice.
export const OPENAI_VOICE: Record<VoiceGender, "nova" | "onyx"> = { FEMALE: "nova", MALE: "onyx" };

// Gemini Live. Checked 2026-11-19 with real calls: gemini-3.8-live accepts the British
// voice-library voices; gemini-3.1-flash-live-preview rejects them ("No matching speaker
// voice"), so on it a British call uses the standard voice + en-GB + the accent instruction.
const LIVE_US: Record<VoiceGender, string> = { FEMALE: "despina", MALE: "achird" };
const LIVE_GB: Record<VoiceGender, string> = { FEMALE: "en-gb-podcaster-10", MALE: "en-gb-assistant-2" };
const LIVE_MODELS_WITH_VOICE_LIBRARY = new Set(["gemini-3.8-live"]);

export function liveSpeechConfig(model: string, v: TutorVoiceChoice) {
  const library = v.accent === "GB" && LIVE_MODELS_WITH_VOICE_LIBRARY.has(model);
  const voiceName = library ? LIVE_GB[v.gender] : LIVE_US[v.gender];
  return { languageCode: speechLanguage(v.accent), voiceConfig: { prebuiltVoiceConfig: { voiceName } } };
}

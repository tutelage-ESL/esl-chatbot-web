import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { env } from "../../../config/env.ts";

// FREE + GOLD production TTS — Azure Neural TTS
// Voice: from voices.ts (the student's accent + gender); default en-US-JennyNeural
// Same AZURE_SPEECH_KEY as STT — no extra key or resource needed
// Free tier: 500k chars/month. Paid: $16/1M chars.
export async function azureTTS(text: string, voice = "en-US-JennyNeural"): Promise<Buffer> {
  if (!env.AZURE_SPEECH_KEY || !env.AZURE_SPEECH_REGION) {
    throw new Error("AZURE_SPEECH_KEY or AZURE_SPEECH_REGION not configured");
  }

  const speechConfig = sdk.SpeechConfig.fromSubscription(
    env.AZURE_SPEECH_KEY,
    env.AZURE_SPEECH_REGION,
  );
  speechConfig.speechSynthesisVoiceName = voice;
  speechConfig.speechSynthesisOutputFormat =
    sdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;

  // No audio config = audio returned in result.audioData (in-memory, not played to speakers)
  const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

  return new Promise((resolve, reject) => {
    synthesizer.speakTextAsync(
      text,
      (result) => {
        synthesizer.close();
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          resolve(Buffer.from(result.audioData));
        } else {
          reject(new Error(`Azure TTS failed: ${result.errorDetails ?? "Unknown error"}`));
        }
      },
      (error) => {
        synthesizer.close();
        reject(new Error(`Azure TTS error: ${String(error)}`));
      },
    );
  });
}

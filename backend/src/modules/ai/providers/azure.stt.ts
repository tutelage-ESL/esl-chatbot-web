import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { env } from "../../../config/env.ts";
import type { STTResult, PronunciationIssue } from "../ai.types.ts";

// GOLD + PREMIUM production STT — Azure Speech + Pronunciation Assessment
// Only commercial provider with phoneme-level pronunciation scoring (no extra API charge)
// GOLD: basic assessment (accuracy + fluency + completeness)
// PREMIUM: full assessment (+ prosody score)
// Supported audio formats: audio/webm (Chrome), audio/ogg (Firefox)
// ⚠️ audio/mp4 (Safari) is NOT supported by this Azure SDK version — route to Deepgram instead
// ⚠️ Linux deployment requires GStreamer for compressed audio decoding

function getAudioFormat(mimeType: string): sdk.AudioStreamFormat {
  const base = (mimeType.split(";")[0] ?? mimeType).trim();
  switch (base) {
    case "audio/webm":
      return sdk.AudioStreamFormat.getWaveFormat(16000, 16, 1, sdk.AudioFormatTag.WEBM_OPUS);
    case "audio/ogg":
      return sdk.AudioStreamFormat.getWaveFormat(16000, 16, 1, sdk.AudioFormatTag.OGG_OPUS);
    case "audio/mpeg":
      return sdk.AudioStreamFormat.getWaveFormat(16000, 16, 1, sdk.AudioFormatTag.MP3);
    default:
      // Fallback: try WebM/Opus (most common browser recording format)
      return sdk.AudioStreamFormat.getWaveFormat(16000, 16, 1, sdk.AudioFormatTag.WEBM_OPUS);
  }
}

export async function azureSTT(
  audioBuffer: Buffer,
  mimeType: string,
  plan: "GOLD" | "PREMIUM",
): Promise<STTResult> {
  if (!env.AZURE_SPEECH_KEY || !env.AZURE_SPEECH_REGION) {
    throw new Error("AZURE_SPEECH_KEY or AZURE_SPEECH_REGION not configured");
  }

  const speechConfig = sdk.SpeechConfig.fromSubscription(
    env.AZURE_SPEECH_KEY,
    env.AZURE_SPEECH_REGION,
  );
  speechConfig.speechRecognitionLanguage = "en-US";

  const pushStream = sdk.AudioInputStream.createPushStream(getAudioFormat(mimeType));
  // Copy Buffer into a clean ArrayBuffer (Azure SDK write() requires ArrayBuffer, not Buffer)
  const arrayBuffer = new ArrayBuffer(audioBuffer.length);
  new Uint8Array(arrayBuffer).set(audioBuffer);
  pushStream.write(arrayBuffer);
  pushStream.close();

  const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

  // Pronunciation assessment config
  // Empty reference text = freestyle (assesses whatever was said, no word-for-word comparison)
  const pronConfig = new sdk.PronunciationAssessmentConfig(
    "",
    sdk.PronunciationAssessmentGradingSystem.HundredMark,
    sdk.PronunciationAssessmentGranularity.Phoneme,
    true, // enableMiscue: detect insertions and omissions
  );
  if (plan === "PREMIUM") {
    pronConfig.enableProsodyAssessment = true;
  }
  pronConfig.applyTo(recognizer);

  return new Promise((resolve, reject) => {
    recognizer.recognizeOnceAsync(
      (result) => {
        recognizer.close();

        if (result.reason === sdk.ResultReason.RecognizedSpeech) {
          const pron = sdk.PronunciationAssessmentResult.fromResult(result);

          // Extract words with low accuracy as pronunciation issues
          type WordResult = { Word?: string; PronunciationAssessment?: { AccuracyScore?: number; ErrorType?: string } };
          const wordResults: WordResult[] =
            ((pron.detailResult as { Words?: unknown[] })?.Words ?? []) as WordResult[];

          const issues: PronunciationIssue[] = wordResults
            .filter((w) => (w.PronunciationAssessment?.AccuracyScore ?? 100) < 60)
            .map((w) => ({
              word: w.Word ?? "",
              issue: `${w.PronunciationAssessment?.ErrorType ?? "Low accuracy"}: ${(w.PronunciationAssessment?.AccuracyScore ?? 0).toFixed(0)}%`,
              suggestion: w.Word ?? "",
            }));

          resolve({
            transcript: result.text,
            confidence: 1,
            words: [],
            pronunciation: {
              accuracyScore: Math.round(pron.accuracyScore ?? 0),
              fluencyScore: Math.round(pron.fluencyScore ?? 0),
              completenessScore: Math.round(pron.completenessScore ?? 0),
              prosodyScore: plan === "PREMIUM" ? Math.round(pron.prosodyScore ?? 0) : null,
              overallScore: Math.round(pron.pronunciationScore ?? 0),
              issues,
            },
          });
        } else if (result.reason === sdk.ResultReason.NoMatch) {
          reject(new Error("Azure STT: No speech detected in audio"));
        } else {
          const cancellation = sdk.CancellationDetails.fromResult(result);
          reject(new Error(`Azure STT canceled: ${cancellation.errorDetails ?? "Unknown error"}`));
        }
      },
      (error) => {
        recognizer.close();
        reject(new Error(`Azure STT error: ${String(error)}`));
      },
    );
  });
}

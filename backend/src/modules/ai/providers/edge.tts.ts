import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

// TTS via Microsoft Edge Read Aloud API (no API key, no billing)
// Same Azure Neural voice profiles as production — dev experience matches real voice quality
// Primary in dev; in prod it is only the LAST-RESORT fallback when no paid TTS key
// (Azure/OpenAI) is configured — unofficial endpoint, no SLA, may break without notice
// The voice comes from voices.ts (the student's accent + gender).
export async function edgeTTS(text: string, voice = "en-US-JennyNeural"): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  const { audioStream } = tts.toStream(text);
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    audioStream.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    audioStream.on("close", () => resolve(Buffer.concat(chunks)));
    audioStream.on("error", reject);
  });
}

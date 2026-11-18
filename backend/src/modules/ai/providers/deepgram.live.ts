import { env } from "../../../config/env.ts";

// Live captions while the learner talks (UX only; the turn itself is transcribed in batch).
// Bun's own WebSocket, not the Deepgram SDK: the SDK's live client throws "Invalid
// binaryType: blob" under Bun, so captions never appeared.

export interface LiveTranscript {
  send(chunk: Buffer): void;
  close(): void;
}

export function openLiveTranscript(
  encoding: string,
  onText: (text: string, isFinal: boolean) => void,
): LiveTranscript | null {
  if (!env.DEEPGRAM_API_KEY) return null;
  const params = new URLSearchParams({
    model: "nova-3",
    language: "en",
    interim_results: "true",
    smart_format: "true",
    punctuate: "true",
    encoding,
    sample_rate: "48000",
  });
  // Containerised audio (webm/ogg/mp3) carries its own format; Deepgram rejects a forced one.
  if (encoding !== "linear16") { params.delete("encoding"); params.delete("sample_rate"); }

  const ws = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`, {
    headers: { Authorization: `Token ${env.DEEPGRAM_API_KEY}` },
  } as unknown as string[]);
  ws.binaryType = "arraybuffer";
  const pending: Buffer[] = [];

  ws.onopen = () => { for (const c of pending.splice(0)) ws.send(c); };
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(String(e.data));
      const text: string = msg?.channel?.alternatives?.[0]?.transcript ?? "";
      if (text) onText(text, !!msg.is_final);
    } catch { /* keep-alive or metadata */ }
  };
  ws.onerror = () => { /* non-fatal: captions stop, the recording is intact */ };

  return {
    send(chunk) {
      if (ws.readyState === WebSocket.OPEN) ws.send(chunk);
      else if (ws.readyState === WebSocket.CONNECTING) pending.push(chunk);
    },
    close() {
      try { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "CloseStream" })); } catch { /* closing */ }
      try { ws.close(); } catch { /* already closed */ }
    },
  };
}

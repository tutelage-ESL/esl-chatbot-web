import type { Namespace } from "socket.io";
import { z } from "zod/v4";
import { openLiveTranscript, type LiveTranscript } from "../modules/ai/providers/deepgram.live.ts";
import { sendVoiceMessage } from "../modules/messages/voice-messages.service.ts";
import { AppError } from "../utils/AppError.ts";
import { prisma } from "../config/database.ts";
import {
  FREE_MAX_MESSAGES_PER_SESSION,
  GOLD_MAX_MESSAGES_PER_SESSION,
  PREMIUM_MAX_MESSAGES_PER_SESSION,
  SOFT_LIMIT_BUFFER,
} from "../modules/sessions/sessions.service.ts";
import type { AuthSocket } from "./index.ts";
import type { Plan } from "@prisma/client";

interface VoiceState {
  // Live captions — null when the key is absent or the format is unsupported
  conn: LiveTranscript | null;
  chunks: Buffer[];   // full recording buffer — sent to sendVoiceMessage on voice:end
  mimeType: string;
}

const voiceSessions = new WeakMap<AuthSocket, Map<string, VoiceState>>();

const voiceStartSchema = z.object({
  sessionId: z.string().uuid(),
  mimeType:  z.string().min(1).max(100),
});

const voiceChunkSchema = z.object({
  sessionId: z.string().uuid(),
  data:      z.string().min(1), // base64-encoded audio chunk
});

const voiceEndSchema = z.object({
  sessionId: z.string().uuid(),
});

// Maps browser MIME type to Deepgram live encoding parameter.
// Returns null for formats unsupported for live streaming (e.g. audio/mp4 from Safari).
function mimeToEncoding(mimeType: string): string | null {
  const base = (mimeType.split(";")[0] ?? "").trim();
  if (base === "audio/webm") return "webm-opus";
  if (base === "audio/ogg")  return "ogg-opus";
  if (base === "audio/mpeg") return "mp3";
  return null;
}

function getVoiceMap(socket: AuthSocket): Map<string, VoiceState> {
  if (!voiceSessions.has(socket)) voiceSessions.set(socket, new Map());
  return voiceSessions.get(socket)!;
}

function softLimitWarning(
  count: number,
  plan: Plan,
): { remaining: number; softLimit: number } | null {
  const limit =
    plan === "PREMIUM" ? PREMIUM_MAX_MESSAGES_PER_SESSION
    : plan === "GOLD"  ? GOLD_MAX_MESSAGES_PER_SESSION
    : FREE_MAX_MESSAGES_PER_SESSION;
  if (count >= limit) {
    return { remaining: Math.max(0, limit + SOFT_LIMIT_BUFFER - count), softLimit: limit };
  }
  return null;
}

function closeConn(conn: LiveTranscript): void {
  conn.close();
}

export function initVoiceHandlers(namespace: Namespace): void {
  namespace.on("connection", (socket: AuthSocket) => {
    const userId = socket.data.user.id;
    const map    = getVoiceMap(socket);

    // ── voice:start ───────────────────────────────────────────
    // Client signals start of recording. Opens a Deepgram live connection for
    // partial transcript UX. The actual STT that drives the AI pipeline runs
    // inside sendVoiceMessage (batch mode) after voice:end — this keeps the
    // authoritative transcript isolated from the live preview.
    socket.on("voice:start", async (data: unknown) => {
      const parsed = voiceStartSchema.safeParse(data);
      if (!parsed.success) {
        socket.emit("voice:error", { code: "VALIDATION_ERROR", message: "Invalid voice:start payload" });
        return;
      }
      const { sessionId, mimeType } = parsed.data;

      // Buffer before any await: the browser's first chunk (~250ms in) carries the WebM
      // header, and losing it to a slow lookup made the whole recording undecodable.
      const prev = map.get(sessionId);
      if (prev?.conn) closeConn(prev.conn);
      const state: VoiceState = { conn: null, chunks: [], mimeType };
      map.set(sessionId, state);
      const drop = () => { if (map.get(sessionId) === state) map.delete(sessionId); };

      const session = await prisma.conversationSession.findUnique({
        where:  { id: sessionId },
        select: { userId: true, endedAt: true, deletedAt: true },
      });
      if (!session || session.userId !== userId || session.deletedAt) {
        drop();
        socket.emit("voice:error", { sessionId, code: "SESSION_NOT_FOUND", message: "Session not found" });
        return;
      }
      if (session.endedAt) {
        drop();
        socket.emit("voice:error", { sessionId, code: "SESSION_ENDED", message: "Session has ended" });
        return;
      }

      // Live captions (UX only). Without a key or for an unsupported format, recording
      // still works; the learner just doesn't see their words appear.
      const encoding = mimeToEncoding(mimeType);
      if (encoding) {
        // Deepgram sends each finished sentence once; keep them so the caption grows.
        let finished = "";
        state.conn = openLiveTranscript(encoding, (text, isFinal) => {
          const shown = `${finished} ${text}`.trim();
          if (isFinal) finished = shown;
          socket.emit("voice:partial_transcript", { sessionId, text: shown, isFinal });
        });
        for (const chunk of state.chunks) state.conn?.send(chunk); // what arrived during the lookup
      }

      socket.emit("voice:started", { sessionId });
    });

    // ── voice:chunk ───────────────────────────────────────────
    // Receives a base64-encoded audio chunk. Buffers it for batch processing
    // and forwards to Deepgram live connection once the WebSocket is ready.
    socket.on("voice:chunk", (data: unknown) => {
      const parsed = voiceChunkSchema.safeParse(data);
      if (!parsed.success) return;
      const { sessionId, data: b64 } = parsed.data;

      const state = map.get(sessionId);
      if (!state) return;

      const chunk = Buffer.from(b64, "base64");
      state.chunks.push(chunk);

      // Chunks sent before the handshake completes are queued inside the live connection
      state.conn?.send(chunk);
    });

    // ── voice:end ─────────────────────────────────────────────
    // Client signals end of recording. Closes the live preview connection,
    // assembles the full buffer, then runs the complete voice pipeline via
    // sendVoiceMessage (STT → LLM → TTS → DB) and emits results.
    socket.on("voice:end", async (data: unknown) => {
      const parsed = voiceEndSchema.safeParse(data);
      if (!parsed.success) {
        socket.emit("voice:error", { code: "VALIDATION_ERROR", message: "Invalid voice:end payload" });
        return;
      }
      const { sessionId } = parsed.data;

      const state = map.get(sessionId);
      if (!state) {
        socket.emit("voice:error", { sessionId, code: "NO_AUDIO", message: "No audio data received" });
        return;
      }
      if (state.chunks.length === 0) {
        if (state.conn) closeConn(state.conn);
        map.delete(sessionId);
        socket.emit("voice:error", { sessionId, code: "NO_AUDIO", message: "No audio data received" });
        return;
      }
      map.delete(sessionId);

      // Close Deepgram live — partial transcripts no longer needed
      if (state.conn) closeConn(state.conn);

      const audioBuffer = Buffer.concat(state.chunks);
      const clientMsgId = `voice-${Date.now().toString(36)}`;

      try {
        const result = await sendVoiceMessage(userId, sessionId, audioBuffer, state.mimeType);
        // The audio goes out once, in voice:tts below, not also inside message:response.
        const { audioBase64, ...saved } = result;

        const [subscription, userMessageCount] = await Promise.all([
          prisma.subscription.findUnique({ where: { userId }, select: { plan: true } }),
          prisma.message.count({ where: { sessionId, role: "USER" } }),
        ]);
        const plan = (subscription?.plan ?? "FREE") as Plan;

        // Emit the authoritative transcript — from batch STT inside sendVoiceMessage
        socket.emit("voice:transcript", {
          sessionId,
          clientMsgId,
          transcript:        result.userMessage.content,
          pronunciationScore: result.evaluation.pronunciationScore,
        });

        socket.emit("message:response", {
          sessionId,
          clientMsgId,
          ...saved,
          softLimitWarning: softLimitWarning(userMessageCount, plan),
        });

        if (audioBase64) {
          socket.emit("voice:tts", {
            sessionId,
            clientMsgId,
            audioBase64,
            mimeType:    "audio/mpeg",
          });
        }
      } catch (err) {
        // Log the real error so we can see what's actually failing
        console.error("[VoiceSocket] voice:end pipeline error:", err);

        let code    = "INTERNAL_ERROR";
        let message = "Failed to process voice message";

        if (err instanceof AppError) {
          message = err.message;
          if      (err.statusCode === 404) code = "SESSION_NOT_FOUND";
          else if (err.statusCode === 409) code = "SESSION_ENDED";
          else if (err.statusCode === 422) code = "NO_SPEECH";
          else if (err.statusCode === 429) code = "LIMIT_REACHED";
          else if (err.statusCode === 503) code = "STT_UNAVAILABLE";
        } else if (err instanceof Error) {
          message = err.message;
        }

        socket.emit("voice:error", { sessionId, clientMsgId, code, message });
      }
    });

    // ── disconnect cleanup ────────────────────────────────────
    socket.on("disconnect", () => {
      for (const state of map.values()) {
        if (state.conn) closeConn(state.conn);
      }
    });
  });
}

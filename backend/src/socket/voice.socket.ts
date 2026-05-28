import type { Namespace } from "socket.io";
import { z } from "zod/v4";
import { DeepgramClient } from "@deepgram/sdk";
import { env } from "../config/env.ts";
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
  // V1Socket from Deepgram SDK — null when key absent, unsupported mime, or after close
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conn: any | null;
  connReady: boolean; // true once the Deepgram WebSocket handshake completes
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

function closeConn(conn: any): void {
  try { conn.sendCloseStream({}); } catch { /* ignore */ }
  try { conn.close(); }            catch { /* ignore */ }
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

      const session = await prisma.conversationSession.findUnique({
        where:  { id: sessionId },
        select: { userId: true, endedAt: true },
      });
      if (!session || session.userId !== userId) {
        socket.emit("voice:error", { sessionId, code: "SESSION_NOT_FOUND", message: "Session not found" });
        return;
      }
      if (session.endedAt) {
        socket.emit("voice:error", { sessionId, code: "SESSION_ENDED", message: "Session has ended" });
        return;
      }

      // Tear down any stale recording for this session before starting fresh
      const prev = map.get(sessionId);
      if (prev?.conn) closeConn(prev.conn);

      const state: VoiceState = { conn: null, connReady: false, chunks: [], mimeType };
      map.set(sessionId, state);

      // Open Deepgram live connection for partial transcript display (UX only).
      // If the key is absent or the format is unsupported, recording still works —
      // partial transcripts just won't appear.
      const encoding = mimeToEncoding(mimeType);
      if (env.DEEPGRAM_API_KEY && encoding) {
        try {
          const client = new DeepgramClient({ apiKey: env.DEEPGRAM_API_KEY });
          // connect() is async — it opens the WebSocket to Deepgram
          const conn = await client.listen.v1.connect({
            model:           "nova-3" as any,
            language:        "en"    as any,
            interim_results: "true"  as any, // fires partial results on every word group
            smart_format:    "true"  as any,
            punctuate:       "true"  as any,
            encoding:        encoding as any,
            sample_rate:     48000   as any,
            Authorization:   "",
          });

          conn.on("open", () => {
            state.connReady = true;
            // Flush any chunks that arrived before the WebSocket handshake completed
            for (const chunk of state.chunks) {
              try { conn.sendMedia(chunk); } catch { /* non-fatal */ }
            }
          });

          conn.on("message", (result: any) => {
            const text: string = result?.channel?.alternatives?.[0]?.transcript ?? "";
            if (!text) return;
            socket.emit("voice:partial_transcript", {
              sessionId,
              text,
              isFinal: !!result.is_final,
            });
          });

          conn.on("error", (err: unknown) => {
            // Non-fatal: live preview stops but the recording buffer is intact
            console.error("[VoiceSocket] Deepgram live error:", err);
            state.conn = null;
          });

          state.conn = conn;
        } catch (err) {
          // Failed to open live connection — continue without partial transcripts
          console.error("[VoiceSocket] Failed to open Deepgram live connection:", err);
        }
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

      // Only forward after handshake — pre-handshake chunks are flushed in the open handler
      if (state.conn && state.connReady) {
        try { state.conn.sendMedia(chunk); } catch { /* non-fatal */ }
      }
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
          ...result,
          softLimitWarning: softLimitWarning(userMessageCount, plan),
        });

        if (result.audioBase64) {
          socket.emit("voice:tts", {
            sessionId,
            clientMsgId,
            audioBase64: result.audioBase64,
            mimeType:    "audio/mpeg",
          });
        }
      } catch (err) {
        let code    = "INTERNAL_ERROR";
        let message = "Failed to process voice message";

        if (err instanceof AppError) {
          message = err.message;
          if      (err.statusCode === 404) code = "SESSION_NOT_FOUND";
          else if (err.statusCode === 409) code = "SESSION_ENDED";
          else if (err.statusCode === 422) code = "NO_SPEECH";
          else if (err.statusCode === 429) code = "LIMIT_REACHED";
          else if (err.statusCode === 503) code = "STT_UNAVAILABLE";
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

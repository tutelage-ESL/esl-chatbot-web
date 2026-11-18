import { EndSensitivity, GoogleGenAI, Modality } from "@google/genai";
import type { Plan } from "@prisma/client";
import { env } from "../../config/env.ts";
import { prisma } from "../../config/database.ts";
import { AppError } from "../../utils/AppError.ts";
import { cleanAiTitle, sanitizeAiReply } from "../../utils/aiReplyFormat.ts";
import { buildLiveInstruction } from "../ai/providers/prompt.ts";
import { generateAIResponse } from "../ai/ai.service.ts";
import { azureSTT } from "../ai/providers/azure.stt.ts";
import { uploadToR2 } from "../../lib/r2-upload.ts";
import { recordPracticeInBackground } from "../metrics/practice.service.ts";
import {
  createSession,
  FREE_MAX_MESSAGES_PER_DAY,
  FREE_MAX_MESSAGES_PER_SESSION,
  GOLD_MAX_MESSAGES_PER_SESSION,
  PREMIUM_MAX_MESSAGES_PER_SESSION,
  SOFT_LIMIT_BUFFER,
  FREE_LLM_CONTEXT_MESSAGES,
} from "../sessions/sessions.service.ts";
import { getSessionUsage } from "../sessions/sessions.usage.service.ts";
import type { LiveCallStart, LiveTurnSaved } from "./live.types.ts";

// The Voice Lab is a real-time call: the browser streams audio straight to Gemini Live
// (speech to speech, ~0.5s to the first word) with a one-use token minted here. The
// token locks the model and the tutor's instructions, so the browser never sees our key
// and can't change how the tutor behaves. After every exchange the browser posts the two
// transcripts back (saveLiveTurn): that is where plan limits, history and scores live.
//
// shortcut: limits are enforced per saved turn and by the token's 30-minute life, not on
// the audio itself (Google carries it); a client that never saves turns gets one call of
// at most 30 minutes per daily session. Proxy the audio through us if that is ever abused.

// Measured 2026-11: flash-live answers in ~0.5s, 3.8-live in ~0.8s with the better voice.
const LIVE_MODEL: Record<Plan, string> = {
  FREE: "gemini-3.1-flash-live-preview",
  GOLD: "gemini-3.1-flash-live-preview",
  PREMIUM: "gemini-3.8-live",
};
const CALL_MAX_MS = 30 * 60_000;
const CONNECT_WITHIN_MS = 60_000;

const PER_SESSION: Record<Plan, number> = {
  FREE: FREE_MAX_MESSAGES_PER_SESSION,
  GOLD: GOLD_MAX_MESSAGES_PER_SESSION,
  PREMIUM: PREMIUM_MAX_MESSAGES_PER_SESSION,
};

export async function startLiveCall(userId: string): Promise<LiveCallStart> {
  if (!env.GEMINI_API_KEY) throw new AppError("Live calls are not configured.", 503);

  // Same answer the page already showed; checked again so a token is never minted for nothing.
  const usage = await getSessionUsage(userId);
  if (!usage.canStart) {
    throw usage.reason === "INACTIVE"
      ? new AppError("Active subscription required to start a conversation", 403)
      : new AppError("You've reached today's limit. Please come back tomorrow or upgrade.", 429);
  }

  const [user, learner] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } }),
    prisma.learnerProfile.findUnique({
      where: { userId },
      select: { currentLevel: true, targetLevel: true, learningPurpose: true, aiPersonality: true, uiLanguage: true },
    }),
  ]);

  const model = LIVE_MODEL[usage.plan];
  const now = Date.now();
  const expiresAt = new Date(now + CALL_MAX_MS).toISOString();
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY, apiVersion: "v1alpha" });
  const token = await ai.authTokens.create({
    config: {
      uses: 1,
      expireTime: expiresAt,
      newSessionExpireTime: new Date(now + CONNECT_WITHIN_MS).toISOString(),
      liveConnectConstraints: {
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: buildLiveInstruction(learner, user?.displayName.split(" ")[0] ?? null),
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          // Calls past the 15-minute audio context limit keep going on a sliding window.
          contextWindowCompression: { slidingWindow: {} },
          // Beginners pause mid-sentence: wait a little longer before the tutor answers.
          realtimeInputConfig: {
            automaticActivityDetection: { endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_LOW, silenceDurationMs: 900 },
          },
        },
      },
    },
  });
  if (!token.name) throw new AppError("Could not start the call. Please try again.", 503);

  const session = await createSession(userId, "VOICE", "Voice Lab call");
  return { sessionId: session.id, token: token.name, model, expiresAt };
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// A WAV header around the raw PCM, so the recording plays back in AI Chat.
function pcmToWav(pcm: Buffer, rate = 16000): Buffer {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

export async function saveLiveTurn(
  userId: string,
  sessionId: string,
  user: string,
  tutor: string,
  audioBase64?: string,
): Promise<LiveTurnSaved> {
  const session = await prisma.conversationSession.findUnique({
    where: { id: sessionId },
    select: { userId: true, endedAt: true, deletedAt: true, title: true },
  });
  if (!session || session.userId !== userId || session.deletedAt) throw new AppError("Session not found", 404);
  if (session.endedAt) throw new AppError("Cannot send messages to an ended session", 409);

  const subscription = await prisma.subscription.findUnique({ where: { userId }, select: { plan: true } });
  const plan = (subscription?.plan ?? "FREE") as Plan;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [inSession, today] = await Promise.all([
    prisma.message.count({ where: { sessionId, role: "USER" } }),
    plan === "FREE" ? prisma.message.count({ where: { userId, role: "USER", createdAt: { gte: todayStart } } }) : 0,
  ]);
  if (inSession >= PER_SESSION[plan] + SOFT_LIMIT_BUFFER) {
    throw new AppError("This call has reached its message limit. Start a new call to keep going.", 429);
  }
  if (plan === "FREE" && today >= FREE_MAX_MESSAGES_PER_DAY) {
    throw new AppError(`Daily message limit reached (${FREE_MAX_MESSAGES_PER_DAY}). Upgrade to GOLD for more messages.`, 429);
  }

  // Scores from the text evaluator in spoken mode (it ignores transcription slips).
  // shortcut: it also writes a reply we throw away; a scores-only prompt would be cheaper.
  const [learner, history] = await Promise.all([
    prisma.learnerProfile.findUnique({
      where: { userId },
      select: { currentLevel: true, targetLevel: true, learningPurpose: true, aiPersonality: true, uiLanguage: true },
    }),
    prisma.message.findMany({
      where: { sessionId }, select: { role: true, content: true }, orderBy: { createdAt: "desc" }, take: FREE_LLM_CONTEXT_MESSAGES,
    }),
  ]);
  // Scores, the recording upload and (Gold+) Azure pronunciation run side by side.
  const userMsgId = crypto.randomUUID();
  const pcm = audioBase64 ? Buffer.from(audioBase64, "base64") : null;
  const [scored, audioUrl, pron] = await Promise.all([
    generateAIResponse(user, history.reverse(), learner, plan, { spoken: true }).catch((err) => {
      console.warn("[live] scoring skipped:", err instanceof Error ? err.message : err);
      return null;
    }),
    pcm ? uploadToR2(`audio/recordings/${sessionId}/${userMsgId}.wav`, pcmToWav(pcm), "audio/wav").catch(() => null) : null,
    pcm && plan !== "FREE" && env.AZURE_SPEECH_KEY
      ? azureSTT(pcm, "audio/pcm", plan as "GOLD" | "PREMIUM").then((r) => r.pronunciation ?? null).catch(() => null)
      : null,
  ]);
  const ev = scored?.evaluation ?? null;
  const wordCount = user.split(/\s+/).filter(Boolean).length;

  await prisma.$transaction(async (tx) => {
    const userMsg = await tx.message.create({
      data: {
        id: userMsgId, userId, sessionId, role: "USER", type: "VOICE", content: user, wordCount,
        audioUrl, audioDurationSec: pcm ? Math.round(pcm.length / 32000) : null,
      },
      select: { id: true },
    });
    if (ev) {
      await tx.messageEvaluation.create({
        data: {
          messageId: userMsg.id,
          grammarScore: ev.grammarScore,
          grammarErrors: ev.grammarErrors as unknown as object[],
          vocabularyScore: ev.vocabularyScore,
          vocabularyLevel: ev.vocabularyLevel,
          fluencyScore: ev.fluencyScore,
          overallScore: ev.overallScore,
          detectedCefrLevel: ev.detectedCefrLevel,
          corrections: ev.corrections as unknown as object[],
          feedback: ev.feedback,
          pronunciationScore: pron?.overallScore ?? null,
          pronunciationIssues: pron?.issues.length ? (pron.issues as unknown as object[]) : undefined,
        },
      });
    }
    if (tutor) {
      await tx.message.create({
        data: {
          userId, sessionId, role: "ASSISTANT", type: "VOICE",
          content: sanitizeAiReply(`<p>${escapeHtml(tutor)}</p>`),
          wordCount: tutor.split(/\s+/).filter(Boolean).length,
        },
      });
    }
    const total = await tx.message.count({ where: { sessionId } });
    const title = session.title ? null : cleanAiTitle(scored?.title);
    await tx.conversationSession.update({ where: { id: sessionId }, data: { messageCount: total, ...(title ? { title } : {}) } });
  });

  recordPracticeInBackground(userId, sessionId, wordCount);

  return {
    pronunciation: pron,
    evaluation: ev && {
      grammarScore: ev.grammarScore,
      vocabularyScore: ev.vocabularyScore,
      fluencyScore: ev.fluencyScore,
      overallScore: ev.overallScore,
      detectedCefrLevel: ev.detectedCefrLevel,
      vocabularyLevel: ev.vocabularyLevel,
      feedback: ev.feedback,
    },
    remainingMessages: plan === "FREE" ? Math.max(0, FREE_MAX_MESSAGES_PER_DAY - today - 1) : null,
  };
}

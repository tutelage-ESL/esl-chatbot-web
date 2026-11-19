import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { env } from "../../config/env.ts";
import { AppError } from "../../utils/AppError.ts";

// Teachers type only the words; the AI writes each card's meaning, example and part of
// speech for them to check before assigning. Learners can't write definitions themselves,
// and writing 20 by hand is slow for a teacher.

export interface EnrichedWord {
  word: string;
  definition: string;
  example: string;
  partOfSpeech: string;
}

const PARTS = new Set(["noun", "verb", "adjective", "adverb", "phrase", "preposition", "pronoun", "conjunction", "other"]);

const PROMPT = `You write vocabulary cards for English learners whose first language is Kurdish (Sorani), mostly at A1 to B1 level.
For every word or phrase you are given, write:
- "definition": one short sentence in very simple English (common A2 words) with the meaning a learner most likely needs. Do not use the word itself in it.
- "example": one short, natural, everyday sentence (at most 12 words) that uses the word.
- "partOfSpeech": one of noun, verb, adjective, adverb, phrase, preposition, pronoun, conjunction, other.
Keep "word" exactly as given. Answer in the same order as the input.
Return only JSON: {"words":[{"word":"...","definition":"...","example":"...","partOfSpeech":"..."}]}`;

export async function enrichWords(words: string[]): Promise<EnrichedWord[]> {
  if (!env.GEMINI_API_KEY) throw new AppError("The AI helper is not configured.", 503);
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

  let raw: string | undefined;
  try {
    const res = await ai.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: [{ role: "user", parts: [{ text: JSON.stringify(words) }] }],
      config: {
        systemInstruction: PROMPT,
        responseMimeType: "application/json",
        temperature: 0.4,
        maxOutputTokens: 4000,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        abortSignal: AbortSignal.timeout(30_000),
      },
    });
    raw = res.text;
  } catch {
    throw new AppError("The AI helper is busy right now. Please try again, or write the meanings yourself.", 503);
  }

  let parsed: { words?: Partial<EnrichedWord>[] } = {};
  try { parsed = JSON.parse(raw ?? "{}"); } catch { /* fall through to blanks */ }
  const byWord = new Map((parsed.words ?? []).map((w) => [String(w.word ?? "").toLowerCase().trim(), w]));

  // Match by word (then by position), and leave blanks for the teacher when the AI skipped one.
  return words.map((word, i) => {
    const w = byWord.get(word.toLowerCase().trim()) ?? parsed.words?.[i] ?? {};
    const pos = String(w.partOfSpeech ?? "").toLowerCase().trim();
    return {
      word,
      definition: String(w.definition ?? "").trim().slice(0, 500),
      example: String(w.example ?? "").trim().slice(0, 500),
      partOfSpeech: PARTS.has(pos) ? pos : "",
    };
  });
}

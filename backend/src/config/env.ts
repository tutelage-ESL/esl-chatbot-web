import { z } from "zod/v4";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(8000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  DATABASE_URL: z.string(),

  REDIS_URL: z.string().default("redis://localhost:6379"),

  JWT_ACCESS_SECRET: z.string(),
  JWT_ACCESS_EXPIRES: z.string().default("15m"),
  JWT_REFRESH_SECRET: z.string(),
  JWT_REFRESH_EXPIRES: z.string().default("7d"),

  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().optional(),

  // Resend — optional; email features return 503 if not set
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // Google OAuth — optional; Google login routes return 503 if not set
  GOOGLE_CLIENT_ID: z.string().optional(),

  // AI Providers — optional; AI features return 503 if not set
  OPENAI_API_KEY: z.string().optional(),   // PREMIUM tier LLM (GPT-5 mini) + TTS (TTS-1-HD)
  GEMINI_API_KEY: z.string().optional(),   // Dev + FREE + GOLD tier LLM (Gemini)
  AZURE_SPEECH_KEY: z.string().optional(), // FREE + GOLD TTS (Neural) + GOLD + PREMIUM STT + Pronunciation
  AZURE_SPEECH_REGION: z.string().optional(),
  DEEPGRAM_API_KEY: z.string().optional(), // Dev + FREE STT (Nova-3, $200 signup credit)

  CORS_ORIGIN: z.string().default("http://localhost:3000"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

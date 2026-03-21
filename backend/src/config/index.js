'use strict';

/**
 * Central application configuration.
 * All env vars are read HERE — consumers import this object, not process.env.
 */
const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3001,

  // ─── Frontend ──────────────────────────────────────────────────────────────
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3020',

  // ─── Session ──────────────────────────────────────────────────────────────
  sessionSecret: process.env.SESSION_SECRET,

  // ─── JWT ──────────────────────────────────────────────────────────────────
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
  },

  // ─── AI providers ─────────────────────────────────────────────────────────
  geminiApiKey: process.env.GEMINI_API_KEY,
  huggingfaceToken: process.env.HUGGINGFACE_API_TOKEN,
  groqApiKey: process.env.GROQ_API_KEY,
  groqModel: process.env.GROQ_MODEL || 'mixtral-8x7b-32768',
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
  openrouterModel: process.env.OPENROUTER_MODEL || 'qwen/qwen-2.5-7b-instruct',
  ollamaUrl: process.env.OLLAMA_URL,
  ollamaModel: process.env.OLLAMA_MODEL || 'llama3.1:8b-instruct',
  hfFallbackModel: process.env.HF_FALLBACK_MODEL || 'HuggingFaceH4/zephyr-7b-beta',

  // ─── ElevenLabs TTS ───────────────────────────────────────────────────────
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY,

  // ─── Free TTS ─────────────────────────────────────────────────────────────
  freeTts: {
    url: process.env.FREE_TTS_URL,
    provider: process.env.FREE_TTS_PROVIDER || 'google',
    voice: process.env.FREE_TTS_VOICE || 'en_US-amy-medium',
    lang: process.env.FREE_TTS_LANG || 'en',
    format: process.env.FREE_TTS_FORMAT || 'mp3',
  },

  // ─── Special modes ────────────────────────────────────────────────────────
  publicEventMode: process.env.PUBLIC_EVENT_MODE === 'true',
  defaultEventUser: process.env.DEFAULT_EVENT_USER || 'TUTELAGE',
};

module.exports = config;

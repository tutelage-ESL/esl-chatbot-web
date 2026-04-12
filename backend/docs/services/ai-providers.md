# AI Providers — ESL Chatbot

> Last updated: 2026-04-10

## Overview

The chatbot needs four AI capabilities:

| Capability | What it does |
|------------|-------------|
| **LLM (Text)** | Conversational tutoring, grammar/vocabulary evaluation, CEFR-aware feedback |
| **STT (Speech-to-Text)** | Transcribe learner speech, handle non-native accents |
| **TTS (Text-to-Speech)** | Natural English speech for the tutor bot |
| **Pronunciation Assessment** | Phoneme-level accuracy, fluency, prosody, accent analysis |

---

## Provider Comparison

### LLM (Text Conversation & Evaluation)

| Provider | Model | Input / Output (per 1M tokens) | ESL Quality | Notes |
|----------|-------|-------------------------------|-------------|-------|
| OpenAI | GPT-4o | ~$2.50 / $10 | Excellent | Strong at structured JSON evaluation, CEFR-aware |
| OpenAI | GPT-4.1 | ~$2.00 / $8 | Excellent | Optimized for instruction-following |
| OpenAI | GPT-4o-mini | ~$0.15 / $0.60 | Good | Best cost-efficiency for dev/free tier |
| Anthropic | Claude Sonnet 4 | ~$3.00 / $15 | Excellent | Nuanced grammar explanation, pedagogical tone |
| Anthropic | Claude Haiku 4.5 | ~$0.80 / $4 | Good | Budget option with strong instruction-following |
| Google | Gemini 2.0 Flash | ~$0.10 / $0.40 | Decent | Cheapest option, native multimodal |
| Google | Gemini 2.5 Pro | ~$1.25 / $10 | Strong | Competitive with GPT-4o |

### STT (Speech-to-Text)

| Provider | Model | Price | Accent Handling | Pronunciation Scoring |
|----------|-------|-------|-----------------|----------------------|
| OpenAI | Whisper API | ~$0.006/min | Good | No |
| Deepgram | Nova-2/Nova-3 | ~$0.0043/min | Excellent | No |
| Google | Cloud Speech v2 | ~$0.016/min | Good | No |
| **Azure** | **Speech Services** | **~$0.016/min** | **Good** | **Yes — Pronunciation Assessment API** |

> **Azure Speech Services is the only major provider with a dedicated Pronunciation Assessment API.**
> It returns per-phoneme accuracy, fluency, completeness, and prosody scores — essential for accent analysis.

### TTS (Text-to-Speech)

| Provider | Price (per 1M chars) | Quality | Notes |
|----------|---------------------|---------|-------|
| OpenAI | ~$15 | Good | 6 voices, simple integration |
| ElevenLabs | ~$30 (varies) | Best-in-class | Voice cloning, 30+ languages |
| Google | ~$16 (WaveNet) / $4 (Standard) | Good | WaveNet approaches ElevenLabs quality |
| Azure | ~$16 (Neural) | Good | Many voices/languages |

### Real-Time Voice Conversation

| Approach | How it works | Cost | Latency |
|----------|-------------|------|---------|
| OpenAI Realtime API | Native speech-to-speech via WebSocket | ~$5/hr in + $20/hr out | ~300-500ms |
| Chained Pipeline | STT -> LLM -> TTS sequentially | Sum of individual (much cheaper) | ~1-2s total |

---

## Recommended Setup

### Development / Free Tier — Single Provider (OpenAI)

```
Text:  GPT-4o-mini      ($0.15 / $0.60 per 1M tokens)
STT:   Whisper API       ($0.006/min)
TTS:   OpenAI TTS        ($15 / 1M chars)
Voice: Chained pipeline  (Whisper -> GPT-4o-mini -> TTS)
```

**Why:** Single API key, simplest integration, cheapest viable quality. Good enough for development and free-tier users.

### Production / Premium Tier — Multi-Provider (Best Quality)

```
Text:           GPT-4o or GPT-4.1      (best evaluation quality)
STT:            Azure Speech Services   (pronunciation assessment)
TTS:            ElevenLabs or OpenAI    (natural voice)
Voice (live):   OpenAI Realtime API     (lowest latency)
Pronunciation:  Azure Pronunciation Assessment API
```

**Why:** Azure is irreplaceable for accent/pronunciation analysis. GPT-4o gives the best structured evaluation output. ElevenLabs has the most natural voices.

---

## Architecture Recommendation

Abstract the AI layer behind provider-agnostic interfaces so providers can be swapped without touching controllers:

```
src/modules/ai/
├── ai.types.ts           # LLMProvider, STTProvider, TTSProvider interfaces
├── providers/
│   ├── openai.llm.ts     # OpenAI GPT implementation
│   ├── openai.stt.ts     # Whisper implementation
│   ├── openai.tts.ts     # OpenAI TTS implementation
│   ├── azure.stt.ts      # Azure Speech (with pronunciation)
│   └── elevenlabs.tts.ts # ElevenLabs TTS implementation
└── ai.service.ts         # Orchestrates providers based on config/plan
```

### Subscription-Gated Features

| Feature | FREE | PREMIUM |
|---------|------|---------|
| Text LLM | GPT-4o-mini | GPT-4o / GPT-4.1 |
| STT | Whisper (transcription only) | Azure (transcription + pronunciation) |
| TTS | OpenAI TTS | ElevenLabs |
| Voice chat | Chained pipeline (higher latency) | Realtime API (low latency) |
| Pronunciation scoring | Not available | Full phoneme-level analysis |

---

## Cost Estimates (per user per month)

Assumptions: 30 text sessions (20 messages each), 10 voice sessions (5 min each)

| Tier | LLM | STT | TTS | Total |
|------|-----|-----|-----|-------|
| Free (GPT-4o-mini) | ~$0.05 | ~$0.30 | ~$0.15 | **~$0.50/user/month** |
| Premium (GPT-4o + Azure + ElevenLabs) | ~$1.50 | ~$1.60 | ~$0.50 | **~$3.60/user/month** |

These are rough estimates. Actual costs depend on message length and session frequency.

---

## Implementation Phases

1. **Phase 4 (now):** Text chat with GPT-4o-mini (OpenAI only). Build the evaluation pipeline.
2. **Phase 4.5:** Add TTS for bot responses (OpenAI TTS). Student reads, bot can also speak.
3. **Phase 5:** Add STT with Whisper for voice input. Student speaks, bot responds in text+voice.
4. **Phase 5.5:** Add Azure Pronunciation Assessment for premium users.
5. **Phase 6:** Add OpenAI Realtime API for live voice conversations (premium).

# AI Providers — Overview

> Detailed decisions moved to `docs/ai-providers/`

## Confirmed Stack (April 2026)

| Capability | Dev | FREE prod | GOLD prod | PREMIUM prod |
|-----------|-----|-----------|-----------|--------------|
| **LLM** | Gemini 3 Flash ⚠️ preview | Gemini 2.5 Flash-Lite | Gemini 2.5 Flash | GPT-5 mini |
| **STT** | Deepgram Nova-3 ($200 credit) | Deepgram Nova-3 | Azure Speech | Azure Speech |
| **TTS** | Edge TTS (npm, no key) | Azure Neural TTS | Azure Neural TTS | Azure Neural TTS* |
| **Pronunciation** | Azure F0 (5 hrs/month free) | None | Azure (basic) | Azure (full + prosody) |

> *PREMIUM TTS: upgrade to OpenAI TTS HD later if voice quality becomes a business priority  
> ⚠️ Dev LLM uses Gemini 3 Flash preview — free tier, better quality than 2.5 Flash. Gemini 3.x not used in production until GA.

## API Keys Required (Production)

| Key | Used for |
|-----|---------|
| `GEMINI_API_KEY` | LLM — Dev (Gemini 3 Flash, free) + FREE + GOLD |
| `OPENAI_API_KEY` | LLM — PREMIUM (GPT-5 mini) |
| `DEEPGRAM_API_KEY` | STT — Dev + FREE ($200 free credit) |
| `AZURE_SPEECH_KEY` | STT + TTS + Pronunciation — GOLD + PREMIUM |
| `AZURE_SPEECH_REGION` | Azure config (e.g. `eastus`) |

## Detailed Docs

| File | Contents |
|------|---------|
| [`docs/ai-providers/llm.md`](../ai-providers/llm.md) | LLM model comparison, cost tables, decision rationale, Gemini + Anthropic setup guides |
| [`docs/ai-providers/stt.md`](../ai-providers/stt.md) | STT provider comparison, Deepgram + Azure setup guides, fallback plan |
| [`docs/ai-providers/tts.md`](../ai-providers/tts.md) | TTS provider comparison, Edge TTS + Azure Neural TTS setup guide, upgrade path |
| [`docs/ai-providers/business-costs.md`](../ai-providers/business-costs.md) | Cost per tier, profit margins, break-even, scale scenarios |

## Implementation Phases

| Phase | Capability | Status |
|-------|-----------|--------|
| 4 | Text LLM — migrate from OpenAI placeholder to Gemini + Claude | 🔄 Code ready, needs API keys |
| 4.5 | TTS for AI tutor voice replies | ⏳ Not started |
| 5 | STT for student voice input | ⏳ Not started |
| 5.5 | Azure Pronunciation Assessment | ⏳ Not started |
| 6 | OpenAI Realtime API — PREMIUM live voice | ⏳ Not started |

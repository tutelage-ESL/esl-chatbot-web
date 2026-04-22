# AI Providers — Overview

> Detailed decisions moved to `docs/ai-providers/`

## Confirmed Stack (April 2026)

| Capability | Dev | FREE prod | GOLD prod | PREMIUM prod |
|-----------|-----|-----------|-----------|--------------|
| **LLM** | `gemini-flash-latest` → gemini-3-flash-preview | Gemini 2.5 Flash-Lite | Gemini 2.5 Flash | GPT-5 mini |
| **STT** | Deepgram Nova-3 ($200 credit) | Deepgram Nova-3 | Azure Speech | Azure Speech |
| **TTS** | Edge TTS (npm, no key) | Azure Neural TTS | Azure Neural TTS | OpenAI TTS-1-HD† |
| **Pronunciation** | Azure F0 (5 hrs/month free) | None | Azure (basic) | Azure (full + prosody) |

> Dev LLM uses the `gemini-flash-latest` alias (resolves to `gemini-3-flash-preview`) — the direct model ID `gemini-3-flash` returns 404; the alias is confirmed working. Gemini 3.x not used in production until GA.  
> †PREMIUM TTS uses OpenAI TTS-1-HD: noticeably more natural speech vs Azure, differentiates the $24.99 tier from GOLD. `OPENAI_API_KEY` already in stack for GPT-5 mini — zero new keys.  
> 🔭 Future (all prod TTS): Gemini 3.1 Flash TTS — launched April 15 2026, ranked #2 quality globally, same `GEMINI_API_KEY`. Migrate when GA.

## API Keys Required (Production)

| Key | Used for |
|-----|---------|
| `GEMINI_API_KEY` | LLM — Dev (`gemini-flash-latest`, free) + FREE + GOLD |
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
| 4 | Text LLM — Gemini (Dev/FREE/GOLD) + GPT-5 mini (PREMIUM) + auto-fallback | ✅ Done — add `GEMINI_API_KEY` to Infisical to activate |
| 4.5 | TTS for AI tutor voice replies | ⏳ Not started |
| 5 | STT for student voice input | ⏳ Not started |
| 5.5 | Azure Pronunciation Assessment | ⏳ Not started |
| 6 | OpenAI Realtime API — PREMIUM live voice | ⏳ Not started |

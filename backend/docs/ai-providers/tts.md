# TTS Provider — Decision & Reference

> Decided: 2026-04-17 (Re-researched & updated: 2026-04-18)
> Status: **Confirmed** — Edge TTS (Dev) · Azure Neural TTS (FREE + GOLD) · OpenAI TTS-1-HD (PREMIUM)
> Implementation: Phase 4.5+ (not needed for text-only Phase 4)
> Future path: Gemini 3.1 Flash TTS (watch for GA — same key as LLM, top-2 quality)
> **SDK versions:** `msedge-tts@2.x` · `microsoft-cognitiveservices-speech-sdk@1.50.x` · `openai@6.x`

---

## What TTS does in this project

When the AI tutor replies in a voice session, its text response is converted to audio and played back to the student. The student hears a natural English voice — this is a core part of the learning experience, especially for ESL learners who benefit from hearing correct pronunciation modeled clearly.

A typical AI reply: ~80 words = ~400 characters of audio (~40 seconds of speech).

TTS is **only triggered in voice sessions**, not text sessions. A user on a text-only session pays zero TTS cost. This keeps costs predictable and proportional to actual usage.

---

## All Options Considered

| # | Provider | Model | Free tier | Price/1M chars | Quality | Stream | Key needed |
|---|----------|-------|-----------|----------------|---------|--------|-----------|
| A | **Edge TTS** (npm, unofficial) | Neural | ✅ Unlimited | $0 | ⭐⭐⭐⭐ | ✅ | None |
| B | **Azure Neural TTS** | Neural | ✅ 500k chars/month | $16 | ⭐⭐⭐⭐ | ✅ | ✅ Have (STT key) |
| C | Azure Neural HD v2 | Neural HD | ✅ (shared 500k) | $30 | ⭐⭐⭐⭐½ | ✅ | ✅ Have (STT key) |
| D | Google WaveNet | WaveNet | ✅ 1M chars/month | $16 | ⭐⭐⭐⭐ | ✅ | New Google Cloud key |
| E | Google Chirp 3 HD | Chirp 3 HD | ✅ 1M chars/month | $30 | ⭐⭐⭐⭐⭐ | ✅ | New Google Cloud key |
| F | **Gemini 3.1 Flash TTS** ⚠️ Preview | Gemini TTS | ✅ Free access | ~$0.008/reply† | ⭐⭐⭐⭐⭐ | ✅ | ✅ Have (`GEMINI_API_KEY`) |
| G | **OpenAI TTS-1** | tts-1 | ❌ None | $15 | ⭐⭐⭐⭐ | ✅ | ✅ Have (`OPENAI_API_KEY`) |
| H | **OpenAI TTS-1-HD** | tts-1-hd | ❌ None | $30 | ⭐⭐⭐⭐½ | ✅ | ✅ Have (`OPENAI_API_KEY`) |
| I | OpenAI gpt-4o-mini-tts | mini-tts | ❌ None | ~$0.015/min | ⭐⭐⭐⭐ | ✅ | ✅ Have (`OPENAI_API_KEY`) |
| J | Groq Orpheus | orpheus-tts | ✅ 100 req/day | $22 | ⭐⭐⭐⭐⭐ (4.6 MOS) | ✅ | New Groq key |
| K | Amazon Polly | Neural | ✅ 1M chars/12 months | $16 | ⭐⭐⭐⭐ | ✅ | New AWS key |
| L | Cartesia Sonic 3 | Sonic-3 | ✅ 10k chars/month | $46.70 | ⭐⭐⭐⭐⭐ (40ms) | ✅ | New Cartesia key |
| M | ElevenLabs Flash | Flash | Very limited | $60 | ⭐⭐⭐⭐⭐ | ✅ | New ElevenLabs key |
| N | ElevenLabs v3 | Multilingual v3 | Very limited | $120 | ⭐⭐⭐⭐⭐ Best | ✅ | New ElevenLabs key |

> †Gemini 3.1 Flash TTS is token-based ($1/1M input + $20/1M audio output). At 400 chars/reply (≈100 input tokens + ≈400 audio output tokens): ~$0.008/reply.

**2026 Quality Leaderboard (Artificial Analysis ELO):**
1. Inworld TTS-1.5-Max — ELO 1,236
2. **Gemini 3.1 Flash TTS — ELO 1,211** ← new, launched April 15 2026, preview
3. ElevenLabs v3
4. OpenAI TTS-1
5. Cartesia Sonic 3

---

## Cost Per Voice-Active User Per Month

Assumptions: AI reply ≈ 400 chars. Voice-active = uses voice sessions.

| User type | Chars/month | Azure Neural ($16/1M) | OpenAI TTS-1-HD ($30/1M) |
|-----------|------------|----------------------|--------------------------|
| FREE voice (5 sessions × 15 msgs) | ~30,000 | **$0** (within free tier) | $0.90 |
| GOLD voice (10 sessions × 25 msgs) | ~100,000 | **$1.60** | $3.00 |
| PREMIUM voice (15 sessions × 35 msgs) | ~210,000 | **$3.36** | **$6.30** |

> Azure 500k free tier: covers ~16 FREE voice-active users per month at $0 cost.

---

## Final Decision

| Environment | Provider | Reason |
|-------------|----------|--------|
| **Development** | Edge TTS (msedge-tts npm) | Zero cost, zero API key, zero configuration. Uses Microsoft Edge's TTS endpoint via the `msedge-tts` npm package. Same Azure Neural voice profiles as production — developer experience matches real voice quality. No SLA, dev-only. |
| **FREE production** | Azure Neural TTS | 500k chars/month free — covers all FREE voice users until meaningful scale. Same `AZURE_SPEECH_KEY` already set for STT. No new key, no new SDK, no new service. |
| **GOLD production** | Azure Neural TTS | Same key and SDK as STT + pronunciation assessment — one package, one key covers all GOLD audio needs. $1.60/user/month for voice-active users on $9.99 revenue. Quality matches the $9.99 tier expectation. |
| **PREMIUM production** | **OpenAI TTS-1-HD** | PREMIUM users pay $24.99/month and deserve a noticeably better voice experience than GOLD. TTS-1-HD delivers significantly more natural, expressive English speech. The `OPENAI_API_KEY` is already in the stack for GPT-5 mini (LLM) — zero new keys, zero new infrastructure. |

**New keys needed: 0** — both `AZURE_SPEECH_KEY` (FREE + GOLD) and `OPENAI_API_KEY` (PREMIUM) are already required by LLM and STT decisions.

---

## Business Case: Why PREMIUM Gets OpenAI TTS-1-HD

**The differentiation problem:** If both GOLD ($9.99) and PREMIUM ($24.99) use Azure Neural TTS, the student voice experience is identical between tiers. A PREMIUM user has no audio-quality reason to stay on the higher tier.

**The solution:** OpenAI TTS-1-HD produces noticeably more natural, human-like English speech — this is a tangible, audible PREMIUM feature. It directly supports the "best ESL experience" positioning of the top tier.

**The cost impact is acceptable:**
- PREMIUM voice user TTS cost: $3.36 → $6.30/month (+$2.94)
- PREMIUM text+voice margin: ~63% → ~52% (still healthy for a SaaS product)
- The extra $2.94/month in TTS cost is recouped if even a small number of users stay on PREMIUM longer because of better voice quality

**The key insight:** `OPENAI_API_KEY` is already a required secret for GPT-5 mini (the PREMIUM LLM). Adding OpenAI TTS-1-HD costs zero additional infrastructure or secrets — it's the same API client and same key, a one-line model change in `openai.tts.ts`.

---

## ⚠️ Heavy Voice User Risk (PREMIUM)

For PREMIUM users who are heavy on both messages AND voice sessions:

| Scenario | LLM | STT | TTS | Total | Revenue | Margin |
|----------|-----|-----|-----|-------|---------|--------|
| Text only (typical) | $1.42 | — | — | **$1.42** | $24.99 | **~94%** ✅ |
| Text + voice (typical) | $1.42 | $4.38 | $6.30 | **$12.10** | $24.99 | **~52%** ✅ |
| Text + voice (heavy) | $3.55 | $8.77 | $12.60 | **$24.92** | $24.99 | **~0%** ❌ |

> Heavy = 3,000 msgs/month LLM + 525 min STT + 420k chars TTS (2× typical voice usage).

**Mitigation (already planned):** Implement PREMIUM voice session daily cap (e.g., 10 voice sessions/day). This prevents the heavy-user tail without affecting typical users. If a heavy user hits caps frequently, it signals they should be on a business/enterprise plan at a higher price point.

The risk profile is the same as before the TTS upgrade — it's the STT cost ($8.77) that dominates in the heavy scenario, not TTS. Voice caps protect margins regardless of the TTS provider choice.

---

## Why NOT the Others

| Provider | Reason eliminated |
|----------|------------------|
| **ElevenLabs v3** | $25.20/PREMIUM voice user/month — nearly the entire $24.99 revenue. Business-killing. |
| **ElevenLabs Flash** | $12.60/user/month — still too expensive, eats 50%+ of revenue before LLM or STT costs. |
| **Cartesia Sonic 3** | $46.70/1M — optimised for real-time voice agents (40ms latency), not ESL tutoring replies. 10k/month free tier is too small for testing. |
| **Groq Orpheus** | Excellent quality (4.6 MOS) and $22/1M, but needs a new API key and is too new for production trust. No meaningful advantage over OpenAI TTS-1-HD that justifies the added key. |
| **Google Chirp 3 HD** | Same $30/1M as OpenAI TTS-1-HD but requires a new Google Cloud service account — a completely separate key setup from the Gemini API key. No reason to add the complexity when `OPENAI_API_KEY` already exists. |
| **Google WaveNet** | Same $16/1M as Azure but needs a new Google Cloud key. Azure key already exists — no benefit. |
| **Amazon Polly** | Free tier expires after 12 months. Then same $16/1M as Azure with a new AWS key and SDK. No benefit over Azure. |
| **OpenAI gpt-4o-mini-tts** | Reviewed as "slightly robotic" — worse than TTS-1 for naturalness. ESL learners need clear, natural English modelling. |
| **Azure Neural HD v2** | $30/1M using the Azure key — viable alternative to OpenAI TTS-1-HD for PREMIUM. However, OpenAI TTS-1-HD was rated higher in blind tests (ELO 1,192 vs Azure HD ~1,050). Same price, better quality from a provider already in the stack. |

---

## ⭐ Future Path: Gemini 3.1 Flash TTS (Watch Closely)

This is the most significant TTS development in 2026. Google launched Gemini 3.1 Flash TTS on **April 15, 2026** and it immediately ranked **#2 on the Artificial Analysis quality leaderboard** (ELO 1,211 — ahead of ElevenLabs v3). It supports 70+ languages and 200+ audio expression tags.

**Why it matters for this project:**
- Uses the **same `GEMINI_API_KEY`** already in the stack for LLM (Dev + FREE + GOLD)
- Quality exceeds Azure Neural TTS and rivals ElevenLabs
- Cost (~$0.008/reply) is comparable to Azure ($0.0064/reply)
- Could replace ALL production TTS tiers with a single provider + single key
- 200+ audio tags enable expressive tutor delivery (warm, encouraging tone on cue)

**Why not now:** It launched 3 days ago as a preview model. The same decision logic that kept Gemini 3.x LLMs out of production applies here — not stable enough yet.

**When to switch (all production tiers → Gemini TTS):**
- Gemini 3.1 Flash TTS reaches GA (stable, non-preview)
- At least 60 days of stable production track record reported in developer forums
- Action: create `gemini.tts.ts`, route all prod TTS through it, retire `azure.tts.ts` and `openai.tts.ts`
- Keys retired: `AZURE_SPEECH_KEY` stays (still needed for STT + pronunciation). `OPENAI_API_KEY` stays (still needed for GPT-5 mini LLM).
- **Net result: entire TTS stack consolidates to one provider, one key, top-2 quality.**

---

## Azure Neural TTS — Recommended Voices (FREE + GOLD)

Azure has 400+ voices. Best for an ESL tutor:

| Voice ID | Style | Best for |
|----------|-------|---------|
| `en-US-JennyNeural` | Conversational, warm | **Default** — friendly and clear for general ESL |
| `en-US-AriaNeural` | Natural, expressive | More dynamic responses, intermediate/advanced students |
| `en-GB-SoniaNeural` | British English | UK English learners |
| `en-AU-NatashaNeural` | Australian English | Australian accent learners |

Students can pick preferred accent in LearnerProfile settings (`aiPersonality` field — extendable to `preferredVoice`).

---

## OpenAI TTS-1-HD — Recommended Voices (PREMIUM)

OpenAI TTS-1-HD has 13 voices. Best for an ESL tutor:

| Voice | Style | Best for |
|-------|-------|---------|
| `nova` | Warm, friendly | **Default** — encouraging tone, good for beginners |
| `alloy` | Neutral, professional | Balanced tutor voice — clear and trustworthy |
| `shimmer` | Soft, gentle | Patient delivery — ideal for anxious learners |

Speed is set to `0.95` (slightly slower than default 1.0) — measurably better ESL comprehension without sounding unnatural.

---

## API Setup Guide

### 1. Edge TTS — Development (No API Key)

**No setup required.** The `msedge-tts` npm package is already installed (`bun add msedge-tts`). It uses Microsoft Edge's Read Aloud API endpoint without any authentication.

```bash
# Already installed — nothing to do
# bun add msedge-tts  ← done
```

> ⚠️ Dev-only. This is an unofficial endpoint with no commercial SLA. It works reliably in server-side Node.js/Bun environments but cannot be used in production (no rate limit guarantees, can be blocked).

**Testing:** Just run `bun dev` and send a voice message — you will hear the AI reply without any API keys set.

---

### 2. Azure Neural TTS — FREE + GOLD Production

**No new resource needed.** Azure TTS uses the **same `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`** you set up for STT (see `stt.md` for the full Azure setup guide).

```
AZURE_SPEECH_KEY     ← already set when you followed the STT setup guide
AZURE_SPEECH_REGION  ← already set when you followed the STT setup guide
```

That's it — no additional configuration.

**How to verify TTS works:** Start the dev server in production mode (`NODE_ENV=production`) with the Azure key set. Send a voice message as a FREE or GOLD user — the response should include a non-null `audioBase64`.

**Free tier:** F0 includes **500,000 characters/month** shared between TTS and STT (STT uses audio duration, not characters — so TTS is the primary free-tier consumer). At ~400 chars/AI reply, the free tier covers ~1,250 AI voice replies/month — plenty for dev and early-stage FREE users.

---

### 3. OpenAI TTS-1-HD — PREMIUM Production

**No new key needed.** OpenAI TTS uses the **same `OPENAI_API_KEY`** you set up for the PREMIUM LLM (GPT-5 mini).

```
OPENAI_API_KEY  ← already set for GPT-5 mini (PREMIUM LLM)
```

That's it — no additional configuration. The key gives access to both the LLM (Chat Completions) and TTS (Audio Speech) APIs.

**How to verify TTS works:** Log in as a PREMIUM user and send a voice message — the response `audioBase64` field will be an MP3 encoded as base64 with a noticeably more natural voice than Azure.

**If OpenAI TTS fails:** The system automatically falls back to Azure TTS for PREMIUM users (see `ai.service.ts: generateTTS`). The AI reply text is always returned — only the audio is affected. This means even if `OPENAI_API_KEY` is not set or has billing issues, PREMIUM voice sessions still work (with Azure-quality audio instead).

**No free tier.** Pay-as-you-go at $30/1M chars from the first character. Billing is tied to the same OpenAI account as GPT-5 mini — check usage at [platform.openai.com/usage](https://platform.openai.com/usage).

---

## Phase 4.5 Implementation Reference

Provider files created in this session:

```
src/modules/ai/providers/
├── edge.tts.ts       ← dev only — msedge-tts npm, no key
├── azure.tts.ts      ← FREE + GOLD — Azure Neural, AZURE_SPEECH_KEY
├── openai.tts.ts     ← PREMIUM — TTS-1-HD, OPENAI_API_KEY
└── gemini.tts.ts     ← future — Gemini 3.1 Flash TTS (create when GA)
```

`ai.service.ts` provider routing (`generateTTS`):
```ts
if (dev)      → edgeTTS(text)          // msedge-tts, no key
if (PREMIUM)  → openaiTTS(text)         // TTS-1-HD, auto-fallback to Azure
else          → azureTTS(text)          // Neural TTS (FREE + GOLD)
```

TTS audio is returned as base64 MP3 in the `audioBase64` field of the voice message response. In Session 2, TTS audio will also be uploaded to R2 and stored as `Message.audioUrl`.

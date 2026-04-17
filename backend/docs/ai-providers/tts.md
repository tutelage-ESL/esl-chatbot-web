# TTS Provider — Decision & Reference

> Decided: 2026-04-17  
> Status: **Confirmed** — Edge TTS (Dev) · Azure Neural TTS (FREE + GOLD + PREMIUM)  
> Implementation: Phase 4.5+ (not needed for text-only Phase 4)  
> Future upgrade: OpenAI TTS HD for PREMIUM if voice quality becomes a differentiator

---

## What TTS does in this project

When the AI tutor replies in a voice session, its text response is converted to audio and played back to the student. The student hears a natural English voice — this is a core part of the learning experience.

A typical AI reply: ~80 words = ~400 characters of audio.

TTS is **only triggered in voice sessions**, not text sessions. A user on a text-only session pays zero TTS cost.

---

## All Options Considered

| # | Provider | Free tier | Paid price | Quality | Key needed |
|---|----------|-----------|-----------|---------|-----------|
| A | **Microsoft Edge TTS** (unofficial) | ✅ Fully free, forever | Free | ⭐⭐⭐⭐ Very Good | None — npm package |
| B | **Google Cloud WaveNet** | ✅ 1M chars/month recurring | $16/1M chars | ⭐⭐⭐⭐ Very Good | New Google Cloud key |
| C | **Azure Neural TTS** | ✅ 500k chars/month recurring | $16/1M chars | ⭐⭐⭐⭐ Very Good | ✅ Already have (from STT) |
| D | OpenAI TTS Standard (tts-1) | ❌ None | $15/1M chars | ⭐⭐⭐⭐ Good | New OpenAI key |
| E | OpenAI TTS HD (tts-1-hd) | ❌ None | $30/1M chars | ⭐⭐⭐⭐⭐ Excellent | New OpenAI key |
| F | ElevenLabs Creator | ❌ $11/mo flat | 100k chars then overage | ⭐⭐⭐⭐⭐ Best-in-class | New ElevenLabs key |

---

## Cost Per Voice-Active User Per Month

Assumptions: AI reply ≈ 400 chars. Voice-active user = one who uses voice sessions.

| User type | Chars/month | Azure Neural ($16/1M) | OpenAI HD ($30/1M) |
|-----------|------------|----------------------|-------------------|
| FREE voice user (5 sessions × 15 msgs) | ~30,000 | **$0.48** (or $0 in free tier) | $0.90 |
| GOLD voice user (10 sessions × 25 msgs) | ~100,000 | **$1.60** | $3.00 |
| PREMIUM voice user (15 sessions × 35 msgs) | ~210,000 | **$3.36** | $6.30 |

> Azure free tier: 500k chars/month platform-wide. Covers ~16 FREE voice users per month at $0.
> After that: $16/1M chars (pay-as-you-go, no minimum).

---

## Final Decision

| Environment | Provider | Reason |
|-------------|----------|--------|
| **Development** | Microsoft Edge TTS | Zero cost, zero API key, zero setup. Uses the `edge-tts` npm package. Same Azure Neural voices as production — dev experience matches prod quality. |
| **FREE production** | Azure Neural TTS | 500k chars/month free. Same Azure key already present for STT. No new key, no new service, no new cost until significant scale. |
| **GOLD production** | Azure Neural TTS | Same key as STT and FREE tier. $1.60/user/month for voice-active users on $9.99 revenue. |
| **PREMIUM production** | Azure Neural TTS (upgrade to OpenAI TTS HD later) | Same key, simpler infrastructure. Quality is very good. If voice quality becomes a competitive selling point for PREMIUM, swap to OpenAI TTS HD — one provider file change. |

**New keys needed: 0** — Azure key already exists from STT decision.

---

## Why NOT the others

| Provider | Reason not selected |
|----------|-------------------|
| Google WaveNet | Higher free tier (1M chars vs Azure's 500k), but requires a new Google Cloud project + key. Azure key already exists — no reason to add complexity. |
| OpenAI TTS Standard | No free tier. Azure is same price ($15 vs $16) with a free tier and existing key. |
| OpenAI TTS HD | Genuinely better quality. Deferred — add `OPENAI_API_KEY` later if business decides voice quality is a premium differentiator. |
| ElevenLabs | Best voice quality in the industry but flat-fee pricing is unpredictable at scale. 100k chars/month = only 250 AI replies. A moderate PREMIUM user exhausts it in days. |

---

## Future Upgrade Path: OpenAI TTS HD for PREMIUM

If the business decides best-in-class voice quality should be a PREMIUM differentiator:

1. Add `OPENAI_API_KEY` to Infisical (prod environment)
2. Create `src/modules/ai/providers/openai.tts.ts`
3. In `ai.service.ts`, route PREMIUM TTS calls to OpenAI TTS HD, keep Azure for FREE + GOLD
4. No controller or service changes needed

Cost impact: PREMIUM voice-active user goes from $3.36 → $6.30/month TTS cost.
Margin impact: still ~75% gross margin on typical PREMIUM user.

---

## Azure Neural TTS — Voice Options

Azure has 400+ voices. Recommended English voices for an ESL tutor:

| Voice | Style | Best for |
|-------|-------|---------|
| `en-US-JennyNeural` | Conversational, warm | Default tutor voice — friendly and clear |
| `en-US-AriaNeural` | Natural, expressive | More dynamic responses |
| `en-GB-SoniaNeural` | British English | UK English learners |
| `en-AU-NatashaNeural` | Australian English | AU English learners |

You can let students pick their preferred accent/voice in LearnerProfile settings (already has `aiPersonality` field — can extend to `preferredVoice`).

---

## API Setup Guide

### 1. Microsoft Edge TTS — Development (No API Key)

Install the npm package:
```bash
bun add edge-tts
```

Usage in Node/Bun:
```ts
import { EdgeTTS } from "edge-tts";

const tts = new EdgeTTS();
const audio = await tts.synthesize("Hello, great sentence structure!", {
  voice: "en-US-JennyNeural",
  rate: "+0%",
  volume: "+0%",
});
// audio is a Buffer — send as audio/mpeg response
```

**No API key, no rate limits, no billing.** Uses Microsoft Edge's TTS endpoint.
⚠️ Dev only — no commercial SLA, endpoint could change without notice.

---

### 2. Azure Neural TTS — Production (FREE + GOLD + PREMIUM)

> Uses the same Azure Speech resource you already created for STT.  
> **No new resource, no new key required.**

The same `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` from your STT setup cover TTS.

**Verify your existing resource supports TTS:**
1. Go to [portal.azure.com](https://portal.azure.com)
2. Open your `esl-chatbot-speech` resource
3. Confirm pricing tier is `F0` (dev) or `S0` (production) — both include TTS
4. TTS is automatically available — no extra configuration

**Free tier included:**
- F0: 500,000 standard neural characters/month
- S0: Same free 500,000 chars/month, then $16/1M chars pay-as-you-go

**Infisical keys (already set):**
```
AZURE_SPEECH_KEY     ← same key used for STT
AZURE_SPEECH_REGION  ← same region used for STT
```

**SDK usage (Azure Speech SDK for Node.js):**
```bash
bun add microsoft-cognitiveservices-speech-sdk
```

```ts
import * as sdk from "microsoft-cognitiveservices-speech-sdk";

const speechConfig = sdk.SpeechConfig.fromSubscription(
  env.AZURE_SPEECH_KEY,
  env.AZURE_SPEECH_REGION,
);
speechConfig.speechSynthesisVoiceName = "en-US-JennyNeural";

const synthesizer = new sdk.SpeechSynthesizer(speechConfig);
synthesizer.speakTextAsync(
  "Great sentence! Your grammar was excellent.",
  (result) => {
    // result.audioData is a Buffer — send as audio/mpeg
    synthesizer.close();
  },
);
```

**To upgrade to OpenAI TTS HD later:**
```
OPENAI_API_KEY=sk-...   ← add to Infisical prod only when ready
```
No other config changes needed — provider selection is handled in `ai.service.ts`.

---

## Notes for Phase 4.5 Implementation

When implementing TTS (Phase 4.5), create:

```
src/modules/ai/providers/
├── edge.tts.ts      ← dev only, uses edge-tts npm
├── azure.tts.ts     ← prod (FREE + GOLD + PREMIUM)
└── openai.tts.ts    ← future PREMIUM upgrade
```

`ai.service.ts` selects provider:
- `NODE_ENV === development` → Edge TTS
- `NODE_ENV === production` → Azure Neural TTS (or OpenAI HD for PREMIUM if configured)

TTS audio returned as `audio/mpeg` buffer — frontend plays it directly.

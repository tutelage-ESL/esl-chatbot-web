# AI Provider Monitoring & Maintenance Guide

> **Where to check:** This file is your single reference for all AI provider health, cost alerts, upgrade timing, and fallback behavior.

---

## Quick Reference — Provider Dashboards

| Provider | What to watch | Dashboard URL |
|----------|--------------|---------------|
| Deepgram | Credit balance (expires 1 year from signup) | console.deepgram.com → Usage → Balance |
| Azure Speech | Monthly audio minutes consumed | portal.azure.com → your Speech resource → Metrics |
| Google Gemini | API quota and error rates | console.cloud.google.com → APIs → Gemini API |
| OpenAI | Monthly spend (PREMIUM tier) | platform.openai.com → Usage |

---

## Deepgram (STT — Dev + FREE tier)

### What to monitor
- **Credit balance** — you have $200 on signup. Go to `console.deepgram.com` → left sidebar → **Usage** → **Balance** tab.
- **Credit expiry** — the $200 credit expires exactly **1 year from your signup date**. Calendar this immediately.

### Alerts to set up
1. `console.deepgram.com` → **Settings** → **Alerts** → create an alert at **$180 remaining**.  
   This gives you $20 of runway to switch providers before the credit runs out.

### When to act
| Situation | Action |
|-----------|--------|
| Balance drops below $20 | Switch FREE tier to Groq Whisper Turbo — one-line change in `src/modules/ai/providers/deepgram.stt.ts` (see fallback plan below) |
| Credit expiry approaching (< 30 days) | Same — switch to Groq or renew with a new Deepgram account |
| SDK update available (`@deepgram/sdk`) | Update quarterly; check changelog for breaking changes to `transcribeFile()` response shape |

### Fallback plan (after credit runs out)
Switch to **Groq Whisper Turbo** — $0.00067/min (6× cheaper than Deepgram paid). Change is isolated to `deepgram.stt.ts`; no controller or service changes needed. Tradeoff: batch-only (no real-time streaming), but accuracy is equivalent.

### What breaks if Deepgram goes down
- **Dev** and **FREE** voice messages return HTTP 503.
- **GOLD/PREMIUM** voice messages are unaffected (they use Azure).
- Text messages for all tiers are completely unaffected.

---

## Azure Speech (STT + TTS — GOLD + PREMIUM)

### What to monitor
- **Monthly audio minutes** — go to `portal.azure.com` → your Speech resource → left menu → **Metrics** → select `Total audio seconds processed`.
- **F0 free tier limit** — 5 audio hours (300 min) per month shared between STT and TTS. Sufficient for dev; switch to S0 before any paying users.

### Alerts to set up
1. In Azure Portal → your Speech resource → **Alerts** → **+ Create alert rule**:
   - Metric: `Total audio seconds processed`
   - Condition: greater than `14,400` seconds (= 4 hours — 80% of the F0 limit)
   - Action: email notification

2. For S0 (production): set a budget alert in **Cost Management** → **Budgets** at your monthly threshold.

### When to act
| Situation | Action |
|-----------|--------|
| Approaching F0 5-hour limit | Upgrade to S0 (you cannot upgrade in-place — create a new resource, update `AZURE_SPEECH_KEY` in Infisical) |
| SDK update available (`microsoft-cognitiveservices-speech-sdk`) | Update quarterly; check changelog specifically for `PronunciationAssessmentConfig` API changes |
| Neural voice model deprecated | Microsoft announces deprecations 6 months in advance; voice name is a one-line constant in `src/modules/ai/providers/azure.tts.ts` |

### Upgrading F0 → S0 (before production)
Azure does **not** allow in-place upgrade from F0 to S0.
1. Create a new Speech resource with **Standard S0** pricing tier (same region, e.g. `uaenorth`)
2. Copy the new **KEY 1** to Infisical: update `AZURE_SPEECH_KEY` in the `prod` environment
3. `AZURE_SPEECH_REGION` stays the same — no change needed
4. Delete the old F0 resource (Azure charges $0 for idle F0, but clean up anyway)

### What breaks if Azure goes down
- **GOLD/PREMIUM STT**: falls back to Deepgram automatically (no pronunciation scores, but voice messages still work — transcript + AI reply still returned).
- **GOLD/PREMIUM TTS**: `generateTTS()` returns empty Buffer — AI text reply still shows in the response, just no audio playback.
- **Text messages** for all tiers are completely unaffected.
- **Dev** is unaffected (uses Edge TTS + Deepgram).

---

## Google Gemini (LLM — FREE + GOLD + Dev)

### What to monitor
- `console.cloud.google.com` → **APIs & Services** → **Gemini API** → **Metrics** tab.
- Watch: requests per minute (RPM), tokens per minute (TPM), error rate (4xx/5xx).

### When to act
| Situation | Action |
|-----------|--------|
| Hitting free-tier rate limits | Add `GEMINI_API_KEY` billing; or throttle requests per user |
| Model name deprecated | Update the model constant in `src/modules/ai/providers/gemini.llm.ts` |
| Better model available | One-line change to the model constant; test in dev first |

### What breaks if Gemini goes down
- FREE and GOLD LLM responses fail → sessions return 500.
- PREMIUM falls back to Gemini if OpenAI also fails → same.
- Voice messages (STT/TTS) are unaffected — they run before/after the LLM step and are independent.

---

## OpenAI (LLM + TTS — PREMIUM tier only)

### What to monitor
- `platform.openai.com` → **Usage** — monthly cost, per-model breakdown.
- Set a **Spend Limit** at `platform.openai.com` → **Settings** → **Limits** → hard limit + soft alert.

### When to act
| Situation | Action |
|-----------|--------|
| Unexpected spend spike | Check for runaway PREMIUM user sessions; add per-user rate limiting |
| Model deprecated | Update model constant in `src/modules/ai/providers/openai.llm.ts` and `openai.tts.ts` |
| API outage | Auto-fallback to Gemini is already wired in `ai.service.ts` — no manual action needed |

### What breaks if OpenAI goes down
Nothing visible to users — `generateAIResponse()` automatically retries with Gemini 2.5 Flash. TTS falls back to Azure Neural TTS. The fallback is logged at `[AI] OpenAI failed, falling back to Gemini`.

---

## SDK Version Policy

All three SDKs should be updated **quarterly** (not on every patch release). Before updating:
1. Check the changelog for breaking API changes.
2. Run `bun run typecheck` after updating.
3. Test a voice message end-to-end in dev before deploying.

| Package | Current version | Where breaking changes appear |
|---------|----------------|-------------------------------|
| `@deepgram/sdk` | 5.x | `transcribeFile()` response shape |
| `microsoft-cognitiveservices-speech-sdk` | 1.50.x | `PronunciationAssessmentConfig`, `AudioFormatTag` enum |
| `@google/genai` | latest | model name format, `generateContent()` options |
| `openai` | latest | `audio.speech.create()` params, model names |

---

## If a Provider Goes Completely Down (Incident Checklist)

1. **Check the provider's status page** before assuming it's your code:
   - Deepgram: `status.deepgram.com`
   - Azure: `status.azure.com`
   - Google: `status.cloud.google.com`
   - OpenAI: `status.openai.com`

2. **Check your own logs** — error messages are prefixed:
   - `[TTS]` — TTS failure (non-fatal, audio just won't play)
   - `[AI]` — LLM failure (fatal for that request)
   - Azure errors surface as: `Azure STT canceled: ...` or `Azure TTS failed: ...`

3. **Fallbacks already in place** (no code change needed):
   - OpenAI LLM down → Gemini takes over automatically
   - OpenAI TTS down → Azure TTS takes over automatically
   - Azure STT down → Deepgram takes over automatically (no pronunciation scores)

4. **Fallbacks that require a one-line code change:**
   - Deepgram down → swap to Groq in `deepgram.stt.ts`
   - Azure TTS down + OpenAI TTS down → Edge TTS is dev-only; for production, add a Groq/ElevenLabs TTS key
   - Gemini down → add OpenAI key, flip FREE/GOLD to use `callOpenAILLM()` in `ai.service.ts`

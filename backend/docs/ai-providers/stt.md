# STT Provider — Decision & Reference

> Decided: 2026-04-17 (Reconfirmed: 2026-04-17 — no changes after full re-research)  
> Status: **Confirmed** — Deepgram Nova-3 (Dev + FREE) · Azure Speech (GOLD + PREMIUM)  
> Implementation: Phase 5+ (not needed for text-only Phase 4)

---

## What STT does in this project

When a student records a voice message:
1. Audio is sent to the STT provider
2. Transcribed text is returned
3. Text flows into the same LLM pipeline as text messages (evaluation + AI reply)

For GOLD and PREMIUM, the same Azure STT call also returns **pronunciation scores** — no extra charge, same API call.

---

## All Options Considered

| # | Provider | Free tier | Paid price/min | Streaming | Accent handling | Notes |
|---|----------|-----------|---------------|-----------|----------------|-------|
| A | **Deepgram Nova-3** | ✅ $200 signup credit (~46,500 min batch) | $0.0043/min batch · $0.0077/min streaming | ✅ Real-time | Very Good | Best free credit value; 5.26% WER; 45+ languages |
| B | Groq Whisper Turbo | ✅ Shared org quota (ongoing) | $0.00067/min | ❌ Batch only | Excellent (Whisper) | 6× cheaper than Deepgram; no streaming |
| C | OpenAI Whisper | ❌ None | $0.006/min | ❌ Batch only | Excellent | Legacy; superseded by gpt-4o-transcribe |
| D | OpenAI gpt-4o-mini-transcribe | ❌ None | $0.003/min | ✅ | Excellent | Better accuracy than Whisper; streaming capable |
| E | OpenAI gpt-4o-transcribe | ❌ None | $0.006/min | ✅ | Excellent | Highest OpenAI accuracy; same price as Whisper |
| F | **Azure Speech STT** | ✅ 5 hrs/month | $0.0167/min | ✅ Real-time | Good | Only provider with Pronunciation Assessment (32+ languages as of 2026) |
| G | AssemblyAI Universal-2 | ✅ $50 one-time | $0.0025/min | ✅ | Very Good | 8.4% WER; $50 one-time credit only |
| H | Google Cloud STT v2 | ✅ 60 min/month | $0.024/min | ✅ | Good | ⚠️ Bills in 15-sec blocks — 3s utterance costs 15s |

---

## Final Decision

| Environment | Provider | Reason |
|-------------|----------|--------|
| **Development** | Deepgram Nova-3 | $200 credit = unlimited dev testing. Real-time streaming matches production behavior. |
| **FREE production** | Deepgram Nova-3 | $200 covers ~46,500 batch minutes. At 100 users × 50 min/month = ~9 years. After credit: switch to Groq ($0.00067/min) or renew. |
| **GOLD production** | Azure Speech | Pronunciation assessment is included in the same STT call at no extra charge. Only commercial provider with phoneme-level scoring. |
| **PREMIUM production** | Azure Speech | Full pronunciation: accuracy + fluency + completeness + prosody + accent. Same price as GOLD — richer output via API parameters only. |

**API keys needed (STT): 2**
- `DEEPGRAM_API_KEY` — Dev + FREE tier
- `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` — GOLD + PREMIUM

---

## Cost Estimates Per User Per Month

Assumption: ~50 min of voice audio/month per voice-active user.

| Tier | Provider | Cost/user/month |
|------|----------|----------------|
| FREE | Deepgram batch ($0.0043/min) | **~$0.22** (or $0 while $200 credit lasts) |
| GOLD | Azure ($0.0167/min) | **~$0.84** (STT + pronunciation included) |
| PREMIUM | Azure ($0.0167/min) | **~$0.84** (same price, fuller pronunciation output) |

---

## Why NOT the others

| Provider | Reason rejected |
|----------|----------------|
| Groq Whisper Turbo | Batch only — no real-time streaming. Fine as fallback after Deepgram credit runs out. |
| OpenAI Whisper / transcribe | No free tier. Deepgram credit makes it uncompetitive for now. |
| Google Cloud STT | 15-second billing blocks — a 4-second ESL utterance costs 15 seconds. Very wasteful. |
| AssemblyAI | $50 one-time credit is too small. No recurring free tier for production. |
| Any provider + Azure pronunciation separately | Paying twice. Azure alone is cheaper than any combination. |

---

## Azure Pronunciation Assessment Details

Azure Speech STT is called once — the response includes both the transcript and pronunciation scores.
No separate API, no double billing.

| Mode | Scores returned | Tier |
|------|----------------|------|
| Basic | AccuracyScore, FluencyScore, CompletenessScore (word-level) | GOLD |
| Full | + ProsodyScore, ContentAssessment, phoneme-level IPA breakdown | PREMIUM |

Both modes: **$0.0167/min** — same price, different `pronunciationAssessmentConfig` parameter in the request.

**Language support update (2026):** Pronunciation assessment expanded from primarily English to **32+ additional languages**. English remains the most comprehensive (full prosody + accent scoring). Other languages support accuracy + fluency at minimum. Useful future feature if the platform expands to non-English learners (e.g., Spanish speakers learning English with Spanish phoneme coaching).

---

## API Setup Guide

### 1. Deepgram API Key (Dev + FREE tier)

> $200 free credit on account creation. No credit card required to start.

**Steps:**
1. Go to [console.deepgram.com](https://console.deepgram.com)
2. Click **Sign Up** — email or GitHub
3. Confirm your email
4. You are automatically credited **$200** (valid 1 year from signup)
5. Go to **Settings → API Keys** → **Create a New API Key**
6. Name it (e.g., `esl-chatbot-dev`) → set permissions to **Member**
7. Copy the key — shown only once

**Add to Infisical:**
```
Key name:  DEEPGRAM_API_KEY
Value:     your-deepgram-api-key
Env:       dev + prod (FREE tier)
```

**Models available:**
- `nova-3` — recommended (best accuracy for accented ESL speech)
- `nova-2` — older, slightly cheaper, still good

**Monitoring usage:**
- Dashboard → **Usage** → watch your $200 balance
- Set a usage alert at $180 so you have time to plan the switch to Groq

---

### 2. Azure Speech Services (GOLD + PREMIUM)

> F0 free tier: 5 audio hours/month shared between STT and Pronunciation Assessment — sufficient for dev testing.

**Steps:**
1. Go to [portal.azure.com](https://portal.azure.com) → sign in or create a free account
2. Click **"+ Create a resource"** → search **"Speech"** → select **Speech** (under Azure AI services)
3. Click **Create** and fill in:
   - **Subscription:** your Azure subscription (free account gives $200 credit)
   - **Resource group:** click **"Create new"** → name it `esl-chatbot-rg`
   - **Region:** pick the region closest to your users
     - Middle East users → `UAE North` or `East US`
     - Europe users → `West Europe` or `North Europe`
   - **Name:** `esl-chatbot-speech`
   - **Pricing tier:** `Free F0` for dev, `Standard S0` for production
4. Click **Review + Create** → **Create** (takes ~1 min)
5. Once deployed, click **"Go to resource"**
6. In the left menu: **Keys and Endpoint** → copy **KEY 1** and note the **Location**

**Add to Infisical:**
```
Key name:  AZURE_SPEECH_KEY
Value:     abc123...your-key
Env:       dev (F0 free tier), prod (S0 pay-as-you-go)

Key name:  AZURE_SPEECH_REGION
Value:     eastus   ← use the exact region slug from the portal (e.g. westeurope, uaenorth)
Env:       dev + prod
```

**Switching F0 → S0 for production:**
- You cannot upgrade an existing F0 resource to S0 — create a new resource with S0 tier
- Delete the F0 resource after creating S0 (Azure charges $0 for unused F0)
- Update `AZURE_SPEECH_KEY` in Infisical (region stays the same if you pick same region)

---

## Future Fallback Plan (after Deepgram credit runs out)

When the $200 Deepgram credit is exhausted or nearing expiry, options in order of preference:

1. **Switch FREE tier to Groq Whisper Turbo** — $0.00067/min (6× cheaper than Deepgram paid), batch only (no streaming). One-line change in code.
2. **Switch FREE tier to OpenAI gpt-4o-mini-transcribe** — $0.003/min, real-time streaming preserved, better accuracy than Whisper. 4× cheaper than Deepgram paid rate, but no free tier. Worth considering if streaming quality matters more than rock-bottom cost.
3. **Pay Deepgram** — at ~1,000 FREE users × 50 min/month = $215/month. Growth pricing kicks in at $0.0065/min (~$195/month). Viable if the user base justifies it.
4. **New Deepgram account** — technically possible; use business judgment.

Switching providers is a one-line change in `src/modules/ai/providers/` — no controller or service changes needed.

# STT Provider — Decision & Reference

> Decided: 2026-04-17 (Reconfirmed: 2026-04-17 — no changes after full re-research)
> Status: **Confirmed** — Deepgram Nova-3 (Dev + FREE) · Azure Speech (GOLD + PREMIUM)
> Implementation: Phase 5+ (not needed for text-only Phase 4)
> **SDK versions:** `@deepgram/sdk@5.x` · `microsoft-cognitiveservices-speech-sdk@1.50.x`

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

## Audio Format Support Matrix

| Format | MIME type | Source | Deepgram | Azure SDK v1.50 |
|--------|-----------|--------|----------|-----------------|
| WebM/Opus | `audio/webm` | Chrome, Edge, Firefox | ✅ | ✅ (`WEBM_OPUS = 7`) |
| OGG/Opus | `audio/ogg` | Firefox alt | ✅ | ✅ (`OGG_OPUS = 6`) |
| MP4/AAC | `audio/mp4` | Safari | ✅ | ❌ No AAC format tag → falls back to Deepgram |
| MP3 | `audio/mpeg` | Legacy | ✅ | ✅ (`MP3 = 4`) |
| WAV/PCM | `audio/wav` | Web Audio API | ✅ | ✅ (default PCM) |

> Safari users on GOLD/PREMIUM will not receive pronunciation scores — their MP4 audio routes to Deepgram. To fix this in the future: either re-encode MP4 to OGG on the client side before uploading (using Web Audio API), or upgrade the Azure SDK once it adds an AAC format tag.

---

## API Setup Guide

### 1. Deepgram API Key (Dev + FREE tier)

> $200 free credit on account creation. No credit card required to start. Credit is valid for **1 year** from signup.

**Step-by-step:**

1. Go to **[console.deepgram.com](https://console.deepgram.com)**
2. Click **Sign Up** — use your email (or GitHub / Google login)
3. Confirm your email address (check spam if not received)
4. Once logged in, you will see **"$200 credits"** in the top-right balance — this is automatic, no action needed
5. In the left sidebar, click **"API Keys"**
6. Click **"+ Create a New API Key"**
7. Fill in:
   - **Comment / Name:** `esl-chatbot-dev`
   - **Permissions:** `Member` (not Owner — no billing access needed)
   - **Expiration:** leave blank (never expires unless you revoke it)
8. Click **"Create Key"**
9. **Copy the key immediately** — it is shown only once. If you close the dialog without copying, you must delete and recreate.

**Add to Infisical dev environment:**
```
Key name:  DEEPGRAM_API_KEY
Value:     your-deepgram-api-key-here
Env:       dev
```

> For production (FREE tier), add the same key to the `prod` environment in Infisical.

**Monitoring your credit balance:**
- Dashboard → left sidebar → **"Usage"** → "Balance" tab
- Set up a usage alert: go to **"Settings"** → **"Alerts"** → alert at $180 (gives ~$20 to plan the Groq switch)
- Credit expires **1 year from signup date** — calendar it

**Models available:**
- `nova-3` — recommended (best accuracy for accented ESL speech as of 2026)
- `nova-2` — older, slightly cheaper, still good; one-line change in `deepgram.stt.ts`

---

### 2. Azure Speech Services (GOLD + PREMIUM)

> F0 free tier: **5 audio hours/month** shared between STT and Pronunciation Assessment — more than enough for dev/testing. Switch to S0 (pay-as-you-go) before going to production.

**Step-by-step:**

1. Go to **[portal.azure.com](https://portal.azure.com)**
   - If you don't have an Azure account: click **"Start for free"** — you get $200 Azure credit valid for 30 days, plus 12 months of free services. No cost to start.

2. Once logged in, click **"+ Create a resource"** in the top-left

3. In the search box, type **"Speech"** → select **"Speech"** (the one under "Azure AI services", published by Microsoft)

4. Click **"Create"**

5. Fill in the form:
   | Field | What to enter |
   |-------|--------------|
   | **Subscription** | Your Azure subscription (free account works) |
   | **Resource group** | Click "Create new" → name it `esl-chatbot-rg` |
   | **Region** | See region guide below ↓ |
   | **Name** | `esl-chatbot-speech` |
   | **Pricing tier** | `Free F0` (for dev/testing) |

   **Region guide — pick the closest to your users:**
   | User location | Recommended region | Region slug |
   |---------------|-------------------|-------------|
   | Kurdistan / Iraq | UAE North (closest to Middle East) | `uaenorth` |
   | Europe | West Europe | `westeurope` |
   | US East | East US | `eastus` |
   | US West | West US | `westus` |

   > The region slug is the value you'll put in `AZURE_SPEECH_REGION`. Write down the slug exactly — it must match the portal.

6. Click **"Review + Create"** → then **"Create"**
   - Deployment takes ~60 seconds

7. Click **"Go to resource"** (or find it in "All resources")

8. In the left menu, click **"Keys and Endpoint"**
   - You will see **KEY 1**, **KEY 2**, and **Location/Region**
   - Copy **KEY 1** — this is your `AZURE_SPEECH_KEY`
   - The **Location** (e.g., `UAE North`) — use the slug form (e.g., `uaenorth`) for `AZURE_SPEECH_REGION`

   > **Important:** the region in the portal says "UAE North" but the slug in the code must be `uaenorth` (lowercase, no space). Find the exact slug by clicking on the resource and looking at the JSON view, or check the Azure region documentation.

**Add to Infisical dev environment:**
```
Key name:  AZURE_SPEECH_KEY
Value:     abc123...your-key-1-here
Env:       dev

Key name:  AZURE_SPEECH_REGION
Value:     uaenorth    ← use the exact region slug (e.g. westeurope, eastus, uaenorth)
Env:       dev
```

**⚠️ Upgrading F0 → S0 for production:**
- You **cannot upgrade** an existing F0 resource to S0 — you must create a new resource
- Steps: repeat the same creation above, but pick **"Standard S0"** for pricing tier
- Delete the old F0 resource after creating S0 (Azure charges $0 for idle F0 resources, but clean up anyway)
- Update `AZURE_SPEECH_KEY` in Infisical (same region is fine if you created S0 in the same region)
- The `AZURE_SPEECH_REGION` value stays the same

---

## Future Fallback Plan (after Deepgram credit runs out)

When the $200 Deepgram credit is exhausted or nearing expiry, options in order of preference:

1. **Switch FREE tier to Groq Whisper Turbo** — $0.00067/min (6× cheaper than Deepgram paid), batch only (no streaming). One-line change in `deepgram.stt.ts` (change model, client, and API call).
2. **Switch FREE tier to OpenAI gpt-4o-mini-transcribe** — $0.003/min, real-time streaming preserved, better accuracy than Whisper. 4× cheaper than Deepgram paid rate, but no free tier. Worth considering if streaming quality matters more than rock-bottom cost.
3. **Pay Deepgram** — at ~1,000 FREE users × 50 min/month = $215/month. Growth pricing kicks in at $0.0065/min (~$195/month). Viable if the user base justifies it.
4. **New Deepgram account** — technically possible; use business judgment.

Switching providers is a change in `src/modules/ai/providers/` — no controller or service changes needed.

---

## Linux Production Deployment Note

The Azure Speech SDK (`microsoft-cognitiveservices-speech-sdk`) requires **GStreamer** for compressed audio decoding (WebM/Opus, OGG/Opus) on Linux.

Install GStreamer before deploying:
```bash
# Ubuntu/Debian
sudo apt-get install -y libgstreamer1.0-0 gstreamer1.0-plugins-base gstreamer1.0-plugins-good

# Alpine Linux (Docker)
apk add gstreamer gst-plugins-base gst-plugins-good
```

**Windows development** (this project): native audio codecs are used — no extra install needed. ✅

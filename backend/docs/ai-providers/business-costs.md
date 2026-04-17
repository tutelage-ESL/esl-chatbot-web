# AI Costs & Business Model — ESL Chatbot

> Last updated: 2026-04-17  
> Purpose: Business-facing summary — what we pay, what we earn, margin per tier

---

## Summary: What We Pay Per Environment

### Development — Monthly Cost: ~$0

| Service | Provider | Cost |
|---------|----------|------|
| LLM | Gemini 2.5 Flash (free tier, 250 req/day) | $0 |
| STT | Deepgram Nova-3 ($200 signup credit) | $0 |
| TTS | Microsoft Edge TTS (npm package, no API) | $0 |
| Pronunciation | Azure Speech F0 (5 hrs/month free) | $0 |
| **Total** | | **$0/month** |

> The $200 Deepgram credit will last years at dev usage levels. Azure F0 free tier is sufficient for testing pronunciation features.

---

## Production Cost Per User Per Month

### How we calculated

Each time a student sends a message, we make one LLM API call.
Each voice message also triggers one STT call + one TTS call.

**Token assumptions per LLM exchange:**
- FREE input: ~450 tokens (system prompt + last 10 messages + new message)
- GOLD/PREMIUM input: ~730 tokens (system prompt + last 20 messages + new message)
- Output: ~500 tokens (AI reply ~80 words + JSON evaluation) — same for all tiers

**Voice assumptions per voice-active user:**
- Average utterance: 30 seconds
- Average AI reply: 400 characters

---

### FREE Tier — Revenue: $0/month per user

**Enforced limits (in code):**
- 3 sessions/day
- 20 messages/session (soft) + 10 buffer (hard cutoff at 30)
- 20 messages/day cap across all sessions
- LLM context: last 10 messages only (saves ~35% on input tokens vs GOLD/PREMIUM)
- No pronunciation scoring

| Service | Provider | Usage | Cost |
|---------|----------|-------|------|
| LLM | Gemini 2.5 Flash-Lite ($0.10 in / $0.40 out per 1M) | ~150 msgs/month typical · max 600/month | **~$0.03–0.15** |
| STT | Deepgram Nova-3 ($0.0043/min) | ~25 min/month voice (5 sessions × 5 min) | **~$0.11** |
| TTS | Azure Neural TTS ($16/1M chars, 500k free) | ~20,000 chars/month voice | **~$0.00–0.32** |
| Pronunciation | None | — | **$0** |

| Scenario | AI Cost/user/month | Revenue | Result |
|----------|--------------------|---------|--------|
| Text only (typical) | **~$0.03** | $0 | ~$0.03 loss |
| Text only (daily cap hit) | **~$0.15** | $0 | ~$0.15 loss |
| Text + voice (typical) | **~$0.26** | $0 | ~$0.26 loss |

> FREE users are a **loss leader** — goal is conversion to GOLD/PREMIUM.
> New limits cut worst-case cost by ~65% vs previous design (from $0.72 → ~$0.26 with voice).
> At 1,000 FREE text-only users: ~$30–150/month. Very manageable.

---

### GOLD Tier — Revenue: $9.99/month per user

| Service | Provider | Usage | Cost |
|---------|----------|-------|------|
| LLM | Gemini 2.5 Flash ($0.30 in / $2.50 out per 1M) | 900 msgs/month | **~$1.32** |
| STT | Azure Speech ($0.0167/min, incl. pronunciation) | 125 min/month (voice users) | **~$2.09** |
| TTS | Azure Neural TTS ($16/1M chars) | 100,000 chars/month | **~$1.60** |
| Pronunciation | Azure Speech (basic — same call as STT) | Included in STT | **$0 extra** |

| Scenario | AI Cost/user/month | Revenue | Gross Margin |
|----------|--------------------|---------|--------------|
| Text only | **~$1.32** | $9.99 | **~87%** ✅ |
| Text + voice | **~$5.01** | $9.99 | **~50%** ✅ |

> Even worst-case (heavy voice user): 50% gross margin is healthy for a SaaS product.
> Text-only users are extremely profitable at 87% margin.

---

### PREMIUM Tier — Revenue: $24.99/month per user

| Service | Provider | Usage | Cost |
|---------|----------|-------|------|
| LLM | GPT-5 mini ($0.25 in / $2.00 out per 1M) | 1,200 msgs/month | **~$1.42** |
| STT | Azure Speech ($0.0167/min, incl. full pronunciation) | 262.5 min/month (voice users) | **~$4.38** |
| TTS | Azure Neural TTS ($16/1M chars) | 210,000 chars/month | **~$3.36** |
| Pronunciation | Azure Speech (full — prosody + accent + phoneme) | Included in STT | **$0 extra** |

| Scenario | AI Cost/user/month | Revenue | Gross Margin |
|----------|--------------------|---------|--------------|
| Text only | **~$1.42** | $24.99 | **~94%** ✅ |
| Text + voice (typical) | **~$9.16** | $24.99 | **~63%** ✅ |
| Text + voice (heavy user) | **~$12.54** | $24.99 | **~50%** ✅ |

> Switching PREMIUM LLM from Claude Haiku 4.5 → GPT-5 mini saves ~$2.46/user/month.
> Heavy voice users improved from ~40% → ~50% gross margin — no longer a concern.

---

## Profit Scenarios at Scale

Assumptions: 30% of users are voice-active. 70% are text-only.

### 100 paid users (50 GOLD, 50 PREMIUM)

| | GOLD (50 users) | PREMIUM (50 users) | Total |
|--|----------------|-------------------|-------|
| Revenue | $499.50 | $1,249.50 | **$1,749.00** |
| AI cost (blended) | ~$111 | ~$260 | ~$371 |
| **Gross profit** | ~$388 | ~$989 | **~$1,377** |
| **Gross margin** | ~78% | ~79% | **~79%** |

> PREMIUM AI cost improved from ~$383 → ~$260 (saving ~$123/month at 50 users).

### 500 paid users (250 GOLD, 250 PREMIUM)

| | GOLD (250 users) | PREMIUM (250 users) | Total |
|--|----------------|-------------------|-------|
| Revenue | $2,497.50 | $6,247.50 | **$8,745.00** |
| AI cost (blended) | ~$556 | ~$1,298 | ~$1,854 |
| **Gross profit** | ~$1,941 | ~$4,949 | **~$6,891** |
| **Gross margin** | ~78% | ~79% | **~79%** |

> These are AI-only costs. Infrastructure (hosting, DB, bandwidth) adds ~$100–500/month at this scale.

---

## Break-Even Analysis

Minimum users needed to cover platform infrastructure (~$200/month hosting + DB):

| Mix | Users needed to break even |
|-----|---------------------------|
| All GOLD ($9.99) | ~3 paying users |
| All PREMIUM ($24.99) | ~2 paying users |
| 50/50 mix | ~2–3 paying users |

> AI costs scale with usage, not headcount — the platform is profitable from the first few paying users.

---

## Free Tier Exposure Limit

Maximum loss from FREE users with current enforced limits (3 sessions/day, 20 msg/session, 20 msg/day cap, 10-message context):

| FREE users | Monthly AI cost (text only) | Monthly AI cost (text + voice) |
|-----------|----------------------------|-------------------------------|
| 100 | ~$3–15 | ~$26 |
| 500 | ~$15–75 | ~$130 |
| 1,000 | ~$30–150 | ~$260 |
| 5,000 | ~$150–750 | ~$1,300 |

> Previous design (50 msg/session, no daily cap): 1,000 FREE users cost ~$720/month with voice.
> New design: same 1,000 users cost ~$260/month — a **63% reduction**.
> At 5,000 FREE users with voice: $1,300/month is covered by just 130 GOLD subscribers (~$1,300 revenue).
> Voice on FREE tier is Phase 5+ — by then you'll have paying users to offset the cost.

---

## API Keys Summary

| Key | Service | Tiers | Monthly cost |
|-----|---------|-------|-------------|
| `GEMINI_API_KEY` | LLM | Dev (Gemini 3 Flash, free) + FREE + GOLD | $0 dev · scales with usage |
| `OPENAI_API_KEY` | LLM | PREMIUM (GPT-5 mini) | Scales with usage |
| `DEEPGRAM_API_KEY` | STT | Dev + FREE | $0 ($200 credit) |
| `AZURE_SPEECH_KEY` | STT + TTS + Pronunciation | GOLD + PREMIUM | Scales with usage |
| `AZURE_SPEECH_REGION` | Azure config | GOLD + PREMIUM | (not a cost) |

**Total active keys in production: 4 secrets**

---

## Future Cost Levers

| Lever | Impact |
|-------|--------|
| Switch PREMIUM TTS to OpenAI TTS HD | +$3/user/month — justified if used as a selling point |
| Batch API for session evaluations (50% discount) | –$0.15–0.50/user/month on LLM costs |
| Switch FREE STT to Groq after Deepgram credit | Saves ~$0.16/user/month (negligible) |
| Add GOLD voice session cap (e.g., 5 voice sessions/day) | Protects 50%+ margin from heavy voice users |
| Cache repeated LLM context (prompt caching) | Gemini + Claude both offer 75–90% discount on cached tokens |

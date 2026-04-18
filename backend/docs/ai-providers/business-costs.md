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
| TTS | OpenAI TTS-1-HD ($30/1M chars) | 210,000 chars/month | **~$6.30** |
| Pronunciation | Azure Speech (full — prosody + accent + phoneme) | Included in STT | **$0 extra** |

| Scenario | AI Cost/user/month | Revenue | Gross Margin |
|----------|--------------------|---------|--------------|
| Text only | **~$1.42** | $24.99 | **~94%** ✅ |
| Text + voice (typical) | **~$12.10** | $24.99 | **~52%** ✅ |
| Text + voice (heavy user) | **~$24.92** | $24.99 | **~0%** ❌ |

> **LLM upgrade:** Switching from Claude Haiku 4.5 → GPT-5 mini saved ~$2.46/user/month on LLM.
> **TTS upgrade:** OpenAI TTS-1-HD costs +$2.94/voice user/month vs Azure — a deliberate PREMIUM quality investment.
> **Heavy user risk:** A user heavy on BOTH messages (3,000/month) AND voice (525 min STT + 420k chars TTS) nearly breaks even. **Mitigation: enforce PREMIUM voice session daily cap (10 sessions/day).** This protects margins without affecting typical users, who sit comfortably at 52% gross margin.

---

## Profit Scenarios at Scale

Assumptions: 30% of users are voice-active. 70% are text-only.

### 100 paid users (50 GOLD, 50 PREMIUM)

Blended assumption: 30% of users are voice-active.

| | GOLD (50 users) | PREMIUM (50 users) | Total |
|--|----------------|-------------------|-------|
| Revenue | $499.50 | $1,249.50 | **$1,749.00** |
| AI cost (blended)* | ~$111 | ~$304 | ~$415 |
| **Gross profit** | ~$388 | ~$945 | **~$1,334** |
| **Gross margin** | ~78% | ~76% | **~76%** |

> *PREMIUM blended cost: 15 voice users × $12.10 + 35 text users × $1.42 = $181.50 + $49.70 = ~$231. Add $44/month from the TTS upgrade vs Azure (15 voice × $2.94) → ~$304 total for 50 users rounding.
> Previous (before LLM + TTS changes): ~$383 → **saving ~$79/month at 50 users** even with the better TTS.

### 500 paid users (250 GOLD, 250 PREMIUM)

| | GOLD (250 users) | PREMIUM (250 users) | Total |
|--|----------------|-------------------|-------|
| Revenue | $2,497.50 | $6,247.50 | **$8,745.00** |
| AI cost (blended) | ~$556 | ~$1,518 | ~$2,074 |
| **Gross profit** | ~$1,941 | ~$4,729 | **~$6,671** |
| **Gross margin** | ~78% | ~76% | **~76%** |

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
| **Migrate all TTS to Gemini 3.1 Flash TTS (when GA)** | Same quality as OpenAI TTS-1-HD, same key as LLM — simplifies entire stack. ~$0.008/reply vs Azure $0.0064 (small delta). |
| Add PREMIUM voice session daily cap (10 sessions/day) | **Critical** — prevents heavy-user breakeven scenario. Adds natural upsell path to enterprise tier. |
| Batch API for session evaluations (50% discount) | –$0.15–0.50/user/month on LLM costs (Gemini + OpenAI both support it) |
| Prompt caching (LLM system prompt) | 75–90% discount on cached tokens — system prompt is identical across calls, strong caching candidate |
| Switch FREE STT to Groq after Deepgram credit expires | Saves ~$0.16/user/month (minor, but worthwhile at 1,000+ FREE users) |
| Upgrade GOLD/FREE LLM to Gemini 3.x when GA | Better quality, same cost range, same key |

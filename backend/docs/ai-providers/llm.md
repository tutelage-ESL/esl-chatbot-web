# LLM Provider — Decision & Reference

> Decided: 2026-04-17  
> Status: **Confirmed** — Gemini 2.5 Flash-Lite (FREE) · Gemini 2.5 Flash (GOLD) · GPT-5 mini (PREMIUM) · Gemini 3 Flash (Dev)

---

## What the LLM does in this project

Every time a student sends a message, the LLM does two things in a single API call:

1. **Responds** as a conversational English tutor (~50–100 words)
2. **Evaluates** the student's message and returns structured JSON:
   - Grammar score (0–100) + list of errors
   - Vocabulary score + detected CEFR level of words used
   - Fluency score
   - Weighted overall score
   - Corrections array (original → corrected + explanation)
   - Feedback sentence

The response shape is fixed (`AIResponse` in `src/modules/ai/ai.types.ts`).
The model selected per call is determined by the user's subscription plan.

---

## All Options Considered

| # | Model | Provider | Free tier | Input $/1M | Output $/1M | ESL quality |
|---|-------|----------|-----------|-----------|------------|-------------|
| A | **Gemini 2.5 Flash-Lite** | Google | ✅ 1,500 req/day | $0.10 | $0.40 | ⭐⭐⭐ Good |
| B | **Gemini 2.5 Flash** | Google | ✅ 250 req/day | $0.30 | $2.50 | ⭐⭐⭐⭐ Very Good |
| C | Gemini 2.5 Pro | Google | ✅ 100 req/day | $1.25 | $10.00 | ⭐⭐⭐⭐⭐ Excellent |
| D | **Gemini 3 Flash** ⚠️ Preview | Google | ✅ Free access | $0.50 | $3.00 | ⭐⭐⭐⭐ Very Good+ |
| E | Gemini 3.1 Flash-Lite ⚠️ Preview | Google | ✅ Free access | $0.25 | $1.50 | ⭐⭐⭐⭐ Good+ (Intel Index 34 vs 16) |
| F | gpt-4o-mini | OpenAI | ❌ None | $0.15 | $0.60 | ⭐⭐⭐ Good |
| G | GPT-4.1 nano | OpenAI | ❌ None | $0.10 | $0.40 | ⭐⭐⭐ Good |
| H | GPT-4.1 | OpenAI | ❌ None | $2.00 | $8.00 | ⭐⭐⭐⭐ Very Good |
| I | **GPT-5 mini** | OpenAI | ❌ None | $0.25 | $2.00 | ⭐⭐⭐⭐⭐ Excellent |
| J | GPT-5 | OpenAI | ❌ None | $1.25 | $10.00 | ⭐⭐⭐⭐⭐ Best |
| K | Claude Haiku 4.5 | Anthropic | ❌ None | $1.00 | $5.00 | ⭐⭐⭐⭐½ Best ESL pedagogy |
| L | Deepseek V3.2 | Deepseek | ❌ None | $0.28 | $0.42 | ⭐⭐⭐ Good — ⚠️ China servers |
| M | Groq Llama 4 | Groq | ✅ 500 req/day | $0.11 | $0.34 | ⭐⭐⭐ Decent |

> ⚠️ Gemini 3.x models are still in **preview** as of April 2026. Developer reports of inconsistency vs 2.5 series in production. Monitor for GA release before using in production tiers.

---

## Cost Estimates Per User Per Month

**Assumptions:** Each exchange ≈ 730 input tokens + 500 output tokens (system prompt + history + user message in; reply + JSON evaluation out).  
FREE tier uses smaller context (~450 input tokens — 10-message window vs 20 for GOLD/PREMIUM).

### FREE-tier user: 20 sessions × 15 messages = 300 messages/month

| Model | Input cost | Output cost | Total/user/month |
|-------|-----------|------------|-----------------|
| Gemini 2.5 Flash-Lite (A) | $0.014 | $0.060 | **~$0.08** ✅ |
| Gemini 3.1 Flash-Lite (E) | $0.034 | $0.225 | **~$0.26** |
| GPT-4.1 nano (G) | $0.014 | $0.060 | **~$0.08** |

### GOLD user: 30 sessions × 30 messages = 900 messages/month

| Model | Total/user/month | Revenue | Gross margin |
|-------|-----------------|---------|--------------|
| Gemini 2.5 Flash (B) | **~$1.32** | $9.99 | ~87% ✅ |
| Gemini 3 Flash (D) | **~$1.68** | $9.99 | ~83% |
| GPT-5 mini (I) | **~$1.07** | $9.99 | ~89% |

### PREMIUM user (typical): 30 sessions × 40 messages = 1,200 messages/month

| Model | Total/user/month | Revenue | Gross margin |
|-------|-----------------|---------|--------------|
| **GPT-5 mini (I)** | **~$1.42** | $24.99 | **~94%** ✅ |
| Claude Haiku 4.5 (K) | **~$3.88** | $24.99 | ~84% |
| GPT-5 (J) | **~$5.96** | $24.99 | ~76% |

### PREMIUM user (heavy): 60 sessions × 50 messages = 3,000 messages/month

| Model | Total/user/month | Revenue | Gross margin |
|-------|-----------------|---------|--------------|
| **GPT-5 mini (I)** | **~$3.55** | $24.99 | **~86%** ✅ |
| Claude Haiku 4.5 (K) | **~$9.69** | $24.99 | ~61% |
| GPT-5 (J) | **~$17.74** | $24.99 | ~29% ❌ dangerous |

---

## Final Decision

| Environment | Model | Reason |
|-------------|-------|--------|
| **Development** | Gemini 3 Flash (preview) | Free tier. Better quality than 2.5 Flash — dev tests reflect near-GOLD production behavior. Preview is acceptable for dev. |
| **FREE production** | Gemini 2.5 Flash-Lite | $0 revenue. Stable GA model at ~$0.08/user/month. Gemini 3.1 Flash-Lite would be 3× more expensive for the same $0 revenue. |
| **GOLD production** | Gemini 2.5 Flash | Stable GA model. 87% gross margin. Upgrade path to Gemini 3 Flash exists when it reaches GA — same key, one string change. |
| **PREMIUM production** | GPT-5 mini | GPT-5 quality at $0.25/$2.00. Margins jump from 84% → 94% (typical) and 61% → 86% (heavy user). 2.7× cheaper than Claude Haiku 4.5. **See testing caveat below before going live.** |

**API keys needed: 2**
- `GEMINI_API_KEY` — covers Dev (Gemini 3 Flash) + FREE (Gemini 2.5 Flash-Lite) + GOLD (Gemini 2.5 Flash)
- `OPENAI_API_KEY` — covers PREMIUM (GPT-5 mini)

---

## Why NOT the others

| Model | Reason rejected |
|-------|----------------|
| Gemini 3 Flash for GOLD (now) | Preview-only as of April 2026 — inconsistency reports in production. Revisit when GA. |
| Gemini 3.1 Flash-Lite for FREE (now) | 3× more expensive than 2.5 Flash-Lite for $0-revenue tier. Quality improvement not worth the increased loss per free user. |
| Claude Haiku 4.5 (was PREMIUM pick) | Excellent ESL pedagogy tone. Replaced by GPT-5 mini which is 2.7× cheaper with equal or better benchmarks. If GPT-5 mini proves insufficient for ESL, revert is a one-line code change. |
| GPT-5 for PREMIUM | $10/1M output — dangerous heavy-user margins (29%). Same reason gpt-4o was rejected. |
| GPT-4.1 for GOLD | 3.7× more expensive than Gemini Flash for same quality level |
| Gemini 2.5 Pro | Same $10/1M output risk as GPT-5 |
| Deepseek V3.2 | Student data on servers in China — privacy risk for a student-facing product |
| Groq Llama 4 | Too inconsistent for reliable CEFR-level ESL evaluation |

---

## ⚠️ GPT-5 mini ESL Pedagogy Caveat

GPT-5 mini was selected on cost/benchmark data, not on validated ESL teaching quality. Claude Haiku 4.5 was the previous pick specifically because it explains grammar corrections naturally — it reads like a real teacher, not an error-checker. GPT-5 mini should be equivalent or better given GPT-5 lineage, but this is unvalidated.

**Before enabling GPT-5 mini for PREMIUM users in production:**
1. Run 20–30 test conversations and compare GPT-5 mini vs Claude Haiku 4.5 on identical student messages
2. Check that correction explanations feel natural and pedagogically useful, not mechanical
3. Verify the structured JSON evaluation output is consistent (no hallucinated fields, scores stay in range)

**Fallback if GPT-5 mini proves insufficient:**
1. Add `ANTHROPIC_API_KEY` to Infisical (prod)
2. Create `src/modules/ai/providers/claude.llm.ts` (mirrors the OpenAI provider)
3. Change PREMIUM routing in `ai.service.ts` — one line
4. No controller or schema changes needed

---

## Future Upgrade Paths

### Upgrade GOLD to Gemini 3 Flash (when GA)
Once Gemini 3 Flash exits preview and developer inconsistency reports stabilize:
- Change `GEMINI_MODEL_BY_PLAN.GOLD` to `"gemini-3-flash"` in `gemini.llm.ts`
- Cost: ~$1.32 → ~$1.68/user/month (+$0.36) for a meaningful quality jump
- Same `GEMINI_API_KEY` — no new secrets needed

### Upgrade FREE to Gemini 3.1 Flash-Lite (when GA)
If FREE-to-paid conversion rate improves enough to justify better free-tier experience:
- Change `GEMINI_MODEL_BY_PLAN.FREE` to `"gemini-3.1-flash-lite"` in `gemini.llm.ts`
- Cost: ~$0.08 → ~$0.26/user/month (still manageable: 5,000 FREE users = ~$1,300/month)
- Same `GEMINI_API_KEY` — no new secrets needed

### Upgrade PREMIUM to GPT-5 full (if needed)
If business decides full GPT-5 is necessary for PREMIUM differentiation:
- Change model string to `"gpt-5"` — same `OPENAI_API_KEY`
- Cost: $1.42 → $5.96/user/month typical; margin drops from ~94% → ~76%
- Only justify alongside a price increase for the PREMIUM plan

---

## Code Implementation

FREE and GOLD use the Gemini SDK (pending provider migration — currently using OpenAI as placeholder).  
PREMIUM uses the OpenAI SDK with `gpt-5-mini`.

```ts
// After Gemini migration (src/modules/ai/providers/gemini.llm.ts):
const GEMINI_MODEL_BY_PLAN: Record<"FREE" | "GOLD", string> = {
  FREE: "gemini-2.5-flash-lite",
  GOLD: "gemini-2.5-flash",
  // Dev uses "gemini-3-flash" (preview) — selected via NODE_ENV check in ai.service.ts
};

// PREMIUM (src/modules/ai/providers/openai.llm.ts):
const MODEL_BY_PLAN: Record<Plan, string> = {
  FREE:    "gpt-4o-mini",   // placeholder — will be removed after Gemini migration
  GOLD:    "gpt-4.1",       // placeholder — will be removed after Gemini migration
  PREMIUM: "gpt-5-mini",    // confirmed stack
};
```

`ai.service.ts` routes by plan after migration:
- `NODE_ENV === development` → Gemini 3 Flash (all plans, free tier)
- `FREE` / `GOLD` → `callGeminiLLM()` (Gemini SDK)
- `PREMIUM` → `callOpenAILLM()` (OpenAI SDK, gpt-5-mini)

---

## API Setup Guide

### 1. Google Gemini API Key (Dev + FREE + GOLD)

**Cost to start:** $0 — free tier, no billing required for development.

Steps:
1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Sign in with your Google account
3. Click **"Get API key"** in the left sidebar
4. Click **"Create API key"** → select or create a Google Cloud project
5. Copy the key — add it to Infisical as `GEMINI_API_KEY` (dev environment)

**Free tier limits (as of April 2026):**
- Gemini 2.5 Flash: 10 RPM, 250,000 TPM, 250 RPD
- Gemini 2.5 Flash-Lite: 15 RPM, 250,000 TPM, 1,500 RPD
- Gemini 3 Flash (preview): Free access — check AI Studio for current rate limits

**To enable paid tier (production):**
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Select your project → **Billing** → link a billing account
3. Same API key works for both free and paid tiers

**Add to Infisical:**
```
Key name:  GEMINI_API_KEY
Value:     AIza...your-key-here
Environment: dev (free tier), prod (paid)
```

---

### 2. OpenAI API Key (PREMIUM — GPT-5 mini)

**Cost to start:** Minimum $5 deposit to activate the API.

Steps:
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create an account
3. Go to **API Keys** → **Create new secret key** → name it (e.g., `esl-chatbot-prod`)
4. Copy the key — shown **only once**
5. Go to **Billing** → add a credit card + deposit minimum $5

**Add to Infisical:**
```
Key name:  OPENAI_API_KEY
Value:     sk-...your-key-here
Environment: prod only (dev uses Gemini free tier — no PREMIUM users in dev)
```

**Model ID to use in code:** `gpt-5-mini`

---

### 3. Anthropic API Key — Not in current stack

Removed when switching PREMIUM from Claude Haiku 4.5 → GPT-5 mini.  
If reverting (see ESL caveat above): [console.anthropic.com](https://console.anthropic.com) → minimum $5 deposit.  
Model ID if reverting: `claude-haiku-4-5-20251001`

---

## Notes for Future Switching

- To revert PREMIUM to Claude Haiku 4.5: add `ANTHROPIC_API_KEY` to Infisical + create `claude.llm.ts` + change one line in `ai.service.ts`
- To upgrade GOLD to Gemini 3 Flash (when GA): change one string in `gemini.llm.ts` — no new keys
- To upgrade FREE to Gemini 3.1 Flash-Lite (when GA): change one string in `gemini.llm.ts` — no new keys
- Batch API (50% discount): available on both Gemini and OpenAI for non-real-time calls (e.g., session end summaries)
- Prompt caching: both Gemini and OpenAI offer 75–90% discount on cached tokens — the system prompt is identical across calls, making it a strong caching candidate

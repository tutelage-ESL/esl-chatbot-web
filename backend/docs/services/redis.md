# Redis — Upstash

## Decision
**Upstash** for serverless Redis. Scaffolded as a placeholder in `src/config/redis.ts`.

---

## Use Cases

| Use Case | Phase |
|----------|-------|
| Rate limiting counters (per-plan) | Phase 8 |
| Caching hot queries (user profiles, class lists) | Phase 8 |
| Session state for real-time features | Phase 9 |
| Refresh token blocklist (optional, fast lookup) | Phase 2+ |

---

## Why Upstash

- **Serverless** — pay per request, zero cost when idle
- **Free tier:** 10,000 requests/day, 256 MB
- Works with the standard `ioredis` client (no code change needed vs hosted Redis)
- Pairs perfectly with Neon (both serverless, both scale to zero)

### Comparison
| Service | Free Tier | Cost Model | Notes |
|---------|-----------|-----------|-------|
| **Upstash** ⭐ | 10K req/day | Pay-per-request | Best for serverless/low traffic |
| Redis Cloud | 30 MB | Free then $7+/mo | Official Redis hosting |
| Railway Redis | Trial credit | ~$5/mo | Easy if on Railway |
| DigitalOcean Managed Redis | None | $15/mo | Good paired with DO Postgres |

---

## Setup

1. Go to [upstash.com](https://upstash.com) → Create account → New Database
2. Settings:

| Setting | Value |
|---------|-------|
| Name | `tutelage-cache` |
| Region | **eu-central-1 (Frankfurt)** — match your Neon region |
| Type | Regional (not Global, unless multi-region needed) |
| TLS | Enabled |

3. Copy the Redis URL

### Required Env Vars
```env
REDIS_URL=rediss://default:password@your-endpoint.upstash.io:6379
```

### Current Placeholder
`src/config/redis.ts` likely has a commented-out or stub Redis client.
When ready to implement, replace with:

```typescript
import { Redis } from "ioredis";

export const redis = new Redis(process.env.REDIS_URL);
```

---

## Production

Upstash scales automatically. For production:
- Upgrade to **Pay-as-you-go** (no daily limit cap)
- Enable **Eviction Policy**: `allkeys-lru` for caching use cases
- Consider **Global** database if you add servers in multiple regions

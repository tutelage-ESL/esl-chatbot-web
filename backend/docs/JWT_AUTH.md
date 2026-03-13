# JWT Authentication

This document describes the JWT-based authentication system used by the active API server (`server.js`).

## Files

| File | Purpose |
|------|---------|
| `services/tokenService.js` | Generates & verifies access/refresh JWTs |
| `services/sessionStore.js` | In-memory Map tracking active refresh tokens per user |
| `middleware/jwtMiddleware.js` | `requireJwtAuth` — validates Bearer token from Authorization header |
| `controllers/jwtAuthController.js` | Sign-in, sign-up, refresh (with rotation), logout, profile |
| `routes/jwtAuthRoutes.js` | Route definitions mounted at `/api/auth/jwt` |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/jwt/signup` | None | Create account, returns tokens + user |
| POST | `/api/auth/jwt/signin` | None | Authenticate, returns tokens + user |
| POST | `/api/auth/jwt/refresh` | Body: `{ refreshToken }` | Rotates both tokens |
| POST | `/api/auth/jwt/logout` | Body: `{ refreshToken }` | Invalidates session |
| GET | `/api/auth/jwt/me` | `Authorization: Bearer <accessToken>` | Returns current user info |
| GET | `/api/auth/jwt/profile` | `Authorization: Bearer <accessToken>` | Returns current user info |

## Response Format

```json
{
  "success": true,
  "message": "Sign in successful",
  "data": {
    "user": { "id": 1, "username": "...", "email": "...", "subscriptionTier": "standard" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

## How It Works

1. **Sign in** — Server issues an access token (20 min) + refresh token (30 days) and stores the refresh token in the session Map.
2. **API calls** — Frontend sends `Authorization: Bearer <accessToken>`. Middleware decodes and attaches `req.user` + `req.userId`.
3. **Token expired** — Frontend calls `/api/auth/jwt/refresh` with the refresh token. Server issues a new pair (rotation — old refresh token is replaced).
4. **Logout** — Server removes the session from the Map. The refresh token is now invalid.
5. **After 30 days** — Refresh token expires; user must sign in again.

## Protecting Routes

```js
const { requireJwtAuth } = require('./middleware/jwtMiddleware');

// Protect a route — requires a valid Bearer token
router.get('/my-route', requireJwtAuth, (req, res) => {
  const userId = req.userId; // set by middleware
  // ...
});
```

> The session-based auth (`/api/auth/*` via `sessionAuthRoutes.js`) also exists and both systems work side by side. JWT is the preferred approach for the React frontend.

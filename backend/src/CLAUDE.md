# src/ — Source Directory

## What lives here
- `app.js` — Express factory (no `listen`, no `db.sync`)
- `config/` — Environment config centralized here
- `sockets/` — Socket.IO handlers (separated from routes)
- `api/v1/` — All REST feature modules

## Conventions

### app.js
- Exports `{ app, server, io }` — consumers import what they need.
- Never import `sequelize` here; DB lifecycle belongs in `server.js`.

### config/index.js
- **Single source of truth** for env vars.
- Import as `const config = require('./config')` or `require('../config')` depending on depth.
- Controllers and services import `config.xxx`, not `process.env.XXX` directly.

### sockets/
- One file per Socket.IO namespace or feature group.
- Each file exports a `register*(io)` function called once in `app.js`.

### Async error handling
- All async route handlers must either be wrapped in try/catch or use a global asyncHandler wrapper.
- Use `apiResponse.internalError(res)` for 500s — never `res.status(500).json({ error: '...' })` in new code.

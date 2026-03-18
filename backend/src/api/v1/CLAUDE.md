# src/api/v1/ — API Version 1

## Domain Folders
Each domain (chat, voice, vocabulary, goals, pronunciation, …) has its own folder with:
- `*.routes.js` — route definitions only (no business logic)
- `*.controller.js` — handler functions (import models, call services, return apiResponse)

## Naming Rules
| File | Purpose |
|---|---|
| `<domain>.routes.js` | Wire middleware + controller, export router |
| `<domain>.controller.js` | Business logic, DB access, `return apiResponse.xxx` |

## Middleware Order in Routes
```
router.METHOD('/path',
  rateLimiter?,      // if needed (e.g. chatLimiter)
  requireJwtAuth?,   // if protected
  validate?,         // if body validation needed
  ctrl.handler       // always last
)
```

## Auth Imports
```js
// Always import from the middleware folder (both paths resolve to the same file):
const { requireJwtAuth } = require('../../../../middleware/jwtMiddleware');
// OR (preferred for new code):
const { requireJwtAuth } = require('../../../../middleware/auth.middleware');
```

## Response Pattern
```js
// Success
return apiResponse.success(res, data, 'Optional message');
return apiResponse.created(res, data, 'Created');

// Errors
return apiResponse.validationError(res, 'Message', details?);
return apiResponse.unauthorized(res, 'Message');
return apiResponse.notFound(res, 'Message');
return apiResponse.internalError(res, 'Message?');
```

## Adding a New Feature Module
1. Create `src/api/v1/<domain>/` folder
2. Add `<domain>.routes.js` and `<domain>.controller.js`
3. Register the router in `src/api/v1/index.js`: `router.use('/<domain>', require('./<domain>/<domain>.routes'))`

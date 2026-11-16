# Prompting Guide

How to write prompts that get accurate, minimal, and well-structured results on this project.

---

## The Core Formula

A good Claude Code prompt answers four questions:

```
WHAT   — What do you want done?
WHERE  — Which file / module / layer?
HOW    — Which pattern / constraint to follow?
SCOPE  — What is explicitly out of scope?
```

Example — bad:
> add a new feature for vocabulary

Example — good:
> Add `POST /vocabulary` to the vocabulary module. Follow the existing module pattern
> (router → controller → service → schema). Validate with Zod. Add Swagger JSDoc.
> Do not touch the SRS fields — that's Phase 5.

The second prompt produces a complete, correct first draft. The first triggers 5 questions.

---

## Prompt Patterns That Work

### 1. "Follow the existing pattern in X"

Claude Code will read the referenced file and mirror its structure exactly.

```
Add a DELETE /classes/:id endpoint. Follow the same pattern as
POST /classes in src/modules/classes/classes.router.ts.
```

### 2. Specify the layer

This project is layered (router → controller → service → schema). Tell Claude which
layers to touch — otherwise it may change more than needed.

```
Only update classes.service.ts and classes.schema.ts — the controller and router
already exist for this endpoint.
```

### 3. Reference the DB schema by model name

Claude knows the full schema from `CLAUDE.md`. Use the exact model names.

```
Query the ClassUser join table to check if the user is already a TUTOR before
adding them. Throw AppError 409 if they already have that role.
```

### 4. Give the error you're seeing

For bugs, paste the exact error. Claude Code can search for the relevant code itself.

```
Getting this error on POST /sessions/:id/messages:
  TypeError: Cannot read properties of undefined (reading 'plan')
Stack trace: messages.service.ts:87
```

### 5. Use "Do not" to guard scope

```
Refactor the auth service to split forgotPassword into a helper. Do not change any
function signatures — the controller calls must stay identical.
```

---

## Project-Specific Recipes

Copy-paste these as starting points for common tasks.

### Add a new module

```
Create a new [name] module under src/modules/[name]/ following the standard pattern:
- [name].router.ts — Express router, mount at /api/v1/[name]
- [name].controller.ts — thin controller, calls service
- [name].service.ts — business logic using Prisma
- [name].schema.ts — Zod validation schemas

The module needs:
  POST /[name] — [describe what it creates]
  GET  /[name] — [describe the list endpoint]

Auth: authenticate + authorize("ROLE") on all routes.
Add Swagger JSDoc on every route.
Mount the router in src/routes/v1/index.ts.
```

### Add a single endpoint to an existing module

```
Add [METHOD] /[path] to src/modules/[name]/[name].router.ts.

- Validate input with Zod in [name].schema.ts
- Business logic in [name].service.ts (new function)
- Controller in [name].controller.ts (new function, calls service)
- Swagger JSDoc on the route

Auth middleware: authenticate, then authorize("[ROLE]") if role-restricted.
Return AppError with the appropriate status code for each error case.
```

### Write integration tests for a module

```
Write integration tests for the [name] module in
src/modules/[name]/__tests__/[name].router.test.ts.

Follow the testing conventions in CLAUDE.md:
- Use supertest against the Express app
- JWT signed directly (no DB lookup needed for 401/403 tests)
- Cover: 401 no token, 403 wrong role, 200 success, 400 bad input, 404 not found
- Do not mock the DB — tests should work against a real seeded DB
```

### Add Swagger JSDoc to an existing route

```
Add Swagger JSDoc comments to every route in src/modules/[name]/[name].router.ts.
Use the ErrorResponse schema (already defined in swagger.ts components) for error cases.
Tag the group as "[Name]".
After adding comments, run: bun run generate:types
```

### Prisma migration for a schema change

```
I need to add a [fieldName] field to the [ModelName] model. It should be:
- Type: [String/Int/Boolean/etc]
- [nullable / required with default X]
- [unique / indexed]

Update prisma/schema.prisma, then tell me the migration command to run.
Do not run the migration yourself.
```

### Debug a TypeScript error

```
Fix this TypeScript error in src/modules/[name]/[name].service.ts:

[paste the full error from bun run typecheck]

Do not change the function's public signature.
```

### Regenerate frontend types after a route change

```
I've finished updating the routes in [module]. Run the type generation pipeline:
  bun run generate:types
Then tell me which types changed in ../frontend/types/api.ts.
```

---

## What NOT to Ask in One Prompt

Split these into separate prompts to avoid large diffs and lost context:

| Instead of... | Do this... |
|---------------|------------|
| "Build the entire vocabulary module" | Build router → test → add service methods one at a time |
| "Refactor all controllers to use X" | Refactor one module, verify, then repeat |
| "Fix all TypeScript errors" | `bun run typecheck`, paste specific errors one at a time |
| "Update Swagger for all routes" | One module at a time |

---

## Prefixes That Change Claude's Behavior

These are prompt prefixes you can use to control how Claude responds:

| Prefix | Effect |
|--------|--------|
| `Think step by step:` | Forces reasoning before code — good for complex logic |
| `Only explain, do not edit:` | Research mode — Claude reads and explains without changing files |
| `Draft only, ask before editing:` | Claude shows what it would do before touching files |
| `List the files you will change before starting:` | Sanity check for large tasks |
| `Minimal change only:` | Prevents Claude from "improving" nearby code |

# Context Efficiency

How to keep sessions lean, avoid wasted tokens, and get consistent results
without hitting context limits.

---

## Why This Matters

Claude Code has a context window limit. As a session grows:
- Older messages get compressed or dropped
- Early instructions (your requirements) may be forgotten
- Responses slow down
- Each message costs more

The goal: **one task per session**, **clear context between tasks**.

---

## The Three Commands You'll Use Daily

### `/clear` — Start Fresh

Wipes the entire conversation history. File edits you made are kept — only the
chat is erased.

**Use it:**
- When switching to a completely unrelated task
- When a session went sideways and you want a clean slate
- After finishing a feature before starting a new one

```
> /clear
# Context is now empty — CLAUDE.md and memory still load automatically
```

### `/compact` — Compress Without Losing Thread

Replaces conversation history with a compressed summary. Good when you're mid-task
and the context is getting long but you don't want to lose the thread.

**Use it:**
- After exploring a lot of files in the first half of a session
- When Claude starts forgetting earlier requirements
- As a softer alternative to `/clear` that keeps task continuity

```
> /compact
# Claude summarizes the session; history is replaced with the summary
```

### `/cost` — Check Token Usage

Shows how many tokens the current session has used and an estimated cost.

**Use it:**
- Any time you're curious about session cost
- As a signal to `/compact` or `/clear` if it's getting expensive

```
> /cost
```

---

## Scoping Rules (How to Keep Requests Small)

### Rule 1: One task per session

Don't mix "add endpoint" + "fix this bug" + "write tests" in one session.
Each task benefits from a fresh context where Claude isn't juggling multiple things.

### Rule 2: Name the files you want Claude to work in

Claude does not read files it's not pointed to. If your task involves 3 files,
name all 3 upfront so Claude explores only those — not the whole codebase.

```
# Vague — Claude may read 10 files hunting for context
> Update the class join logic

# Precise — Claude goes straight to the right files
> Update the join logic in src/modules/classes/classes.service.ts,
> specifically the joinClass() function. Also update the Zod schema
> in classes.schema.ts if the input shape changes.
```

### Rule 3: Don't ask Claude to read things it already knows

`CLAUDE.md` already documents the DB schema, module pattern, auth flow, API conventions,
and tech stack. You don't need to explain these — just reference them by name:

```
# Redundant — CLAUDE.md already documents this
> The project uses Express with controllers and services. Auth uses JWT.
> Validate with Zod. Follow the module pattern with router/controller/service...

# Efficient
> Add POST /vocabulary following the standard module pattern.
```

### Rule 4: Tell Claude what to skip

If you know something is irrelevant, say so explicitly:

```
> Refactor the session service. Ignore the AI evaluation logic in getAIResponse() —
> that's a placeholder we'll replace later.
```

### Rule 5: Use `/diff` before a long commit, not after

After a session with many file changes, run `/diff` to review everything Claude
touched before committing. It's faster than `git diff` and keeps you in the session.

---

## Context Budget Per Task Type

Rough guideline for how "expensive" each task type is:

| Task | Context cost | Tip |
|------|-------------|-----|
| Fix a single bug with stack trace | Low | Paste exact error, name the file |
| Add one endpoint (all layers) | Medium | Use the recipe from `01-prompting.md` |
| Write tests for a module | Medium | Reference the existing test file |
| Add a new full module | High | Break into router → service → tests |
| Refactor across multiple modules | Very High | `/clear` between each module |
| Debug without a stack trace | Very High | Run `bun run typecheck` first, paste output |

---

## What Claude Loads Automatically (You Don't Need to Repeat)

| Already loaded | Source |
|----------------|--------|
| Tech stack (Bun, Express, Prisma, Zod, etc.) | `CLAUDE.md` |
| Module pattern (router/controller/service/schema) | `CLAUDE.md` |
| DB schema (all models, enums, relations) | `CLAUDE.md` |
| API conventions (AppError, asyncHandler, pagination) | `CLAUDE.md` |
| Auth flow (JWT, refresh tokens, authorize middleware) | `CLAUDE.md` |
| Testing conventions (supertest, co-located tests) | `CLAUDE.md` |
| Your past corrections and preferences | Auto-memory |

**If Claude gets something wrong that's documented in CLAUDE.md**, check `/memory` to
verify the file is being loaded, then report the issue so CLAUDE.md can be corrected.

---

## Common Mistakes That Waste Context

| Mistake | Fix |
|---------|-----|
| Pasting entire files | Name the file — Claude will read it with a tool |
| Re-explaining the module pattern every session | It's in CLAUDE.md — just say "follow the module pattern" |
| Long back-and-forth before making a decision | Use `Draft only, ask before editing:` prefix to align first |
| Asking for 5 features in one prompt | One feature per prompt |
| Asking Claude to "check everything" | Give it a specific file or error to focus on |
| Leaving a session running for hours | `/clear` between distinct tasks |

# Project Memory

How Claude remembers your project, what it knows across sessions, and how to keep
that knowledge accurate.

---

## Two Memory Systems

Claude Code uses two complementary systems that load automatically at the start of
every session:

| System | Maintained by | What it stores |
|--------|--------------|----------------|
| `CLAUDE.md` | You (the developer) | Project rules, architecture, conventions, schema |
| Auto-memory files | Claude itself | Your corrections, preferences, validated approaches |

Both are loaded silently before your first message. You never need to re-explain the
project from scratch.

---

## CLAUDE.md — The Project Brain

`backend/CLAUDE.md` is Claude's persistent brief on this project. It already covers:

- Tech stack and commands
- Architecture (module pattern, file layout)
- Full database schema with key design decisions
- API conventions (AppError, asyncHandler, pagination, auth middleware)
- Testing conventions
- Phase roadmap

### When to update CLAUDE.md

Update it **immediately** when any of the following change:

| Change | What to add/update |
|--------|--------------------|
| New module added | Add to architecture overview + phase tracker |
| New DB model or field | Update the schema table or design decisions |
| Auth flow changes | Update the auth section |
| New convention adopted | Add it under Code Standards |
| A design decision was made | Add to Key Design Decisions with the reasoning |
| A phase completed | Mark it ✅ in the Recommended Next Phases section |

### How to ask Claude to update CLAUDE.md

Claude can update it for you after finishing a task:

```
> We just finished adding the vocabulary SRS endpoints. Update CLAUDE.md to:
> - Mark Phase 5 vocabulary items as ✅
> - Add the SM-2 review flow to the Key Design Decisions section
> - Update the vocabulary module entry in the architecture overview
```

### Verify CLAUDE.md is loaded

```
/memory
```

This lists every file Claude currently has in context. If `CLAUDE.md` is missing from
the list, Claude can't see your project instructions and will make incorrect assumptions.

---

## Auto-Memory — What Claude Learns From You

Claude Code automatically saves things it learns about you and the project across
sessions — your preferences, past corrections, and validated approaches. These live in:

```
~/.claude/projects/[project-hash]/memory/
```

You never need to manage these files directly. But you can:

**Tell Claude to remember something explicitly:**
```
> Remember: in this project we never mock the database in tests — always use a real
> seeded DB. We got burned with false positives before.
```

**Tell Claude to forget something:**
```
> Forget the convention about X — we changed the approach.
```

**What gets saved automatically:**
- Corrections you make to Claude's approach ("no, don't do it that way")
- Approaches you confirm worked ("yes, exactly — keep doing that")
- Your preferences about response style, verbosity, commit messages
- Project context that isn't in CLAUDE.md (e.g., a decision made mid-session)

---

## Layered CLAUDE.md (Advanced)

You can have CLAUDE.md files at multiple levels. Claude prioritizes the most specific one:

```
esl-chatbot-web/
├── CLAUDE.md              ← monorepo-wide rules (if you add one)
└── backend/
    └── CLAUDE.md          ← backend-specific (current) ← this is what loads now
```

If you add a frontend module to this project, create `frontend/CLAUDE.md` with
frontend-specific conventions. Claude will load both when working across both directories.

### CLAUDE.local.md (Personal Overrides)

Create `backend/CLAUDE.local.md` for developer-specific overrides that should NOT be
committed to the repo:

```markdown
# My Local Overrides

- I prefer verbose explanations for auth-related changes
- My local DB is on port 5433 instead of 5432
- Skip Infisical warnings in terminal output
```

Add `CLAUDE.local.md` to `.gitignore` — it's personal config, not team config.

---

## What to Do When Claude "Forgets" Something

Possible causes, in order of likelihood:

1. **Context window compressed `CLAUDE.md`** — run `/compact` or `/clear` to reload
2. **CLAUDE.md doesn't cover the topic** — update it and ask again
3. **The instruction conflicts with Claude's training** — be more explicit in the prompt
4. **Auto-memory has a stale entry** — ask Claude to update or forget it

To diagnose:
```
> /memory
```

If the file you expect isn't listed — that's the issue. Report it and we'll investigate
the `.claude/settings.json` configuration.

---

## Practical Workflow

```
Start of project day:
  1. Open Claude Code (CLAUDE.md loads automatically)
  2. Run /memory to verify — takes 2 seconds

During a task:
  3. Prompt with specific file paths and context
  4. Run /compact if the session gets long
  5. Use /diff before committing

End of task:
  6. If something important was decided, tell Claude to remember it or update CLAUDE.md
  7. Run /clear before switching to a new, unrelated task
```

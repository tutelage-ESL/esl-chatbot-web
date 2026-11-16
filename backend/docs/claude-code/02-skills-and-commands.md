# Skills and Slash Commands

A reference for every command and skill available in this project, with when and how to use each.

---

## The Difference: Slash Commands vs Skills

| | Slash Commands | Skills |
|--|----------------|--------|
| What they are | Built-in hardcoded operations | Reusable AI prompts invoked as `/name` |
| Involve AI reasoning? | No — fixed logic | Yes — Claude reads context and acts |
| Customizable? | No | Yes — stored in `.claude/skills/` |
| Example | `/clear`, `/compact` | `/review`, `/simplify` |

Type `/` in any Claude Code session to see the full list. Keep typing to filter.

---

## Built-In Slash Commands

### Session & Context

| Command | What it does | When to use |
|---------|--------------|-------------|
| `/clear` | Wipes the entire conversation history | Starting a new unrelated task |
| `/compact` | Compresses history into a summary | Context is getting long but you want continuity |
| `/cost` | Shows tokens used + estimated cost so far | Checking how expensive the current session is |
| `/usage` | Shows your plan limits and rate limit status | If you hit slowdowns |

### Navigation & Review

| Command | What it does | When to use |
|---------|--------------|-------------|
| `/diff` | Interactive diff viewer of all changes this session | Before committing — review everything Claude touched |
| `/rewind` | Reverts conversation AND file edits to a previous point | Claude went in the wrong direction |
| `/copy` | Copies Claude's last response to clipboard | Grabbing a code snippet or explanation |

### Project & Memory

| Command | What it does | When to use |
|---------|--------------|-------------|
| `/memory` | Shows which CLAUDE.md and memory files are loaded | Verifying Claude sees your project instructions |
| `/init` | Generates a new CLAUDE.md from the current codebase | Starting a new project without a CLAUDE.md |

### Session Management

| Command | What it does | When to use |
|---------|--------------|-------------|
| `/resume` | Resumes a previous Claude Code session | Coming back to an interrupted task |
| `/model` | Switches the active Claude model | Temporarily switching model mid-session |
| `/fast` | Toggles fast mode (Opus 4.6 — faster output) | Long generation tasks where speed matters |
| `/help` | Lists all available commands | When you forget something |

---

## Skills Available in This Project

Skills are invoked with `/skill-name` (no "skill" prefix needed in the slash).

### `/review`

**What it does:** Reviews your current branch's changes against `main` — catches logic
errors, missing edge cases, inconsistent patterns.

**When to use:**
- Before opening a PR
- After finishing a feature to sanity-check your own work

**How to invoke:**
```
/review
```

Claude will read the diff and report: what's changed, what looks risky, what's missing.

---

### `/security-review`

**What it does:** Security-focused review of pending changes. Checks for OWASP issues
(injection, auth bypass, excessive permissions, exposed secrets, etc.).

**When to use:**
- Before any auth-related PR (new middleware, token handling, password flows)
- When adding new input validation or DB queries
- After any change in `src/middlewares/` or `src/modules/auth/`

**How to invoke:**
```
/security-review
```

This is a **must-run** before merging anything that touches auth, sessions, or subscriptions.

---

### `/simplify`

**What it does:** Reviews recently changed code for over-engineering, redundancy, and
efficiency issues — then fixes them.

**When to use:**
- After a feature is working but feels too complex
- After a refactor where you added abstractions
- When a service function grew too large

**How to invoke:**
```
/simplify
```

Good to run after `/review` — review first for correctness, then simplify.

---

### `/init`

**What it does:** Analyzes the codebase and generates a `CLAUDE.md` file.

**When to use:**
- This project already has a thorough `CLAUDE.md` — do NOT run `/init` here.
- Only use on a fresh project without a `CLAUDE.md`.

---

### `/less-permission-prompts`

**What it does:** Scans your session transcripts for repeated tool calls that kept asking
for permission, then adds them to the project's allowlist in `.claude/settings.json`.

**When to use:**
- After your first few sessions when you've noticed repeated "allow this?" prompts
- Run it once; the permissions persist for all future sessions

**How to invoke:**
```
/less-permission-prompts
```

---

### `/update-config`

**What it does:** Configures Claude Code behavior via `settings.json` — permissions, hooks,
environment variables, and automated behaviors.

**When to use:**
- Setting up hooks (e.g., run `bun run typecheck` after every file edit)
- Adding permissions for specific commands
- Configuring environment variables

**How to invoke:**
```
/update-config
```

Then describe what you want. Example:
```
/update-config
Add a hook that runs `bun run typecheck` after Claude edits any .ts file
```

---

### `/loop`

**What it does:** Runs a prompt on a recurring interval — either you set the interval
or Claude self-paces.

**When to use:**
- Watching a long-running process (e.g., checking if a migration finished)
- Polling for an external state change
- Running a repetitive check during development

**How to invoke:**
```
/loop 30s Check if the dev server is healthy at localhost:8000/health and report the status
```

---

### `/schedule`

**What it does:** Creates a remote agent that runs on a cron schedule — completely
independent of your active session.

**When to use:**
- Automating tasks that need to run on a schedule (e.g., daily DB health check)
- Setting up CI-adjacent automation

**How to invoke:**
```
/schedule
```

Then describe the task, frequency, and what to do with results.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+C` | Cancel current generation |
| `Escape` | Go back / exit current mode |
| `↑ / ↓` | Navigate prompt history |
| `Shift+Tab` | Toggle auto-accept mode (Claude edits without asking) |

> **Auto-accept mode** is powerful but risky. Only enable it for low-stakes tasks
> (adding comments, formatting) — not for logic changes.

---

## Running Shell Commands Yourself

If Claude asks you to run a command (e.g., a migration or interactive login), use the
`!` prefix to run it directly in the session — the output lands in the conversation:

```
! bun run db:migrate
! infisical login
! bun run typecheck
```

This is faster than switching windows and paste-copying output.

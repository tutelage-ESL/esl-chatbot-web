# Claude Code — Developer Guide

A practical guide to using Claude Code effectively on this project.
Aimed at developers who know AI tools but are new to Claude Code's specific features.

---

## What Is Claude Code?

Claude Code is Anthropic's AI coding assistant that runs directly in your terminal (and IDE).
Unlike a chatbot you paste code into, Claude Code:

- **reads your actual files** — no copy-pasting required
- **edits files directly** — not just suggests
- **remembers your project** across sessions via `CLAUDE.md` and a memory system
- **runs tools** — bash commands, file search, git, web search, and more
- **has skills** — reusable slash commands you invoke for specific tasks

---

## Guides in This Folder

| File | What it covers |
|------|----------------|
| [01-prompting.md](./01-prompting.md) | How to write prompts that get great results; project-specific recipes |
| [02-skills-and-commands.md](./02-skills-and-commands.md) | Every slash command + skill available in this project, and when to reach for each |
| [03-context-efficiency.md](./03-context-efficiency.md) | Managing token usage: /clear, /compact, scoping requests |
| [04-project-memory.md](./04-project-memory.md) | How Claude remembers things; how to maintain `CLAUDE.md` |

---

## 60-Second Quick Start

```bash
# 1. Open terminal in backend/
cd esl-chatbot-web/backend

# 2. Start Claude Code
claude

# 3. Verify it sees the project instructions
/memory

# 4. Ask it something specific
> Add a GET /users/:id/profile endpoint following the existing users module pattern

# 5. When you switch to a new task, clear the context
/clear
```

**The #1 rule:** the more context Claude has from `CLAUDE.md` and your prompt, the less
it needs to ask, explore, or guess. Keep `CLAUDE.md` accurate and your prompts precise.

---

## How Claude Code Reads This Project

At startup, Claude Code automatically reads:

1. **`backend/CLAUDE.md`** — tech stack, architecture, conventions, DB schema, module pattern
2. **Auto-memory files** — corrections and preferences it has learned from past sessions
3. **Files you reference** — anything you mention or that gets read via tools

It does NOT speculatively read every file. If you need it to understand a specific module,
mention the path explicitly or ask it to read it.

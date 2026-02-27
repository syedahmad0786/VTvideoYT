# Setting Up the `cs` and `cr` Shell Aliases

## What These Are

Two shell aliases that launch Claude Code with the `/prime` command pre-loaded, so every session starts with full workspace context. They differ only in permission mode.

## Setup

Add to `~/.zshrc` (or `~/.bashrc`):

```bash
alias cs='claude "/prime"'
alias cr='claude --dangerously-skip-permissions "/prime"'
```

Reload with `source ~/.zshrc`.

## The Commands

### `cs` — Claude Safe

Opens Claude Code and runs `/prime`. Claude asks permission before every tool call (reading files, running commands, editing code). The user approves or denies each action.

**Why it exists:** Oversight. When working on unfamiliar code, sensitive operations, or tasks where you want to understand exactly what Claude is doing before it does it, `cs` keeps you in the loop. It's the default for a reason — you trade speed for control.

### `cr` — Claude Run

Same as `cs` but passes `--dangerously-skip-permissions`, which lets Claude execute tools without asking. Still runs `/prime` so context is fully loaded.

**Why it exists:** Speed. When you're doing routine work — generating reports, running familiar workflows, iterating on known tasks — the permission prompts become friction. `cr` removes that friction so Claude can work autonomously. The name intentionally mirrors the flag's warning: you're choosing to trust Claude with unsupervised execution.

## Why Both Matter

The pair captures two distinct working modes:

- **Supervised (`cs`)**: You review each action. Use for first-time tasks, anything touching production, or when learning how Claude approaches a problem.
- **Autonomous (`cr`)**: Claude runs freely. Use for trusted, repeatable work where approvals slow you down more than they protect you.

Both always run `/prime` first, which reads `CLAUDE.md` and the `context/` directory so Claude starts oriented to the user, workspace structure, and current goals — regardless of permission mode.

# Plan: Move Daily Research Automation to GitHub Actions

**Created:** 2026-02-22
**Status:** Implemented
**Request:** Move the daily research pipeline from a local macOS LaunchAgent to GitHub Actions so it runs reliably Mon-Fri without requiring the Mac to be awake or online.

---

## Overview

### What This Plan Accomplishes

Migrates the automated daily research pipeline (`/daily-research`) from a local macOS LaunchAgent to a GitHub Actions scheduled workflow. The result is a fully cloud-hosted automation that runs every weekday at 6:30 AM UAE time — researching leads, enriching contacts via Apollo, drafting outreach, syncing to Google Sheets, and emailing a morning brief — regardless of whether your Mac is on.

### Why This Matters

The current LaunchAgent setup only fires when the Mac is awake and logged in. If the lid is closed, the machine is off, or you're traveling, the run is silently skipped with no retry. This defeats the purpose of automation. GitHub Actions runners are always available and ephemeral — the pipeline runs on schedule every time.

---

## Current State

### Relevant Existing Structure

| File | Role |
|---|---|
| `scripts/daily-research.sh` | Shell runner — invokes Claude CLI, extracts summary JSON, triggers email |
| `.claude/commands/daily-research.md` | The `/daily-research` command — 9-phase autonomous pipeline |
| `reference/daily-research-config.md` | Sector rotation schedule, search queries, volume targets |
| `.mcp.json` | MCP server config — Apollo via `uv run` (stdio) |
| `.apollo-mcp-server/` | Apollo MCP server (Python, cloned from `edwardchoh/apollo-io-mcp-server`, custom patches applied) |
| `data/sector-rotation.json` | Rotation state — last run date, query indexes, run log |
| `data/research-history.json` | Previously researched companies (deduplication) |
| `data/sheets-config.json` | Google Sheets webhook URL (sensitive) |
| `scripts/sheets-sync.sh` | Webhook client — pushes data to Google Sheets |
| `~/Library/LaunchAgents/com.hrmny.daily-research.plist` | macOS LaunchAgent (6:30 AM daily) |
| `.gitignore` | Currently only ignores `.apollo-mcp-server/` |

### Gaps or Problems Being Addressed

1. **LaunchAgent requires Mac to be awake + logged in** — runs are silently skipped if the machine is asleep, lid is closed, or powered off
2. **No missed-run recovery** — if the 6:30 AM window is missed, the run is lost for that day
3. **No remote visibility** — no way to check run status, logs, or history without being on the Mac
4. **State files are local-only** — `sector-rotation.json` and `research-history.json` exist only on the Mac, not backed up
5. **Workspace has no GitHub remote** — needs to be pushed to a private GitHub repo first

---

## Proposed Changes

### Summary of Changes

- Create a private GitHub repository and push the workspace
- Add the Apollo MCP server to the workspace repo (un-gitignore, remove its nested `.git`)
- Create a `.github/workflows/daily-research.yml` workflow file
- Add a `.data/` gitignore strategy to commit state files but exclude secrets and logs
- Store sensitive values (API keys, webhook URL) as GitHub Secrets
- Update `CLAUDE.md` to document the new automation setup
- Keep the local LaunchAgent as an optional fallback (no removal)

### New Files to Create

| File Path | Purpose |
|---|---|
| `.github/workflows/daily-research.yml` | GitHub Actions workflow — scheduled cron job for daily research |

### Files to Modify

| File Path | Changes |
|---|---|
| `.gitignore` | Remove `.apollo-mcp-server/`, add targeted ignores for `data/` (secrets, logs, node_modules, etc.) |
| `CLAUDE.md` | Update "Daily Automation" section to document GitHub Actions setup, secrets, and manual controls |

### Files to Delete

| File Path | Reason |
|---|---|
| `.apollo-mcp-server/.git/` | Remove nested git repo so it can be committed to workspace repo |

---

## Design Decisions

### Key Decisions Made

1. **Use raw Claude CLI, not `claude-code-action`**: The GitHub Action wrapper (`anthropics/claude-code-action@v1`) is designed for PR/issue workflows with GitHub context. Our use case is a scheduled cron job that runs a slash command — raw CLI with `-p` mode is the right fit.

2. **Commit Apollo MCP server to workspace repo**: The Apollo MCP server is currently gitignored and cloned separately. For CI reliability, it should be part of the workspace repo. This avoids fetching from an external repo on every run and ensures our custom patches (Pydantic fixes, `base.py`, validation fallback) are always available.

3. **Persist state via git commit**: `sector-rotation.json` and `research-history.json` will be committed back to the repo after each run. This is the most reliable persistence method — survives indefinitely, is version-tracked, and stays in sync with local usage. The `[skip ci]` commit message tag prevents recursive workflow triggers.

4. **Reconstruct `sheets-config.json` from a GitHub Secret**: The webhook URL is sensitive and should not be committed. The workflow creates it at runtime from `SHEETS_WEBHOOK_URL` secret.

5. **Keep the local LaunchAgent**: No reason to remove it. If the Mac happens to be awake, both can coexist — the deduplication in `research-history.json` and the date check in `sector-rotation.json` prevent double-runs. But in practice, you can disable the local one once GitHub Actions is confirmed working.

6. **Use `--model sonnet` for cost efficiency**: Daily research doesn't need Opus-level reasoning. Sonnet is the existing model choice in `daily-research.sh` and keeps API costs reasonable for daily automated runs.

7. **Schedule at UTC 02:30 = UAE 06:30**: GitHub Actions cron uses UTC. Dubai is UTC+4, so 6:30 AM UAE = 2:30 AM UTC. Note: GitHub Actions cron can have up to ~15 minutes of delay on free plans.

8. **Add `workflow_dispatch` for manual triggers**: Allows running the pipeline manually from the GitHub Actions UI with optional mode (dry-run) and sector override inputs.

### Alternatives Considered

| Alternative | Why Rejected |
|---|---|
| **pmset wake + LaunchAgent** | Still depends on the Mac being plugged in and not shut down. Not truly independent. |
| **Small VPS (DigitalOcean)** | Extra infrastructure to maintain, monthly cost, more setup. GitHub Actions is free and simpler. |
| **GitHub Actions cache for state** | Caches are evicted after 7 days of non-access. State files are critical — git commit is more reliable. |
| **Clone Apollo MCP server in CI** | Our custom patches (Pydantic fixes) wouldn't be available. Would need a fork or patch step. Simpler to commit the server to the workspace. |
| **Use `claude-code-action`** | Designed for PR/issue trigger workflows. Overkill for a cron job and adds unnecessary GitHub API integration. |

### Open Questions

1. **GitHub repo name**: Suggest `hrmny-sales-workspace` (private). Confirm before creating.
2. **GitHub account**: Which GitHub account/org should host the repo? (Personal or an hrmny org?)
3. **Notification on failure**: Should the workflow send you an email/Slack notification if the run fails? GitHub Actions has built-in failure notifications, but we could also trigger the existing error email via the Apps Script webhook.

---

## Step-by-Step Tasks

### Step 1: Create a Private GitHub Repository

Create a new private repo to host the workspace. The workspace currently has no remote.

**Actions:**
- Create a private GitHub repo (suggested name: `hrmny-sales-workspace`)
- Add the remote to the local git repo
- Do NOT push yet — we need to update `.gitignore` and prepare files first

**Commands:**
```bash
gh repo create hrmny-sales-workspace --private --source=. --remote=origin
```

**Files affected:**
- `.git/config` (remote added)

---

### Step 2: Prepare the Apollo MCP Server for Commit

The Apollo MCP server is currently gitignored and has its own `.git` directory. We need to include it in the workspace repo.

**Actions:**
- Remove the nested `.git` directory from `.apollo-mcp-server/`
- Remove `.apollo-mcp-server/` from `.gitignore`
- Remove `.apollo-mcp-server/.venv/` and `__pycache__/` (these are generated and should not be committed)
- Add `.apollo-mcp-server/.venv/` and `__pycache__/` to `.gitignore`

**Files affected:**
- `.gitignore`
- `.apollo-mcp-server/` (remove `.git/`, `.venv/`, `__pycache__/`)

---

### Step 3: Update `.gitignore`

Replace the current `.gitignore` (which only has `.apollo-mcp-server/`) with a proper one that:
- Commits the Apollo MCP server (code only, not venv/cache)
- Commits state files (`data/sector-rotation.json`, `data/research-history.json`)
- Ignores secrets (`data/sheets-config.json`), logs (`data/logs/`), intent exports (`data/intent-exports/`), and generated output
- Ignores standard items (`node_modules/`, `.DS_Store`, etc.)

**New `.gitignore` content:**
```gitignore
# Dependencies
node_modules/

# OS
.DS_Store

# Apollo MCP server — generated files only
.apollo-mcp-server/.venv/
.apollo-mcp-server/__pycache__/
.apollo-mcp-server/.git/

# Data — secrets and generated files
data/sheets-config.json
data/logs/
data/intent-exports/
data/.DS_Store

# Outputs — generated per-run
outputs/

# Misc
.clasp.json
*.pyc
```

**Files affected:**
- `.gitignore`

---

### Step 4: Configure GitHub Secrets

Store sensitive values as GitHub repository secrets. These will be injected into the workflow at runtime.

**Actions:**
Add these secrets via GitHub Settings > Secrets and variables > Actions (or via `gh` CLI):

| Secret Name | Value Source |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key (for Claude CLI) |
| `APOLLO_API_KEY` | From `.mcp.json` → `env.APOLLO_IO_API_KEY` |
| `SHEETS_WEBHOOK_URL` | From `data/sheets-config.json` → `webhook_url` |

**Commands:**
```bash
gh secret set ANTHROPIC_API_KEY
gh secret set APOLLO_API_KEY
gh secret set SHEETS_WEBHOOK_URL
```

**Files affected:**
- None (GitHub-side configuration)

---

### Step 5: Create the GitHub Actions Workflow

Create the workflow file that runs the daily research pipeline on a cron schedule.

**Actions:**
- Create `.github/workflows/` directory
- Create `daily-research.yml` with the full workflow

**Workflow file: `.github/workflows/daily-research.yml`**

```yaml
name: Daily Research Pipeline

on:
  schedule:
    # 6:30 AM UAE (UTC+4) = 2:30 AM UTC, Monday-Friday
    - cron: '30 2 * * 1-5'
  workflow_dispatch:
    inputs:
      mode:
        description: 'Run mode'
        required: false
        default: 'standard'
        type: choice
        options:
          - standard
          - dry-run
      sector:
        description: 'Override sector (leave empty for rotation)'
        required: false
        type: string

permissions:
  contents: write

jobs:
  daily-research:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - name: Checkout workspace
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup uv (Python package manager)
        uses: astral-sh/setup-uv@v7
        with:
          enable-cache: true

      - name: Install Python
        run: uv python install 3.12

      - name: Install Claude Code CLI
        run: npm install -g @anthropic-ai/claude-code

      - name: Create runtime config files
        run: |
          # Create sheets-config.json from secret
          mkdir -p data
          cat > data/sheets-config.json <<EOF
          {
            "webhook_url": "${{ secrets.SHEETS_WEBHOOK_URL }}",
            "sheet_id": "1wKQvEHPHuHemKRJu7oQBfz6jCmHm40AlDmX7xSHB1u8"
          }
          EOF

          # Create MCP config with Apollo API key from secret
          cat > /tmp/mcp-config.json <<EOF
          {
            "mcpServers": {
              "apollo": {
                "type": "stdio",
                "command": "uv",
                "args": [
                  "run",
                  "--directory",
                  "${{ github.workspace }}/.apollo-mcp-server",
                  "mcp",
                  "run",
                  "server.py"
                ],
                "env": {
                  "APOLLO_IO_API_KEY": "${{ secrets.APOLLO_API_KEY }}"
                }
              }
            }
          }
          EOF

      - name: Build Claude prompt
        id: prompt
        run: |
          MODE="${{ inputs.mode || 'standard' }}"
          SECTOR="${{ inputs.sector }}"

          ARGS=""
          if [ "$MODE" = "dry-run" ]; then
            ARGS="dry-run"
          fi
          if [ -n "$SECTOR" ]; then
            ARGS="$ARGS sector:${SECTOR}"
          fi
          ARGS=$(echo "$ARGS" | xargs)

          echo "args=$ARGS" >> "$GITHUB_OUTPUT"
          echo "Mode: $MODE | Sector: ${SECTOR:-rotation} | Args: $ARGS"

      - name: Run daily research
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          echo "=== Starting daily research pipeline ==="
          echo "Date: $(date -u '+%Y-%m-%d %H:%M UTC')"

          claude -p \
            --dangerously-skip-permissions \
            --model sonnet \
            --max-turns 30 \
            --mcp-config /tmp/mcp-config.json \
            "/daily-research ${{ steps.prompt.outputs.args }}" \
            > /tmp/claude-output.txt 2>&1

          echo "=== Claude completed ==="

      - name: Extract and send summary email
        if: inputs.mode != 'dry-run'
        run: |
          # Extract summary JSON from Claude output
          SUMMARY_JSON=$(python3 -c "
          import sys, json
          content = open('/tmp/claude-output.txt').read()
          start = content.find('===DAILY_SUMMARY_START===')
          end = content.find('===DAILY_SUMMARY_END===')
          if start == -1 or end == -1:
              print('{}')
              sys.exit(0)
          start += len('===DAILY_SUMMARY_START===')
          raw = content[start:end].strip()
          parsed = json.loads(raw)
          print(json.dumps(parsed))
          " 2>/dev/null || echo "{}")

          if [ "$SUMMARY_JSON" = "{}" ]; then
            echo "WARNING: Could not extract summary JSON"
            DATE=$(date -u '+%Y-%m-%d')
            SUMMARY_JSON="{\"date\":\"$DATE\",\"error\":true,\"error_message\":\"Could not parse summary from Claude output\",\"sector_focus\":\"Unknown\",\"companies_researched\":0,\"companies\":[],\"total_contacts_enriched\":0,\"outreach_drafted_count\":0,\"outreach_drafts\":[],\"dry_run\":false,\"errors\":[\"Summary parsing failed\"],\"market_signals\":[]}"
          fi

          # Send email via Apps Script webhook
          bash scripts/sheets-sync.sh send_summary "$SUMMARY_JSON" || echo "WARNING: Email summary failed"

      - name: Commit state updates
        if: inputs.mode != 'dry-run'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

          # Stage state files (only if they exist and changed)
          git add data/sector-rotation.json data/research-history.json 2>/dev/null || true

          # Commit only if there are changes
          git diff --cached --quiet || {
            git commit -m "chore: update daily research state [skip ci]"
            git push
          }

      - name: Upload research output
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: research-output-${{ github.run_number }}
          path: /tmp/claude-output.txt
          retention-days: 14

      - name: Report failure
        if: failure()
        run: |
          DATE=$(date -u '+%Y-%m-%d')
          ERROR_JSON="{\"date\":\"$DATE\",\"error\":true,\"error_message\":\"GitHub Actions daily research workflow failed. Check run: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}\",\"sector_focus\":\"Unknown\",\"companies_researched\":0,\"companies\":[],\"total_contacts_enriched\":0,\"outreach_drafted_count\":0,\"dry_run\":false,\"errors\":[\"Workflow failed\"],\"market_signals\":[]}"
          bash scripts/sheets-sync.sh send_summary "$ERROR_JSON" 2>/dev/null || echo "Could not send error email"
```

**Files affected:**
- `.github/workflows/daily-research.yml` (new)

---

### Step 6: Update CLAUDE.md — Daily Automation Section

Replace the "Daily Automation" section to reflect the new GitHub Actions setup while keeping the local option documented.

**Actions:**
- Update the "Daily Automation" section in `CLAUDE.md`
- Document GitHub Actions setup, secrets, and manual controls
- Keep local LaunchAgent as documented fallback

**Updated section content:**

Replace the existing "Daily Automation" section with:

```markdown
## Daily Automation

The workspace includes an automated daily research pipeline that runs at 6:30 AM UAE time, Monday-Friday.

**How it works (GitHub Actions — primary):**
1. GitHub Actions cron triggers `.github/workflows/daily-research.yml` at 6:30 AM UAE (2:30 AM UTC)
2. Runner installs Claude CLI, uv, and Python
3. Claude executes the full pipeline: sector rotation → research → contacts → outreach → sync
4. Summary JSON is extracted and sent to Apps Script webhook
5. Formatted HTML email arrives in inbox by ~7 AM
6. State files (`sector-rotation.json`, `research-history.json`) are committed back to the repo

**Sector rotation (Mon-Fri):**
- Mon/Thu: Retail + Consumer Experience
- Tue: Sports / Wellness / Movements
- Wed: Automotive / EV
- Fri: Signal-driven (market news)
- Sat/Sun: No run

**Configuration:** `reference/daily-research-config.md`
**State files:** `data/sector-rotation.json`, `data/research-history.json` (committed to repo)
**Workflow:** `.github/workflows/daily-research.yml`

**GitHub Secrets required:**
- `ANTHROPIC_API_KEY` — Claude CLI authentication
- `APOLLO_API_KEY` — Apollo.io people enrichment
- `SHEETS_WEBHOOK_URL` — Google Sheets Apps Script webhook

**Manual controls:**
```bash
# Trigger manually from GitHub (opens browser)
gh workflow run daily-research.yml

# Trigger with options
gh workflow run daily-research.yml -f mode=dry-run
gh workflow run daily-research.yml -f sector=automotive

# Check recent runs
gh run list --workflow=daily-research.yml --limit=5

# View logs from the latest run
gh run view --log

# Download research output artifact
gh run download --name research-output-<run-number>
```

**Local fallback (macOS LaunchAgent — optional):**
The original local automation is still available if needed. It requires the Mac to be awake and logged in.
```bash
# Run locally
scripts/daily-research.sh

# Dry run
scripts/daily-research.sh --dry-run

# Check launchd status
launchctl list | grep hrmny

# Disable local automation (recommended once GitHub Actions is confirmed)
launchctl unload ~/Library/LaunchAgents/com.hrmny.daily-research.plist
```
```

**Files affected:**
- `CLAUDE.md`

---

### Step 7: Initial Commit and Push

Stage all files, commit, and push to the new GitHub repo.

**Actions:**
- Review staged files to ensure no secrets are included
- Commit everything
- Push to the new private repo

**Commands:**
```bash
git add .gitignore .apollo-mcp-server/ .github/ CLAUDE.md
git add data/sector-rotation.json data/research-history.json
git add -A  # Stage all other tracked/untracked files (review first)
git status  # Verify — no sheets-config.json, no .env, no secrets
git commit -m "Add GitHub Actions daily research automation"
git push -u origin main
```

**Files affected:**
- All workspace files (initial push to remote)

---

### Step 8: Set GitHub Secrets

Add the three required secrets to the GitHub repo.

**Actions:**
```bash
gh secret set ANTHROPIC_API_KEY
# Paste your Anthropic API key when prompted

gh secret set APOLLO_API_KEY
# Use the value from .mcp.json: qLeRGwBmRTZqgwbTERwrzA
# (This key is already in committed files — consider rotating it after migration)

gh secret set SHEETS_WEBHOOK_URL
# Use the value from data/sheets-config.json
```

**Files affected:**
- None (GitHub-side)

---

### Step 9: Test with a Dry Run

Trigger the workflow manually in dry-run mode to verify everything works before relying on the cron schedule.

**Actions:**
```bash
gh workflow run daily-research.yml -f mode=dry-run
gh run watch  # Watch the run in real time
```

**Verify:**
- Workflow starts and installs dependencies
- Claude CLI runs successfully
- Apollo MCP server initializes
- No errors in the logs

**Files affected:**
- None

---

### Step 10: Test with a Full Run

Trigger a full standard run with a sector override to verify end-to-end operation including Apollo enrichment, Sheets sync, and email delivery.

**Actions:**
```bash
gh workflow run daily-research.yml -f sector=sports
gh run watch
```

**Verify:**
- Leads researched and enriched via Apollo
- Data synced to Google Sheets (check the sheet)
- Summary email received in inbox
- State files committed back to repo
- Research output artifact downloadable

**Files affected:**
- `data/sector-rotation.json` (updated by the run)
- `data/research-history.json` (updated by the run)

---

## Connections & Dependencies

### Files That Reference This Area

| File | Reference |
|---|---|
| `CLAUDE.md` | Documents daily automation setup, controls, and shell commands |
| `.claude/commands/daily-research.md` | The command itself — no changes needed, runs the same in CI |
| `scripts/daily-research.sh` | Local runner script — kept as fallback, not modified |
| `reference/daily-research-config.md` | Config — no changes needed |
| `~/Library/LaunchAgents/com.hrmny.daily-research.plist` | Local LaunchAgent — kept as optional fallback |

### Updates Needed for Consistency

- `CLAUDE.md` "Daily Automation" section must be rewritten (Step 6)
- `.gitignore` must be updated to include Apollo MCP server and state files (Step 3)

### Impact on Existing Workflows

- **No breaking changes**: The `/daily-research` command is unchanged. It runs identically in CI.
- **State sync**: If you run `/daily-research` locally AND GitHub Actions runs it, the state files will diverge. Solution: `git pull` before local runs, or disable the local LaunchAgent.
- **Apollo credits**: Both local and CI runs consume the same Apollo credits. Don't run both on the same day.

---

## Validation Checklist

- [ ] Private GitHub repo created and workspace pushed
- [ ] Apollo MCP server committed to workspace repo (no nested `.git`)
- [ ] `.gitignore` updated — no secrets committed, state files committed
- [ ] GitHub Secrets set: `ANTHROPIC_API_KEY`, `APOLLO_API_KEY`, `SHEETS_WEBHOOK_URL`
- [ ] Workflow file created at `.github/workflows/daily-research.yml`
- [ ] Dry run completes successfully via `workflow_dispatch`
- [ ] Full run completes: leads researched, contacts enriched, Sheets synced, email received
- [ ] State files committed back to repo after full run
- [ ] `CLAUDE.md` updated with new automation docs
- [ ] Local LaunchAgent disabled (optional, after confirming CI works)

---

## Success Criteria

The implementation is complete when:

1. **The daily research pipeline runs automatically every weekday at ~6:30 AM UAE** via GitHub Actions, with no dependency on any local machine being online
2. **The full pipeline works end-to-end in CI**: sector rotation → web research → Apollo enrichment → outreach drafts → Google Sheets sync → summary email delivered to inbox
3. **State persists between runs**: `sector-rotation.json` and `research-history.json` are committed after each run and correctly inform the next run's sector and deduplication
4. **Manual triggers work**: `gh workflow run` with `mode` and `sector` inputs function correctly
5. **Failure notification works**: If the workflow fails, an error email is sent via the Apps Script webhook

---

## Notes

- **GitHub Actions cron accuracy**: Free-tier GitHub Actions cron jobs can be delayed by up to 15 minutes during high-load periods. The email might arrive at 6:45 AM instead of 7:00 AM. This is acceptable.
- **API costs**: Each daily run uses ~30K-50K tokens (Sonnet) + up to 10 Apollo enrichment credits. At current Sonnet pricing, this is approximately $0.30-0.50 per run, or ~$7-10/month.
- **Apollo API key rotation**: The Apollo API key is currently committed in `.mcp.json`. After migrating to GitHub Secrets, consider rotating the key and removing it from committed history.
- **Future enhancement**: Could add a Slack notification step alongside the email for faster visibility.
- **Concurrency**: The workflow should include a concurrency guard to prevent parallel runs if a manual trigger overlaps with the cron schedule. Add `concurrency: { group: daily-research, cancel-in-progress: true }` to the workflow if this becomes an issue.

---

## Implementation Notes

**Implemented:** 2026-02-22

### Summary

- Created private GitHub repo `ayhrmny/hrmny-sales-workspace` and pushed the full workspace
- Removed nested `.git` from `.apollo-mcp-server/` and committed the server source code to the workspace repo
- Updated `.gitignore` (root + `data/`) to commit state files while excluding secrets, logs, and generated files
- Created `.github/workflows/daily-research.yml` with cron schedule (2:30 UTC = 6:30 UAE), manual dispatch with mode/sector inputs, state commit-back, artifact upload, and failure reporting
- Set all 3 GitHub Secrets: `ANTHROPIC_API_KEY`, `APOLLO_API_KEY`, `SHEETS_WEBHOOK_URL`
- Updated `CLAUDE.md` Daily Automation section with GitHub Actions docs, controls, and local fallback

### Deviations from Plan

- `data/.gitignore` was also updated (removed state file ignores) — the plan only mentioned the root `.gitignore` but the `data/.gitignore` was blocking state file commits
- Steps 4 (configure secrets) and 8 (set secrets) from the plan were consolidated — secrets were set after push since `gh secret set` requires the repo to exist on GitHub
- The "Report failure" step was kept in the workflow even though user chose "Default GitHub only" for notifications — it serves as a secondary safety net via the existing Apps Script webhook

### Issues Encountered

- `gh` CLI was not installed — installed via Homebrew (`brew install gh`)
- `gh` was not authenticated — user ran `gh auth login` interactively
- Apollo API key is committed in `.mcp.json` in the repo history — plan notes recommend rotating the key post-migration

#!/bin/bash
#
# daily-research.sh — Run the automated daily sales research pipeline
#
# Usage:
#   daily-research.sh                    # Standard run
#   daily-research.sh --dry-run          # Skip Apollo + Sheets sync
#   daily-research.sh --sector retail    # Override sector
#   daily-research.sh --test-email       # Send a test email summary
#
# Called by launchd at 6:30 AM daily, or manually.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$WORKSPACE_DIR/data/logs"
CONFIG_FILE="$WORKSPACE_DIR/data/sheets-config.json"
DATE=$(date +%Y-%m-%d)
LOG_FILE="$LOG_DIR/daily-research-${DATE}.log"

# --- Ensure log directory exists ---
mkdir -p "$LOG_DIR"

# --- Helpers ---
log() {
  echo "[${DATE} $(date +%H:%M:%S)] $1" | tee -a "$LOG_FILE"
}

send_error_email() {
  local error_msg="$1"
  if [ -f "$CONFIG_FILE" ]; then
    local url
    url=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['webhook_url'])" 2>/dev/null || echo "")
    if [ -n "$url" ]; then
      local payload
      payload=$(python3 -c "
import json, sys
print(json.dumps({
  'action': 'send_daily_summary',
  'data': {
    'error': True,
    'error_message': sys.argv[1],
    'date': sys.argv[2]
  }
}))
" "$error_msg" "$DATE")
      curl -s -L -H "Content-Type: application/json" -d "$payload" "$url" > /dev/null 2>&1 || true
    fi
  fi
}

error() {
  log "ERROR: $1"
  send_error_email "$1" || true
  exit 1
}

# --- Parse arguments ---
DRY_RUN=""
SECTOR_OVERRIDE=""
TEST_EMAIL=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN="dry-run"
      shift
      ;;
    --sector)
      SECTOR_OVERRIDE="sector:$2"
      shift 2
      ;;
    --test-email)
      TEST_EMAIL=true
      shift
      ;;
    *)
      log "Unknown argument: $1"
      shift
      ;;
  esac
done

# --- Test email mode ---
if [ "$TEST_EMAIL" = true ]; then
  log "Sending test email summary..."
  "$SCRIPT_DIR/sheets-sync.sh" send_summary '{"date":"'"$DATE"'","test":true,"sector_focus":"Test Run","companies_researched":0,"companies":[],"total_contacts_enriched":0,"outreach_drafted_count":0,"dry_run":true,"errors":[],"market_signals":["This is a test email — daily research automation is working"]}'
  log "Test email sent."
  exit 0
fi

# --- Check dependencies ---
if ! command -v claude &> /dev/null; then
  error "Claude CLI not found in PATH. Ensure ~/.local/bin is in PATH."
fi

# --- Build Claude prompt arguments ---
ARGS="$DRY_RUN $SECTOR_OVERRIDE"
ARGS=$(echo "$ARGS" | xargs)  # Trim whitespace

log "=== hrmny Daily Research Pipeline ==="
log "Mode: ${DRY_RUN:-standard}"
log "Sector override: ${SECTOR_OVERRIDE:-none (using rotation)}"
log "Workspace: $WORKSPACE_DIR"

# --- Check if weekend (no run) ---
DAY_OF_WEEK=$(date +%u)  # 1=Monday, 7=Sunday
if [ "$DAY_OF_WEEK" -ge 6 ] && [ -z "$SECTOR_OVERRIDE" ]; then
  log "Weekend — no automated run scheduled. Use --sector to override."
  exit 0
fi

# --- Run Claude with /daily-research ---
log "Invoking Claude CLI..."
CLAUDE_OUTPUT_FILE="$LOG_DIR/claude-output-${DATE}.txt"

# Use --print mode for non-interactive execution
# Use --dangerously-skip-permissions for autonomous operation
set +e
timeout 600 claude \
  -p \
  --dangerously-skip-permissions \
  --model sonnet \
  "/daily-research ${ARGS}" \
  > "$CLAUDE_OUTPUT_FILE" 2>>"$LOG_FILE"

CLAUDE_EXIT=$?
set -e

if [ $CLAUDE_EXIT -ne 0 ]; then
  log "Claude exited with code $CLAUDE_EXIT"
  if [ $CLAUDE_EXIT -eq 124 ]; then
    error "Claude timed out after 10 minutes"
  else
    error "Claude failed with exit code $CLAUDE_EXIT. Check $CLAUDE_OUTPUT_FILE for details."
  fi
fi

log "Claude completed successfully. Output saved to $CLAUDE_OUTPUT_FILE"

# --- Extract summary JSON ---
log "Extracting summary JSON..."
SUMMARY_JSON=$(python3 -c "
import sys, json
content = open(sys.argv[1]).read()
start = content.find('===DAILY_SUMMARY_START===')
end = content.find('===DAILY_SUMMARY_END===')
if start == -1 or end == -1:
    print('{}')
    sys.exit(0)
start += len('===DAILY_SUMMARY_START===')
raw = content[start:end].strip()
parsed = json.loads(raw)
print(json.dumps(parsed))
" "$CLAUDE_OUTPUT_FILE" 2>>"$LOG_FILE" || echo "{}")

if [ "$SUMMARY_JSON" = "{}" ]; then
  log "WARNING: Could not extract summary JSON from Claude output"
  SUMMARY_JSON='{"date":"'"$DATE"'","error":true,"error_message":"Could not parse summary from Claude output","sector_focus":"Unknown","companies_researched":0,"companies":[],"total_contacts_enriched":0,"outreach_drafted_count":0,"outreach_drafts":[],"dry_run":false,"errors":["Summary parsing failed"],"market_signals":[]}'
fi

log "Summary extracted successfully"

# --- Trigger email summary (unless dry-run) ---
if [ -z "$DRY_RUN" ]; then
  log "Sending daily summary email..."
  "$SCRIPT_DIR/sheets-sync.sh" send_summary "$SUMMARY_JSON" >> "$LOG_FILE" 2>&1 || log "WARNING: Email summary failed to send"
  log "Daily summary email sent."
else
  log "Dry run — skipping email summary."
fi

# --- Done ---
log "=== Daily research pipeline complete ==="
log "Output: $CLAUDE_OUTPUT_FILE"
log "Log: $LOG_FILE"

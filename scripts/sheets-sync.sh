#!/bin/bash
#
# sheets-sync.sh — Push/pull data to the hrmny Sales Dashboard Google Sheet (V2)
#
# Usage:
#   sheets-sync.sh add_company '{"company":"Seddiqi","sector":"Retail",...}'
#   sheets-sync.sh update_company '{"company":"Seddiqi","stage":"Approved"}'
#   sheets-sync.sh add_contact '{"company":"Seddiqi","name":"Hind Seddiqi",...}'
#   sheets-sync.sh update_contact '{"company":"Seddiqi","name":"Hind","contact_stage":"Contact Approved"}'
#   sheets-sync.sh update_outreach '{"company":"Seddiqi","contact_name":"Hind","email_subject":"...",...}'
#   sheets-sync.sh update_stage '{"company":"Seddiqi","tab":"companies","stage":"Approved"}'
#   sheets-sync.sh get_data companies
#   sheets-sync.sh get_data summary

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$WORKSPACE_DIR/data/sheets-config.json"

# --- Helpers ---

error() {
  echo "ERROR: $1" >&2
  exit 1
}

check_config() {
  if [ ! -f "$CONFIG_FILE" ]; then
    error "Config not found at $CONFIG_FILE. Run the setup first — see reference/google-sheets-setup.md"
  fi
}

get_webhook_url() {
  check_config
  local url
  url=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['webhook_url'])" 2>/dev/null)
  if [ -z "$url" ] || [ "$url" = "null" ]; then
    error "webhook_url not set in $CONFIG_FILE"
  fi
  echo "$url"
}

# --- Commands ---

post_data() {
  local action="$1"
  local data="$2"
  local url
  url=$(get_webhook_url)

  local payload
  payload=$(python3 -c "
import json, sys
action = sys.argv[1]
data = json.loads(sys.argv[2])
print(json.dumps({'action': action, 'data': data}))
" "$action" "$data")

  local response
  response=$(curl -s -L -w "\n%{http_code}" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "$url")

  local http_code
  http_code=$(echo "$response" | tail -1)
  local body
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo "$body"
  else
    error "HTTP $http_code — $body"
  fi
}

get_data() {
  local tab="$1"
  local url
  url=$(get_webhook_url)

  local response
  response=$(curl -s -L -w "\n%{http_code}" "${url}?tab=${tab}")

  local http_code
  http_code=$(echo "$response" | tail -1)
  local body
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo "$body"
  else
    error "HTTP $http_code — $body"
  fi
}

# --- Main ---

if [ $# -lt 2 ]; then
  echo "Usage: sheets-sync.sh <action> <data>"
  echo ""
  echo "Actions:"
  echo "  add_company       '{\"company\":\"...\", \"sector\":\"...\", ...}'"
  echo "  update_company    '{\"company\":\"...\", \"stage\":\"...\", ...}'"
  echo "  add_contact       '{\"company\":\"...\", \"name\":\"...\", ...}'"
  echo "  update_contact    '{\"company\":\"...\", \"name\":\"...\", ...}'"
  echo "  update_outreach   '{\"company\":\"...\", \"contact_name\":\"...\", \"email_subject\":\"...\", ...}'"
  echo "  update_stage      '{\"company\":\"...\", \"tab\":\"companies|outreach\", \"stage\":\"...\"}'"
  echo "  send_summary      '{\"date\":\"...\", \"sector_focus\":\"...\", ...}'"
  echo "  get_data          companies|outreach|summary"
  exit 1
fi

ACTION="$1"
DATA="$2"

case "$ACTION" in
  add_company|update_company|add_contact|update_contact|update_outreach|update_stage)
    post_data "$ACTION" "$DATA"
    ;;
  send_summary)
    post_data "send_daily_summary" "$DATA"
    ;;
  get_data)
    get_data "$DATA"
    ;;
  *)
    error "Unknown action: $ACTION"
    ;;
esac

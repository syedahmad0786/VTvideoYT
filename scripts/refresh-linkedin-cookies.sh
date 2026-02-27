#!/usr/bin/env bash
# Refresh LinkedIn cookies — opens browser, grabs fresh cookies, saves them.
# Run this when LinkedIn API calls start failing (every ~2-3 weeks).

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE="$(dirname "$SCRIPT_DIR")"

echo "=== LinkedIn Cookie Refresh ==="
echo ""

cd "$WORKSPACE/.linkedin-mcp-server"
uv run python refresh_cookies.py

echo ""
echo "Restart your Claude Code session to use the new cookies."

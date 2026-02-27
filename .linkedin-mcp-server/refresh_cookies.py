"""
LinkedIn Cookie Refresh — Opens a browser, logs in, saves cookies.

Usage:
    uv run python refresh_cookies.py

Uses Playwright with persistent browser context so you only need to
log in manually once. After that, the script just opens the browser,
grabs fresh cookies, and saves them.

Cookies are saved to ../data/linkedin-cookies.json and also written
into ../.mcp.json so the MCP server picks them up on next restart.
"""

import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

WORKSPACE = Path(__file__).resolve().parent.parent
COOKIE_FILE = WORKSPACE / "data" / "linkedin-cookies.json"
MCP_CONFIG = WORKSPACE / ".mcp.json"
BROWSER_STATE_DIR = WORKSPACE / "data" / "linkedin-browser-state"


def refresh():
    print("Opening LinkedIn in browser...")
    print("(If not logged in, log in manually — the script will wait.)\n")

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=str(BROWSER_STATE_DIR),
            headless=False,
            channel="chromium",
        )

        page = context.pages[0] if context.pages else context.new_page()
        page.goto("https://www.linkedin.com/feed/")

        # Wait for login — check for the feed URL or profile nav
        print("Waiting for LinkedIn login...")
        max_wait = 120  # seconds
        start = time.time()
        while time.time() - start < max_wait:
            url = page.url
            cookies = context.cookies(["https://www.linkedin.com"])
            li_at = next((c for c in cookies if c["name"] == "li_at"), None)
            jsessionid = next((c for c in cookies if c["name"] == "JSESSIONID"), None)

            if li_at and jsessionid:
                print(f"Logged in! (URL: {url})")
                break

            time.sleep(2)
        else:
            print("Timed out waiting for login. Try again.")
            context.close()
            return False

        # Extract cookie values
        li_at_value = li_at["value"]
        jsessionid_value = jsessionid["value"].strip('"')

        # Save to cookie file
        COOKIE_FILE.parent.mkdir(parents=True, exist_ok=True)
        cookie_data = {
            "li_at": li_at_value,
            "JSESSIONID": jsessionid_value,
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        }
        COOKIE_FILE.write_text(json.dumps(cookie_data, indent=2) + "\n")
        print(f"\nCookies saved to {COOKIE_FILE}")

        # Update .mcp.json
        if MCP_CONFIG.exists():
            mcp = json.loads(MCP_CONFIG.read_text())
            li_env = mcp.get("mcpServers", {}).get("linkedin", {}).get("env", {})
            li_env["LINKEDIN_COOKIE"] = li_at_value
            li_env["LINKEDIN_JSESSIONID"] = jsessionid_value
            MCP_CONFIG.write_text(json.dumps(mcp, indent=2) + "\n")
            print(f"Updated {MCP_CONFIG}")

        print(f"\nli_at: {li_at_value[:40]}...")
        print(f"JSESSIONID: {jsessionid_value}")
        print("\nDone! Restart your Claude Code session to pick up new cookies.")

        context.close()
        return True


if __name__ == "__main__":
    success = refresh()
    sys.exit(0 if success else 1)

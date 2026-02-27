#!/usr/bin/env python3
"""
Batch send approved LinkedIn connection requests via Playwright.
Standalone script — runs outside MCP server to avoid asyncio conflicts.

Usage: python3 scripts/send-linkedin-batch.py
"""

import json
import os
import sys
import time
import random

# Add the linkedin-mcp-server to path for PlaywrightBrowser
WORKSPACE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(WORKSPACE, ".linkedin-mcp-server"))
os.chdir(WORKSPACE)

from playwright_browser import PlaywrightBrowser

COOKIE_FILE = "data/linkedin-cookies.json"
RESULTS_FILE = "data/linkedin-send-results.json"

# The 13 approved connection requests to send
REQUESTS = [
    {
        "company": "Samsung Gulf Electronics",
        "contact": "Shafi Alam",
        "profile_id": "shafialam",
        "note": "Hi Shafi, Samsung Gulf's D2C and experiential strategy across the region is compelling. We work with global brands on culture-led creative in the UAE. Would be great to connect.",
    },
    {
        "company": "BYD UAE",
        "contact": "Anna-Maryam Faisal",
        "profile_id": "anna-maryam-faisal-34a095183",
        "note": "Hi Anna-Maryam, BYD is doing impressive things in the UAE market. We work with automotive brands on culture-led creative and brand positioning in the region. Would be great to connect.",
    },
    {
        "company": "BYD UAE",
        "contact": "Ali Tamimi",
        "profile_id": "ali-tamimi-b71704a7",
        "note": "Hi Ali, BYD is making strong moves in the UAE EV market. We specialise in culture-led creative for automotive brands in the region. Would be great to connect.",
    },
    {
        "company": "FIX Dessert Chocolatier",
        "contact": "Darin Dabasay",
        "profile_id": "darin-dabasay",
        "note": "Hi Darin, FIX has built impressive buzz in Dubai. We work with culture-led F&B brands on PR and social strategy. Would be great to connect.",
    },
    {
        "company": "FIX Dessert Chocolatier",
        "contact": "Yezen Alani",
        "profile_id": "yezen-alani-266a7288",
        "note": "Hi Yezen, FIX has built something rare in Dubai F&B: real cultural credibility. We work with brands like yours on PR and social strategy. Would love to connect.",
    },
    {
        "company": "Al Ghurair",
        "contact": "Sonya Jose",
        "profile_id": "sonyajose",
        "note": "Hi Sonya, Al Ghurair Centre is evolving with Flayva and GLITCH. We work with retail and lifestyle brands in the UAE on social content and brand strategy. Would love to connect.",
    },
    {
        "company": "JKS Restaurants (Gymkhana)",
        "contact": "Nawras Mustafa",
        "profile_id": "nawrasmustafa",
        "note": "Hi Nawras, Gymkhana coming to DIFC is one of the most exciting F&B launches this year. We work with hospitality brands on PR and creative in the UAE. Would be great to connect.",
    },
    {
        "company": "Inaura (Arada)",
        "contact": "Maher Kassab",
        "profile_id": "maher-kassab",
        "note": "Hi Maher, Inaura's kinetic wellness concept is a compelling brand play. We work with lifestyle brands in the UAE on culture-led social and campaigns. Would be great to connect.",
    },
    {
        "company": "Zeekr UAE",
        "contact": "Sara O'Hara",
        "profile_id": "sara-ohara-corporate-communications",
        "note": "Hi Sara, Al Rostamani bringing Zeekr to the UAE at this moment is well-timed. We work with automotive brands on culture-led creative in the region. Would love to connect.",
    },
    {
        "company": "LC (formerly L Couture)",
        "contact": "Lyndsay Doran",
        "profile_id": "lyndsay-doran-0637181ab",
        "note": "Hi Lyndsay, the rebrand from L Couture to LC is a bold move. We work with lifestyle brands in the UAE on social strategy and PR. Would love to connect.",
    },
    {
        "company": "LC (formerly L Couture)",
        "contact": "Zahraa Amjad",
        "profile_id": "zahraa-amjad-350b40b3",
        "note": "Hi Zahraa, LC is making an exciting evolution as a lifestyle brand in Dubai. We work with lifestyle brands on social content and PR. Would love to connect.",
    },
    {
        "company": "Xpeng UAE",
        "contact": "Tarek Bedran",
        "profile_id": "tarekbed91",
        "note": "Hi Tarek, Xpeng entering the UAE through Ali and Sons is well-timed. We work with automotive brands on culture-led creative in the region. Would be great to connect.",
    },
    {
        "company": "Xpeng UAE",
        "contact": "Mohamed Al Dhaheri",
        "profile_id": "mohamed-al-dhaheri-05a219313",
        "note": "Hi Mohamed, Ali and Sons bringing Xpeng to the UAE is a strong move. We work with automotive brands on culture-led creative in the region. Would love to connect.",
    },
]


def main():
    print(f"Sending {len(REQUESTS)} LinkedIn connection requests...")
    print("=" * 60)

    browser = PlaywrightBrowser(cookie_file=COOKIE_FILE)
    results = []

    for i, req in enumerate(REQUESTS, 1):
        print(f"\n[{i}/{len(REQUESTS)}] {req['contact']} ({req['company']})")
        print(f"  Profile: {req['profile_id']}")

        # Rate limit: 3-8s between requests
        if i > 1:
            delay = random.uniform(4, 9)
            print(f"  Waiting {delay:.1f}s...")
            time.sleep(delay)

        try:
            result = browser.send_connection_request(req["profile_id"], req["note"])
            results.append({
                "company": req["company"],
                "contact": req["contact"],
                "profile_id": req["profile_id"],
                "result": result,
            })

            if result.get("success"):
                print(f"  ✓ SENT")
            else:
                error_type = result.get("error_type", "unknown")
                error_msg = result.get("error", "Unknown error")
                print(f"  ✗ FAILED ({error_type}): {error_msg}")

        except Exception as e:
            print(f"  ✗ ERROR: {e}")
            results.append({
                "company": req["company"],
                "contact": req["contact"],
                "profile_id": req["profile_id"],
                "result": {"success": False, "error": str(e), "error_type": "exception"},
            })

    # Save results
    with open(RESULTS_FILE, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\n{'=' * 60}")
    sent = sum(1 for r in results if r["result"].get("success"))
    failed = len(results) - sent
    print(f"Done: {sent} sent, {failed} failed")
    print(f"Results saved to {RESULTS_FILE}")

    browser.close()


if __name__ == "__main__":
    main()

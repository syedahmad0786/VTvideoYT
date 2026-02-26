"""
Playwright-based LinkedIn browser for profile scraping, search, and connection requests.

Replaces broken linkedin-api endpoints (HTTP 410 Gone) with browser automation.
Manages browser lifecycle, cookie injection, and page interactions.

Uses the ASYNC Playwright API so it runs cleanly inside FastMCP's asyncio event loop.
"""

import asyncio
import json
import logging
import re
from pathlib import Path
from typing import Optional
from urllib.parse import quote

from playwright.async_api import async_playwright, BrowserContext, Page

logger = logging.getLogger("linkedin-mcp")

WORKSPACE = Path(__file__).resolve().parent.parent
COOKIE_FILE = WORKSPACE / "data" / "linkedin-cookies.json"
BROWSER_STATE_DIR = WORKSPACE / "data" / "linkedin-browser-state"


class _AuthRetryError(Exception):
    """Raised when session was refreshed mid-operation and caller should retry."""
    pass


class PlaywrightBrowser:
    """Manages a Playwright browser session for LinkedIn.

    Uses a persistent browser context in headed mode. LinkedIn aggressively
    detects and revokes headless sessions, so headed mode is required.

    On first use, the browser opens and checks the session. If expired,
    it navigates to LinkedIn login and waits for the user to authenticate
    (or auto-authenticates if the persistent context still has a valid
    session). Cookies are saved automatically after login.
    """

    def __init__(self, cookie: Optional[str] = None, jsessionid: Optional[str] = None,
                 cookie_file: Optional[str] = None):
        self._cookie = cookie
        self._jsessionid = jsessionid
        self._cookie_file = cookie_file or str(COOKIE_FILE)
        self._playwright = None
        self._context: Optional[BrowserContext] = None

    async def _ensure_browser(self):
        """Launch persistent browser context and verify/refresh auth."""
        if self._context is not None:
            return

        BROWSER_STATE_DIR.mkdir(parents=True, exist_ok=True)

        self._playwright = await async_playwright().start()

        try:
            self._context = await self._playwright.chromium.launch_persistent_context(
                user_data_dir=str(BROWSER_STATE_DIR),
                headless=False,
                channel="chromium",
                viewport={"width": 1280, "height": 800},
                locale="en-US",
            )
        except Exception as e:
            logger.error(
                "Failed to launch browser (%s). "
                "The browser state may be locked — "
                "close any other LinkedIn MCP sessions first.",
                e,
            )
            if self._playwright:
                await self._playwright.stop()
                self._playwright = None
            raise RuntimeError(
                f"Browser launch failed: {e}. "
                "Close other LinkedIn MCP sessions and try again."
            )

        # Block heavy media to speed things up
        await self._context.route(
            re.compile(r"\.(png|jpg|jpeg|gif|svg|woff2?|ttf|mp4|webm)(\?.*)?$"),
            lambda route: route.abort(),
        )

        # Verify session — navigate to feed and check for login redirect
        await self._verify_and_refresh_session()

        logger.info("Playwright: browser ready (authenticated)")

    async def _verify_and_refresh_session(self):
        """Check if logged in; if not, wait for user to log in and save cookies."""
        page = self._context.pages[0] if self._context.pages else await self._context.new_page()

        try:
            await page.goto(
                "https://www.linkedin.com/feed/",
                wait_until="domcontentloaded",
                timeout=30000,
            )
        except Exception:
            # Redirect loop or network error — session is dead, go to login
            await page.goto(
                "https://www.linkedin.com/login",
                wait_until="domcontentloaded",
                timeout=30000,
            )

        await asyncio.sleep(2)

        if "/login" not in page.url and "/checkpoint" not in page.url:
            # Already authenticated — save cookies and continue
            logger.info("LinkedIn session is valid")
            await self._save_cookies()
            await page.close()
            return

        # Session expired — wait for user to log in
        logger.warning(
            "LinkedIn session expired. Browser is open — "
            "please log in. Waiting up to 300 seconds..."
        )

        max_wait = 300
        start = asyncio.get_event_loop().time()
        while asyncio.get_event_loop().time() - start < max_wait:
            cookies = await self._context.cookies(["https://www.linkedin.com"])
            li_at = next((c for c in cookies if c["name"] == "li_at"), None)
            jsessionid = next((c for c in cookies if c["name"] == "JSESSIONID"), None)

            if li_at and jsessionid:
                logger.info("Login detected — saving cookies")
                await self._save_cookies()
                await page.close()
                return

            await asyncio.sleep(2)

        await page.close()
        raise RuntimeError(
            "Timed out waiting for LinkedIn login (300s). "
            "Try again — the browser will reopen."
        )

    async def _save_cookies(self):
        """Save current LinkedIn cookies to the cookie file and .mcp.json."""
        import time as _time

        cookies = await self._context.cookies(["https://www.linkedin.com"])
        li_at = next((c for c in cookies if c["name"] == "li_at"), None)
        jsessionid = next((c for c in cookies if c["name"] == "JSESSIONID"), None)

        if not li_at:
            return

        li_at_value = li_at["value"]
        jsessionid_value = jsessionid["value"].strip('"') if jsessionid else ""

        # Save to cookie file
        cookie_path = Path(self._cookie_file)
        cookie_path.parent.mkdir(parents=True, exist_ok=True)
        cookie_data = {
            "li_at": li_at_value,
            "JSESSIONID": jsessionid_value,
            "updated_at": _time.strftime("%Y-%m-%dT%H:%M:%S"),
        }
        cookie_path.write_text(json.dumps(cookie_data, indent=2) + "\n")
        logger.info("Cookies saved to %s", cookie_path)

        # Update .mcp.json so the linkedin-api client picks them up
        mcp_config = WORKSPACE / ".mcp.json"
        if mcp_config.exists():
            try:
                mcp = json.loads(mcp_config.read_text())
                li_env = mcp.get("mcpServers", {}).get("linkedin", {}).get("env", {})
                li_env["LINKEDIN_COOKIE"] = li_at_value
                li_env["LINKEDIN_JSESSIONID"] = jsessionid_value
                mcp_config.write_text(json.dumps(mcp, indent=2) + "\n")
                logger.info("Updated %s", mcp_config)
            except Exception as e:
                logger.warning("Failed to update .mcp.json: %s", e)

    async def _new_page(self) -> Page:
        """Get a new page in the browser context."""
        await self._ensure_browser()
        return await self._context.new_page()

    async def _check_auth(self, page: Page):
        """Check if page was redirected to login; if so, re-authenticate."""
        if "/login" not in page.url and "/checkpoint" not in page.url:
            return

        logger.warning("Session expired mid-operation — re-authenticating...")
        await page.close()

        # Re-run the auth flow
        await self._verify_and_refresh_session()

        raise _AuthRetryError("Session refreshed — retry the operation")

    async def close(self):
        """Clean up browser resources."""
        if self._context:
            try:
                await self._context.close()
            except Exception:
                pass
            self._context = None
        if self._playwright:
            try:
                await self._playwright.stop()
            except Exception:
                pass
            self._playwright = None

    def close_sync(self):
        """Best-effort sync cleanup for atexit handler."""
        # Can't await in atexit — just null out references and let process exit
        self._context = None
        self._playwright = None

    # ------------------------------------------------------------------
    # Profile scraping
    # ------------------------------------------------------------------

    # JavaScript for extracting profile data from the DOM.
    # Uses structural patterns (h1, section IDs, visually-hidden spans)
    # instead of CSS class names, which LinkedIn obfuscates.
    _PROFILE_EXTRACT_JS = """() => {
        const data = {
            name: "", headline: "", location: "", company: "",
            about: "", experience: [],
        };

        // --- Name from h1 ---
        const h1 = document.querySelector("h1");
        if (!h1) return data;
        data.name = h1.innerText.trim();

        // --- Headline: first div with direct text in the top section ---
        const topSection = h1.closest("section");
        if (topSection) {
            const divs = topSection.querySelectorAll("div");
            for (const div of divs) {
                const directText = Array.from(div.childNodes)
                    .filter(n => n.nodeType === 3)
                    .map(n => n.textContent.trim())
                    .filter(t => t.length > 0)
                    .join(" ");
                if (directText && directText.length > 5 && directText !== data.name) {
                    data.headline = directText;
                    break;
                }
            }

            // --- Location: span containing comma + region pattern ---
            const spans = topSection.querySelectorAll("span");
            for (const span of spans) {
                const t = span.innerText.trim();
                if (t.includes(",") && t.length > 5 && t.length < 80
                    && !t.includes("@") && !t.includes("\\n")) {
                    data.location = t;
                    break;
                }
            }
        }

        // --- About / Summary ---
        const aboutEl = document.querySelector("#about");
        if (aboutEl) {
            const aboutSection = aboutEl.closest("section");
            if (aboutSection) {
                const vh = aboutSection.querySelectorAll("span.visually-hidden");
                for (const s of vh) {
                    const t = s.innerText.trim();
                    if (t.length > 20) { data.about = t.substring(0, 2000); break; }
                }
                if (!data.about) {
                    const ah = aboutSection.querySelectorAll("span[aria-hidden='true']");
                    for (const s of ah) {
                        const t = s.innerText.trim();
                        if (t.length > 20) { data.about = t.substring(0, 2000); break; }
                    }
                }
            }
        }

        // --- Experience ---
        const expEl = document.querySelector("#experience");
        if (expEl) {
            const expSection = expEl.closest("section");
            if (expSection) {
                const items = expSection.querySelectorAll(
                    ":scope > div > div > ul > li, :scope > div > ul > li"
                );
                for (let i = 0; i < Math.min(items.length, 5); i++) {
                    const vh = items[i].querySelectorAll("span.visually-hidden");
                    const texts = Array.from(vh)
                        .map(s => s.innerText.trim())
                        .filter(t => t.length > 0);
                    if (texts.length >= 2) {
                        data.experience.push({
                            title: texts[0] || "",
                            company: (texts[1] || "").split("\\u00b7")[0].trim(),
                            dates: texts[2] || "",
                            location: texts[3] || "",
                        });
                    }
                }
            }
        }

        return data;
    }"""

    async def scrape_profile(self, public_id: str) -> dict:
        """
        Scrape a LinkedIn profile page for structured data.

        Uses JavaScript evaluation for robust extraction (LinkedIn obfuscates
        CSS class names). Returns the same shape as the old API.
        """
        page = await self._new_page()
        try:
            url = f"https://www.linkedin.com/in/{public_id}/"
            logger.info("Scraping profile: %s", url)

            resp = await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await self._check_auth(page)

            # Check for 404 (may be URL-level or client-side redirect)
            if (resp and resp.status == 404) or "/404" in page.url:
                return {
                    "success": False,
                    "error": f"Profile not found: {public_id}",
                    "error_type": "not_found",
                }

            # Let dynamic content render
            await page.wait_for_timeout(2500)

            # Extract URN from page source
            urn_id = await self._extract_urn_id(page, public_id)

            # Extract profile data via JavaScript
            raw = await page.evaluate(self._PROFILE_EXTRACT_JS)

            # Parse name
            full_name = raw.get("name", "")
            parts = full_name.split(" ", 1)

            # Set company from first experience if available
            company = ""
            experience = raw.get("experience", [])
            if experience:
                company = experience[0].get("company", "")

            profile = {
                "public_id": public_id,
                "urn_id": urn_id or "",
                "first_name": parts[0] if parts else "",
                "last_name": parts[1] if len(parts) > 1 else "",
                "headline": raw.get("headline", ""),
                "summary": raw.get("about", ""),
                "location": raw.get("location", ""),
                "industry": "",
                "company": company,
                "experience": experience,
                "email": "",
                "websites": [],
            }

            return {"success": True, "data": profile}

        except _AuthRetryError:
            raise  # Page already closed by _check_auth
        except RuntimeError:
            raise
        except Exception as e:
            logger.error("Profile scrape failed for %s: %s", public_id, e)
            return {"success": False, "error": str(e), "error_type": "scrape_error"}
        finally:
            if not page.is_closed():
                await page.close()

    async def _extract_urn_id(self, page: Page, public_id: str) -> Optional[str]:
        """Extract LinkedIn member URN ID from page source."""
        try:
            content = await page.content()

            # fsd_profile URN (preferred — used by most API calls)
            m = re.search(r'urn:li:fsd_profile:([A-Za-z0-9_-]+)', content)
            if m:
                logger.info("Found fsd_profile URN: %s", m.group(1))
                return m.group(1)

            # fs_miniProfile URN
            m = re.search(
                r'"(?:profile|entity)Urn"\s*:\s*"urn:li:fs_miniProfile:([^"]+)"',
                content,
            )
            if m:
                logger.info("Found miniProfile URN: %s", m.group(1))
                return m.group(1)

            # Numeric member URN
            m = re.search(r'urn:li:member:(\d+)', content)
            if m:
                logger.info("Found member URN: %s", m.group(1))
                return m.group(1)

            logger.warning("Could not extract URN ID for %s", public_id)
            return None

        except Exception as e:
            logger.warning("URN extraction error: %s", e)
            return None

    # ------------------------------------------------------------------
    # People search
    # ------------------------------------------------------------------

    # JavaScript for extracting search results.
    _SEARCH_EXTRACT_JS = """(limit) => {
        const people = [];
        const seen = new Set();

        const links = document.querySelectorAll('div > a[href*="/in/"]');

        for (const link of links) {
            if (people.length >= limit) break;

            const href = link.href || "";
            const match = href.match(/\\/in\\/([^/?]+)/);
            if (!match) continue;

            const publicId = match[1];
            if (seen.has(publicId)) continue;

            const fullText = link.innerText.trim();
            if (!fullText || fullText.length < 3) continue;

            const sections = fullText.split(/\\n\\n+/).map(s => s.trim()).filter(Boolean);
            if (sections.length < 1) continue;

            let name = sections[0].split("\\u2022")[0].trim();
            if (!name || name.length < 2 || name.length > 60) continue;

            if (/^(view|search|connect|follow)/i.test(name)) continue;

            seen.add(publicId);

            const headline = sections.length > 1 ? sections[1] : "";
            const location = sections.length > 2 ? sections[2] : "";

            people.push({
                public_id: publicId,
                urn_id: "",
                name: name,
                headline: headline.substring(0, 200),
                location: location.substring(0, 100),
            });
        }

        return people;
    }"""

    async def search_people(self, keywords: str, limit: int = 10) -> dict:
        """Search LinkedIn for people matching keywords via the search page."""
        page = await self._new_page()
        try:
            search_url = (
                f"https://www.linkedin.com/search/results/people/"
                f"?keywords={quote(keywords)}&origin=GLOBAL_SEARCH_HEADER"
            )
            logger.info("Searching people: %s", keywords)
            await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
            await self._check_auth(page)

            await page.wait_for_timeout(4000)

            people = await page.evaluate(self._SEARCH_EXTRACT_JS, limit)

            return {
                "success": True,
                "data": {"people": people, "count": len(people)},
            }

        except _AuthRetryError:
            raise
        except RuntimeError:
            raise
        except Exception as e:
            logger.error("People search failed: %s", e)
            return {"success": False, "error": str(e), "error_type": "scrape_error"}
        finally:
            if not page.is_closed():
                await page.close()

    # ------------------------------------------------------------------
    # Connection requests
    # ------------------------------------------------------------------

    async def send_connection_request(self, public_id: str, note: str = "") -> dict:
        """
        Send a connection request by navigating to the profile and clicking Connect.

        Steps:
        1. Open profile page
        2. Click Connect (or More → Connect)
        3. Optionally add a note
        4. Click Send
        """
        if note and len(note) > 300:
            return {
                "success": False,
                "error": f"Connection note is {len(note)} chars — LinkedIn limit is 300.",
                "error_type": "validation_error",
            }

        page = await self._new_page()
        try:
            url = f"https://www.linkedin.com/in/{public_id}/"
            logger.info("Sending connection request to: %s", public_id)
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await self._check_auth(page)

            await page.wait_for_timeout(2500)

            # Check current relationship status
            if await page.query_selector("button:has-text('Pending')"):
                return {
                    "success": False,
                    "error": f"Connection request already pending for {public_id}",
                    "error_type": "already_pending",
                }

            # Find the Connect button
            connect_btn = await self._find_connect_button(page)

            if not connect_btn:
                if await page.query_selector("button:has-text('Message')"):
                    return {
                        "success": False,
                        "error": f"Already connected with {public_id}",
                        "error_type": "already_connected",
                    }
                return {
                    "success": False,
                    "error": (
                        f"Connect button not found for {public_id}. "
                        "Profile may restrict connection requests."
                    ),
                    "error_type": "button_not_found",
                }

            await connect_btn.click()
            await page.wait_for_timeout(1500)

            # Handle "How do you know …" gate if it appears
            email_gate = await page.query_selector("label:has-text('Email')")
            if email_gate:
                return {
                    "success": False,
                    "error": (
                        f"LinkedIn requires an email address to connect with {public_id}. "
                        "This person may not accept connection requests from strangers."
                    ),
                    "error_type": "email_required",
                }

            # Handle the note
            if note:
                add_note_btn = await page.query_selector("button:has-text('Add a note')")
                if add_note_btn:
                    await add_note_btn.click()
                    await page.wait_for_timeout(1000)

                    textarea = (
                        await page.query_selector("textarea[name='message']")
                        or await page.query_selector("textarea#custom-message")
                        or await page.query_selector("textarea")
                    )
                    if textarea:
                        await textarea.fill(note)
                        await page.wait_for_timeout(500)
                    else:
                        logger.warning("Note textarea not found — sending without note")

            # Click Send
            send_btn = (
                await page.query_selector("button[aria-label='Send invitation']")
                or await page.query_selector("button[aria-label='Send now']")
                or await page.query_selector("button:has-text('Send')")
            )

            if not send_btn:
                return {
                    "success": False,
                    "error": "Send button not found in connection modal",
                    "error_type": "button_not_found",
                }

            await send_btn.click()
            await page.wait_for_timeout(2000)

            # Verify modal closed (success indicator)
            modal_still_open = await page.query_selector(
                "div.send-invite, div.artdeco-modal--layer-default"
            )
            if modal_still_open and await modal_still_open.is_visible():
                # Check for error text inside modal
                error_el = await page.query_selector(".artdeco-modal .artdeco-inline-feedback")
                error_text = (await error_el.inner_text()).strip() if error_el else "Modal did not close after send"
                return {
                    "success": False,
                    "error": error_text,
                    "error_type": "send_failed",
                }

            logger.info("Connection request sent to %s", public_id)
            return {
                "success": True,
                "data": {
                    "sent": True,
                    "profile_id": public_id,
                    "note_included": bool(note),
                    "note_length": len(note) if note else 0,
                    "method": "playwright",
                },
            }

        except _AuthRetryError:
            raise
        except RuntimeError:
            raise
        except Exception as e:
            logger.error("Connection request failed for %s: %s", public_id, e)
            return {"success": False, "error": str(e), "error_type": "send_error"}
        finally:
            if not page.is_closed():
                await page.close()

    async def _find_connect_button(self, page: Page):
        """Locate the Connect button, checking profile actions then More dropdown."""
        # Primary: top-level Connect button
        for selector in [
            "button.pvs-profile-actions__action:has-text('Connect')",
            "main section button:has-text('Connect')",
        ]:
            btn = await page.query_selector(selector)
            if btn and await btn.is_visible():
                return btn

        # Secondary: inside "More" dropdown
        more_btn = (
            await page.query_selector(
                "button.pvs-profile-actions__action:has-text('More')"
            )
            or await page.query_selector("main section button:has-text('More')")
        )

        if more_btn and await more_btn.is_visible():
            await more_btn.click()
            await page.wait_for_timeout(1000)

            for selector in [
                ".artdeco-dropdown__content button:has-text('Connect')",
                ".artdeco-dropdown__content li:has-text('Connect')",
            ]:
                btn = await page.query_selector(selector)
                if btn and await btn.is_visible():
                    return btn

        return None

    # ------------------------------------------------------------------
    # URN lookup (standalone)
    # ------------------------------------------------------------------

    async def get_urn_id(self, public_id: str) -> Optional[str]:
        """Quick lookup: navigate to profile, extract URN ID, close."""
        page = await self._new_page()
        try:
            await page.goto(
                f"https://www.linkedin.com/in/{public_id}/",
                wait_until="domcontentloaded",
                timeout=30000,
            )
            await self._check_auth(page)
            await page.wait_for_timeout(2000)
            return await self._extract_urn_id(page, public_id)
        except Exception as e:
            logger.error("URN lookup failed for %s: %s", public_id, e)
            return None
        finally:
            if not page.is_closed():
                await page.close()

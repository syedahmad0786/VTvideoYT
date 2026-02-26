"""
LinkedIn client — hybrid architecture using API + Playwright.

Routing:
- linkedin-api (tomquirk): get_conversations, get_messages, send_message, get_pending_invitations
  These Voyager messaging endpoints still work.
- Playwright browser (async): get_profile, search_people, send_connection_request
  The API endpoints for these return 410 Gone / empty results.

Both paths share the same sliding-window rate limiter (max 12 calls/hour).
"""

import asyncio
import json
import logging
import random
import sys
import time
from collections import deque
from pathlib import Path
from typing import Optional

from playwright_browser import PlaywrightBrowser, _AuthRetryError

logger = logging.getLogger("linkedin-mcp")
if not logger.handlers:
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

MAX_CALLS_PER_HOUR = 12
MIN_DELAY_SECONDS = 3
MAX_DELAY_SECONDS = 8
WINDOW_SECONDS = 3600


def _ok(data):
    return {"success": True, "data": data}


def _err(message, error_type="api_error"):
    return {"success": False, "error": message, "error_type": error_type}


class LinkedInClient:
    def __init__(self, email: Optional[str] = None, password: Optional[str] = None,
                 cookie: Optional[str] = None, jsessionid: Optional[str] = None,
                 cookie_file: Optional[str] = None):
        self._email = email
        self._password = password
        self._cookie = cookie
        self._jsessionid = jsessionid
        self._cookie_file = cookie_file
        self._api = None  # linkedin-api instance — lazy init
        self._browser = PlaywrightBrowser(
            cookie=cookie,
            jsessionid=jsessionid,
            cookie_file=cookie_file,
        )
        self._call_times = deque()

    # ------------------------------------------------------------------
    # Auth (API only — Playwright uses cookie injection)
    # ------------------------------------------------------------------

    def _load_cookie_file(self):
        """Load cookies from JSON file."""
        if not self._cookie_file:
            return None, None
        path = Path(self._cookie_file)
        if not path.exists():
            return None, None
        try:
            data = json.loads(path.read_text())
            li_at = data.get("li_at")
            jsessionid = data.get("JSESSIONID")
            updated = data.get("updated_at", "unknown")
            logger.info("Loaded cookies from file (updated: %s)", updated)
            return li_at, jsessionid
        except Exception as e:
            logger.warning("Failed to read cookie file: %s", e)
            return None, None

    def _ensure_api(self):
        """Lazy init for linkedin-api (messaging endpoints only)."""
        if self._api is not None:
            return

        from linkedin_api import Linkedin
        from requests.cookies import RequestsCookieJar

        li_at, jsessionid = self._load_cookie_file()
        if not li_at:
            li_at = self._cookie
            jsessionid = self._jsessionid

        if li_at:
            logger.info("Authenticating linkedin-api with cookies")
            jar = RequestsCookieJar()
            jar.set("li_at", li_at, domain=".linkedin.com", path="/")
            jsessionid = jsessionid or "ajax:0"
            jar.set("JSESSIONID", f'"{jsessionid}"', domain=".linkedin.com", path="/")
            self._api = Linkedin("", "", cookies=jar)
            logger.info("linkedin-api authentication successful")
        elif self._email and self._password:
            logger.info("Authenticating linkedin-api with email/password")
            self._api = Linkedin(self._email, self._password)
        else:
            raise RuntimeError(
                "LinkedIn credentials not set. "
                "Run refresh_cookies.py or set LINKEDIN_COOKIE env var."
            )

    # ------------------------------------------------------------------
    # Rate limiting (shared by API and Playwright calls)
    # ------------------------------------------------------------------

    async def _rate_limit_async(self):
        """Enforce sliding-window rate limit with random delay (async version)."""
        now = time.time()
        while self._call_times and (now - self._call_times[0]) > WINDOW_SECONDS:
            self._call_times.popleft()

        if len(self._call_times) >= MAX_CALLS_PER_HOUR:
            wait_until = self._call_times[0] + WINDOW_SECONDS
            wait_seconds = wait_until - now + 1
            if wait_seconds > 0:
                logger.warning(
                    "Rate limit reached (%d/%d). Waiting %.0fs.",
                    len(self._call_times), MAX_CALLS_PER_HOUR, wait_seconds,
                )
                await asyncio.sleep(wait_seconds)
                now = time.time()
                while self._call_times and (now - self._call_times[0]) > WINDOW_SECONDS:
                    self._call_times.popleft()

        delay = random.uniform(MIN_DELAY_SECONDS, MAX_DELAY_SECONDS)
        logger.debug("Rate limiter: sleeping %.1fs", delay)
        await asyncio.sleep(delay)
        self._call_times.append(time.time())

    def _rate_limit_sync(self):
        """Enforce sliding-window rate limit with random delay (sync version for API calls)."""
        now = time.time()
        while self._call_times and (now - self._call_times[0]) > WINDOW_SECONDS:
            self._call_times.popleft()

        if len(self._call_times) >= MAX_CALLS_PER_HOUR:
            wait_until = self._call_times[0] + WINDOW_SECONDS
            wait_seconds = wait_until - now + 1
            if wait_seconds > 0:
                logger.warning(
                    "Rate limit reached (%d/%d). Waiting %.0fs.",
                    len(self._call_times), MAX_CALLS_PER_HOUR, wait_seconds,
                )
                time.sleep(wait_seconds)
                now = time.time()
                while self._call_times and (now - self._call_times[0]) > WINDOW_SECONDS:
                    self._call_times.popleft()

        delay = random.uniform(MIN_DELAY_SECONDS, MAX_DELAY_SECONDS)
        logger.debug("Rate limiter: sleeping %.1fs", delay)
        time.sleep(delay)
        self._call_times.append(time.time())

    # ------------------------------------------------------------------
    # Call wrappers
    # ------------------------------------------------------------------

    def _call_api(self, fn, *args, **kwargs):
        """Auth + rate limit + call linkedin-api method + error handling."""
        try:
            self._ensure_api()
        except RuntimeError as e:
            return _err(str(e), "auth_failed")
        except Exception as e:
            return _err(f"LinkedIn API auth failed: {e}", "auth_failed")

        self._rate_limit_sync()
        try:
            return fn(*args, **kwargs)
        except Exception as e:
            logger.error("LinkedIn API error: %s", e)
            return _err(str(e), "api_error")

    async def _call_browser(self, fn, *args, **kwargs):
        """Rate limit + call async Playwright method + auto-retry on auth refresh."""
        await self._rate_limit_async()
        try:
            return await fn(*args, **kwargs)
        except _AuthRetryError:
            # Session was refreshed mid-operation — retry once
            logger.info("Retrying after session refresh...")
            try:
                return await fn(*args, **kwargs)
            except Exception as e:
                logger.error("Retry failed: %s", e)
                return _err(str(e), "auth_failed")
        except RuntimeError as e:
            return _err(str(e), "auth_failed")
        except Exception as e:
            logger.error("Playwright error: %s", e)
            return _err(str(e), "browser_error")

    # ------------------------------------------------------------------
    # Playwright-backed tools (API endpoints broken) — async
    # ------------------------------------------------------------------

    async def get_profile(self, profile_id: str) -> dict:
        """Get profile via Playwright scraping (API returns 410 Gone)."""
        return await self._call_browser(self._browser.scrape_profile, profile_id)

    async def search_people(self, keywords: str, limit: int = 10) -> dict:
        """Search people via Playwright (API returns empty results)."""
        return await self._call_browser(self._browser.search_people, keywords, limit)

    async def send_connection_request(self, profile_id: str, note: str = "") -> dict:
        """Send connection request via Playwright click-through."""
        return await self._call_browser(
            self._browser.send_connection_request, profile_id, note,
        )

    # ------------------------------------------------------------------
    # API-backed tools (Voyager messaging endpoints still work) — sync
    # ------------------------------------------------------------------

    def send_message(self, profile_id: str, message: str) -> dict:
        """Send a direct message to a connection (API)."""
        def _do():
            self._api.send_message(message_body=message, recipients=[profile_id])
            return _ok({
                "sent": True,
                "profile_id": profile_id,
                "message_length": len(message),
            })
        return self._call_api(_do)

    def get_conversations(self, count: int = 20) -> dict:
        """Get recent conversations (API)."""
        def _do():
            raw = self._api.get_conversations()
            conversations = []
            elements = raw.get("elements", []) if isinstance(raw, dict) else []

            for conv in elements[:count]:
                participants = []
                for p in conv.get("participants", []):
                    mini_profile = (
                        p.get("com.linkedin.voyager.messaging.MessagingMember", {})
                        .get("miniProfile", {})
                    )
                    if mini_profile:
                        participants.append({
                            "name": f"{mini_profile.get('firstName', '')} {mini_profile.get('lastName', '')}".strip(),
                            "public_id": mini_profile.get("publicIdentifier", ""),
                        })

                conversations.append({
                    "conversation_id": conv.get("entityUrn", "").split(":")[-1],
                    "participants": participants,
                    "last_activity": conv.get("lastActivityAt", 0),
                    "unread": conv.get("unreadCount", 0) > 0,
                })

            return _ok({"conversations": conversations, "count": len(conversations)})

        return self._call_api(_do)

    def get_messages(self, conversation_id: str) -> dict:
        """Get messages in a conversation thread (API)."""
        def _do():
            raw = self._api.get_conversation(conversation_id)
            messages = []
            elements = raw.get("elements", []) if isinstance(raw, dict) else []

            for msg in elements:
                event = msg.get("eventContent", {})
                body_el = event.get("com.linkedin.voyager.messaging.event.MessageEvent", {})
                body = body_el.get("body", "") if body_el else ""

                sender_profile = (
                    msg.get("from", {})
                    .get("com.linkedin.voyager.messaging.MessagingMember", {})
                    .get("miniProfile", {})
                )
                sender = f"{sender_profile.get('firstName', '')} {sender_profile.get('lastName', '')}".strip()

                messages.append({
                    "sender": sender,
                    "sender_public_id": sender_profile.get("publicIdentifier", ""),
                    "body": body,
                    "timestamp": msg.get("createdAt", 0),
                })

            return _ok({
                "conversation_id": conversation_id,
                "messages": messages,
                "count": len(messages),
            })

        return self._call_api(_do)

    def get_pending_invitations(self) -> dict:
        """Get pending connection invitations (API)."""
        def _do():
            raw = self._api.get_invitations()
            invitations = []

            for inv in raw:
                from_profile = inv.get("fromMember", {})
                invitations.append({
                    "id": inv.get("id", ""),
                    "from_name": f"{from_profile.get('firstName', '')} {from_profile.get('lastName', '')}".strip(),
                    "from_public_id": from_profile.get("publicIdentifier", ""),
                    "sent_at": inv.get("sentTime", 0),
                    "message": inv.get("message", ""),
                    "direction": inv.get("invitationType", ""),
                })

            return _ok({"invitations": invitations, "count": len(invitations)})

        return self._call_api(_do)

    # ------------------------------------------------------------------
    # Utility
    # ------------------------------------------------------------------

    async def get_urn_id(self, public_id: str) -> Optional[str]:
        """Get just the URN ID for a profile (for send_message flow)."""
        result = await self._call_browser(self._browser.get_urn_id, public_id)
        if isinstance(result, str):
            return result
        if isinstance(result, dict) and result.get("success") is False:
            return None
        return result

    def close(self):
        """Best-effort sync cleanup for atexit handler."""
        self._browser.close_sync()

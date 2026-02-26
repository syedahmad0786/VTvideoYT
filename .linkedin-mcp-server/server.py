"""
LinkedIn MCP Server — Exposes LinkedIn actions as tools via FastMCP.

Hybrid architecture:
- Playwright (async browser): get_profile, search_people, send_connection_request
  (linkedin-api endpoints return 410 Gone / empty results)
- linkedin-api: send_message, get_conversations, get_messages, get_pending_invitations
  (Voyager messaging endpoints still work)

Auth: LINKEDIN_COOKIE + LINKEDIN_JSESSIONID env vars (preferred),
      or LINKEDIN_EMAIL + LINKEDIN_PASSWORD.
Rate limit: Max 12 calls/hour with 3-8s random delay between calls.
"""

import atexit
import os

from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP

from linkedin_client import LinkedInClient

load_dotenv()

WORKSPACE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COOKIE_FILE = os.path.join(WORKSPACE, "data", "linkedin-cookies.json")

client = LinkedInClient(
    email=os.getenv("LINKEDIN_EMAIL"),
    password=os.getenv("LINKEDIN_PASSWORD"),
    cookie=os.getenv("LINKEDIN_COOKIE"),
    jsessionid=os.getenv("LINKEDIN_JSESSIONID"),
    cookie_file=COOKIE_FILE,
)

# Clean up Playwright on exit (best-effort sync cleanup)
atexit.register(client.close)

mcp = FastMCP("LinkedIn")


@mcp.tool()
def send_message(profile_id: str, message: str) -> dict:
    """
    Send a direct message to a LinkedIn connection.

    Args:
        profile_id: The recipient's LinkedIn profile URN ID (not public ID).
                     Get this from search_people or get_profile results.
        message: The message text to send.
    """
    return client.send_message(profile_id, message)


@mcp.tool()
def get_conversations(count: int = 20) -> dict:
    """
    List recent LinkedIn conversations (inbox).
    Returns conversation IDs, participant names, and last activity timestamps.

    Args:
        count: Number of conversations to return (default 20).
    """
    return client.get_conversations(count)


@mcp.tool()
def get_messages(conversation_id: str) -> dict:
    """
    Read messages in a LinkedIn conversation thread.

    Args:
        conversation_id: The conversation URN ID (from get_conversations results).
    """
    return client.get_messages(conversation_id)


# --- Playwright-backed tools (async) ---


@mcp.tool()
async def search_people(keywords: str, limit: int = 10) -> dict:
    """
    Search LinkedIn for people matching keywords.
    Returns names, headlines, locations, and profile IDs.

    Args:
        keywords: Search query (e.g. "marketing director Dubai").
        limit: Max results to return (default 10).
    """
    return await client.search_people(keywords, limit)


@mcp.tool()
async def get_profile(profile_id: str) -> dict:
    """
    Get a LinkedIn profile with experience, headline, summary, and contact info.

    Args:
        profile_id: The public profile ID (the URL slug, e.g. "john-doe-123").
    """
    return await client.get_profile(profile_id)


@mcp.tool()
async def send_connection_request(profile_id: str, note: str = "") -> dict:
    """
    Send a LinkedIn connection request with an optional personalized note.
    Note must be 300 characters or fewer (LinkedIn limit).

    Args:
        profile_id: The public profile ID of the person to connect with.
        note: Optional personalized message (max 300 chars). Leave empty for no note.
    """
    return await client.send_connection_request(profile_id, note)


@mcp.tool()
def get_pending_invitations() -> dict:
    """
    Check pending LinkedIn connection invitations (sent and received).
    Returns invitation details including sender name, message, and timestamp.
    """
    return client.get_pending_invitations()

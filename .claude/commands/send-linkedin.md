# Send LinkedIn — Auto-Send Approved LinkedIn Messages via MCP

Send all approved LinkedIn connection requests and follow-up messages via the LinkedIn MCP server. Pulls "Approved" items from the Google Sheet, sends them through LinkedIn, and updates the sheet to "Sent".

## Variables

filter: $ARGUMENTS (optional — "connections" for connection requests only, "followups" for follow-ups only, or a company name to send for a specific company. Empty = send all approved LinkedIn items)

---

## Instructions

You are sending LinkedIn messages on behalf of Ayham Homsi using the LinkedIn MCP server. This command is the LinkedIn equivalent of the email auto-send — it bridges the Google Sheets approval workflow with actual LinkedIn delivery.

### Phase 1: Pull Approved LinkedIn Items

Pull the Outreach tab:
```bash
scripts/sheets-sync.sh get_data outreach
```

Scan for rows matching the filter:

**Connection requests** — rows where:
- LI Connection Stage (col R) = "Approved"
- LI Connection Message (col Q) is not empty
- LinkedIn URL (col F) is not empty

**Follow-up messages** — rows where:
- LI Follow-up Stage (col T) = "Approved"
- LI Follow-up Message (col S) is not empty
- LinkedIn URL (col F) is not empty

Apply the filter argument:
- No argument → process both connection requests and follow-ups
- `connections` → connection requests only
- `followups` → follow-ups only
- Company name → only rows matching that company

If nothing is found, tell the user: "No approved LinkedIn items found. Approve connection requests (col R) or follow-ups (col T) in the Outreach tab first."

### Phase 2: Present Summary & Confirm

Before sending anything, present a summary table:

```
## LinkedIn Send Queue

### Connection Requests (X items)
| Company | Contact | Message Preview | LinkedIn Profile |
|---|---|---|---|
| ... | ... | [first 60 chars]... | [profile URL] |

### Follow-up Messages (X items)
| Company | Contact | Message Preview | LinkedIn Profile |
|---|---|---|---|

**Total: X messages to send**
Rate limit: LinkedIn MCP allows max 12 calls/hour with 3-8s delays between calls.
```

**Ask for confirmation before proceeding.** This is a real send action — not a draft.

### Phase 3: Extract Profile IDs & Send

For each approved item:

**Step 1: Extract the public profile ID from the LinkedIn URL.**
The LinkedIn URL in the sheet is typically `https://www.linkedin.com/in/john-doe-123/` — the public profile ID is the slug: `john-doe-123`.

Parse it:
```python
url = "https://www.linkedin.com/in/john-doe-123/"
profile_id = url.rstrip("/").split("/in/")[-1]
```

**Step 2: Send via LinkedIn MCP.**

For **connection requests**, use:
```
mcp__linkedin__send_connection_request(profile_id="{public_id}", note="{connection message}")
```
- The note must be 300 characters or fewer (should already be — `/draft-outreach` enforces this)
- If the note exceeds 300 chars, skip this item and flag it for the user

For **follow-up messages**, use:
```
mcp__linkedin__send_message(profile_id="{urn_id}", message="{follow-up message}")
```
- **Important**: `send_message` requires the URN ID (not public ID). First call `mcp__linkedin__get_profile(profile_id="{public_id}")` to get the `urn_id`, then use that for `send_message`.
- Follow-up messages can only be sent to existing connections. If the send fails, note it and continue.

**Step 3: Update the sheet after each successful send.**

For connection requests:
```bash
scripts/sheets-sync.sh update_outreach "$(python3 -c "
import json
data = {
    'company': '[Company]',
    'contact_name': '[Contact Name]',
    'li_connection_stage': 'Sent'
}
print(json.dumps(data))
")"
```

For follow-ups:
```bash
scripts/sheets-sync.sh update_outreach "$(python3 -c "
import json
data = {
    'company': '[Company]',
    'contact_name': '[Contact Name]',
    'li_follow_up_stage': 'Sent'
}
print(json.dumps(data))
")"
```

**Handle errors gracefully**: If a send fails (rate limit, auth issue, already connected), log the error, skip the item, and continue with the next one. Report all failures at the end.

### Phase 4: Report Results

After processing all items, present a results summary:

```
## LinkedIn Send Results

### Sent Successfully (X/Y)
| Company | Contact | Channel | Status |
|---|---|---|---|
| ... | ... | Connection Request | Sent |
| ... | ... | Follow-up Message | Sent |

### Failed (X/Y)
| Company | Contact | Channel | Error |
|---|---|---|---|
| ... | ... | Connection Request | Already connected |

### Sheet Updated
- X connection request(s) updated to "Sent"
- X follow-up message(s) updated to "Sent"
```

### Phase 5: Log Execution

Append an execution record to `data/feedback-log.json`:

```bash
python3 -c "
import json, os
from datetime import datetime, timedelta

f = 'data/feedback-log.json'
data = json.load(open(f)) if os.path.exists(f) else {'entries': []}
cutoff = (datetime.now() - timedelta(days=90)).isoformat()
data['entries'] = [e for e in data['entries'] if e.get('timestamp', '') > cutoff]
data['entries'].append({
    'id': datetime.now().strftime('%Y-%m-%d') + '-' + str(len(data['entries']) + 1).zfill(3),
    'timestamp': datetime.now().isoformat(),
    'command': 'send-linkedin',
    'inputs': {'filter': '[filter used]', 'connections_queued': [N], 'followups_queued': [N]},
    'outputs': {'connections_sent': [N], 'followups_sent': [N], 'failed': [N]},
    'quality_signals': {},
    'errors': ['[any send failures with reasons]']
})
json.dump(data, open(f, 'w'), indent=2)
"
```

Fill in actual values from this run. If the write fails, note it but don't block the command.

### Phase 6: Suggest Next Steps

- "Connection requests sent — LinkedIn may take a few minutes to deliver them"
- "Once connections are accepted, set LI Connection Stage to **Accepted** in the sheet"
- "Then approve follow-up messages (col T → **Approved**) and run `/send-linkedin followups`"
- "Run `/dashboard` to see updated outreach stats"
- "When a lead responds with interest, run `/promote-lead [company]` to move them to Asana"

---

## Rate Limiting

The LinkedIn MCP enforces:
- **Max 12 calls per hour** (sliding window)
- **3-8 second random delay** between each call
- If the rate limit is hit, the MCP will wait automatically

For follow-up messages, each item requires 2 API calls (get_profile for URN ID + send_message), so effective throughput is ~6 follow-ups per hour. Connection requests need 1 call each, so ~12 per hour.

**Recommendation**: For large batches (>10 items), suggest the user run in smaller groups.

---

## Examples

- `/send-linkedin` — send all approved LinkedIn items (connections + follow-ups)
- `/send-linkedin connections` — send approved connection requests only
- `/send-linkedin followups` — send approved follow-up messages only
- `/send-linkedin Red Bull` — send approved LinkedIn items for Red Bull only

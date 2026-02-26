# Google Sheets Dashboard — Setup Guide

## Overview

The hrmny Sales Dashboard is a Google Sheet with **4 tabs** that acts as the central outreach tracker:

- **Companies** (14 cols) — One row per company. Tracks research through connection. Key column: Stage (col J).
- **Outreach** (22 cols) — One row per contact. All 3 outreach channels inline (email, LI connection, LI follow-up). Key columns: Contact Stage (col I), Email Stage (col M), LI Connection Stage (col R), LI Follow-up Stage (col T).
- **Dashboard** — Auto-updating summary with formulas. No manual editing needed.
- **Log** — Webhook activity log for debugging.

When you run `/find-leads`, data is pushed to the Companies tab. `/fetch-contacts` adds contacts to the Outreach tab. `/draft-outreach` fills the messaging columns for existing contacts. The `/dashboard` command reads from both tabs. When a lead connects, `/promote-lead` moves them from the sheet to Asana.

**Gated workflow**: Each stage requires your approval before the next command can proceed:
1. `/find-leads` → Companies tab (Stage: "Researched") → **You approve** → Stage: "Approved"
2. `/fetch-contacts` → Outreach tab (Contact Stage: "Contact Found") → **You approve** → Contact Stage: "Contact Approved"
3. `/draft-outreach` → Outreach tab (Email/LI stages: "Drafted") → **You approve per channel** → "Approved" triggers send

---

## Step 1: Create the Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Name it **"hrmny Sales Dashboard 2026"**
3. Note the spreadsheet ID from the URL — it's the long string between `/d/` and `/edit`

---

## Step 2: Set up the Apps Script

1. In your new spreadsheet, go to **Extensions → Apps Script**
2. Delete any existing code in the editor
3. Copy the entire contents of `scripts/google-sheets-webhook.gs` and paste it into the editor
4. Click **Save** (Ctrl/Cmd + S)
5. Name the project **"hrmny Dashboard Webhook"**

---

## Step 3: Run initial setup

1. In the Apps Script editor, select the `setupSheet` function from the dropdown (next to the Run button)
2. Click **Run**
3. When prompted, click **Review Permissions** → select your Google account → **Allow**
4. This creates all 4 tabs (Companies, Outreach, Dashboard, Log) with headers, dropdowns, conditional formatting, and Dashboard formulas

---

## Step 3b: Migration from V1 (if upgrading from old 3-tab structure)

If you have an existing sheet with the old Leads, Contacts, and Outreach tabs:

1. In the Apps Script editor, first update the code to the latest version from `scripts/google-sheets-webhook.gs`
2. Deploy as a new version (Deploy → Manage deployments → edit → New version → Deploy)
3. Select the `migrateToV2` function from the dropdown
4. Click **Run**
5. The migration will:
   - Read all data from the old Leads, Contacts, and Outreach tabs
   - Map it to the new Companies and Outreach tab structure
   - Archive old tabs with `_Archive` suffix (Leads_Archive, Contacts_Archive, Outreach_Archive)
   - Create new Companies and Outreach tabs with migrated data
   - Rebuild the Dashboard tab with updated formulas
6. After verifying the migration is correct, you can optionally delete the `_Archive` tabs

---

## Step 4: Deploy as web app

1. Click **Deploy → New deployment**
2. Click the gear icon next to "Select type" → choose **Web app**
3. Set:
   - **Description**: "hrmny Sales Dashboard Webhook"
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Click **Deploy**
5. **Copy the Web app URL** — you'll need it in the next step

> The URL looks like: `https://script.google.com/macros/s/AKfycb.../exec`

---

## Step 4b: Enable outreach approval trigger (per-channel)

This enables the approval workflow: when you change a channel's stage to "Approved" in the Outreach tab, it triggers the appropriate action.

1. In the Apps Script editor, select the `setupOutreachTrigger` function from the dropdown
2. Click **Run**
3. When prompted, approve **Gmail permissions** (this allows the script to send emails from your Gmail)
4. You'll see a confirmation in the Log tab

**How it works after setup — 3 independent triggers per channel:**

| Column | Action on "Approved" |
|---|---|
| **Email Stage** (col M) | Email is auto-sent from your Gmail. Stage updates to "Sent", Date Sent + Follow-up Due are set |
| **LI Connection Stage** (col R) | Set to "Approved", then run `/send-linkedin` to send via LinkedIn MCP. Fallback: notification email with message + profile link |
| **LI Follow-up Stage** (col T) | Set to "Approved", then run `/send-linkedin` to send via LinkedIn MCP. Fallback: notification email with message + profile link |

Each channel operates independently — you can approve an email without approving LinkedIn, or vice versa.

---

## Step 4c: Enable email tracking trigger (Automated send/reply detection)

This enables automated tracking: the script checks Gmail every 30 minutes to detect replies and sends a daily follow-up digest email.

1. In the Apps Script editor, select the `setupTrackingTrigger` function from the dropdown
2. Click **Run**
3. Approve any additional permissions if prompted
4. You'll see a confirmation in the Log tab

**What it does automatically:**
- **Sent detection (legacy)**: For any older rows still at "Draft Created", the script detects when the draft is manually sent and updates to "Sent". New emails skip this — they go straight to "Sent" on approval
- **Reply detection**: When a recipient replies to your email, the script detects it and updates Email Stage → "Replied", sets Email Response Date, and captures the first 200 characters of the reply in Email Response Summary
- **No Response auto-set**: If no reply is received within 7 days, Email Stage is automatically set to "No Response"
- **Follow-up digest**: Once per day, if there are overdue follow-ups or LinkedIn connections to check, you receive a branded digest email with all items sorted by urgency, including any drafted LinkedIn follow-up messages ready to copy

---

## Step 5: Configure the workspace

Create the config file at `data/sheets-config.json`:

```json
{
  "webhook_url": "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec",
  "sheet_id": "YOUR_SPREADSHEET_ID"
}
```

Replace:
- `YOUR_DEPLOYMENT_ID` — from the deployment URL you copied
- `YOUR_SPREADSHEET_ID` — from the spreadsheet URL

---

## Step 6: Test

Run a test from the terminal:

```bash
scripts/sheets-sync.sh add_company '{"company":"Test Company","sector":"Retail","icp_fit":"Warm","why_this_company":"Test insight","services":"SMM","lead_source":"Cold Outbound","stage":"Researched"}'
```

Check the Google Sheet — a new row should appear in the **Companies** tab.

Then test reading:

```bash
scripts/sheets-sync.sh get_data summary
```

This should return a JSON summary of Companies and Outreach tab stats.

Then test adding a contact:

```bash
scripts/sheets-sync.sh add_contact '{"company":"Test Company","name":"Test Person","title":"CMO","email":"test@test.com","email_status":"Verified","linkedin_url":"https://linkedin.com/in/test","seniority":"C-Suite","why_this_person":"Decision maker","contact_stage":"Contact Found"}'
```

Check the **Outreach** tab — a new row should appear.

Clean up test data after verifying.

---

## Updating the deployment

If you modify the Apps Script code:

1. Go to **Deploy → Manage deployments**
2. Click the edit (pencil) icon on your deployment
3. Change **Version** to "New version"
4. Click **Deploy**
5. The URL stays the same — no config change needed

---

## Tab Reference

### Companies Tab (14 columns)

| Col | Header | Notes |
|---|---|---|
| A | Company | Company/brand name (unique key) |
| B | Sector | Industry/category |
| C | ICP Fit | Hot / Warm / Cool (dropdown) |
| D | Why This Company | Research insight — why this company is relevant |
| E | Services Match | SMM / PR / Campaigns / Branding / Activations |
| F | Est. Value (AED) | Estimated deal value |
| G | Outreach Angle | The hook for outreach |
| H | Evidence/Sources | URLs from research |
| I | Lead Source | Cold Outbound / Intent Signal (dropdown) |
| J | Stage | Researched → Approved → Contacts Found → Outreach Ready → Sent → Replied → Connected / Rejected / Rework (dropdown) |
| K | Feedback | Free text — used with "Rework" stage |
| L | Asana Task ID | Set by `/promote-lead` |
| M | Date Added | Auto-set |
| N | Date Updated | Auto-set |

### Outreach Tab (22 columns)

| Col | Header | Notes |
|---|---|---|
| A | Company | Matches Companies tab |
| B | Contact Name | Full name |
| C | Title | Job title |
| D | Email | Email address |
| E | Email Status | Verified / Unverified / Unavailable (dropdown) |
| F | LinkedIn URL | Profile link |
| G | Seniority | C-Suite / VP / Director / Head / Manager (dropdown) |
| H | Why This Contact | Reason they're the right person |
| I | Contact Stage | Contact Found → Contact Approved / Rejected / Rework (dropdown) |
| J | Feedback | Free text — used with "Rework" stages |
| K | Email Subject | Subject line for cold email |
| L | Email Body | Full email body text |
| M | Email Stage | Drafted → Rework → Approved → Sent → Replied → No Response (dropdown). "Approved" auto-sends the email |
| N | Email Date Sent | Auto-set by tracking |
| O | Email Response Date | Auto-set by tracking |
| P | Email Response Summary | First 200 chars of reply |
| Q | LI Connection Message | LinkedIn connection request text |
| R | LI Connection Stage | Drafted → Rework → Approved → Sent → Accepted → No Response (dropdown) |
| S | LI Follow-up Message | LinkedIn follow-up message text |
| T | LI Follow-up Stage | Drafted → Rework → Approved → Sent → Replied → No Response (dropdown) |
| U | Follow-up Due | Auto-calculated (send date + 5 business days) |
| V | Date Added | Auto-set |

---

## Step 7: Configure newsletter recipients (optional)

By default, the morning brief email is sent only to the account that deployed the Apps Script. To add team members:

**Option A — via Apps Script editor:**
1. Open the Apps Script editor
2. Run this in the console: `setNewsletterRecipients(['ayham@hrmny.co', 'team-member@hrmny.co'])`

**Option B — via webhook POST:**
```bash
curl -s -L -H 'Content-Type: application/json' \
  -d '{"action":"set_newsletter_recipients","data":{"emails":["ayham@hrmny.co","team-member@hrmny.co"]}}' \
  "YOUR_WEBHOOK_URL"
```

Recipients are stored in Script Properties and persist across deployments. To check current recipients, run `getNewsletterRecipients()` in the Apps Script console.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `Config not found` | Create `data/sheets-config.json` with your webhook URL |
| `HTTP 401` or `403` | Re-deploy the Apps Script with "Anyone" access |
| `Company already exists` | The sheet checks for duplicate company names in the Companies tab — use `update_company` instead |
| `Contact not found` | For `update_outreach`, the contact must already exist in the Outreach tab — run `/fetch-contacts` first |
| Data not appearing | Check the **Log** tab in the sheet for error details |
| `HTTP 302` / redirects | Make sure you're using the `/exec` URL, not `/dev` |
| Approval trigger not firing | Re-run `setupOutreachTrigger` — check Triggers in Apps Script editor to confirm it exists |
| Email not sending on approval | Check Gmail permissions — re-run `setupOutreachTrigger` and approve permissions |

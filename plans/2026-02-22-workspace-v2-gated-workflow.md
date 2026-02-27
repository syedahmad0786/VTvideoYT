# Plan: Workspace V2 — Gated Workflow & Sheet Restructure

**Created:** 2026-02-22
**Status:** Implemented
**Request:** Restructure the Google Sheets dashboard from 3 data tabs to 2, add approval gates at each pipeline phase, add a feedback mechanism via a `/review` command, and update all commands to respect the new workflow.

---

## Overview

### What This Plan Accomplishes

Restructures the entire outreach system from a 3-tab, gate-free flow into a 2-tab, gated pipeline where every phase (company research → contact enrichment → outreach drafting → sending) has an explicit approval checkpoint. Adds a feedback mechanism that lets the user rework any output directly from the sheet. Updates all commands to respect gates and the new data structure.

### Why This Matters

The current system runs everything end-to-end without pause — burning Apollo credits on companies the user might reject, drafting outreach for contacts they might not want to pursue, and landing 9 rows per company across 3 tabs with no way to give quality feedback. This restructuring gives the user control over every phase, consolidates the view to two purposeful tabs, and creates a feedback loop that feeds corrections back into Claude's output.

---

## Current State

### Relevant Existing Structure

| File | Role |
|---|---|
| `scripts/google-sheets-webhook.gs` | Apps Script — tab setup, POST/GET handlers, data operations, Gmail draft triggers, email tracking |
| `scripts/sheets-sync.sh` | CLI wrapper for webhook calls |
| `.claude/commands/find-leads.md` | Researches companies AND auto-enriches contacts |
| `.claude/commands/fetch-contacts.md` | Fetches contacts for a single company |
| `.claude/commands/draft-outreach.md` | Drafts email + LinkedIn messages |
| `.claude/commands/daily-research.md` | Full autonomous pipeline |
| `.claude/commands/process-intent-leads.md` | Intent CSV → full pipeline |
| `.claude/commands/promote-lead.md` | Google Sheets → Asana |
| `.claude/commands/dashboard.md` | Reads sheet data, renders dashboard |
| `reference/google-sheets-setup.md` | Setup guide for the sheet |
| `CLAUDE.md` | Workspace documentation |

### Current Google Sheets Tabs

| Tab | Headers |
|---|---|
| **Leads** (15 cols) | Company, Sector, ICP Fit, Status, Services Needed, Est. Value, Outreach Angle, Lead Source, Evidence, Asana Task ID, Primary Contact, Primary Email, Date Added, Date Updated, Notes |
| **Contacts** (13 cols) | Company, Contact Name, Title, Email, Email Status, LinkedIn URL, Apollo ID, Seniority, Why This Person, Outreach Status, Date Added, Date Last Contacted, Notes |
| **Outreach** (13 cols) | Company, Contact Name, Channel, Subject/Hook, Message Body, Recipient Email, Status, Date Drafted, Date Sent, Date Approved, Response Date, Response Summary, Follow-up Due |
| **Dashboard** | Formula-driven summary |
| **Log** | Timestamp, Action, Details |

### Gaps and Problems Being Addressed

1. **No approval gates** — `/find-leads` auto-enriches contacts (burns Apollo credits) with no user review of company picks
2. **Data spread across 3 tabs** — understanding one company requires checking 3 separate tabs
3. **Duplicate data** — Primary Contact/Email in Leads tab duplicates Contacts tab; Outreach Status in Contacts tab duplicates Outreach tab Status
4. **Status desynchronization** — three independent status progressions (Lead Status, Contact Outreach Status, Outreach Status) that can diverge
5. **Row explosion** — 3 contacts × 3 channels = 9 rows per company in the Outreach tab
6. **No feedback mechanism** — no way to tell Claude "this contact is wrong" or "this email is too generic" and have it act on the feedback
7. **No research insights in the sheet** — companies land in the sheet without the reasoning behind why they were picked
8. **Lead Source validation bug** — Leads dropdown doesn't include "Intent Signal"

---

## Proposed Changes

### Summary of Changes

- Replace 3 data tabs (Leads, Contacts, Outreach) with 2 data tabs (Companies, Outreach)
- Companies tab: one row per company with research insights, stage gates, and feedback column
- Outreach tab: one row per contact with all 3 channels inline (22 columns), contact stage, per-channel stages, and feedback column
- Add approval gates: Researched → Approved → Contacts Found → Contact Approved → Drafted → Approved (send)
- Add `/review` command that reads "Rework" items + feedback and regenerates content
- Update `/find-leads` to ONLY research companies (no Apollo enrichment)
- Update `/fetch-contacts` to support batch mode (all "Approved" companies) and respect gates
- Update `/draft-outreach` to write inline to Outreach tab and respect Contact Approved gate
- Update `/daily-research` and `/process-intent-leads` to run full pipeline but land at correct stages for review
- Update `/promote-lead` and `/dashboard` to read from new tab structure
- Update Apps Script with new tab structure, per-channel onEdit triggers, updated tracking automation
- Update Dashboard tab formulas for new structure
- Add migration function for existing data
- Update `CLAUDE.md` and `reference/google-sheets-setup.md`

### New Files to Create

| File Path | Purpose |
|---|---|
| `.claude/commands/review.md` | New `/review` command — reads feedback from sheet, regenerates content |

### Files to Modify

| File Path | Changes |
|---|---|
| `scripts/google-sheets-webhook.gs` | Complete rewrite — new tab headers, data operations, per-channel onEdit triggers, updated tracking, migration function |
| `scripts/sheets-sync.sh` | Updated action names and payloads for new tab structure |
| `.claude/commands/find-leads.md` | Remove auto-contact enrichment (Phase 4), update sync to Companies tab |
| `.claude/commands/fetch-contacts.md` | Add batch mode, respect "Approved" gate, sync to new Outreach tab format |
| `.claude/commands/draft-outreach.md` | Write inline to Outreach tab columns, respect "Contact Approved" gate |
| `.claude/commands/daily-research.md` | Update sync calls for new structure, set correct stages |
| `.claude/commands/process-intent-leads.md` | Update sync calls for new structure, set correct stages |
| `.claude/commands/promote-lead.md` | Read from Companies + Outreach tabs instead of Leads + Contacts |
| `.claude/commands/dashboard.md` | Read from new tab structure, updated rendering |
| `reference/google-sheets-setup.md` | Updated setup steps, new tab descriptions, migration instructions |
| `CLAUDE.md` | Updated workspace structure, workflow diagram, command descriptions |

### Files to Delete

None — existing files are modified in place.

---

## Design Decisions

### Key Decisions Made

1. **Two tabs, not one**: A single tab can't cleanly represent the 1-to-many relationship between companies and contacts. Two tabs (Companies = one row per company, Outreach = one row per contact) maintains a clean data model while eliminating the third (Outreach-as-messages) tab entirely.

2. **One row per contact with all channels inline**: Instead of one row per message (which causes 9x row explosion), each contact gets one row with Email, LinkedIn Connection, and LinkedIn Follow-up columns inline. This means 22 columns but only 3 rows per company instead of 9.

3. **Unified Feedback column**: One Feedback column per tab rather than per-channel. The user writes "email: too generic, linkedin: fine" in free text. This keeps the column count manageable and doesn't force structured input.

4. **`/find-leads` stops at research**: The biggest behavior change. No Apollo credits are spent until the user explicitly approves companies. This prevents wasting credits on poor fits.

5. **`/daily-research` runs full pipeline but lands at review-ready stages**: Since it runs autonomously at 6:30 AM, it can't wait for approval gates. It runs the full pipeline (research + contacts + outreach) but sets stages correctly so the user reviews and approves in the morning before anything gets sent. The SEND gate is always manual.

6. **`/review` command reads sheet feedback**: The feedback loop is command-driven. User writes feedback in the sheet → sets stage to "Rework" → runs `/review` → Claude reads feedback, regenerates, updates the row. This works within the constraint that Claude only runs when invoked.

7. **Per-channel onEdit triggers**: The Apps Script onEdit handler watches Email Stage (col M), LI Connection Stage (col R), and LI Follow-up Stage (col T) independently. Each channel can be approved, reworked, or held separately.

8. **Dashboard tab preserved**: The formula-driven Dashboard tab is updated with formulas referencing the new column positions. Retains its role as a quick visual summary.

9. **Migration via Apps Script function**: A `migrateToV2()` function in the webhook script migrates existing data from old tabs to new structure, then archives old tabs with `_Archive` suffix.

10. **Lead Source dropdown includes "Intent Signal"**: Fixing the existing validation bug.

### Alternatives Considered

- **Three tabs with gates**: Keeps existing structure but adds review columns. Rejected because it doesn't solve data duplication or the 3-tab confusion.
- **Single tab**: One row per company with everything inline. Rejected because multi-contact companies make it unworkable (can't have 3 contacts in one row without excessive columns or comma-separated values).
- **Separate feedback columns per channel**: More structured but adds 4+ columns. Rejected in favor of one unified Feedback column to keep column count at 22.
- **`/daily-research` only does research**: Would require 2 additional manual command runs every morning. Rejected as too much friction for a daily workflow.

### Open Questions

None — all design decisions were discussed and aligned in the conversation preceding this plan.

---

## Step-by-Step Tasks

### Step 1: Rewrite Apps Script — Tab Structure & Setup

Complete rewrite of `scripts/google-sheets-webhook.gs` with the new tab structure.

**Actions:**

- Replace `SHEET_NAMES` — rename `leads` to `companies`, keep `outreach`, keep `dashboard`, keep `log`. Remove `contacts`.
- Replace `LEADS_HEADERS` with `COMPANIES_HEADERS`:
  ```
  ['Company', 'Sector', 'ICP Fit', 'Why This Company', 'Services Match', 'Est. Value (AED)',
   'Outreach Angle', 'Evidence/Sources', 'Lead Source', 'Stage', 'Feedback',
   'Asana Task ID', 'Date Added', 'Date Updated']
  ```
- Replace `CONTACTS_HEADERS` + `OUTREACH_HEADERS` with unified `OUTREACH_HEADERS`:
  ```
  ['Company', 'Contact Name', 'Title', 'Email', 'Email Status', 'LinkedIn URL',
   'Seniority', 'Why This Contact', 'Contact Stage', 'Feedback',
   'Email Subject', 'Email Body', 'Email Stage', 'Email Date Sent',
   'Email Response Date', 'Email Response Summary',
   'LI Connection Message', 'LI Connection Stage',
   'LI Follow-up Message', 'LI Follow-up Stage',
   'Follow-up Due', 'Date Added']
  ```
- Update `setupCompaniesTab()` (replaces `setupLeadsTab()`):
  - Column widths: [200, 140, 90, 300, 180, 120, 250, 250, 130, 130, 250, 120, 100, 100]
  - Dropdown — ICP Fit (col C): Hot, Warm, Cool
  - Dropdown — Lead Source (col I): Cold Outbound, Intent Signal, Inbound, Contact, Referral
  - Dropdown — Stage (col J): Researched, Approved, Contacts Found, Outreach Ready, Sent, Replied, Connected, Rejected, Rework
  - Conditional formatting for ICP Fit (C) and Stage (J)
  - Number format for Est. Value (F)
  - Freeze row 1, freeze column A
- Update `setupOutreachTab()`:
  - Column widths: [180, 160, 180, 220, 100, 240, 100, 250, 130, 250, 250, 400, 120, 100, 100, 250, 350, 120, 350, 120, 100, 100]
  - Wrap text on Email Body (col L), LI Connection Message (col Q), LI Follow-up Message (col S)
  - Dropdown — Email Status (col E): Verified, Unverified, Unavailable
  - Dropdown — Seniority (col G): C-Suite, VP, Director, Head, Manager
  - Dropdown — Contact Stage (col I): Contact Found, Contact Approved, Rejected, Rework
  - Dropdown — Email Stage (col M): Drafted, Rework, Approved, Draft Created, Sent, Replied, No Response
  - Dropdown — LI Connection Stage (col R): Drafted, Rework, Approved, Sent, Accepted, No Response
  - Dropdown — LI Follow-up Stage (col T): Drafted, Rework, Approved, Sent, Replied, No Response
  - Conditional formatting for all stage columns
  - Freeze row 1, freeze columns A-B
- Remove `setupContactsTab()` entirely
- Update `setupSheet()` to call new tab setup functions, remove contacts tab creation

**Files affected:**
- `scripts/google-sheets-webhook.gs`

---

### Step 2: Rewrite Apps Script — Data Operations

Update all POST handler functions for the new tab structure.

**Actions:**

- Rename `addLead()` → `addCompany()`:
  - Writes to Companies tab
  - Row: [company, sector, icp_fit, why_this_company, services, est_value, outreach_angle, evidence, lead_source, stage (default "Researched"), feedback (""), asana_task_id, date_added, date_updated]
  - Duplicate check by company name (col A)
- Rename `updateLead()` → `updateCompany()`:
  - Field map updated for new column positions
  - Always updates Date Updated (col N)
- Replace `addContact()` with new version that writes to Outreach tab:
  - Writes contact fields (cols A-I, V) with outreach columns empty
  - Row: [company, name, title, email, email_status, linkedin_url, seniority, why_this_person, contact_stage (default "Contact Found"), feedback, "", "", "", "", "", "", "", "", "", "", "", date_added]
  - Duplicate check by company + name
- Replace `addOutreach()` with `updateOutreach()` that fills messaging columns for an existing contact row:
  - Finds row by company + contact_name
  - Sets: email_subject (K), email_body (L), email_stage (M), li_connection_msg (Q), li_connection_stage (R), li_follow_up_msg (S), li_follow_up_stage (T)
  - This is how `/draft-outreach` writes messages into existing contact rows
- Keep `updateContact()` but update field map for new column positions
- Replace `updateStatus()` with `updateStage()`:
  - Accepts: tab (companies/outreach), identifier fields, stage_column, new_stage
  - For companies: find by company name, update Stage (col J)
  - For outreach: find by company + name, update specified stage column (I, M, R, or T)
- Update `doPost()` switch cases:
  - `add_company`, `update_company`, `add_contact`, `update_contact`, `update_outreach`, `update_stage`, `send_daily_summary`, `setup`, `migrate_v2`
- Update GET handler `getSummary()`:
  - Read Companies tab (new column positions for stage=col J index 9, icp_fit=col C index 2, value=col F index 5)
  - Read Outreach tab (contact_stage=col I index 8, email_stage=col M index 12, li_conn_stage=col R index 17, li_fu_stage=col T index 19)
  - Aggregate: leads by stage, by ICP fit, contacts by contact stage, emails by email stage, LI by LI stage
  - Needs action: companies at "Researched" (awaiting review), contacts at "Contact Found" (awaiting review), any "Rework" items, follow-ups overdue
- Update GET handler `getSheetData()` — no structural changes needed, it reads headers dynamically

**Files affected:**
- `scripts/google-sheets-webhook.gs`

---

### Step 3: Rewrite Apps Script — onEdit Triggers & Tracking

Update the approval triggers and email tracking automation for the new per-channel structure.

**Actions:**

- Rewrite `onOutreachEdit(e)` (or `onEdit(e)` handler) to check which column was edited in the Outreach tab:
  - **Column M (Email Stage) → "Approved"**:
    - Read: Company (A), Contact Name (B), Email (D), Email Subject (K), Email Body (L)
    - Validate: Email is not empty, Email Body is not empty
    - Create Gmail draft: to=Email, subject=Email Subject, body=Email Body (HTML formatted with sign-off)
    - Set Email Stage (M) → "Draft Created"
    - Log the action
  - **Column R (LI Connection Stage) → "Approved"**:
    - Read: Company (A), Contact Name (B), LinkedIn URL (F), LI Connection Message (Q)
    - Validate: LinkedIn URL is not empty, LI Connection Message is not empty
    - Send notification email to self with: message text ready to copy, LinkedIn profile link, contact name and company
    - Keep stage at "Approved" (user manually sets "Sent" after pasting on LinkedIn)
    - Log the action
  - **Column T (LI Follow-up Stage) → "Approved"**:
    - Same pattern as LI Connection but reads LI Follow-up Message (S)
    - Send notification email with follow-up message text + LinkedIn link
    - Keep stage at "Approved"
    - Log the action
- Rewrite `trackEmails()` (the 30-minute trigger):
  - Scan Outreach tab for rows where Email Stage (col M) = "Draft Created":
    - Search Gmail for matching draft/sent email by subject + recipient
    - If sent: Email Stage → "Sent", Email Date Sent (N) → today, calculate Follow-up Due (U) = sent + 5 business days
  - Scan for rows where Email Stage = "Sent":
    - Search Gmail for replies in the thread
    - If reply found: Email Stage → "Replied", Email Response Date (O) → today, Email Response Summary (P) → first 200 chars
    - If no reply and Email Date Sent + 7 days < today: Email Stage → "No Response"
  - Column references must use the new positions (M=13, N=14, O=15, P=16, U=21)
- Update `setupOutreachTrigger()` to create the onEdit trigger for the new column checks
- Update `setupTrackingTrigger()` — the time-driven trigger setup doesn't change, but the function it calls uses new columns
- Rewrite follow-up digest email to reference new columns:
  - Find overdue follow-ups: Follow-up Due (U) < today AND Email Stage (M) = "Sent"
  - Find LinkedIn items that need manual follow-up: LI Connection Stage (R) = "Approved" (sent but not confirmed)
  - Include any drafted LI Follow-up messages (T = "Drafted") for contacts whose LI Connection Stage = "Accepted"

**Files affected:**
- `scripts/google-sheets-webhook.gs`

---

### Step 4: Rewrite Apps Script — Dashboard Tab Formulas

Update the Dashboard tab to reflect the new 2-tab structure.

**Actions:**

- Update `createDashboardTab()` with new formula references:
  - **Top KPI cards:**
    - Total Companies: `=COUNTA(Companies!A:A)-1`
    - Pipeline Value: `=SUMPRODUCT((Companies!F2:F<>"")*1,Companies!F2:F)` (formatted as AED)
    - Total Contacts: `=COUNTA(Outreach!A:A)-1`
    - Email Response Rate: `=IFERROR(COUNTIF(Outreach!M:M,"Replied")/(COUNTIF(Outreach!M:M,"Sent")+COUNTIF(Outreach!M:M,"Replied")+COUNTIF(Outreach!M:M,"No Response")),"--")`
  - **Companies by Stage (left column):**
    - Researched: `=COUNTIF(Companies!J:J,"Researched")`
    - Approved: `=COUNTIF(Companies!J:J,"Approved")`
    - Contacts Found: `=COUNTIF(Companies!J:J,"Contacts Found")`
    - Outreach Ready: `=COUNTIF(Companies!J:J,"Outreach Ready")`
    - Sent: `=COUNTIF(Companies!J:J,"Sent")`
    - Replied: `=COUNTIF(Companies!J:J,"Replied")`
    - Connected: `=COUNTIF(Companies!J:J,"Connected")`
  - **Companies by ICP Fit (right column):**
    - Hot: `=COUNTIF(Companies!C:C,"Hot")`
    - Warm: `=COUNTIF(Companies!C:C,"Warm")`
    - Cool: `=COUNTIF(Companies!C:C,"Cool")`
  - **Outreach Performance (left column):**
    - Emails Drafted: `=COUNTIF(Outreach!M:M,"Drafted")`
    - Emails Approved/Draft Created: `=COUNTIF(Outreach!M:M,"Approved")+COUNTIF(Outreach!M:M,"Draft Created")`
    - Emails Sent: `=COUNTIF(Outreach!M:M,"Sent")`
    - Emails Replied: `=COUNTIF(Outreach!M:M,"Replied")`
    - Emails No Response: `=COUNTIF(Outreach!M:M,"No Response")`
  - **LinkedIn Performance (right column):**
    - LI Requests Drafted: `=COUNTIF(Outreach!R:R,"Drafted")`
    - LI Requests Sent: `=COUNTIF(Outreach!R:R,"Sent")`
    - LI Accepted: `=COUNTIF(Outreach!R:R,"Accepted")`
    - LI Follow-ups Sent: `=COUNTIF(Outreach!T:T,"Sent")`
    - LI Follow-ups Replied: `=COUNTIF(Outreach!T:T,"Replied")`
  - **Needs Action section (red background):**
    - Companies awaiting review: `=COUNTIF(Companies!J:J,"Researched")`
    - Contacts awaiting review: `=COUNTIF(Outreach!I:I,"Contact Found")`
    - Outreach awaiting approval: `=COUNTIF(Outreach!M:M,"Drafted")+COUNTIF(Outreach!R:R,"Drafted")+COUNTIF(Outreach!T:T,"Drafted")`
    - Rework items: `=COUNTIF(Companies!J:J,"Rework")+COUNTIF(Outreach!I:I,"Rework")+COUNTIF(Outreach!M:M,"Rework")+COUNTIF(Outreach!R:R,"Rework")+COUNTIF(Outreach!T:T,"Rework")`
    - Follow-ups overdue: `=COUNTIFS(Outreach!U:U,"<"&TODAY(),Outreach!U:U,"<>",Outreach!M:M,"Sent")`
- Keep the same visual styling (hrmny brand colors, card layout)

**Files affected:**
- `scripts/google-sheets-webhook.gs`

---

### Step 5: Rewrite Apps Script — Migration Function

Add a `migrateToV2()` function that converts existing data from the old 3-tab structure to the new 2-tab structure.

**Actions:**

- Create `migrateToV2()`:
  1. Check if old tabs exist (Leads, Contacts, Outreach). If not, log and return.
  2. **Migrate Companies**: Read all rows from Leads tab. For each row, map to new Companies headers:
     - Company (A→A), Sector (B→B), ICP Fit (C→C), Why This Company ← Outreach Angle (G) or Notes (O), Services Match ← Services Needed (E→E), Est. Value (F→F), Outreach Angle (G→G), Evidence (I→H), Lead Source (H→I), Stage ← Status mapping (Researched→Researched, Contacts Found→Contacts Found, Outreach Drafted→Outreach Ready, Contacted→Sent, Connected→Connected), Feedback ← "", Asana Task ID (J→L), Date Added (M→M), Date Updated (N→N)
     - Write to new Companies tab
  3. **Migrate Outreach (contacts + messages)**: Read all rows from old Contacts tab. For each contact:
     - Create a new Outreach tab row with contact fields (A-I, V)
     - Contact Stage: map from old Outreach Status (Not Contacted → Contact Found, LinkedIn Sent/Email Sent → Contact Approved, Replied → Contact Approved, Meeting → Contact Approved)
     - Search old Outreach tab for matching rows (same company + same contact name)
     - If Email outreach found: fill Email Subject (K), Email Body (L), Email Stage (M) mapped from old Status, Date Sent (N), Response Date (O), Response Summary (P)
     - If LinkedIn Connection found: fill LI Connection Message (Q), LI Connection Stage (R) mapped from old Status
     - If LinkedIn Follow-up found: fill LI Follow-up Message (S), LI Follow-up Stage (T) mapped from old Status
     - Follow-up Due (U) from old outreach if present
  4. **Archive old tabs**: Rename Leads → Leads_Archive, Contacts → Contacts_Archive, Outreach → Outreach_Archive
  5. **Set up new tabs**: Call `setupCompaniesTab()` and `setupOutreachTab()` to apply formatting, dropdowns, conditional formatting
  6. **Rebuild Dashboard**: Call `createDashboardTab()` with new formulas
  7. Log: "Migration complete. [N] companies migrated. [M] contacts migrated. Old tabs archived with _Archive suffix."

**Files affected:**
- `scripts/google-sheets-webhook.gs`

---

### Step 6: Update `sheets-sync.sh`

Update the CLI script with new action names matching the new webhook structure.

**Actions:**

- Update the usage text and case statement:
  ```
  Actions:
    add_company       '{"company":"...", "sector":"...", ...}'
    update_company    '{"company":"...", "stage":"...", ...}'
    add_contact       '{"company":"...", "name":"...", ...}'
    update_contact    '{"company":"...", "name":"...", ...}'
    update_outreach   '{"company":"...", "contact_name":"...", "email_subject":"...", ...}'
    update_stage      '{"company":"...", "tab":"companies|outreach", "stage":"...", ...}'
    send_summary      '{"date":"...", ...}'
    get_data          companies|outreach|summary
  ```
- Update the case statement to route new action names
- Remove old actions: `add_lead`, `update_lead`, `add_outreach`, `update_status`
- The `post_data` and `get_data` functions don't change (they're generic HTTP callers)

**Files affected:**
- `scripts/sheets-sync.sh`

---

### Step 7: Update `/find-leads` — Research Only, No Apollo

Modify the command to ONLY research companies and sync to the Companies tab. Remove all contact enrichment.

**Actions:**

- Remove Phase 4 (Fetch Contacts) entirely — no Apollo calls
- Remove Phase 4's output format (the contacts table per company)
- Update Phase 5 (Output) to remove contact details, keep company briefs only
- Update the output format to emphasize the fields that land in the sheet:
  - **Why This Company** (the research insight — this is new and critical)
  - Services Match, Outreach Angle, Evidence
- Update Phase 7 (Sync to Google Sheets):
  - Replace `sheets-sync.sh add_lead` → `sheets-sync.sh add_company` with new payload:
    ```bash
    scripts/sheets-sync.sh add_company '{"company":"[Company]","sector":"[Sector]","icp_fit":"[Hot/Warm/Cool]","why_this_company":"[Research insight — why this company is relevant]","services":"[Services Match]","est_value":"[AED value]","outreach_angle":"[Angle]","evidence":"[URLs]","lead_source":"Cold Outbound","stage":"Researched"}'
    ```
  - Remove all `add_contact`, `update_lead` calls
  - Remove the "update status to Contacts Found" step
- Update Phase 8 (Suggest Next Steps):
  - "Review the researched companies in the **Companies tab** of the Google Sheet"
  - "Set Stage to **Approved** for companies you want to pursue"
  - "Set Stage to **Rejected** for companies that don't fit"
  - "Set Stage to **Rework** + write Feedback for companies that need adjustment"
  - "Then run `/fetch-contacts` to enrich contacts for all approved companies"
- Update Quality Standards:
  - Remove "Top 3-5 leads must have verified contact details"
  - Add "Every lead must have a specific 'Why This Company' insight — not just 'they're a big brand'"
  - Add "Leads are synced to the Companies tab at Stage 'Researched' — they require your approval before contacts are fetched"

**Files affected:**
- `.claude/commands/find-leads.md`

---

### Step 8: Update `/fetch-contacts` — Batch Mode & Gates

Update to support batch processing of all "Approved" companies, respect the gate, and sync to the new Outreach tab.

**Actions:**

- Add batch mode: when invoked without a specific company argument (just `/fetch-contacts`), pull the Companies tab from Google Sheets, find all companies with Stage = "Approved", and process each
- Keep single-company mode: when invoked with a company name (`/fetch-contacts Samsung`), process just that company (but still check it's "Approved" or warn if not)
- Update Phase 6 (Sync to Google Sheets):
  - Replace `sheets-sync.sh add_contact` with new payload for the Outreach tab:
    ```bash
    scripts/sheets-sync.sh add_contact '{"company":"[Company]","name":"[Name]","title":"[Title]","email":"[Email]","email_status":"[Verified/Unverified/Unavailable]","linkedin_url":"[URL]","seniority":"[Level]","why_this_person":"[Reason]","contact_stage":"Contact Found"}'
    ```
  - Replace `sheets-sync.sh update_lead` → `sheets-sync.sh update_company`:
    ```bash
    scripts/sheets-sync.sh update_company '{"company":"[Company]","stage":"Contacts Found"}'
    ```
  - Remove add_lead fallback (companies must already exist in the Companies tab)
- Update Phase 7 (Suggest Next Steps):
  - "Review contacts in the **Outreach tab** — check seniority, email status, and 'Why This Contact'"
  - "Set Contact Stage to **Contact Approved** for contacts you want to reach out to"
  - "Set Contact Stage to **Rejected** for wrong contacts"
  - "Set Contact Stage to **Rework** + write Feedback — e.g., 'need someone more senior in brand marketing'"
  - "Then run `/draft-outreach` to draft messages for all approved contacts"
- Add to instructions: "Before enriching, read the Companies tab via `sheets-sync.sh get_data companies`. Only enrich companies where Stage = 'Approved'. If no companies are approved, tell the user to approve companies in the sheet first."

**Files affected:**
- `.claude/commands/fetch-contacts.md`

---

### Step 9: Update `/draft-outreach` — Inline Channels & Gates

Update to write all 3 channels inline to the Outreach tab for existing contact rows, and respect the "Contact Approved" gate.

**Actions:**

- Add batch mode: when invoked without arguments (just `/draft-outreach`), read the Outreach tab, find all contacts with Contact Stage = "Contact Approved" and empty Email Body, and draft for each
- Keep single-contact mode: when invoked with a company/contact name, draft for that specific contact
- Update Phase 5 (Sync to Google Sheets):
  - Replace 3 separate `add_outreach` calls (email, LI connection, LI follow-up) with a single `update_outreach` call that fills all messaging columns for an existing contact row:
    ```bash
    scripts/sheets-sync.sh update_outreach "$(python3 -c "
    import json
    data = {
        'company': '[Company]',
        'contact_name': '[Contact Name]',
        'email_subject': '[Subject]',
        'email_body': '''[Full email body]''',
        'email_stage': 'Drafted',
        'li_connection_msg': '''[LinkedIn connection request text]''',
        'li_connection_stage': 'Drafted',
        'li_follow_up_msg': '''[LinkedIn follow-up text]''',
        'li_follow_up_stage': 'Drafted'
    }
    print(json.dumps(data))
    ")"
    ```
  - Update company stage:
    ```bash
    scripts/sheets-sync.sh update_company '{"company":"[Company]","stage":"Outreach Ready"}'
    ```
  - Remove old `update_status` and `update_lead` calls
- Update Phase 6 (Suggest Next Steps):
  - "Review the drafts in the **Outreach tab** — edit Email Body (col L), LI Connection Message (col Q), or LI Follow-up (col S) directly in the sheet"
  - "When ready to send:"
  - "  **Email**: Set Email Stage (col M) to **Approved** → Gmail draft appears in your Drafts folder"
  - "  **LinkedIn**: Set LI Connection Stage (col R) to **Approved** → notification email arrives with message + profile link"
  - "Set any channel's stage to **Rework** + write Feedback to have Claude regenerate"
  - "Run `/review` to process all rework items"
- Add gate check: "Before drafting, read the Outreach tab via `sheets-sync.sh get_data outreach`. Only draft for contacts where Contact Stage = 'Contact Approved'. If no contacts are approved, tell the user to approve contacts in the sheet first."

**Files affected:**
- `.claude/commands/draft-outreach.md`

---

### Step 10: Create `/review` Command

New command that reads "Rework" items from both tabs and regenerates content based on feedback.

**Actions:**

- Create `.claude/commands/review.md` with this structure:

```
Phase 1: Load Context
  - Read outreach-guidelines.md, icp-and-qualification.md, business-info.md

Phase 2: Pull Sheet Data
  - Run sheets-sync.sh get_data companies → find rows where Stage = "Rework" and Feedback is not empty
  - Run sheets-sync.sh get_data outreach → find rows where any stage column = "Rework" and Feedback is not empty
  - Categorize rework items:
    - Company rework: Company row with Stage = "Rework"
    - Contact rework: Outreach row with Contact Stage = "Rework"
    - Email rework: Outreach row with Email Stage = "Rework"
    - LI Connection rework: Outreach row with LI Connection Stage = "Rework"
    - LI Follow-up rework: Outreach row with LI Follow-up Stage = "Rework"

Phase 3: Process Each Rework Item
  For company rework:
    - Read the feedback (e.g., "look at their Dubai Mall campaign specifically")
    - Re-research the company with the feedback as guidance
    - Update the row: why_this_company, outreach_angle, evidence, services
    - Reset Stage → "Researched" (back to review-ready)
    - Clear Feedback column

  For contact rework:
    - Read the feedback (e.g., "need someone more senior in brand marketing")
    - Re-search Apollo with adjusted criteria based on feedback
    - Update the contact row or replace with a new contact
    - Reset Contact Stage → "Contact Found"
    - Clear Feedback column

  For email rework:
    - Read the feedback (e.g., "too generic, reference their pop-up")
    - Re-draft the email incorporating the feedback
    - Update Email Subject, Email Body in the row
    - Reset Email Stage → "Drafted"
    - Clear Feedback column

  For LI connection/follow-up rework:
    - Read the feedback
    - Re-draft the message
    - Update the message column
    - Reset the stage → "Drafted"
    - Clear Feedback column

Phase 4: Report
  - Show a summary of what was reworked: "[N] items processed"
  - For each item: what changed and why
  - "Review the updated items in the sheet and approve when ready"
```

**Files affected:**
- `.claude/commands/review.md` (new file)

---

### Step 11: Update `/daily-research` — New Sync Structure

Update the autonomous daily pipeline to use new tab structure and set correct stages.

**Actions:**

- Update Phase 7 (Sync to Google Sheets):
  - Replace `add_lead` → `add_company`:
    ```bash
    scripts/sheets-sync.sh add_company '{"company":"[Company]","sector":"[Sector]","icp_fit":"[Hot/Warm/Cool]","why_this_company":"[Research insight]","services":"[Services]","est_value":"[AED value]","outreach_angle":"[Angle]","evidence":"[URLs]","lead_source":"Cold Outbound","stage":"Outreach Ready"}'
    ```
    Note: Stage is "Outreach Ready" (not "Researched") because the daily pipeline runs the full workflow autonomously.
  - Replace `add_contact` with new payload:
    ```bash
    scripts/sheets-sync.sh add_contact '{"company":"[Company]","name":"[Name]","title":"[Title]","email":"[Email]","email_status":"[Status]","linkedin_url":"[URL]","seniority":"[Level]","why_this_person":"[Reason]","contact_stage":"Contact Approved"}'
    ```
    Note: Contact Stage is "Contact Approved" (auto-advanced for autonomous mode).
  - Replace 3 `add_outreach` calls with single `update_outreach`:
    ```bash
    scripts/sheets-sync.sh update_outreach "$(python3 -c "
    import json
    data = {
        'company': '[Company]',
        'contact_name': '[Name]',
        'email_subject': '[Subject]',
        'email_body': '''[Full email body]''',
        'email_stage': 'Drafted',
        'li_connection_msg': '''[LI connection text]''',
        'li_connection_stage': 'Drafted',
        'li_follow_up_msg': '''[LI follow-up text]''',
        'li_follow_up_stage': 'Drafted'
    }
    print(json.dumps(data))
    ")"
    ```
  - Remove old `update_lead` status calls
- Update Phase 9 (Summary JSON): no changes needed — the summary format is independent of the sheet structure

**Files affected:**
- `.claude/commands/daily-research.md`

---

### Step 12: Update `/process-intent-leads` — New Sync Structure

Same pattern as daily-research — full pipeline, correct stages for review.

**Actions:**

- Update Phase 8 (Sync to Google Sheets):
  - Replace `add_lead` → `add_company` with `"lead_source":"Intent Signal"` and `"stage":"Outreach Ready"`
  - Replace `add_contact` with new payload, `"contact_stage":"Contact Approved"`
  - Replace 3 `add_outreach` calls → single `update_outreach`
  - Remove old `update_lead` status calls

**Files affected:**
- `.claude/commands/process-intent-leads.md`

---

### Step 13: Update `/promote-lead` — Read New Tabs

Update to read from Companies + Outreach tabs instead of Leads + Contacts.

**Actions:**

- Update Phase 2 (Pull Lead Data):
  - Replace `get_data leads` → `get_data companies`
  - Replace `get_data contacts` → `get_data outreach`
  - Field mapping: company name from Companies tab, contacts from Outreach tab (filter by company name)
  - Extract: company, sector, icp_fit, services, est_value, outreach_angle, lead_source from Companies tab
  - Extract: contact_name, title, email, linkedin_url from matching Outreach tab rows
- Update Phase 5 (Update Google Sheets):
  - Replace `update_lead` → `update_company`:
    ```bash
    scripts/sheets-sync.sh update_company '{"company":"[Company]","stage":"Connected","asana_task_id":"[GID]"}'
    ```

**Files affected:**
- `.claude/commands/promote-lead.md`

---

### Step 14: Update `/dashboard` — Read New Tabs

Update to read from Companies + Outreach tabs and render updated dashboard format.

**Actions:**

- Update Phase 1 (Pull Data):
  - Replace `get_data leads` → `get_data companies`
  - Keep `get_data outreach` (same name, new structure)
  - Remove separate contacts pull (contacts are in the Outreach tab)
- Update Phase 2 (Render Dashboard):
  - **Pipeline Overview**: Total Companies, Pipeline Value, Total Contacts, Email Response Rate
  - **Companies by Stage**: Researched, Approved, Contacts Found, Outreach Ready, Sent, Replied, Connected
  - **Companies by ICP Fit**: Hot, Warm, Cool
  - **Email Performance**: Drafted, Approved/Draft Created, Sent, Replied, No Response, Response Rate
  - **LinkedIn Performance**: Requests Drafted, Requests Sent, Accepted, Follow-ups Sent, Follow-ups Replied
  - **Needs Action**: Companies awaiting review, Contacts awaiting review, Outreach awaiting approval, Rework items (with feedback), Follow-ups overdue
  - **Ready to Promote**: Companies where Stage = "Replied" or any contact has Email Stage = "Replied" or LI Connection Stage = "Accepted"
  - **Company Details Table**: Company | Sector | ICP Fit | Stage | Contacts | Est. Value
  - **Suggested Next Actions**: specific companies by name

**Files affected:**
- `.claude/commands/dashboard.md`

---

### Step 15: Update `reference/google-sheets-setup.md`

Rewrite the setup guide for the new structure.

**Actions:**

- Update "Overview" to describe 2 data tabs (Companies, Outreach) + Dashboard + Log
- Update Step 3 (Run initial setup): now creates 4 tabs — Companies, Outreach, Dashboard, Log
- Add Step 3b: Migration from V1 — if upgrading from the old 3-tab structure:
  1. Select `migrateToV2` function in Apps Script editor
  2. Click Run
  3. Old tabs are archived with `_Archive` suffix, new tabs are created with migrated data
  4. After verifying migration, optionally delete `_Archive` tabs
- Update Step 4b (outreach trigger): describe per-channel approval — Email Stage "Approved" creates Gmail draft, LI Connection Stage "Approved" sends notification email
- Update the Troubleshooting table with new tab names
- Add a "Tab Reference" section:
  - **Companies** (14 cols): One row per company. Tracks research through connection. Key column: Stage (col J) — set "Approved" to proceed to contacts, "Rework" + Feedback for revisions.
  - **Outreach** (22 cols): One row per contact. All 3 channels inline. Key columns: Contact Stage (col I), Email Stage (col M), LI Connection Stage (col R), LI Follow-up Stage (col T). Set "Approved" in any channel's stage to trigger sending.
  - **Dashboard**: Auto-updating summary with formulas. No manual editing needed.
  - **Log**: Webhook activity log for debugging.

**Files affected:**
- `reference/google-sheets-setup.md`

---

### Step 16: Update `CLAUDE.md`

Update the master workspace documentation.

**Actions:**

- Update "Workspace Structure" tree: remove references to old tab structure, describe new tabs
- Update "Sales Workflow" diagram to show the gated flow:
  ```
  /find-leads → Companies tab (Stage: Researched)
       ↓ [User reviews, sets "Approved"]
  /fetch-contacts → Outreach tab (Contact Stage: Contact Found)
       ↓ [User reviews, sets "Contact Approved"]
  /draft-outreach → Outreach tab (Email/LI stages: Drafted)
       ↓ [User reviews/edits, sets "Approved" per channel]
  Gmail draft / LinkedIn notification → Sent → Replied
       ↓ [Lead responds]
  /promote-lead → Asana (Connected)

  /review → reads "Rework" items + Feedback → regenerates → updates sheet
  ```
- Update "Commands" section:
  - Add `/review` description
  - Update `/find-leads` — note it no longer auto-enriches contacts
  - Update `/fetch-contacts` — note batch mode for approved companies
  - Update `/draft-outreach` — note batch mode for approved contacts
- Update "Integrations" table:
  - Google Sheets description: "Outreach tracker — 2 data tabs (Companies, Outreach) with gated approval workflow"
- Update "Data flow" line: "Commands → `sheets-sync.sh` → Apps Script webhook → Google Sheet (4 tabs: Companies, Outreach, Dashboard, Log)"
- Add a "Review & Feedback" section explaining the rework mechanism

**Files affected:**
- `CLAUDE.md`

---

### Step 17: Test & Validate

After all changes are implemented, verify the system works end-to-end.

**Actions:**

- Deploy updated Apps Script as a new version
- Run `setupSheet()` to verify tab creation with correct headers, dropdowns, formatting
- Test `migrateToV2()` to verify existing data migrates correctly
- Test each sync command:
  - `sheets-sync.sh add_company '{"company":"Test Co","sector":"Retail","icp_fit":"Hot","why_this_company":"Test insight","services":"SMM","lead_source":"Cold Outbound","stage":"Researched"}'`
  - `sheets-sync.sh add_contact '{"company":"Test Co","name":"Test Person","title":"CMO","email":"test@test.com","email_status":"Verified","linkedin_url":"https://linkedin.com/in/test","seniority":"C-Suite","why_this_person":"Decision maker","contact_stage":"Contact Found"}'`
  - `sheets-sync.sh update_outreach '{"company":"Test Co","contact_name":"Test Person","email_subject":"Test subject","email_body":"Test body","email_stage":"Drafted","li_connection_msg":"Test LI msg","li_connection_stage":"Drafted","li_follow_up_msg":"Test follow-up","li_follow_up_stage":"Drafted"}'`
  - `sheets-sync.sh update_company '{"company":"Test Co","stage":"Outreach Ready"}'`
  - `sheets-sync.sh get_data companies`
  - `sheets-sync.sh get_data outreach`
  - `sheets-sync.sh get_data summary`
- Test approval triggers in the sheet:
  - Set Email Stage to "Approved" → verify Gmail draft is created
  - Set LI Connection Stage to "Approved" → verify notification email arrives
- Verify Dashboard tab formulas update correctly
- Clean up test data

**Files affected:**
- All modified files (verification only)

---

## Connections & Dependencies

### Files That Reference This Area

| File | Dependency |
|---|---|
| `.github/workflows/daily-research.yml` | Calls scripts that use sheets-sync.sh — action names must match |
| `scripts/daily-research.sh` | Runner script that invokes `/daily-research` — no changes needed (it's a wrapper) |
| `data/sheets-config.json` | Webhook URL config — no changes needed (URL stays the same after redeployment) |

### Updates Needed for Consistency

- All command files referencing `add_lead`, `update_lead`, `add_contact`, `add_outreach`, `update_status` must be updated to new action names
- All command files referencing "Leads tab", "Contacts tab" must be updated to "Companies tab", "Outreach tab"
- Any documentation mentioning the 5-tab structure must be updated to 4-tab
- The `reference/daily-research-config.md` doesn't need changes (it defines sector rotation, not sheet structure)

### Impact on Existing Workflows

- **`/find-leads` behavior change**: No longer auto-enriches contacts. Users must approve companies in the sheet, then run `/fetch-contacts` separately. This adds one step but saves Apollo credits.
- **`/fetch-contacts` behavior change**: Now supports batch mode. When run without arguments, processes all "Approved" companies at once.
- **`/draft-outreach` behavior change**: Now supports batch mode. When run without arguments, drafts for all "Contact Approved" contacts at once.
- **`/daily-research` behavior**: Still runs full pipeline autonomously, but stages land at review-ready states (not auto-sent).
- **Existing data**: Must run `migrateToV2()` once after deploying the new Apps Script. Old tabs are archived.

---

## Validation Checklist

- [ ] Apps Script deploys without errors
- [ ] `setupSheet()` creates 4 tabs (Companies, Outreach, Dashboard, Log) with correct headers
- [ ] All dropdowns work (ICP Fit, Stage, Lead Source, Email Status, Seniority, Contact Stage, Email Stage, LI Connection Stage, LI Follow-up Stage)
- [ ] Conditional formatting applies correctly to all stage columns
- [ ] `migrateToV2()` migrates existing data and archives old tabs
- [ ] `add_company` writes to Companies tab correctly
- [ ] `add_contact` writes to Outreach tab correctly (contact section only)
- [ ] `update_outreach` fills messaging columns for existing contact rows
- [ ] `update_company` updates stage and other fields
- [ ] `get_data summary` returns correct aggregated stats for new structure
- [ ] Email Stage "Approved" → Gmail draft created and stage set to "Draft Created"
- [ ] LI Connection Stage "Approved" → notification email sent with message + LinkedIn link
- [ ] LI Follow-up Stage "Approved" → notification email sent with follow-up message
- [ ] Email tracking detects sent emails and sets Email Date Sent + Follow-up Due
- [ ] Email tracking detects replies and sets Email Response Date + Summary
- [ ] Dashboard tab formulas display correct counts for all sections
- [ ] `/find-leads` syncs to Companies tab only (no Apollo calls)
- [ ] `/fetch-contacts` batch mode processes only "Approved" companies
- [ ] `/draft-outreach` batch mode processes only "Contact Approved" contacts
- [ ] `/review` reads rework items and feedback, regenerates, and updates sheet
- [ ] `/promote-lead` reads from Companies + Outreach tabs correctly
- [ ] `/dashboard` renders correctly from new tab structure
- [ ] `/daily-research` sync calls use new action names and correct stages
- [ ] `/process-intent-leads` sync calls use new action names and correct stages
- [ ] `CLAUDE.md` accurately reflects the new structure and workflow
- [ ] `reference/google-sheets-setup.md` has correct setup and migration instructions
- [ ] Follow-up digest email references correct columns in new structure

---

## Success Criteria

The implementation is complete when:

1. **Two data tabs replace three**: Companies tab (14 cols, one row per company) and Outreach tab (22 cols, one row per contact) replace Leads, Contacts, and old Outreach tabs. Dashboard and Log tabs are preserved and updated.
2. **Three approval gates work**: User can set "Approved" at company, contact, and outreach (per-channel) levels, and the system respects these gates before proceeding.
3. **Feedback loop is functional**: User can set any stage to "Rework", write feedback, run `/review`, and Claude regenerates the item based on the feedback.
4. **All commands work with new structure**: Every command (`/find-leads`, `/fetch-contacts`, `/draft-outreach`, `/daily-research`, `/process-intent-leads`, `/promote-lead`, `/dashboard`, `/pipeline-review`) operates correctly against the new tab structure.
5. **Existing data is migrated**: Running `migrateToV2()` converts all current data to the new format without data loss.
6. **Outreach approval automation works per-channel**: Setting Email Stage to "Approved" creates a Gmail draft; setting LI Connection/Follow-up Stage to "Approved" sends a notification email. Each channel operates independently.

---

## Notes

- **Column count**: The Outreach tab at 22 columns is wide but organized into clear sections (Contact info → Email → LinkedIn Connection → LinkedIn Follow-up → Metadata). In Google Sheets, freezing columns A-B and using column group hiding can help manage the width.
- **Future enhancement**: Consider adding column grouping in the Apps Script setup — group cols K-P (Email section), Q-R (LI Connection), S-T (LI Follow-up) so the user can collapse sections they're not reviewing.
- **Apollo credit savings**: By separating research from enrichment, users only spend credits on approved companies. At ~2-3 credits per company, this could save 4-6 credits per research run on rejected companies.
- **Daily research friction**: The daily pipeline still runs end-to-end autonomously. The user's morning workflow is: receive email → open sheet → review → approve channels they want to send → reject/rework the rest. This is 1 step more than today (today: receive email → open sheet → approve) but gives quality control.
- **Batch operations order matters**: `/fetch-contacts` (batch) should be run before `/draft-outreach` (batch). If run in wrong order, `/draft-outreach` will find no "Contact Approved" items and tell the user.

---

## Implementation Notes

**Implemented:** 2026-02-22

### Summary

All 17 steps of the plan were implemented:

- **Steps 1-5**: Complete rewrite of `scripts/google-sheets-webhook.gs` (~1100+ lines) — new 2-tab data model (Companies 14 cols, Outreach 22 cols), new data operations, per-channel onEdit triggers, updated email tracking, Dashboard formulas, and migrateToV2() function
- **Step 6**: Updated `scripts/sheets-sync.sh` with new action names (add_company, update_company, add_contact, update_contact, update_outreach, update_stage)
- **Step 7**: Rewrote `/find-leads` — removed Phase 4 (Fetch Contacts), updated sync to use add_company with "Researched" stage, added "Why This Company" as critical field
- **Step 8**: Rewrote `/fetch-contacts` — added batch mode for "Approved" companies, gate check, new sync payloads for Outreach tab
- **Step 9**: Rewrote `/draft-outreach` — added batch mode for "Contact Approved" contacts, replaced 3 add_outreach calls with single update_outreach, per-channel approval guidance
- **Step 10**: Created new `/review` command — reads Rework items + Feedback from both tabs, regenerates content, resets stages
- **Step 11**: Updated `/daily-research` — new sync structure with add_company (stage "Outreach Ready"), add_contact (stage "Contact Approved"), single update_outreach call
- **Step 12**: Updated `/process-intent-leads` — same sync pattern as daily-research with lead_source "Intent Signal"
- **Step 13**: Updated `/promote-lead` — reads from Companies + Outreach tabs instead of Leads + Contacts
- **Step 14**: Updated `/dashboard` — new rendering format with companies by stage, email performance, LinkedIn performance, approval queue, rework items
- **Step 15**: Rewrote `reference/google-sheets-setup.md` — 4-tab structure, migration instructions, per-channel trigger descriptions, full tab reference tables
- **Step 16**: Updated `CLAUDE.md` — new workflow diagram with 3 gates, updated command descriptions (batch modes, /review), updated integrations table, updated data flow line
- **Step 16b**: Updated `/prime` command — new suggested actions reflecting approval queue and rework items

### Deviations from Plan

- Updated `/prime` command (not explicitly in the plan but necessary for consistency — suggested actions now reference approval queue and rework items instead of old status names)

### Issues Encountered

- Context window ran out mid-implementation, requiring session continuation — no data was lost, all files were written successfully
- Some file writes failed with "File has not been read yet" errors after context compaction — resolved by re-reading files before writing

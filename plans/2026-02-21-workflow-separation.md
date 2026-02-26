# Plan: Separate Google Sheets (Outreach) from Asana (Pipeline)

**Date**: 2026-02-21
**Goal**: Google Sheets handles all outreach work (research → contacts → drafts → send). Asana only receives leads that have connected and shown interest, entering at the **Connected** section.

---

## The New Workflow

```
/find-leads [target]           → Google Sheets (status: Researched)
        ↓
/fetch-contacts [company]      → Google Sheets (status: Contacts Found)
        ↓
/draft-outreach [contact]      → Google Sheets (status: Outreach Drafted)
        ↓
[Manual] Send email/LinkedIn   → Google Sheets (status: Contacted)
        ↓
[Lead responds with interest]
        ↓
/promote-lead [company]        → Creates Asana task in Connected section
                                 → Google Sheets (status: Connected)
        ↓
/pipeline-review               → Asana only (Connected + Qualified)
```

**Key principle**: Google Sheets = outreach tracker. Asana = pipeline for engaged leads only.

---

## Changes Required

### 1. New command: `/promote-lead` (`.claude/commands/promote-lead.md`)
- Pulls lead + contact data from Google Sheets
- Checks for Asana duplicates
- Creates task in Asana **Connected** section (`1212644606086673`)
- Updates Google Sheet: status → "Connected", stores Asana Task ID
- Suggests next actions: `/pipeline-review`, follow-up strategy

### 2. Remove `/log-lead` (`.claude/commands/log-lead.md`)
- Delete this command — replaced by `/promote-lead`
- `/promote-lead` handles the Sheets→Asana bridge at the right stage

### 3. Update `/find-leads`
- Remove any "next step: log to Asana" suggestions
- Clarify: leads go to Google Sheets only
- Next step suggestion → `/fetch-contacts` or `/draft-outreach`

### 4. Update `/fetch-contacts`
- No changes to core logic (already Sheets-first)
- Clarify in docs: contacts tracked in Sheets, not Asana

### 5. Update `/draft-outreach`
- No changes to core logic (already Sheets-first)
- After drafting, suggest: "Send manually, then when they respond → `/promote-lead`"

### 6. Update `/pipeline-review`
- Only analyse Connected + Qualified stages in Asana
- Remove Lead Submissions and Target List from analysis
- Add note: "Pre-connection outreach tracked in Google Sheets — use `/dashboard`"

### 7. Update `/prime`
- Pull BOTH: Google Sheets summary + Asana Connected/Qualified snapshot
- Show two views: **Outreach Tracker** (Sheets) and **Pipeline** (Asana)
- Update command list: add `/promote-lead`, remove `/log-lead`

### 8. Update `/dashboard`
- Replace "Logged" status references with "Connected"
- Add "Ready to Promote" section: leads with status "Contacted" or "Replied"
- Suggested actions include `/promote-lead` for leads that have connected

### 9. Update `CLAUDE.md`
- Update workflow diagram
- Update command list (add `/promote-lead`, remove `/log-lead`)
- Update sales workflow section
- Update workspace structure

### 10. Update `reference/asana-pipeline-map.md`
- Note: Lead Submissions and Target List sections are no longer used (outreach tracked in Google Sheets)
- Connected = entry point from Google Sheets via `/promote-lead`
- Remove "Default for /log-lead" references

### 11. Update Google Sheets statuses
- Replace "Logged" with "Connected" in the status dropdown
- Update `scripts/google-sheets-webhook.gs` (setupSheet function — status validation)
- Flow: Researched → Contacts Found → Outreach Drafted → Contacted → Connected

---

## Files to Create
- `.claude/commands/promote-lead.md`

## Files to Modify
- `.claude/commands/find-leads.md`
- `.claude/commands/draft-outreach.md`
- `.claude/commands/pipeline-review.md`
- `.claude/commands/prime.md`
- `.claude/commands/dashboard.md`
- `CLAUDE.md`
- `reference/asana-pipeline-map.md`
- `scripts/google-sheets-webhook.gs`

## Files to Delete
- `.claude/commands/log-lead.md`

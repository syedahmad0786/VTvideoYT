# Dashboard

View a live snapshot of the hrmny outreach tracker from the Google Sheets dashboard. This tracks all pre-connection sales work — companies, contacts, outreach, and promotion readiness.

## Variables

filter: $ARGUMENTS (optional — "companies", "outreach", "email", "linkedin", or empty for full dashboard)

---

## Instructions

You are rendering a live outreach dashboard by pulling data from the central Google Sheet. This is the tracker for all outreach work — leads move to Asana only after connecting via `/promote-lead`.

### Phase 1: Pull Data

Run the following commands to get live data from the sheet:

1. Get the summary:
```bash
scripts/sheets-sync.sh get_data summary
```

2. Get all companies:
```bash
scripts/sheets-sync.sh get_data companies
```

3. If the user asked about outreach, contacts, email, or LinkedIn specifically, also pull:
```bash
scripts/sheets-sync.sh get_data outreach
```

If `sheets-sync.sh` fails with a config error, tell the user to set up the Google Sheet first — see `reference/google-sheets-setup.md`.

### Phase 2: Render Dashboard

Present the data in this format:

```
# hrmny Outreach Dashboard
**Date**: [today's date]
**Source**: Google Sheets (live)

---

## Pipeline Overview

| Metric | Count |
|---|---|
| Total Companies | [n] |
| Total Pipeline Value | AED [n] |
| Total Contacts | [n] |
| Email Response Rate | [x%] |

---

## Companies by Stage

| Stage | Count |
|---|---|
| Researched | [n] |
| Approved | [n] |
| Contacts Found | [n] |
| Outreach Ready | [n] |
| Sent | [n] |
| Replied | [n] |
| Connected | [n] |

## Companies by ICP Fit

| Fit | Count |
|---|---|
| Hot | [n] |
| Warm | [n] |
| Cool | [n] |

---

## Email Performance

| Metric | Value |
|---|---|
| Drafted | [n] |
| Approved / Draft Created | [n] |
| Sent | [n] |
| Replied | [n] |
| No Response | [n] |
| Response Rate | [x%] |

## LinkedIn Performance

| Metric | Value |
|---|---|
| Requests Drafted | [n] |
| Requests Sent | [n] |
| Accepted | [n] |
| Follow-ups Sent | [n] |
| Follow-ups Replied | [n] |

---

## Needs Action

- **[n] companies awaiting review** (Stage = "Researched") — review in Companies tab, approve or reject
- **[n] contacts awaiting review** (Contact Stage = "Contact Found") — review in Outreach tab, approve or reject
- **[n] outreach awaiting approval** (Email/LI stages = "Drafted") — review messages, set to "Approved" to send
- **[n] rework items** — run `/review` to process feedback
- **[n] follow-ups overdue** — check Follow-up Due column in Outreach tab

---

## Ready to Promote

Companies where Stage = "Replied" or any contact has Email Stage = "Replied" or LI Connection Stage = "Accepted" — these may be ready to move to Asana via `/promote-lead`:

| Company | ICP Fit | Contact | Signal |
|---|---|---|---|
| [Company] | [Fit] | [Contact Name] | [e.g., "Email replied", "LI accepted"] |

---

## Company Details

| Company | Sector | ICP Fit | Stage | Contacts | Est. Value |
|---|---|---|---|---|---|
| [Company] | [Sector] | [Fit] | [Stage] | [n] | AED [value] |

---

## Suggested Next Actions

[Based on the data, suggest 3-5 specific actions, e.g.:]
1. Review [n] researched companies — approve to proceed with contact enrichment
2. Approve [n] contacts — then run `/draft-outreach` to draft messages
3. Approve outreach for [Company] — set Email Stage to "Approved" in the sheet
4. Follow up on [Company] — outreach sent [n] days ago, no response
5. Promote [Company] to Asana — they've replied/connected, ready for pipeline
```

### Phase 3: Sheet Link

End with:
```
**Full dashboard**: [Google Sheet link from data/sheets-config.json sheet_id]
```

---

## Examples

- `/dashboard` — full outreach dashboard
- `/dashboard companies` — companies table with stages
- `/dashboard outreach` — outreach performance (email + LinkedIn)
- `/dashboard email` — email performance only
- `/dashboard linkedin` — LinkedIn performance only

---

## Quality Standards

- Always show real numbers from the sheet — never estimate or guess
- If the sheet is empty, say so and suggest running `/find-leads` to start populating it
- If the config is missing, provide clear setup instructions
- Suggested actions should be specific — name the companies, not just counts
- **Highlight leads ready to promote** — this is the key handoff point to Asana
- **Highlight rework items** — these need `/review` to process
- **Show approval queue** — companies, contacts, and outreach messages awaiting review

# Promote Lead

Promote a connected lead from the Google Sheets outreach tracker into the Asana Lead Pipeline 2026 (Connected section).

## Variables

lead_info: $ARGUMENTS (company name — must already exist in the Google Sheet)

---

## Instructions

You are promoting a lead that has responded to outreach and shown interest. This moves it from the Google Sheets outreach tracker into Asana's pipeline where it will be managed through Connected → Qualified stages.

### Phase 1: Load Context

Read these files:
1. `reference/asana-pipeline-map.md` — Project GID, section GIDs, custom field GIDs
2. `reference/icp-and-qualification.md` — qualification criteria (for notes)

### Phase 2: Pull Lead Data from Google Sheets

Get the lead's current data from the Companies tab:

```bash
scripts/sheets-sync.sh get_data companies
```

Find the row matching the company name. Extract:
- Company name, sector, ICP fit, services needed, estimated value
- Outreach angle, lead source, why this company
- Any notes

Also pull contacts for this company from the Outreach tab:
```bash
scripts/sheets-sync.sh get_data outreach
```

Find all contacts matching this company. Extract names, titles, emails, LinkedIn URLs.

**If the lead doesn't exist in the sheet**, tell the user and suggest they run `/find-leads` first.

**If the lead exists but has no contacts**, warn the user and ask if they still want to promote (they may have connected through a different channel).

### Phase 3: Check for Duplicates in Asana

Before creating the task:
1. Use `mcp__claude_ai_Asana__search_objects` with `resource_type: "task"` and search for the company name
2. If a matching task exists in Lead Pipeline 2026, **stop and tell the user** — provide the existing task link and ask if they want to update it instead

### Phase 4: Create the Asana Task

1. Use `mcp__claude_ai_Asana__create_task_preview` to preview the task:
   - **Project**: `1212644606086670` (Lead Pipeline 2026)
   - **Section**: `1212644606086673` (Connected)
   - **Task name**: Company/brand name
   - **Description**: Structured brief pulling from Google Sheets data:
     ```
     VERTICAL: [Sector] | ICP FIT: [Hot/Warm/Cool]
     CONTACT: [Primary Contact Name] — [Title]
     EMAIL: [Primary Email]
     LINKEDIN: [LinkedIn URL]

     COMPANY: [Brief description from research]

     OUTREACH ANGLE: [What we led with]
     CONNECTION: [How they responded — email reply, LinkedIn accept, meeting booked, etc.]

     FIT: [Services hrmny could provide]

     NEXT ACTION: [Specific next step — e.g., schedule discovery call, send capabilities deck]
     ```
   - **Assignee**: `me` (Ayham)

2. Set custom fields:
   - **Client/Brand** (`1209356923265210`): Company name
   - **Lead Source** (`1210546371034211`): From Google Sheet data
   - **Lead status** (`1209356923265198`): `Contacted`
   - **Next Steps (Sales)** (`1209356923265212`): `Schedule Initial Meeting` (default, user can override)
   - **Client Contact** (`1209358852727690`): Primary contact name + email
   - **Potential** (`1209356923265205`): Based on ICP fit (Hot → High, Warm → Medium, Cool → Low)
   - **Estimated value** (`1209356923265196`): From Google Sheet if available
   - **Contacted** (`1212655346767345`): Today's date
   - **Notes** (`1211089242073567`): Outreach angle + connection context

3. After user confirms the preview, use `mcp__claude_ai_Asana__create_task_confirm` to create it

### Phase 5: Update Google Sheets

After the Asana task is created:

```bash
scripts/sheets-sync.sh update_company '{"company":"[Company Name]","stage":"Connected","asana_task_id":"[Asana Task GID]"}'
```

### Phase 6: Log Execution

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
    'command': 'promote-lead',
    'inputs': {'company': '[Company Name]', 'connection_context': '[how they responded]'},
    'outputs': {'asana_task_created': True, 'section': 'Connected', 'estimated_value': '[AED value]'},
    'quality_signals': {'icp_fit': '[Hot/Warm/Cool]', 'lead_source': '[source]'},
    'errors': []
})
json.dump(data, open(f, 'w'), indent=2)
"
```

Fill in actual values from this run. If the write fails, note it but don't block the command.

### Phase 7: Confirm

After everything is done:
- Confirm the task was created in Asana's **Connected** section
- List the key fields populated
- Provide the Asana task link
- Show what was updated in Google Sheets
- Suggest next actions:
  - "Schedule a discovery call with [Contact Name]"
  - "Run `/pipeline-review` to see your updated pipeline"

---

## Examples

- `/promote-lead On Running ME` — promote after they replied to outreach
- `/promote-lead Red Bull - Kareem responded on LinkedIn` — promote with connection context
- `/promote-lead Lucid Motors - meeting booked for next week` — promote with meeting context

---

## Important

- **Only promote leads that have actually connected** — this is the bridge from outreach (Google Sheets) to pipeline (Asana)
- **Default section**: Connected (`1212644606086673`) — always
- **Never create duplicate tasks** — always check Asana first
- **Pull data from Google Sheets** — don't ask the user to re-enter information that's already tracked
- If the user provides connection context (e.g., "they replied to email", "meeting booked"), include it in the task description

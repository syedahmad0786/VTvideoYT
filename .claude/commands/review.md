# Review & Rework

Process all items marked as "Rework" in the Google Sheets outreach tracker. Reads the Feedback column, regenerates the content based on your guidance, and updates the sheet — setting the stage to "Reworked" and writing a note in the Feedback column about what changed.

## Variables

filter: $ARGUMENTS (optional — "companies", "contacts", "email", "linkedin", or empty for all rework items)

---

## Instructions

You are processing feedback on items that have been flagged for rework. The user has reviewed researched companies, contacts, or outreach drafts in the Google Sheet, set the stage to "Rework", and written specific feedback in the Feedback column. Your job is to regenerate the content based on that feedback.

**Important — "Reworked" stage and Feedback as two-way communication:**
- After processing each item, set the stage to **"Reworked"** (not back to "Researched", "Contact Found", or "Drafted")
- Write a brief note in the **Feedback column** explaining what you changed (do NOT clear it)
- This lets the user see at a glance which items have been processed and what was done
- The user will then either set the stage to "Approved" (looks good) or back to "Rework" with new feedback

### Phase 1: Load Context

Read these files:

1. `reference/outreach-guidelines.md` — tone, structure, templates, and what to avoid
2. `reference/icp-and-qualification.md` — ICP, no-go list, qualification criteria
3. `context/business-info.md` — hrmny's services and capabilities

### Phase 2: Pull Sheet Data

Pull data from both tabs:

```bash
scripts/sheets-sync.sh get_data companies
```

```bash
scripts/sheets-sync.sh get_data outreach
```

**Find all rework items:**

1. **Company rework**: Companies tab rows where Stage = "Rework" and Feedback is not empty
2. **Contact rework**: Outreach tab rows where Contact Stage = "Rework" and Feedback is not empty
3. **Email rework**: Outreach tab rows where Email Stage = "Rework" and Feedback is not empty
4. **LI Connection rework**: Outreach tab rows where LI Connection Stage = "Rework" and Feedback is not empty
5. **LI Follow-up rework**: Outreach tab rows where LI Follow-up Stage = "Rework" and Feedback is not empty

If `$ARGUMENTS` filters to a specific type (e.g., "companies"), only process that type.

**If no rework items are found**, tell the user: "No items are marked as 'Rework' in the sheet. To request changes, set any stage column to 'Rework' and write your feedback in the Feedback column."

**Present a summary before processing:**
```
## Rework Queue

| # | Type | Company | Contact | Feedback |
|---|------|---------|---------|----------|
| 1 | Company | [Name] | — | [Feedback text] |
| 2 | Email | [Company] | [Contact] | [Feedback text] |
| 3 | LI Connection | [Company] | [Contact] | [Feedback text] |
```

### Phase 3: Process Each Rework Item

#### Company Rework (Stage = "Rework")

1. Read the feedback (e.g., "look at their Dubai Mall campaign specifically" or "wrong sector, they're in hospitality not retail")
2. Re-research the company with the feedback as guidance — use web search to find the specific information requested
3. Update the company row with revised content:
```bash
scripts/sheets-sync.sh update_company '{"company":"[Company Name]","why_this_company":"[Updated research insight]","outreach_angle":"[Updated angle]","evidence":"[Updated URLs]","services":"[Updated services if changed]","stage":"Reworked","feedback":"[Brief note: what you changed and why, e.g. Updated research to focus on Dubai Mall campaign per feedback]"}'
```
4. Present what changed and why

#### Contact Rework (Contact Stage = "Rework")

1. Read the feedback (e.g., "need someone more senior in brand marketing" or "this person left the company")
2. Re-search Apollo with adjusted criteria based on feedback:
   - If "more senior" → search with higher seniority levels
   - If "different department" → adjust person_titles
   - If "person left" → search for replacements at the same company
3. Update the contact row or add a replacement:
```bash
scripts/sheets-sync.sh update_contact '{"company":"[Company]","name":"[Original Name]","new_name":"[New Name if replacing]","title":"[Title]","email":"[Email]","email_status":"[Status]","linkedin_url":"[URL]","seniority":"[Level]","why_this_person":"[Updated reason]","contact_stage":"Reworked","feedback":"[Brief note: what you changed, e.g. Replaced with UAE-based marketing lead per feedback]"}'
```
4. Present what changed and why

#### Email Rework (Email Stage = "Rework")

1. Read the feedback (e.g., "too generic, reference their pop-up" or "shorter, more direct")
2. Re-draft the email incorporating the feedback
3. Update the outreach row:
```bash
scripts/sheets-sync.sh update_outreach "$(python3 -c "
import json
data = {
    'company': '[Company]',
    'contact_name': '[Contact Name]',
    'email_subject': '[Updated subject]',
    'email_body': '''[Updated email body]''',
    'email_stage': 'Reworked',
    'feedback': '[Brief note: what you changed, e.g. Rewrote opening to reference pop-up event per feedback]'
}
print(json.dumps(data))
")"
```
4. Present the old vs new email and what changed

#### LI Connection Rework (LI Connection Stage = "Rework")

1. Read the feedback (e.g., "too salesy, keep it more casual" or "mention their recent event")
2. Re-draft the LinkedIn connection request incorporating the feedback
3. Verify it's still under 300 characters
4. Update the outreach row:
```bash
scripts/sheets-sync.sh update_outreach "$(python3 -c "
import json
data = {
    'company': '[Company]',
    'contact_name': '[Contact Name]',
    'li_connection_msg': '''[Updated connection request]''',
    'li_connection_stage': 'Reworked',
    'feedback': '[Brief note: what you changed, e.g. Shortened and removed pitch language per feedback]'
}
print(json.dumps(data))
")"
```
5. Present the old vs new message and what changed

#### LI Follow-up Rework (LI Follow-up Stage = "Rework")

1. Read the feedback
2. Re-draft the follow-up message incorporating the feedback
3. Update the outreach row:
```bash
scripts/sheets-sync.sh update_outreach "$(python3 -c "
import json
data = {
    'company': '[Company]',
    'contact_name': '[Contact Name]',
    'li_follow_up_msg': '''[Updated follow-up message]''',
    'li_follow_up_stage': 'Reworked',
    'feedback': '[Brief note: what you changed, e.g. Added reference to recent event per feedback]'
}
print(json.dumps(data))
")"
```
4. Present the old vs new message and what changed

### Phase 4: Log Execution

Append an execution record to `data/feedback-log.json`. **Categorise each rework item's feedback** into one of: `personalisation`, `tone`, `length`, `wrong_contact`, `wrong_angle`, `factual_error`, `other`.

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
    'command': 'review',
    'inputs': {'filter': '[filter used]', 'rework_items_found': [N]},
    'outputs': {'items_processed': [N]},
    'rework_details': [
        {
            'type': '[company/contact/email/li_connection/li_follow_up]',
            'company': '[Company]',
            'contact': '[Contact or null]',
            'feedback': '[original feedback text]',
            'feedback_category': '[personalisation/tone/length/wrong_contact/wrong_angle/factual_error/other]',
            'what_changed': '[brief description of change]'
        }
    ],
    'errors': []
})
json.dump(data, open(f, 'w'), indent=2)
"
```

Fill in actual values. The `rework_details` array should have one entry per rework item processed.

### Phase 5: Report

After processing all rework items, present a summary:

```
## Rework Complete

**Items processed**: [N]

| # | Type | Company | Contact | What Changed |
|---|------|---------|---------|--------------|
| 1 | Company | [Name] | — | Updated research to focus on Dubai Mall campaign |
| 2 | Email | [Company] | [Contact] | Rewrote opening to reference pop-up event |
| 3 | LI Connection | [Company] | [Contact] | Shortened, removed pitch language |

**Next steps:**
- Items are now at **"Reworked"** stage — check the **Feedback column** for a summary of what changed
- Set Stage to **Approved** for items that now look good
- Set to **Rework** again with new feedback if further changes are needed
```

---

## Examples

- `/review` — process all rework items across both tabs
- `/review companies` — only process company-level rework
- `/review email` — only process email draft rework
- `/review linkedin` — only process LinkedIn message rework
- `/review contacts` — only process contact rework

---

## Quality Standards

- Every regenerated item must incorporate the specific feedback provided — don't just make generic improvements
- Regenerated outreach must still follow `reference/outreach-guidelines.md`
- LinkedIn connection requests must remain under 300 characters
- Cold emails must remain 150-200 words
- **Stages are set to "Reworked"** after processing — this is a distinct stage that signals "Claude processed your feedback, please review"
- **Feedback column is updated (not cleared)** — write a brief note about what you changed so the user can see at a glance what was done without re-reading the full content
- The user will then set to "Approved" (looks good) or back to "Rework" with new feedback
- If feedback is unclear or contradictory, note this in the report and make your best interpretation

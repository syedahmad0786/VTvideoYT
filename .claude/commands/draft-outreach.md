# Draft Outreach

Draft personalised outreach for approved contacts. Channels drafted depend on available contact info: if the contact has a verified/unverified email, draft all 3 channels (email + LI connection + LI follow-up); if email is unavailable or missing, draft LinkedIn only (connection request + follow-up). All channels are written to a single row in the Outreach tab. Supports batch mode: run without arguments to draft for all "Contact Approved" contacts.

## Variables

lead: $ARGUMENTS (optional — company name and/or contact name for single-contact mode, or empty for batch mode processing all Contact Approved contacts)

---

## Instructions

You are drafting outreach messages for Ayham Homsi, Managing Partner, Creative & Growth at hrmny. Every message must be highly personalised, professional, and have a clear CTA.

**Gate check**: Only draft for contacts that have been approved. Before drafting, read the Outreach tab via `sheets-sync.sh get_data outreach`. Only draft for contacts where Contact Stage = "Contact Approved" and LI Connection Message is empty (i.e., outreach not yet drafted). If no contacts are approved, tell the user to approve contacts in the sheet first.

**Email availability check**: For each contact, check the Email and Email Status columns. If Email Status = "Unavailable" or the Email column is empty, **skip email drafting entirely** — only draft LinkedIn connection request and follow-up. Do NOT draft email subject/body for contacts without a usable email address.

### Phase 1: Load Standards

Read these files:

1. `reference/outreach-guidelines.md` — tone, structure, templates, and what to avoid
2. `reference/icp-and-qualification.md` — positioning context and service alignment
3. `context/business-info.md` — hrmny's services and capabilities
4. `memory/outreach-learnings.md` — proven patterns from past outreach. Apply the "Active Rules" section when drafting.

### Phase 2: Determine Mode & Check Gate

**Pull the Outreach tab:**
```bash
scripts/sheets-sync.sh get_data outreach
```

**Batch mode** (no arguments — just `/draft-outreach`):
- Find all contacts with Contact Stage = "Contact Approved" and empty LI Connection Message (i.e., outreach not yet drafted)
- If none are found, tell the user: "No contacts have Contact Stage = 'Contact Approved' with empty outreach in the Outreach tab. Review the contacts in the sheet and set Contact Stage to 'Contact Approved' for contacts you want to reach out to."
- **Single-contact warning**: Before processing, check how many contacts exist per company in the full Outreach tab. If any company has only 1 contact total, flag it: "Warning: [Company] has only 1 contact — best practice is 2-3 per company for multi-threaded outreach. Consider running `/fetch-contacts [Company]` to add more before drafting."
- Process each approved contact through Phases 3-5

**Single-contact mode** (`/draft-outreach Red Bull - Kareem`):
- Find the matching contact row
- If Contact Stage is not "Contact Approved", warn: "[Contact] has Contact Stage = '[current stage]'. Outreach is normally drafted after contact approval. Proceeding anyway."
- Process this contact through Phases 3-5

### Phase 3: Research the Lead

Before drafting anything, research the specific company and contact:

- Company website — what they do, recent news, brand positioning
- Recent activity — launches, campaigns, events, expansions, hires
- Social media presence — quality, consistency, gaps
- PR/earned media — coverage, visibility, creator partnerships
- LinkedIn — contact's role, recent posts, company updates
- Any hrmny connection — mutual contacts, previous interactions, shared events

**The goal**: Find the strongest outreach angle — something specific about their brand that creates a natural bridge to what hrmny offers.

### Phase 4: Draft Messages

**Check email availability first.** If the contact has Email Status = "Unavailable" or the Email column is empty, skip the Cold Email section entirely and only produce LinkedIn outputs (connection request + follow-up). Note this in the output: "Email unavailable — LinkedIn-only outreach."

If the contact has a usable email (Email Status = "Verified" or "Unverified"), produce all three outputs:

#### 1. Cold Email (skip if no email)

- **Subject line**: Short (5-8 words), specific to the brand
- **Body**: 150-200 words max
- **Structure**: Opening observation → Bridge to hrmny → Optional credibility signal → Direct CTA
- **CTA**: Request for a 15-20 minute call, specific timeframe
- **Sign-off**: Ayham Homsi, Managing Partner, Creative & Growth, hrmny

#### 2. LinkedIn Connection Request

- **Hard limit: 300 characters** (LinkedIn enforces this — count carefully)
- Reference something specific about them or their brand
- Don't pitch — this is an introduction
- Professional but human

#### 3. LinkedIn Follow-Up Message

- **~100 words** — sent after connection is accepted
- Thank + context → Value line → CTA for a call
- More direct than the connection request — this is where the ask lives

### Phase 5: Present & Save

Present the drafts clearly with headers:

```
# Outreach: [Company Name]
**Contact**: [Name, Title]
**Date**: [YYYY-MM-DD]
**Outreach angle**: [One line — the hook]

---

## Cold Email
*(omit this section entirely if email unavailable)*

**Subject**: [Subject line]

[Email body]

---

## LinkedIn Connection Request (XXX/300 characters)

[Message text]

---

## LinkedIn Follow-Up Message

[Follow-up text]

---

## Research Notes

[Key findings that informed the angle — useful for follow-up conversations]
```

Save to: `outputs/outreach/YYYY-MM-DD-{company-name}.md`

### Phase 6: Sync to Google Sheets

After saving the outreach drafts, push all three channels to the existing contact row in the Outreach tab using a single `update_outreach` call. **Include the full message body** so drafts are reviewable and approvable directly from the sheet.

**Important**: Use Python for JSON encoding to handle newlines and special characters in message bodies.

**For each contact**, run a single call that fills all messaging columns. **If the contact has no email**, omit email_subject, email_body, and email_stage from the payload (leave those columns empty in the sheet):

```bash
# Full outreach (contact has email)
scripts/sheets-sync.sh update_outreach "$(python3 -c "
import json
data = {
    'company': '[Company Name]',
    'contact_name': '[Contact Name]',
    'email_subject': '[Subject line]',
    'email_body': '''[Full email body text including sign-off]''',
    'email_stage': 'Drafted',
    'li_connection_msg': '''[Full LinkedIn connection request text]''',
    'li_connection_stage': 'Drafted',
    'li_follow_up_msg': '''[Full LinkedIn follow-up message text]''',
    'li_follow_up_stage': 'Drafted'
}
print(json.dumps(data))
")"

# LinkedIn-only outreach (no email available)
scripts/sheets-sync.sh update_outreach "$(python3 -c "
import json
data = {
    'company': '[Company Name]',
    'contact_name': '[Contact Name]',
    'li_connection_msg': '''[Full LinkedIn connection request text]''',
    'li_connection_stage': 'Drafted',
    'li_follow_up_msg': '''[Full LinkedIn follow-up message text]''',
    'li_follow_up_stage': 'Drafted'
}
print(json.dumps(data))
")"
```

**Update the company stage** to reflect that outreach is ready:
```bash
scripts/sheets-sync.sh update_company '{"company":"[Company Name]","stage":"Outreach Ready"}'
```

If `sheets-sync.sh` fails (e.g., config not found), note it at the end of the output but don't block the command — the markdown file is the primary output.

### Phase 7: Log Execution

Append an execution record to `data/feedback-log.json`. Use Python to read, prune entries older than 90 days, append, and write back:

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
    'command': 'draft-outreach',
    'inputs': {'companies': ['[company names]'], 'contacts_count': [N], 'mode': '[batch/single]'},
    'outputs': {'drafts_created': [N], 'channels': ['email', 'li_connection', 'li_follow_up']},
    'quality_signals': {
        'email_word_counts': [N],
        'li_char_counts': [N],
        'personalisation_hooks': ['[hooks used]'],
        'outreach_angles': ['[angles used]'],
        'learnings_applied': ['[rules from outreach-learnings.md applied]']
    },
    'errors': []
})
json.dump(data, open(f, 'w'), indent=2)
"
```

Fill in actual values from this run. If the write fails, note it but don't block the command.

### Phase 8: Suggest Next Steps

After drafting:
- "Review the drafts in the **Outreach tab** — edit Email Body (col L), LI Connection Message (col Q), or LI Follow-up (col S) directly in the sheet"
- "When ready to send:"
- "  **Email**: Set Email Stage (col M) to **Approved** → email auto-sends from your Gmail"
- "  **LinkedIn**: Set LI Connection/Follow-up Stage to **Approved** → run `/send-linkedin` to send via LinkedIn MCP"
- "Set any channel's stage to **Rework** + write Feedback to have Claude regenerate"
- "Run `/review` to process all rework items"
- "Once they respond with interest, run `/promote-lead [company]` to move them into the Asana pipeline"
- **Do NOT suggest `/log-lead`** — leads go to Asana only after connecting via `/promote-lead`
- If any contacts were LinkedIn-only (no email), note: "Contacts without email have LinkedIn-only outreach — no email columns were populated."

---

## Examples

- `/draft-outreach` — batch mode: draft for all contact-approved contacts
- `/draft-outreach On Running ME` — research and draft for On Running's ME team
- `/draft-outreach Red Bull - Kareem Doukhei` — draft for a specific contact
- `/draft-outreach Lucid Motors - they just opened a showroom in Dubai` — use the provided context as a starting point

---

## Quality Checks

Before presenting the drafts, verify:

- [ ] Cold email is 150-200 words (skip if LinkedIn-only contact)
- [ ] LinkedIn connection request is **under 300 characters** (count it)
- [ ] Every message references something specific about the company — no generic language
- [ ] CTA is clear and direct in the email and follow-up
- [ ] Tone is highly professional, confident, and direct
- [ ] No language from the "What to Avoid" list in the outreach guidelines
- [ ] The outreach angle is based on real research, not assumptions
- [ ] Contacts without email have NO email subject/body drafted — LinkedIn channels only

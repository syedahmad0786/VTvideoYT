# Fetch Contacts

Find the right decision-makers at target companies — names, titles, LinkedIn profiles, and **verified emails** via Apollo.io. Supports batch mode: run without arguments to process all "Approved" companies from the Companies tab.

## Variables

company: $ARGUMENTS (optional — company name for single-company mode, or empty for batch mode processing all Approved companies)

---

## Instructions

You are identifying the right people to contact at target companies for hrmny's sales outreach. The goal is to find **senior marketing/comms decision-makers** with budget authority — not junior roles, not generic info@ emails.

**Gate check**: Only enrich companies that have been approved. Before enriching, read the Companies tab via `sheets-sync.sh get_data companies`. Only enrich companies where Stage = "Approved". If no companies are approved, tell the user to approve companies in the sheet first.

### Phase 1: Load Context

Read these files to understand who to look for:

1. `reference/icp-and-qualification.md` — stakeholder profile section (CMO, Head of Marketing, etc.)
2. If a `/find-leads` output exists for this company, read it for context on what services are relevant (this helps narrow the right department)

### Phase 2: Determine Mode & Check Gate

**Pull the Companies tab:**
```bash
scripts/sheets-sync.sh get_data companies
```

**Batch mode** (no company argument — just `/fetch-contacts`):
- Find all companies with Stage = "Approved"
- If none are approved, tell the user: "No companies have Stage = 'Approved' in the Companies tab. Review the researched companies in the sheet and set Stage to 'Approved' for companies you want to pursue."
- Process each approved company through Phases 3-6

**Single-company mode** (`/fetch-contacts Samsung`):
- Find the matching company row
- If Stage is not "Approved", warn: "[Company] has Stage = '[current stage]'. Contacts are normally fetched after approval. Proceeding anyway."
- Process this company through Phases 3-6

### Phase 3: Apollo Search (Primary Method)

**Apollo.io is connected via the official Claude connector.** Use it as the primary source for contact data.

#### Step 1: Find the company's Apollo domain

If you don't know the company's website domain, use `mcp__claude_ai_Apollo_io__apollo_mixed_companies_search` to find it:
```
mcp__claude_ai_Apollo_io__apollo_mixed_companies_search(q_organization_name: "[Company Name]")
```
Note the `primary_domain` and `id` (organization_id) from the result. **This endpoint uses Apollo credits** — only use it when you genuinely don't know the domain.

#### Step 2: Search for senior marketing contacts

Use `mcp__claude_ai_Apollo_io__apollo_mixed_people_api_search` with these parameters:
```
mcp__claude_ai_Apollo_io__apollo_mixed_people_api_search(
  q_organization_domains_list: ["company-domain.com"],
  person_titles: ["Chief Marketing Officer", "Head of Marketing", "Marketing Director", "VP Marketing", "Communications Director", "Brand Director", "Head of Digital"],
  person_seniorities: ["c_suite", "vp", "head", "director"],
  person_locations: ["United Arab Emirates", "Dubai", "Abu Dhabi"],
  per_page: 10
)
```

**Note**: This search endpoint does NOT return emails or phone numbers — it returns names, titles, org info, and `has_email` flags. Emails require the enrichment step below.

**You MUST find at least 2 contacts per company.** If the first search returns fewer than 2 usable results, progressively broaden:
1. Remove `person_locations` (some people's locations aren't tagged as UAE)
2. Broaden `person_titles` to include: "Marketing Manager", "Social Media Director", "Content Director", "Head of Brand", "Regional Marketing Manager"
3. Broaden `person_seniorities` to include "manager" (but only senior managers — not coordinators or executives)
4. Try `organization_ids` instead of domain if domain didn't work
5. Try the parent company domain if this is a regional subsidiary

**Do not move to Phase 4 until you have at least 2 qualified contacts per company.** If Apollo search is exhausted, supplement with web research (company website team pages, press quotes, LinkedIn) to find a second contact — even if their email must be marked as unverified.

#### Step 3: Enrich top contacts for verified emails

For each company, enrich **at least 2 contacts** (up to 3) using `mcp__claude_ai_Apollo_io__apollo_people_match` to get verified emails:
```
mcp__claude_ai_Apollo_io__apollo_people_match(
  id: "[person_id from search results]"
)
```

Or if you have their LinkedIn URL:
```
mcp__claude_ai_Apollo_io__apollo_people_match(
  linkedin_url: "[LinkedIn URL]"
)
```

Or match by name + company:
```
mcp__claude_ai_Apollo_io__apollo_people_match(
  first_name: "[First]",
  last_name: "[Last]",
  organization_name: "[Company]"
)
```

**Important**: `apollo_people_match` costs Apollo credits. Only enrich contacts you've qualified as worth reaching out to — **minimum 2 per company, maximum 3**. Having only 1 contact per company is NOT acceptable — it leaves no alternative path if that contact doesn't respond.

From the enrichment response, extract:
- `email` — the verified email address
- `email_status` — check this is "verified" or "likely_to_engage" (not "unavailable")
- `linkedin_url` — confirmed LinkedIn profile
- `title` — current title
- `organization.name` — confirm correct company

### Phase 4: Supplementary Web Research

Use web search to add context that Apollo doesn't provide:

#### Company website
- Check the "About" / "Leadership" / "Team" page for named executives
- Check press/newsroom for recent quotes from marketing leaders
- Check careers page for open marketing roles (signals team growth or gaps)

#### Press and interviews
- Search: "[Company] marketing [recent campaign or event name]" (people often get quoted in press)
- Search Campaign ME / Arabian Marketer for articles naming marketing contacts
- Look for recent interviews, speaking engagements, or LinkedIn posts by the contacts found

#### Agency landscape
- Identify existing agencies the company works with (to avoid pitching services already covered)
- Note recent agency changes or reviews

### Phase 5: Qualify Contacts

For each person found, assess:

- **Seniority**: Are they senior enough to make or influence agency decisions?
- **Relevance**: Is their role aligned with the services hrmny would pitch?
- **Region**: Are they based in or responsible for UAE/GCC?
- **Tenure**: How long have they been in the role? (New = more likely to review agencies)
- **Activity**: Are they active on LinkedIn? (Affects outreach approach)
- **Email status**: Is their email verified? Flag if unverified or unavailable.

### Phase 6: Output

Present contacts in a structured format:

```
# Contacts: [Company Name]
**Date**: [YYYY-MM-DD]
**Related lead research**: [Link to /find-leads output if applicable]

---

## Agency Landscape (important context)

[Who already handles what — so hrmny knows which services to pitch and which to avoid]

---

## Primary Contact (highest priority)

**Name**: [Full name]
**Title**: [Exact title]
**Company**: [Company name]
**Location**: [City, Country]
**LinkedIn**: [URL]
**Email**: [Verified email from Apollo] *(verified/unverified/unavailable)*
**Why this person**: [Why they're the right contact for hrmny's pitch]
**Recent activity**: [Any recent posts, interviews, or public activity worth referencing in outreach]

**Key references for outreach personalisation**:
- [Links to interviews, articles, or posts by this person]

---

## Secondary Contact(s)

[Same format for 1-2 additional contacts — different department, different seniority, or backup path]

---

## Outreach Strategy

- **Recommended approach**: [Who to contact first, via which channel, and why]
- **Parallel path**: [Alternative entry point if primary contact doesn't respond]
- **Warm paths**: [Any mutual connections, shared events, or intro opportunities identified]
- **LinkedIn note angle**: [Specific detail to reference in the connection request]
```

Save to: `outputs/lead-research/YYYY-MM-DD-contacts-{company-name}.md`

### Phase 7: Sync to Google Sheets

After saving the markdown file, push contacts to the Outreach tab and update the company stage.

**For each contact found**, run:
```bash
scripts/sheets-sync.sh add_contact '{"company":"[Company Name]","name":"[Full Name]","title":"[Title]","email":"[Email]","email_status":"[Verified/Unverified/Unavailable]","linkedin_url":"[URL]","seniority":"[Seniority]","why_this_person":"[Why they are the right contact]","contact_stage":"Contact Found"}'
```

**Update the company stage** to reflect that contacts have been found:
```bash
scripts/sheets-sync.sh update_company '{"company":"[Company Name]","stage":"Contacts Found"}'
```

**Note**: Companies must already exist in the Companies tab — do not create companies here. If a company isn't in the sheet, tell the user to run `/find-leads` first.

If `sheets-sync.sh` fails (e.g., config not found), note it at the end of the output but don't block the command — the markdown file is the primary output.

**Note**: Contacts are tracked in Google Sheets only. They move to Asana when the lead is promoted via `/promote-lead` after connecting.

### Phase 8: Log Execution

Append an execution record to `data/feedback-log.json`. Use Python to read the file, prune entries older than 90 days, append a new entry, and write back:

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
    'command': 'fetch-contacts',
    'inputs': {'companies': ['[company names]'], 'mode': '[batch/single]'},
    'outputs': {'contacts_found': [N], 'companies_enriched': [N], 'apollo_credits_used': [N], 'emails_verified': [N], 'emails_unavailable': [N]},
    'quality_signals': {'contacts_per_company': [N], 'director_plus_contacts': [N]},
    'errors': ['[any Apollo or sync errors]']
})
json.dump(data, open(f, 'w'), indent=2)
"
```

Fill in actual values from this run. If the file doesn't exist or the write fails, note it but don't block the command.

### Phase 9: Suggest Next Steps

After fetching contacts:
- "Review contacts in the **Outreach tab** — check seniority, email status, and 'Why This Contact'"
- "Set Contact Stage to **Contact Approved** for contacts you want to reach out to"
- "Set Contact Stage to **Rejected** for wrong contacts"
- "Set Contact Stage to **Rework** + write Feedback — e.g., 'need someone more senior in brand marketing'"
- "Then run `/draft-outreach` to draft messages for all approved contacts"
- **Do NOT suggest `/log-lead`** — leads go to Asana only after connecting via `/promote-lead`

---

## Examples

- `/fetch-contacts` — batch mode: enrich contacts for all approved companies
- `/fetch-contacts Samsung Gulf Electronics` — single company
- `/fetch-contacts Seddiqi Holding — focus on social media and activations team`
- `/fetch-contacts Lucid Motors UAE`
- `/fetch-contacts Ethara — events marketing team`

---

## Quality Standards

- **Minimum 2 contacts per company — this is a hard requirement.** If you can only find 1 person via Apollo, you must supplement with web research (team pages, press, LinkedIn) until you have at least 2. Only if the company is genuinely too small or opaque to find a second contact should you proceed with 1, and you must flag this explicitly: "Only 1 contact found — [reason]"
- **Primary contact must be director-level or above** — no coordinators, no executives, no analysts
- **LinkedIn profile URL is required** for at least the primary contact
- **Verified email is required** for at least the primary contact (use Apollo enrichment)
- Every contact must have a clear reason why they're the right person
- If Apollo returns no results for a company, fall back to web research and clearly flag emails as unverified
- If Apollo enrichment shows email status as "unavailable", note this and suggest the domain format as a fallback (flagged as unverified)
- **Credit awareness**: Enrich 2-3 contacts per company — it costs Apollo credits. The minimum is 2, not 1.
- **Gate enforcement**: Only enrich companies where Stage = "Approved" (batch mode enforces this automatically)

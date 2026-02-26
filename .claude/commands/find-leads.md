# Find Leads

Research and identify potential leads matching hrmny's Ideal Customer Profile. Companies are synced to the Google Sheets Companies tab at Stage "Researched" — ready for your review and approval before contacts are enriched.

## Variables

target: $ARGUMENTS (industry, sector, specific company, market signal, or opportunity area to investigate)

---

## Instructions

You are researching potential sales leads for hrmny, a Dubai-based creative agency. Your job is to find companies that are a strong fit for hrmny's services and deliver actionable lead briefs — synced to Google Sheets for review. **Do NOT fetch contacts** — that happens after you approve companies in the sheet via `/fetch-contacts`.

### Phase 1: Load Context

Read these files to understand targeting criteria and service alignment:

1. `reference/icp-and-qualification.md` — ICP definition, no-go list, qualification criteria
2. `context/business-info.md` — hrmny's services, pricing ranges, and positioning
3. `context/strategy.md` — current sector focus and strategic priorities

### Phase 2: Research

Based on the target provided, use web search to investigate:

- Companies active in the target area (sector, market, or signal)
- Recent brand activity: launches, campaigns, market entries, hires, agency changes
- UAE/GCC presence or expansion plans
- Marketing gaps or opportunities visible from public sources
- Key decision-makers (CMO, Marketing Director, Head of Comms, etc.) — note names for later enrichment

**Research depth**: Aim for 5-10 potential leads per search. Quality over quantity — only include companies that genuinely fit the ICP.

### Phase 3: Filter & Qualify

For each company found, assess against the ICP and qualification criteria:

- **No-go check**: Immediately discard low-budget startups, small local brands (unless global budgets), alcohol, tobacco
- **Sector fit**: Does the company operate in a priority sector?
- **Budget signal**: Does company size/activity suggest they can afford hrmny's rates?
- **Service fit**: Does the brand need services hrmny delivers?
- **Urgency signal**: Is there a near-term trigger (launch, campaign, event, agency review)?

### Phase 4: Output

Present each qualified lead as a brief:

```
## [Company Name]

**Sector**: [Industry/category]
**HQ / Region**: [Location, UAE presence]
**ICP Fit**: [Hot / Warm / Cool] — [which of B/U/A/F are met]

**Why this company**: [Specific research insight — why this company is relevant RIGHT NOW. Not just "they're a big brand" — what creates an opportunity for hrmny]

**Likely services needed**: [SMM / PR / Campaign / Branding / Activation — based on observed signals]

**Estimated deal size**: [AED range based on service fit and company scale]

**Recommended outreach angle**: [The specific hook — what to lead with when reaching out]

**Source / evidence**: [Links or references to what you found]
```

### Phase 5: Save

Save the output to: `outputs/lead-research/YYYY-MM-DD-{topic}.md`

Use today's date. Replace `{topic}` with a short kebab-case description (e.g., `retail-brands-dubai`, `ev-brands-gcc`, `sports-wellness-uae`).

### Phase 6: Sync to Google Sheets

After saving the markdown file, push each qualified lead to the Google Sheets Companies tab. **Do NOT log to Asana** — leads only move to Asana later via `/promote-lead` once they've connected and shown interest. **Do NOT fetch contacts** — contacts are enriched separately via `/fetch-contacts` after approval.

**For each qualified lead**, run:
```bash
scripts/sheets-sync.sh add_company '{"company":"[Company Name]","sector":"[Sector]","icp_fit":"[Hot/Warm/Cool]","why_this_company":"[Research insight — why this company is relevant]","services":"[Services Match]","est_value":"[AED value or empty]","outreach_angle":"[Recommended angle]","evidence":"[Source URLs]","lead_source":"Cold Outbound","stage":"Researched"}'
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
    'command': 'find-leads',
    'inputs': {'target': '[search target]'},
    'outputs': {'companies_researched': [N], 'icp_fits': {'hot': [N], 'warm': [N], 'cool': [N]}, 'sectors': ['[sectors]']},
    'quality_signals': {'companies_with_urgency_trigger': [N], 'companies_with_specific_angle': [N]},
    'errors': []
})
json.dump(data, open(f, 'w'), indent=2)
"
```

Fill in actual values from this run. If the write fails, note it but don't block the command.

### Phase 8: Suggest Next Steps

After completing research, suggest:
- "Review the researched companies in the **Companies tab** of the Google Sheet"
- "Set Stage to **Approved** for companies you want to pursue"
- "Set Stage to **Rejected** for companies that don't fit"
- "Set Stage to **Rework** + write Feedback for companies that need adjustment (e.g., 'look at their Dubai Mall campaign specifically')"
- "Then run `/fetch-contacts` to enrich contacts for all approved companies"

---

## Examples

- `/find-leads retail brands launching in Dubai Q1 2026`
- `/find-leads EV brands entering GCC market`
- `/find-leads sports and wellness brands in UAE`
- `/find-leads brands that recently changed agencies in the Middle East`
- `/find-leads F&B retail brands expanding in Dubai`

---

## Quality Standards

- Every lead must pass the ICP no-go filter
- Every lead must have a specific **"Why This Company"** insight — not just "they're a big brand". This is the most important field.
- Every lead must have a specific outreach angle based on real research, not assumptions
- If a search yields fewer than 3 qualified leads, note this and suggest alternative search angles
- **Leads are synced to the Companies tab at Stage "Researched"** — they require your approval before contacts are fetched
- **Leads are tracked in Google Sheets only** — they move to Asana via `/promote-lead` after the lead connects
- **Do NOT call Apollo or enrich contacts** — that happens in `/fetch-contacts` after approval

# Process Intent Leads

Parse an Apollo buyer intent CSV export, filter against ICP, research and enrich the top opportunities, draft outreach, and sync to Google Sheets with "Intent Signal" as the lead source.

## Variables

args: $ARGUMENTS (optional: file path to CSV, or "dry-run" to skip Apollo enrichment and Sheets sync, or "top:N" to override how many leads to process)

---

## Instructions

You are processing a batch of companies that Apollo identified as showing buyer intent for services hrmny provides (e.g., "Social Media Marketing", "Creative Agency", "Brand Management"). These companies are actively researching topics that align with hrmny's offering — this is a higher-signal lead source than cold outbound.

**This is a monthly workflow.** The user exports a CSV from Apollo's web UI (company-level data with intent topics and scores), drops it in `data/intent-exports/`, and runs this command to turn it into qualified, outreach-ready leads.

**Key difference from `/find-leads` and `/daily-research`**: The company list comes from the CSV (not from web search). The intent topics from the CSV are a core part of the outreach angle — these companies are actively looking for what hrmny offers. Use that signal.

---

### Phase 1: Load Context

Read these files:

1. `reference/icp-and-qualification.md` — ICP, no-go list, qualification criteria (BUAF)
2. `reference/outreach-guidelines.md` — tone, structure, templates, what to avoid
3. `context/business-info.md` — hrmny services, pricing ranges, positioning
4. `context/strategy.md` — current priorities and sector focus
5. `data/research-history.json` — previously researched companies (for dedup)

---

### Phase 2: Locate & Parse the CSV

#### Find the CSV file

- If `$ARGUMENTS` contains a file path (e.g., `data/intent-exports/feb-2026.csv`), use that file
- If no file path is provided, look for the most recently modified `.csv` file in `data/intent-exports/`
- If `data/intent-exports/` doesn't exist or contains no CSV files, tell the user to create the directory and drop their Apollo export there

**Validate the file exists before proceeding.**

#### Parse the CSV

Read the CSV file and extract these fields for each row. Apollo company exports typically use these column names (handle minor variations in naming):

| Expected Column | Fallback Names | Required |
|---|---|---|
| Company Name | Name, Company | Yes |
| Domain | Website Domain, Website | Yes |
| Industry | Primary Industry | No |
| # Employees | Number of Employees, Employees | No |
| City | HQ City | No |
| State | HQ State | No |
| Country | HQ Country | No |
| Annual Revenue | Revenue, Estimated Revenue | No |
| Intent Topics | Intent Topic, Topics | Yes |
| Intent Score | Intent, Score | No |

**Parse intent topics**: The "Intent Topics" field is typically a comma-separated string (e.g., "Social Media Marketing, Creative Agency, Brand Management"). Split it into a list.

**Parse intent score**: Values are typically "High", "Medium", or "Low". If missing, default to "Medium".

Report the total number of rows parsed.

#### Check mode

- If `$ARGUMENTS` contains "dry-run", skip Apollo enrichment (Phase 5) and Google Sheets sync (Phase 8). Note dry-run status in output.
- If `$ARGUMENTS` contains "top:N" (e.g., "top:5"), process only the top N companies after filtering. Default is 10.

---

### Phase 3: Deduplicate

Check each company from the CSV against `data/research-history.json`:

- **Skip** any company that appears in `researched_companies` with a `date` within the last 30 days
- Match on company name (case-insensitive, fuzzy — "Samsung Gulf" should match "Samsung Gulf Electronics")
- Log skipped companies with the reason: "Researched on [date] via [source]"

Also check for duplicates within the CSV itself (same company appearing twice).

Report: "[N] companies after deduplication ([M] skipped — researched in last 30 days, [K] CSV duplicates)"

---

### Phase 4: Filter & Qualify

For each remaining company, apply ICP filtering in this order:

#### Step 1: No-go filter (immediate discard)
- Alcohol, tobacco — check industry field
- Known no-go sectors from `reference/icp-and-qualification.md`

#### Step 2: Budget signal filter
Use employee count and revenue from the CSV as budget proxies:
- **Strong signal** (proceed): 50+ employees OR revenue > $5M
- **Moderate signal** (proceed with caution): 20-49 employees OR revenue $1M-$5M
- **Weak signal** (skip unless intent score is High): <20 employees AND revenue < $1M (or unknown)

#### Step 3: Location relevance
- Prioritise companies with UAE/GCC presence (City/Country fields)
- Companies outside GCC: still include if they show UAE intent topics or if they're a global brand likely to have ME operations
- Flag companies with no clear UAE connection for manual review

#### Step 4: Sector fit
Map the company's industry to hrmny's priority sectors:
- **Primary match**: Retail, Consumer, F&B, Sports, Wellness, Fitness, Lifestyle
- **Secondary match**: Automotive, EV, Beauty, Fashion, Entertainment
- **Opportunistic**: Tech, Hospitality, Luxury — include if intent score is High
- **Poor fit**: B2B SaaS, Industrial, Healthcare, Education — skip unless intent score is High AND budget signal is strong

#### Step 5: Intent relevance scoring
Use the intent topics from the CSV to score relevance to hrmny:
- **Direct match** (highest priority): Topics like "Social Media Marketing", "Creative Agency", "Brand Management", "Public Relations", "Content Marketing", "Influencer Marketing", "Event Marketing"
- **Adjacent match** (high priority): "Digital Marketing", "Brand Strategy", "Marketing Agency", "Advertising", "Marketing Campaigns"
- **Indirect match** (moderate priority): "Marketing Automation", "SEO", "Performance Marketing" — still relevant but weaker signal for hrmny's services

#### Step 6: Rank and select

Score each company using:
- Intent Score from CSV: High = 3, Medium = 2, Low = 1
- Intent Relevance (from Step 5): Direct = 3, Adjacent = 2, Indirect = 1
- Budget Signal (from Step 2): Strong = 3, Moderate = 2, Weak = 1
- Sector Fit (from Step 4): Primary = 3, Secondary = 2, Opportunistic = 1

**Total score = sum of all four.** Maximum 12.

Rank by total score. Select the top N (default 10, override with "top:N").

Apply BUAF classification:
- **Hot**: Score 10-12, direct intent match, strong budget signal
- **Warm**: Score 7-9, adjacent intent match or moderate budget
- **Cool**: Score 4-6, indirect match or weak signals

**Report**: Present a ranked table of all qualified companies with their scores before proceeding. Show discarded companies in a separate section with reasons.

---

### Phase 5: Research (skip in dry-run mode)

For each of the selected companies, do a focused web search to find:
- What the company does and their current positioning
- UAE/GCC presence or expansion plans
- Recent marketing activity, campaigns, agency news
- Social media quality and gaps
- A specific outreach angle that connects their intent signal to hrmny's services

**The intent signal is your anchor.** If a company is researching "Social Media Marketing", the outreach angle should acknowledge they're evaluating social media options and position hrmny as a natural fit. Don't mention you know their intent data — frame it as an observation about their brand's current marketing.

**Time-box**: Spend 2-3 minutes of research per company. This is a batch operation — depth matters less than coverage. The user can always run `/find-leads [company]` for a deeper dive later.

**Do NOT enrich contacts or draft outreach.** This command respects the approval gates. Companies are added at Stage "Researched" — the user reviews, approves, and then follows the gated workflow (`/fetch-contacts` → `/draft-outreach`).

---

### Phase 6: Save Local Outputs

Save a combined intent leads report:
- File: `outputs/lead-research/YYYY-MM-DD-intent-leads.md`
- Include: CSV summary, filtering results, all qualified companies with research

Format:
```
# Intent Leads Report — YYYY-MM-DD

**Source CSV**: [filename]
**Total companies in CSV**: [N]
**After deduplication**: [N]
**After ICP filtering**: [N]
**Qualified & added to sheet**: [N]

---

## Qualified Leads

### 1. [Company Name] — [HOT/WARM/COOL]

**Intent Topics**: [from CSV]
**Intent Score**: [High/Medium/Low]
**Qualification Score**: [X/12]

| Field | Detail |
|---|---|
| Sector | [Industry] |
| ICP Fit | [Hot/Warm/Cool] (B+U+A+F analysis) |
| Budget Signal | [Employee count, revenue, what it suggests] |
| Urgency | [Intent signal + any research-based urgency triggers] |
| Services Needed | [Mapped from intent topics + research] |
| Est. Value | [AED range] |
| Outreach Angle | [The hook — informed by intent signal] |
| Evidence | [Source URLs from research] |

---

[Repeat for each qualified lead]

---

## Skipped Companies

| Company | Reason |
|---|---|
| [Name] | [Researched recently / No-go / Budget too small / Poor sector fit] |

---

## Intent Analysis Summary

| Intent Topic | Companies Showing | hrmny Relevance |
|---|---|---|
| Social Media Marketing | [N] | Direct — core service |
| Creative Agency | [N] | Direct — exactly what hrmny is |
| [etc.] | | |
```

---

### Phase 7: Sync to Google Sheets (skip in dry-run mode)

**Important**: Intent leads respect the approval gates. Companies are added at Stage "Researched" — they must be approved before contacts are fetched. `lead_source` must be `"Intent Signal"` — not `"Cold Outbound"`.

For each qualified lead, add to the **Companies tab**:
```bash
scripts/sheets-sync.sh add_company '{"company":"[Company]","sector":"[Sector]","icp_fit":"[Hot/Warm/Cool]","why_this_company":"[Research insight — include intent signal context]","services":"[Services]","est_value":"[AED value]","outreach_angle":"[Angle]","evidence":"[URLs]","lead_source":"Intent Signal","stage":"Researched"}'
```

**Do NOT add contacts or draft outreach.** The gated workflow is:
1. Companies land at "Researched" → user reviews → approves in sheet
2. User runs `/fetch-contacts` for approved companies → contacts at "Contact Found"
3. User reviews contacts → approves → runs `/draft-outreach`
4. User reviews drafts → approves per channel → sends

If any sync call fails, log the error but continue with remaining operations.

---

### Phase 8: Update State Files

**Update `data/research-history.json`** — read the current file, append new entries for each processed company, and write it back. Each entry:
```json
{"company": "Company Name", "date": "YYYY-MM-DD", "sector": "[sector]", "source": "intent-signal"}
```

Note the `source` is `"intent-signal"` — distinct from `"daily-research"` and `"find-leads"`.

---

### Phase 9: Summary & Next Steps

Present a summary:

```
## Intent Leads Summary — YYYY-MM-DD

| Metric | Value |
|---|---|
| CSV file processed | [filename] |
| Total companies in CSV | [N] |
| Skipped (recently researched) | [N] |
| Skipped (ICP filter) | [N] |
| Qualified & added to sheet | [N] |

### Top Opportunities

| Company | ICP Fit | Intent Topics | Est. Value |
|---|---|---|---|
| [Company] | Hot | Social Media Marketing | AED [X] |

### Next Steps

1. Review intent leads in Google Sheets — filter by Lead Source = "Intent Signal"
2. Approve companies you want to pursue (set Stage to "Approved")
3. Run `/fetch-contacts` to enrich approved companies with 2-3 contacts each
4. Review contacts → approve → run `/draft-outreach`
5. Review drafts → approve per channel → sends
```

- **Do NOT suggest `/log-lead`** — leads go to Asana only after connecting via `/promote-lead`

---

## Examples

- `/process-intent-leads` — process the latest CSV in data/intent-exports/
- `/process-intent-leads data/intent-exports/feb-2026-intent.csv` — process a specific file
- `/process-intent-leads dry-run` — test run without Apollo credits or Sheets sync
- `/process-intent-leads top:5` — only process the top 5 leads after filtering
- `/process-intent-leads data/intent-exports/march-2026.csv top:15` — specific file, process 15

---

### Phase 10: Log Execution

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
    'command': 'process-intent-leads',
    'inputs': {'csv_file': '[filename]', 'total_in_csv': [N], 'mode': '[standard/dry-run]', 'top_n': [N]},
    'outputs': {'after_dedup': [N], 'after_icp_filter': [N], 'qualified_synced': [N]},
    'quality_signals': {'icp_fits': {'hot': [N], 'warm': [N], 'cool': [N]}, 'top_intent_topics': ['[topics]']},
    'errors': []
})
json.dump(data, open(f, 'w'), indent=2)
"
```

Fill in actual values from this run. If the write fails, note it but don't block the command.

---

## Quality Standards

- Every lead must pass the ICP no-go filter
- Every lead must have a specific outreach angle informed by their intent signal — not just "they're a big brand"
- Intent topics from the CSV must be used to inform the outreach angle, but NEVER referenced directly ("we saw you're researching X" is prohibited)
- **Process-intent-leads does NOT enrich contacts or draft outreach** — it respects the approval gates. Companies are added at "Researched" and the user follows the gated workflow from there.
- Previously researched companies (last 30 days) must be skipped
- `lead_source` must be "Intent Signal" in all Sheets sync calls — never "Cold Outbound"
- `source` must be "intent-signal" in research-history.json entries
- All data must sync to Google Sheets (unless dry-run)
- State files must be updated after every run
- If the CSV contains more than 50 companies, recommend the user run with `top:10` or `top:15` to manage credit usage

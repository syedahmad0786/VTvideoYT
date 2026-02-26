# Daily Research — Automated Sales Pipeline

Orchestrate a full daily sales research cycle: sector rotation, market research, lead identification, contact enrichment, outreach drafting, Google Sheets sync, and summary generation. Designed for autonomous execution.

## Variables

mode: $ARGUMENTS (optional: "dry-run" to skip Apollo enrichment and Google Sheets sync, or "sector:retail|sports|automotive|signal" to override rotation)

---

## Instructions

You are running an automated daily research pipeline for hrmny. This command executes the FULL sales research workflow in one pass — no user interaction required. Every decision should follow hrmny's ICP, qualification criteria, and outreach standards.

**This command is designed to run autonomously via `claude -p --dangerously-skip-permissions`.** Do not ask questions — make decisions based on the reference files and quality standards.

---

### Phase 1: Load Context & Determine Today's Focus

Read these files:
1. `reference/daily-research-config.md` — rotation schedule, search queries, volume targets
2. `reference/icp-and-qualification.md` — ICP, no-go list, qualification criteria
3. `reference/outreach-guidelines.md` — tone, structure, templates
4. `context/business-info.md` — hrmny services and positioning
5. `context/strategy.md` — current priorities
6. `data/sector-rotation.json` — last run state and query index
7. `data/research-history.json` — previously researched companies

**Determine today's sector:**
- Check the day of the week (use the current date)
- Map to sector per the rotation schedule in daily-research-config.md:
  - Monday, Thursday → Retail + Consumer Experience
  - Tuesday → Sports / Wellness / Movements
  - Wednesday → Automotive / EV
  - Friday → Signal-driven
  - Saturday, Sunday → skip (but proceed if explicitly invoked)
- If $ARGUMENTS contains "sector:X", override with that sector
- Advance the query_index for the selected sector (cycle through search angles)

**Check mode:**
- If $ARGUMENTS contains "dry-run", skip Apollo enrichment (Phase 4) and Google Sheets sync (Phase 7)
- Note dry-run status in output

---

### Phase 2: Market Research & Signal Capture

Using the search query template for today's sector (from daily-research-config.md, at the current query_index), use web search to find:

- Companies active in the target sector in UAE/GCC
- Recent brand activity: launches, campaigns, market entries, hires, agency reviews
- Marketing gaps or opportunities visible from public sources
- Key decision-makers mentioned in articles

**Research depth**: Aim for 8-10 potential companies. Quality over quantity.

**Capture market signals**: As you research, collect **structured market signals** — any noteworthy news, trends, or events relevant to hrmny's target sectors, even if they don't directly map to a specific lead. For each signal, record:
- `headline`: What happened (concise, factual)
- `source`: Where you found it (publication name)
- `source_url`: The actual article URL (clickable link for the newsletter)
- `signal_type`: One of: `market_entry`, `agency_review`, `campaign`, `expansion`, `event`, `hire`, `funding`, `trend`
- `relevance`: Why this matters for hrmny (1 sentence — what opportunity does it create?)

Aim for 3-6 signals per run. These form the lead section of the morning brief email.

**Deduplication**: Check each company against `data/research-history.json`. Skip any company that has been researched in the last 30 days. Note skipped companies briefly.

---

### Phase 3: Filter & Qualify

For each company found, assess against ICP and qualification criteria:

- **No-go check**: Immediately discard low-budget startups, small local brands, alcohol, tobacco
- **Sector fit**: Does the company operate in a priority sector?
- **Budget signal**: Company size/activity suggests they can afford hrmny's rates
- **Service fit**: Brand needs services hrmny delivers
- **Urgency signal**: Near-term trigger exists (launch, campaign, event, agency review)

**Select top 3-5 companies** that pass all filters. Rank by ICP fit (Hot > Warm > Cool).

---

### Phase 4: Save Local Outputs

Save the daily research report:
- File: `outputs/lead-research/YYYY-MM-DD-daily-research.md`
- Include: sector focus, all researched companies with ICP assessment, outreach angles, evidence

---

### Phase 5: Sync to Google Sheets (Skip in dry-run mode)

**Important**: Daily research respects the approval gates. Companies are added at Stage "Researched" — they must be approved in the sheet before contacts are fetched. This prevents spending Apollo credits on companies you don't want to pursue.

For each qualified lead, add to the **Companies tab**:
```bash
scripts/sheets-sync.sh add_company '{"company":"[Company]","sector":"[Sector]","icp_fit":"[Hot/Warm/Cool]","why_this_company":"[Research insight — why this company is relevant right now]","services":"[Services]","est_value":"[AED value]","outreach_angle":"[Angle]","evidence":"[URLs]","lead_source":"Cold Outbound","stage":"Researched"}'
```

**Do NOT enrich contacts or draft outreach.** The gated workflow is:
1. Companies land at "Researched" → user reviews morning brief → approves in sheet
2. User runs `/fetch-contacts` for approved companies → contacts at "Contact Found"
3. User reviews contacts → approves → runs `/draft-outreach`
4. User reviews drafts → approves per channel → sends

If any sync call fails, log the error but continue with remaining operations.

---

### Phase 6: Update State Files

**Update `data/research-history.json`** — read the current file, append new entries for each researched company, and write it back. Each entry:
```json
{"company": "Company Name", "date": "YYYY-MM-DD", "sector": "retail", "source": "daily-research"}
```

**Update `data/sector-rotation.json`**:
- Set `last_run_date` to today's date
- Set `last_sector` to today's sector
- Increment the `query_index` for the sector used (wrap around to 0 when exceeding available queries)
- Append to `run_log`: `{"date": "YYYY-MM-DD", "sector": "...", "companies": N}`

**Compute `run_context`** from the updated `data/sector-rotation.json`:
- Count how many entries in `run_log` have dates within the current week (Monday-Sunday) → `run_number`
- Sum `companies` from those entries → `companies_this_week`
- Build `sector_schedule` string from `reference/daily-research-config.md`: "Mon: Retail | Tue: Sports | Wed: Auto | Thu: Retail | Fri: Signal"

---

### Phase 7: Generate Summary JSON

At the very end of your output, emit a structured summary block. The runner script parses this to trigger the morning brief email. Wrap it exactly as shown:

```
===DAILY_SUMMARY_START===
{
  "date": "YYYY-MM-DD",
  "sector_focus": "Retail + Consumer Experience",
  "sector_override": false,
  "override_reason": null,
  "tldr": "2 hot retail brands preparing UAE launches with immediate agency needs.",
  "executive_summary": "Strong week for retail entrants — 2 premium brands preparing UAE launches with immediate agency needs. Both are hiring marketing teams locally, signaling budget and urgency.",
  "companies_researched": 4,
  "companies": [
    {
      "name": "Company Name",
      "sector": "Retail",
      "icp_fit": "Hot",
      "why_now": "Opening flagship store in Dubai Mall Q1 2026 — actively hiring marketing team",
      "opportunity_summary": "Launch campaign, social media management, influencer activation for store opening",
      "services_match": ["SMM", "Campaigns", "Activations"],
      "est_value": "AED 300K-500K",
      "outreach_angle": "Just opened a new Dubai flagship store",
      "evidence_urls": [
        {"title": "Brand X opens flagship store in Dubai Mall", "url": "https://example.com/article1"},
        {"title": "Brand X hiring Marketing Director for UAE", "url": "https://example.com/article2"}
      ]
    }
  ],
  "dry_run": false,
  "errors": [],
  "market_signals": [
    {
      "headline": "Lucid Motors opens first Dubai showroom in DIFC",
      "source": "Arabian Business",
      "source_url": "https://www.arabianbusiness.com/example-article",
      "signal_type": "market_entry",
      "relevance": "New EV entrant needs launch campaign, social media, influencer activation"
    }
  ],
  "run_context": {
    "run_number": 3,
    "companies_this_week": 12,
    "sector_schedule": "Mon: Retail | Tue: Sports | Wed: Auto | Thu: Retail | Fri: Signal"
  },
  "next_steps": "Review companies in Google Sheets → approve → run /fetch-contacts → /draft-outreach"
}
===DAILY_SUMMARY_END===
```

**Critical**: The JSON must be valid and parseable. The email focuses on market signals and opportunity briefs — the user then reviews and approves companies in the sheet.

**Summary field guide**:
- `tldr`: One punchy line (under 100 chars) — the "if you read nothing else" headline for the newsletter. Different from executive_summary — this is short, sharp, attention-grabbing
- `executive_summary`: 1-2 sentence market read — the fuller "headline" of today's research
- `market_signals`: Structured objects with headline, source, source_url, signal_type, relevance (3-6 per run)
- `market_signals[].source_url`: The actual article URL — makes the source name clickable in the newsletter
- `why_now`: The urgency trigger for each company — why this opportunity exists right now
- `opportunity_summary`: What hrmny could specifically offer this company
- `services_match`: Array of hrmny service names that fit (e.g., "SMM", "PR", "Campaigns", "Branding", "Activations")
- `evidence_urls`: Array of `{title, url}` per company — the source articles that support the research. These are already gathered during Phase 2; include them in the JSON so the newsletter can render clickable links
- `run_context`: Computed from `data/sector-rotation.json` in Phase 6 — gives the newsletter weekly context (run number, total companies this week, sector schedule)
- `next_steps`: Always include — reminds user to approve companies and run the gated workflow

---

### Phase 8: Send Morning Brief Email (Skip in dry-run mode)

After generating the summary JSON above, send the morning brief email by calling the Google Sheets webhook directly. This ensures the email is always sent regardless of how the pipeline is invoked (interactive, runner script, or GitHub Actions).

1. Write the full summary JSON (everything between `===DAILY_SUMMARY_START===` and `===DAILY_SUMMARY_END===`) to a temporary file
2. Call the webhook using the temp file to avoid shell quoting issues:

```bash
python3 -c "
import json, subprocess, sys, os, tempfile

# Read the summary from temp file
with open('/tmp/hrmny-daily-summary.json', 'r') as f:
    summary = json.load(f)

# Build the webhook payload
payload = json.dumps({'action': 'send_daily_summary', 'data': summary})

# Read webhook URL from config
config_path = os.path.join(os.environ.get('PWD', '.'), 'data/sheets-config.json')
with open(config_path) as f:
    config = json.load(f)

url = config['webhook_url']

# POST to webhook
result = subprocess.run(
    ['curl', '-s', '-L', '-H', 'Content-Type: application/json', '-d', payload, url],
    capture_output=True, text=True, timeout=30
)
print(result.stdout)
" && rm -f /tmp/hrmny-daily-summary.json
```

3. Before calling the script, write the summary JSON to `/tmp/hrmny-daily-summary.json`:

```bash
python3 -c "
import json
summary = <paste the full summary dict here>
with open('/tmp/hrmny-daily-summary.json', 'w') as f:
    json.dump(summary, f)
"
```

**Important**: Always write the JSON to the temp file first, then run the send script. This avoids all shell escaping issues with apostrophes and special characters in company names and outreach text.

If the send fails, log the error but do not fail the pipeline. Report the error in your output.

---

### Phase 9: Log Execution

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
    'command': 'daily-research',
    'inputs': {'sector': '[sector focus]', 'mode': '[standard/dry-run]', 'query_index': [N]},
    'outputs': {'companies_researched': [N], 'companies_synced': [N], 'dedup_skipped': [N], 'market_signals': [N]},
    'quality_signals': {'icp_fits': {'hot': [N], 'warm': [N], 'cool': [N]}},
    'errors': []
})
json.dump(data, open(f, 'w'), indent=2)
"
```

Fill in actual values from this run. If the write fails, note it but don't block the command.

---

## Quality Standards

- Every lead must pass the ICP no-go filter
- Every lead must have a specific outreach angle (not generic)
- **Daily research does NOT enrich contacts or draft outreach** — it respects the approval gates. Companies are added at "Researched" and the user follows the gated workflow from there.
- Previously researched companies (last 30 days) must be skipped
- All data must sync to Google Sheets (unless dry-run)
- Summary JSON must be valid and parseable
- State files must be updated after every run

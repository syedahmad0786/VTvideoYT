# Daily Research Configuration

> This file configures the automated daily research pipeline. Read by `/daily-research`, `/find-leads`, and `/process-intent-leads`. Defines search strategy, scoring, deduplication, credit allocation, and performance tracking.

---

## Sector Rotation Schedule

| Day | Sector | Frequency |
|---|---|---|
| Monday | Retail + Consumer Experience | Primary (2x/week) |
| Tuesday | Sports / Wellness / Movements | Primary (2x/week) |
| Wednesday | Automotive incl. EV | Secondary (1x/week) |
| Thursday | Retail + Consumer Experience | Primary (2x/week) |
| Friday | Signal-Driven (hot news/launches) | Opportunistic (1x/week) |
| Saturday | No automated run | Weekend |
| Sunday | No automated run | Weekend |

### Override Rules

- If a major market signal is detected during research (new brand entering UAE, large agency review announced, major event coming up), **override the scheduled sector** and pursue that signal
- Signal detection happens during the web search phase: if breaking news is more commercially relevant than the scheduled sector, pivot
- Log the override reason in the daily summary and in `data/feedback-log.json`

---

## Filtering Criteria (Applied to All Search Results)

Before researching any company deeper, apply these hard filters. If a company fails any hard filter, skip it immediately.

### Hard Filters (must pass all)

| Filter | Requirement | How to Verify |
|---|---|---|
| **UAE/GCC presence** | Must have an active or announced presence in the UAE or GCC (office, showroom, distribution, retail, event, or confirmed market entry) | Company website, LinkedIn company page (filter locations), press releases, Apollo org data |
| **Company size** | 50+ employees globally OR 10+ in the MENA region (proxy for real marketing budget) | Apollo org enrichment, LinkedIn company page, Crunchbase |
| **Not on no-go list** | Not a low-budget startup, not a small local brand (unless clearly global budgets), not alcohol, not tobacco | Manual check against `reference/icp-and-qualification.md` no-go list |
| **Not already in pipeline** | Not already in the Google Sheets Companies tab or Asana pipeline | Check via `sheets-sync.sh get_data summary` and `data/research-history.json` |
| **Marketing activity signal** | At least one observable signal: active social media, recent campaigns, job postings for marketing roles, press coverage, event participation, or agency review | LinkedIn, company social accounts, job boards, Campaign ME, press search |

### Soft Filters (prefer companies that match more of these)

| Filter | Signal | Weight |
|---|---|---|
| **Recent market move** | Launched in UAE within last 12 months, opened new location, announced expansion | High |
| **Active hiring** | Marketing/comms/brand roles open in UAE/GCC | High |
| **Agency dissatisfaction** | Agency review announced, RFP in market, or visible quality gap in current output | High |
| **Seasonal trigger** | Upcoming Ramadan, DSF, summer campaign, Abu Dhabi GP, or sector event | Medium |
| **Social media presence but weak execution** | Active accounts but generic/inconsistent content (indicates need for SMM retainer) | Medium |
| **Revenue/funding level** | Series B+ funding, or estimated revenue >$10M (global) | Medium |
| **PR gap** | Low press coverage relative to brand size and activity | Low |

---

## Search Query Templates

### Query Construction Rules

Every search query must include at least two of these specificity anchors:
1. **Geographic**: "Dubai", "UAE", "GCC", "Middle East", "MENA" (not just "Gulf" or "region")
2. **Temporal**: "2026", "2025", "this year", "recently", "new", "launching"
3. **Activity signal**: "opening", "launching", "expanding", "hiring", "marketing", "agency", "campaign"
4. **Sector-specific term**: Use precise category terms, not broad industry labels

Bad query: "sports brands UAE marketing 2026" (too broad, returns noise)
Good query: "athleisure DTC brands opening Dubai retail 2026" (specific activity + location + time)

### Retail + Consumer Experience (Monday, Thursday)

Run 2-3 queries per session, rotating through these. Each Monday/Thursday pair should use different queries.

**Market entry and expansion:**
1. `"new retail brand" OR "store opening" Dubai 2026`
2. `premium F&B concept opening Dubai OR "Abu Dhabi" 2026`
3. `luxury retail brand "GCC expansion" OR "Middle East launch" 2026`
4. `DTC brand OR "direct to consumer" opening Dubai showroom OR store`

**Agency and marketing activity:**
5. `retail brand Dubai "agency review" OR "marketing review" OR "agency appointment" 2026`
6. `"hiring marketing" OR "hiring brand manager" retail Dubai LinkedIn`
7. `shopping destination OR "mall activation" Dubai brand partnership 2026`

**Experience and activation:**
8. `"pop-up" OR "brand activation" OR "experiential retail" Dubai 2026`
9. `F&B brand expansion UAE franchise OR "new concept"`
10. `"consumer experience" brand Dubai "social media" OR campaign launch`

### Sports / Wellness / Movements (Tuesday)

Run 2-3 queries per session.

**Brand activity:**
1. `sports brand "Middle East" OR "Dubai" launch OR expansion 2026`
2. `wellness OR fitness brand Dubai "new location" OR partnership OR sponsorship`
3. `athleisure brand GCC OR UAE "market entry" OR launch`

**Community and events:**
4. `running OR cycling OR fitness community brand Dubai sponsorship OR activation`
5. `sports event Dubai OR "Abu Dhabi" brand partnership 2026`
6. `"performance lifestyle" OR "sports lifestyle" brand UAE marketing`

**Hiring and agency signals:**
7. `sports brand Dubai "hiring marketing" OR "marketing manager" OR "brand manager"`
8. `wellness brand UAE "agency review" OR "social media" OR campaign`
9. `gym OR fitness chain OR "health club" UAE expansion OR opening 2026`

### Automotive incl. EV (Wednesday)

Run 2-3 queries per session.

**EV and new entrants:**
1. `EV brand OR "electric vehicle" Dubai OR UAE showroom OR launch 2026`
2. `Chinese EV brand OR "new automotive brand" entering UAE OR GCC market`
3. `"electric car" brand "Middle East launch" OR "GCC expansion"`

**Established brands with activity:**
4. `automotive brand Dubai "new model launch" OR campaign OR activation 2026`
5. `luxury car brand UAE "hiring marketing" OR "agency appointment" OR "brand experience"`
6. `automotive lifestyle brand Dubai "social media" OR content OR influencer partnership`

### Signal-Driven (Friday)

Friday research is driven by specific, named signal sources. Do NOT run generic searches. Instead, check these sources in order and research the most commercially relevant signals found.

**Primary signal sources (check all):**

| Source | What to Look For | How to Access |
|---|---|---|
| **Campaign Middle East** (campaignme.com) | Agency appointments, brand launches, marketing moves, account wins/losses | Web search: `site:campaignme.com brand OR agency OR launch past week` |
| **Arabian Business** (arabianbusiness.com) | New market entrants, expansion announcements, retail/F&B openings | Web search: `site:arabianbusiness.com brand launch OR expansion UAE 2026` |
| **Gulf Business** (gulfbusiness.com) | Business expansions, new ventures, regional market moves | Web search: `site:gulfbusiness.com new brand OR launch OR expansion Dubai` |
| **LinkedIn News (MENA)** | Trending business news, company announcements, executive moves | Search LinkedIn for trending posts in UAE business community |
| **Communicate Online** (communicateonline.me) | Marketing industry news, campaign launches, agency changes | Web search: `site:communicateonline.me brand OR campaign OR agency 2026` |
| **Zawya / Reuters (ME)** | Corporate news, expansions, funding rounds in GCC | Web search: `site:zawya.com UAE brand launch OR expansion` |

**Secondary signal sources (check if primary yields <3 leads):**

| Source | What to Look For |
|---|---|
| **Dubai Economy announcements** | New trade licenses, commercial registrations in relevant sectors |
| **DMCC / DIFC / DAFZA press releases** | New companies setting up in free zones |
| **Major event calendars** (Dubai Calendar, Visit Dubai) | Upcoming events that brands may activate around |
| **Google News alerts** | `"new brand" Dubai OR UAE launch 2026` filtered to past 7 days |

**Friday output**: Research the top 3-5 signal-driven companies. Tag each with the signal source and date in the research notes. Set `lead_source: "Cold Outbound"` unless the signal came from an intent data source.

---

## Deduplication Rules

Dedup is mandatory before any company enters the pipeline. Run these checks in order.

### Step 1: Check Google Sheets (primary dedup)

```bash
scripts/sheets-sync.sh get_data companies
```

Match against the Companies tab by:
- **Exact company name** (case-insensitive)
- **Known aliases**: check if the company trades under a different name (e.g., "Chalhoub Group" vs "Chalhoub")
- **Parent company**: if the brand is a subsidiary, check if the parent is already in the pipeline (e.g., "Sephora" under "LVMH" is a separate lead; "Nike UAE" under "Nike" is not)

### Step 2: Check research history

```bash
# Check data/research-history.json
```

If the company was researched in the last 90 days and rejected, skip it unless there is a new material signal (funding round, market entry, leadership change, agency review).

### Step 3: Check Asana pipeline

Only if Steps 1-2 pass. Check if the company already exists in the Asana Lead Pipeline 2026 (Connected or Qualified stages).

### Dedup decision matrix

| Scenario | Action |
|---|---|
| Company in Sheets at "Researched" or "Approved" | **Skip** (already in pipeline) |
| Company in Sheets at "Rejected" | **Skip** unless new material signal. If re-adding, note the new signal |
| Company in Sheets at "Connected" or beyond | **Skip** (active lead) |
| Company in research-history.json, rejected <90 days ago | **Skip** unless new material signal |
| Company in research-history.json, rejected >90 days ago | **Allow** (re-evaluate) |
| Parent company in pipeline but subsidiary is distinct brand | **Allow** (treat as separate lead) |
| Company in Asana pipeline | **Skip** (already promoted) |

---

## Auto-Qualify Scoring Rubric

Every company that passes filtering and dedup gets scored immediately. This score determines research depth, credit allocation, and priority in the sheet.

### Scoring dimensions (max 100 points)

| Dimension | Max Points | Scoring Guide |
|---|---|---|
| **Budget Fit (B)** | 25 | 25: Clear evidence of large marketing spend (global brand, major campaigns visible). 15: Likely able to afford hrmny (mid-size brand, active marketing). 5: Budget unclear but company size suggests possible fit. 0: Likely cannot afford hrmny |
| **Urgency (U)** | 25 | 25: Active trigger (launching in UAE now, agency review live, event in <3 months). 15: Near-term trigger (expansion planned, hiring, seasonal push coming). 5: General growth but no specific trigger. 0: No urgency signals |
| **Access (A)** | 15 | 15: Decision-maker identified with verified email + LinkedIn. 10: Decision-maker identified with LinkedIn only. 5: Know the company but no specific contact yet. 0: No path to a decision-maker |
| **Fit (F)** | 20 | 20: Needs exactly what hrmny delivers, creative alignment is strong. 15: Needs 2+ hrmny services, good creative fit. 10: Needs at least 1 hrmny service, adequate fit. 0: Services mismatch or brand misalignment |
| **Sector Priority** | 15 | 15: Primary sector (Retail/Consumer, Sports/Wellness). 10: Secondary sector (Automotive/EV). 5: Opportunistic sector with strong signals. 0: Off-sector |

### Score-to-action mapping

| Score | Rating | ICP Fit Label | Action |
|---|---|---|---|
| 75-100 | **Hot** | Hot | Research deep, allocate Apollo credits, prioritise for outreach |
| 55-74 | **Warm** | Warm | Research standard depth, allocate credits if available, queue for outreach |
| 35-54 | **Cool** | Cool | Light research only, no Apollo credits, park for future review |
| 0-34 | **Skip** | (do not add) | Do not add to pipeline |

### Score output format

When adding a company to Google Sheets, include the score breakdown in the `Why This Company` field:

```
[Score: 78/100 — Hot] B:20 U:25 A:15 F:13 S:5
Recently launched Dubai showroom (Jan 2026). Hiring Head of Marketing MENA.
Active social but inconsistent, weak PR coverage. Strong fit for SMM + PR retainer.
```

---

## Volume Targets

### Per-Run Targets (daily)

| Metric | Target | Notes |
|---|---|---|
| Companies researched (passed filters) | 3-5 | After dedup and hard filters; expect to evaluate 10-15 raw results to yield 3-5 |
| Companies added to Sheets | 3-5 | All scored; Hot and Warm only |
| Apollo org enrichments | 3-5 max | Only for companies scoring 55+ (Warm/Hot) |

### Weekly Rollup Targets

| Metric | Target | How Calculated |
|---|---|---|
| New companies added (Mon-Fri) | 12-18 | 4 research days x 3-5 per day (Friday may yield fewer) |
| Hot-rated companies | 3-5 per week | ~25-30% of total should be Hot |
| Warm-rated companies | 7-12 per week | Remainder of qualified additions |
| Companies approved by Ayham | 8-12 per week | Depends on review cadence; target 60-70% approval rate |
| Contacts enriched (after approval) | 16-30 per week | 2-3 contacts per approved company |
| Outreach drafted | 10-20 contacts per week | Based on Contact Approved volume |

### Monthly Rollup Targets

| Metric | Target | Notes |
|---|---|---|
| New companies added | 50-70 | ~4 weeks of research |
| Companies approved | 35-50 | 60-70% approval rate |
| Contacts enriched | 70-120 | 2-3 per approved company |
| Outreach sent (all channels) | 40-80 contacts | Based on channel approval rate |
| Replies received | 8-16 | Targeting 15-20% reply rate |
| Meetings booked | 4-8 | Targeting 50% reply-to-meeting conversion |

### Sustainability check

If weekly volumes drop below minimums for 2 consecutive weeks, flag in `/prime` session init:
- "Research volume below target: [X] companies added vs [12] minimum this week"
- Suggest running `/daily-research` with sector override or broadening search queries

---

## Apollo Credit Budget

### Priority-Based Credit Allocation

Apollo credits are finite. Allocate based on company score, not equally.

| Company Score | Credit Allocation | Max Contacts to Enrich | Rationale |
|---|---|---|---|
| 75-100 (Hot) | **Full** | 3 contacts | High-value targets deserve full enrichment |
| 55-74 (Warm) | **Standard** | 2 contacts | Worth pursuing but conserve credits |
| 35-54 (Cool) | **None** | 0 (LinkedIn research only) | Not worth credits until score improves |
| 0-34 (Skip) | **None** | 0 (not added to pipeline) | Does not enter pipeline |

### Weekly Credit Budget

| Budget Item | Credits/Week | Notes |
|---|---|---|
| Org enrichments (company data) | 5-10 | Only for companies scoring 55+ |
| People enrichments (contact data) | 20-30 | 2-3 per approved company, ~10 companies/week |
| Email verification | Included | Part of people enrichment |
| **Weekly total** | **25-40** | Adjust if approval rate changes |
| **Monthly budget** | **100-160** | 4 weeks; leave 10% buffer for ad-hoc research |

### Credit-Saving Rules

- **Skip enrichment if**: company already has contacts in Google Sheets
- **Skip enrichment if**: company scores below 55 (Cool/Skip)
- **Batch enrichments**: run `/fetch-contacts` in batch mode to process all approved companies at once (more efficient than one-by-one)
- **Fallback for no-credit situations**: use web research for LinkedIn URLs and note emails as "Unverified" in the sheet
- **End-of-month buffer**: if >80% of monthly credits used by week 3, restrict enrichment to Hot companies only (75+ score)

### Credit Tracking

Log credit usage in `data/feedback-log.json` per session:
```json
{
  "date": "2026-02-26",
  "command": "fetch-contacts",
  "apollo_credits_used": {
    "org_enrichments": 3,
    "people_enrichments": 8,
    "total": 11
  }
}
```

---

## ROI Tracking Metrics

Track these conversion rates to measure research quality and pipeline health. Updated by `/reflect` and surfaced by `/dashboard` and `/prime`.

### Funnel Conversion Rates

| Metric | Definition | Target | How to Calculate |
|---|---|---|---|
| **Research-to-Approval %** | Companies approved / Companies added at "Researched" | **60-70%** | Companies tab: count "Approved" / count total (excl. "Rework" in-progress) |
| **Approval-to-Contact %** | Companies with contacts found / Companies approved | **90%+** | Should be near 100%; low rate means Apollo isn't returning results |
| **Contact-to-Outreach %** | Contacts with outreach drafted / Contacts found | **70-80%** | Outreach tab: contacts with Email or LI drafts / total contacts |
| **Outreach-to-Reply %** | Contacts who replied / Contacts with outreach sent | **15-20%** | Outreach tab: "Replied" / "Sent" across all channels |
| **Reply-to-Meeting %** | Meetings booked / Replies received | **40-50%** | Track meetings manually or via Asana "Connected" entries |
| **Research-to-Meeting %** | Meetings booked / Companies originally researched | **5-10%** | End-to-end conversion; the north star metric |

### Segment Breakdown

Track conversion rates separately by:
- **Sector**: Retail vs Sports/Wellness vs Automotive vs Signal-driven
- **Lead source**: Cold Outbound vs Intent Signal
- **ICP score**: Hot vs Warm
- **Channel**: Email vs LinkedIn connection vs LinkedIn follow-up

### Performance Thresholds

| Metric | Green | Yellow | Red | Action if Red |
|---|---|---|---|---|
| Research-to-Approval % | >60% | 40-60% | <40% | Tighten search queries, raise scoring bar |
| Outreach-to-Reply % | >15% | 8-15% | <8% | Review outreach quality, check personalization depth |
| Reply-to-Meeting % | >40% | 25-40% | <25% | Review follow-up cadence, check CTA strength |
| Hot company ratio | >25% | 15-25% | <15% | Queries too broad, refocus on higher-signal searches |

### When to Review

- **Weekly**: `/reflect` calculates and logs these metrics from sheet data
- **Monthly**: `/evolve` compares month-over-month trends and proposes config changes
- **Per-session**: `/prime` surfaces any Red metrics as priority alerts

---

## Research Depth by Score

Not every company deserves the same research effort. Match depth to score.

### Hot (75-100): Deep Research

- Full company background (founding, funding, leadership, UAE operations)
- Current marketing activity audit (social channels, recent campaigns, PR coverage, events)
- Competitive positioning (who else serves them, agency of record if known)
- Specific outreach angle with evidence (quote a campaign, reference a job posting, cite a news article)
- 2-3 decision-maker contacts identified with titles and LinkedIn URLs
- Service alignment: which 2-3 hrmny services map to their visible needs
- Estimated deal value (based on company size and likely scope)

### Warm (55-74): Standard Research

- Company overview (what they do, UAE presence, sector)
- 1-2 observable marketing signals (social activity, recent press, events)
- General outreach angle (market trend or company activity-based)
- 1-2 decision-maker contacts identified
- Primary service alignment (which 1-2 hrmny services fit)

### Cool (35-54): Light Research (No Apollo Credits)

- Company name, sector, and reason for inclusion
- One-line outreach angle
- LinkedIn company page URL
- Note in `Why This Company` explaining what signal would upgrade them to Warm

---

_Update this file when `/evolve` identifies improvements based on conversion data. Last updated: 2026-02-26._

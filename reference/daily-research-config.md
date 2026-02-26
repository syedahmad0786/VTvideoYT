# Daily Research Configuration

> This file configures the automated daily research pipeline. Read by `/daily-research`.

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
- Signal detection happens during the web search phase — if breaking news is more commercially relevant than the scheduled sector, pivot
- Log the override reason in the daily summary

---

## Search Query Templates

### Retail + Consumer Experience (Monday, Thursday)

Rotate through these search angles:
1. "premium retail brands launching in Dubai 2026"
2. "new F&B concepts opening UAE 2026"
3. "shopping destination brands Dubai Mall Mall of the Emirates"
4. "luxury retail brands expanding GCC"
5. "consumer experience brands UAE activations"
6. "Dubai retail marketing agency review"

### Sports / Wellness / Movements (Tuesday)

Rotate through these search angles:
1. "sports brands UAE marketing 2026"
2. "wellness fitness brands Dubai"
3. "community building brands UAE lifestyle"
4. "sports sponsorship activations Dubai"
5. "athleisure performance brands GCC market entry"
6. "UAE fitness wellness brand partnerships"

### Automotive incl. EV (Wednesday)

Rotate through these search angles:
1. "EV brands launching UAE 2026"
2. "automotive marketing agency UAE"
3. "new car brands Dubai showroom opening"
4. "electric vehicle GCC market expansion"
5. "luxury automotive marketing Middle East"

### Signal-Driven (Friday)

Use these searches to find breaking signals:
1. "UAE brand launch this week"
2. "Dubai agency review appointment 2026"
3. "GCC marketing news this week"
4. "Campaign Middle East latest agency moves"
5. "new brands entering UAE market 2026"

---

## Volume Targets

| Metric | Target per Run |
|---|---|
| Companies researched | 3-5 |
| Contacts enriched per company | 2-3 |
| Apollo enrichments per run | 6-10 max |
| Outreach drafts (email + LinkedIn) | Top 2-3 leads |
| Total outreach pieces per run | 6-9 (email + LinkedIn request + follow-up per lead) |

---

## Apollo Credit Budget

- **Max enrichments per run**: 10
- **Max enrichments per company**: 3
- **Skip enrichment if**: company already has contacts in Google Sheets
- **Fallback**: If Apollo returns no results, use web research for LinkedIn URLs and note emails as unverified

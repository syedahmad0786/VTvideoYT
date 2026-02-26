# hrmny — Sales & Growth Workspace

This workspace is the operating environment for **Ayham Homsi, Managing Partner — Creative & Growth** at **hrmny**, a Dubai-based creative agency. It is purpose-built for sales and growth: finding leads, managing pipeline, drafting outreach, and driving deals forward.

Claude operates as a **sales co-pilot** — context-aware, pipeline-connected, and commercially aligned with hrmny's strategy.

---

## How This Works

1. **Start every session** with `/prime` (or use the `cs`/`cr` shell aliases)
2. **Use commands** to execute the sales workflow — research, outreach, promote, review
3. **Context is persistent** — hrmny's ICP, strategy, pipeline structure, and outreach standards are encoded in reference files so Claude never needs re-briefing
4. **Two-system workflow**:
   - **Google Sheets** = outreach tracker (research → contacts → drafts → send → track responses)
   - **Asana** = pipeline for engaged leads only (Connected → Qualified — entered via `/promote-lead`)

---

## Workspace Structure

```
.
├── CLAUDE.md                          # This file — always loaded, core workspace guide
├── .mcp.json                          # MCP server config (LinkedIn)
├── .claude/
│   └── commands/                      # Slash commands
│       ├── prime.md                   # /prime — session init with pipeline check
│       ├── find-leads.md             # /find-leads — research companies → Companies tab
│       ├── fetch-contacts.md         # /fetch-contacts — enrich contacts → Outreach tab
│       ├── draft-outreach.md         # /draft-outreach — draft all 3 channels → Outreach tab
│       ├── review.md                 # /review — process "Rework" feedback → update sheet
│       ├── promote-lead.md           # /promote-lead — promote connected lead from Sheets → Asana
│       ├── pipeline-review.md        # /pipeline-review — Asana pipeline analysis (Connected+)
│       ├── dashboard.md              # /dashboard — Google Sheets outreach tracker dashboard
│       ├── daily-research.md         # /daily-research — automated daily pipeline
│       ├── process-intent-leads.md  # /process-intent-leads — Apollo intent CSV → leads
│       ├── reflect.md                # /reflect — synthesise learnings into memory
│       ├── evolve.md                 # /evolve — apply learnings to improve workspace files
│       ├── create-plan.md            # /create-plan — plan larger initiatives
│       └── implement.md              # /implement — execute plans
├── context/                           # Who we are, what we're doing, where we stand
│   ├── personal-info.md              # Ayham's role, responsibilities, decision rights
│   ├── business-info.md              # hrmny overview, services, ICP, constraints
│   ├── strategy.md                   # 2026 sales strategy and priorities
│   └── current-data.md              # Pipeline metrics, targets, benchmarks
├── reference/                         # Standards and mappings (read by commands)
│   ├── icp-and-qualification.md      # ICP definition, no-go list, qualification criteria
│   ├── outreach-guidelines.md        # Outreach tone, structure, templates
│   ├── daily-research-config.md      # Sector rotation, search queries, volume targets
│   ├── asana-pipeline-map.md         # Asana project/section/field GID mapping
│   ├── google-sheets-setup.md        # Google Sheets dashboard setup guide
│   └── shell-aliases-setup.md        # cs/cr alias setup docs
├── outputs/                           # Work products
│   ├── lead-research/                # Lead research results from /find-leads
│   └── outreach/                     # Drafted emails and LinkedIn messages
├── plans/                             # Implementation plans
├── data/                              # Runtime config (gitignored)
│   ├── sheets-config.json            # Google Sheets webhook URL
│   ├── sector-rotation.json          # Rotation state (gitignored)
│   ├── research-history.json         # Researched companies history (gitignored)
│   ├── feedback-log.json             # Execution records from all commands (gitignored)
│   ├── metrics-history.json          # Weekly metric snapshots (gitignored)
│   ├── intent-exports/               # Apollo buyer intent CSV exports (gitignored)
│   └── logs/                          # Daily research execution logs (gitignored)
└── scripts/                           # Automation scripts
    ├── google-sheets-webhook.gs      # Apps Script code for the dashboard webhook
    ├── sheets-sync.sh                # CLI helper for pushing/pulling sheet data
    └── daily-research.sh             # Daily research runner (invokes Claude, triggers email)
```

---

## Commands

### Sales Workflow Commands

#### `/prime`
Initialise a session. Loads all context, pulls Google Sheets outreach snapshot + Asana pipeline snapshot, lists commands, and suggests actions.

#### `/find-leads [target]`
Research potential leads matching hrmny's ICP. Outputs lead briefs synced to the **Companies tab** at Stage "Researched". **Does NOT auto-enrich contacts** — you review and approve companies in the sheet first, then run `/fetch-contacts`.

**Examples:**
- `/find-leads retail brands launching in Dubai Q1 2026`
- `/find-leads EV brands entering GCC market`
- `/find-leads sports and wellness brands in UAE`

#### `/fetch-contacts [company]`
Find decision-makers at target companies — names, titles, LinkedIn profiles, and **verified emails via Apollo.io**. Synced to the **Outreach tab**. Supports **batch mode**: run without arguments to process all "Approved" companies at once.

**Examples:**
- `/fetch-contacts` (batch mode — all approved companies)
- `/fetch-contacts Samsung Gulf Electronics`
- `/fetch-contacts Seddiqi Holding — focus on social media and activations team`

#### `/draft-outreach [company/contact]`
Draft personalised outreach for approved contacts. Channels depend on email availability: contacts with email get all 3 channels (email + LI connection + LI follow-up); contacts without email get **LinkedIn only** (connection request + follow-up). All channels are written to a **single row** in the Outreach tab. Supports **batch mode**: run without arguments to draft for all "Contact Approved" contacts. Per-channel approval: set Email Stage to "Approved" → email auto-sent; set LI Connection/Follow-up Stage to "Approved" → run `/send-linkedin` to send.

**Examples:**
- `/draft-outreach` (batch mode — all contact-approved contacts)
- `/draft-outreach Red Bull - Kareem Doukhei`
- `/draft-outreach Lucid Motors - just opened a Dubai showroom`

#### `/review [filter]`
Process all items marked as "Rework" in the Google Sheet. Reads the Feedback column, regenerates content based on your guidance, and updates the sheet — setting stages to "Reworked" and writing a note in Feedback about what changed. Works across companies, contacts, and all outreach channels.

**Examples:**
- `/review` (all rework items)
- `/review companies` (company-level rework only)
- `/review email` (email draft rework only)
- `/review linkedin` (LinkedIn message rework only)

#### `/promote-lead [company]`
Promote a connected lead from the Google Sheets outreach tracker into the Asana Lead Pipeline 2026 (Connected section). Use this when a lead has responded to outreach and shown interest. Pulls all lead/contact data from Google Sheets automatically.

**Examples:**
- `/promote-lead On Running ME`
- `/promote-lead Red Bull - Kareem responded on LinkedIn`
- `/promote-lead Lucid Motors - meeting booked for next week`

#### `/pipeline-review [filter]`
Pull the live pipeline from Asana (Connected + Qualified stages only) and analyse it — deals needing action, pipeline health vs. targets, and prioritised recommendations.

**Examples:**
- `/pipeline-review` (full review)
- `/pipeline-review stalled deals`
- `/pipeline-review qualified stage`

#### `/dashboard [filter]`
Pull the live outreach tracker from Google Sheets — companies by stage, email + LinkedIn performance, approval queue, rework items, and suggested next actions. All outreach commands automatically sync data to the sheet.

**Examples:**
- `/dashboard` (full dashboard)
- `/dashboard companies` (companies table with stages)
- `/dashboard outreach` (email + LinkedIn performance)

#### `/send-linkedin [filter]`
Send all approved LinkedIn connection requests and follow-up messages via the LinkedIn MCP server. Pulls "Approved" items from the Outreach tab, sends them through LinkedIn, and updates the sheet to "Sent". Requires confirmation before sending.

**Examples:**
- `/send-linkedin` (send all approved LinkedIn items)
- `/send-linkedin connections` (connection requests only)
- `/send-linkedin followups` (follow-up messages only)
- `/send-linkedin Red Bull` (send for a specific company)

#### `/process-intent-leads [csv-path]`
Process an Apollo buyer intent CSV export — companies in UAE showing intent for services like "Social Media Marketing" or "Creative Agency". Parses the CSV, filters against ICP, scores by intent relevance + budget + sector fit, researches each company, and syncs to Google Sheets at Stage "Researched" with `lead_source: "Intent Signal"`. Respects the approval gates — you review and approve companies, then run `/fetch-contacts` and `/draft-outreach`. Monthly workflow — drop the CSV in `data/intent-exports/` and run.

**Examples:**
- `/process-intent-leads` (process latest CSV in data/intent-exports/)
- `/process-intent-leads data/intent-exports/feb-2026-intent.csv` (specific file)
- `/process-intent-leads dry-run` (test without Apollo credits or Sheets sync)
- `/process-intent-leads top:5` (only process top 5 after filtering)

### Automation Commands

#### `/daily-research [mode]`
Automated sector-focused research: determines today's sector focus (rotation schedule), researches leads matching hrmny's ICP, syncs to Google Sheets at Stage "Researched", and sends a morning brief email. Respects the approval gates — companies land at "Researched" and you review the morning brief, approve in the sheet, then run `/fetch-contacts` and `/draft-outreach` through the gated workflow.

**Examples:**
- `/daily-research` (standard automated run — uses rotation)
- `/daily-research dry-run` (test without Apollo credits or Sheets sync)
- `/daily-research sector:automotive` (override to a specific sector)

### Self-Improvement Commands

#### `/reflect [filter]`
Synthesise learnings from recent command execution data and outreach outcomes. Extracts patterns (what's working, what's not), updates memory topic files (`memory/outreach-learnings.md`, `memory/patterns.md`, `memory/error-log.md`), and snapshots metrics. Run after a batch of work or at end of day/week.

**Examples:**
- `/reflect` (full 14-day reflection)
- `/reflect outreach` (focus on outreach effectiveness)
- `/reflect this-week` (current week only)

#### `/evolve [focus]`
Propose concrete, evidence-backed changes to workspace reference files based on accumulated learnings. Reads memory topic files and execution data, identifies improvements, presents a structured proposal, and applies approved changes. Run weekly or when `/prime` suggests it.

**Examples:**
- `/evolve` (full evolution review)
- `/evolve outreach` (outreach guidelines improvements)
- `/evolve research` (research config optimisation)
- `/evolve metrics` (refresh current-data.md with fresh numbers)

### General Commands

#### `/create-plan [request]`
Create a detailed implementation plan for a larger initiative. Saves to `plans/`.

#### `/implement [plan-path]`
Execute a plan created by `/create-plan`.

---

## Sales Workflow

The standard flow this workspace supports. **Three approval gates** ensure quality before each step. **Two lead sources** feed into Google Sheets. Asana receives leads only after they connect.

```
┌─────────────────────────┐    ┌──────────────────────────────┐
│  LAYER 1: Outbound       │    │  LAYER 2: Intent Signals      │
│  /find-leads             │    │  /process-intent-leads        │
│  /daily-research         │    │  (monthly Apollo CSV export)  │
│  source: "Cold Outbound" │    │  source: "Intent Signal"      │
└───────────┬─────────────┘    └──────────────┬───────────────┘
            │                                  │
            └──────────────┬───────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  GOOGLE SHEETS — Companies Tab                               │
│                                                              │
│  All lead sources → Stage: "Researched"                      │
│       ↓                                                      │
│  GATE 1: [Review in Sheet]                                   │
│       → "Approved" to proceed  |  "Rejected" to skip        │
│       → "Rework" + Feedback → /review → "Reworked"            │
│       ↓                                                      │
│  /fetch-contacts → Stage: "Contacts Found"                   │
│                                                              │
└────────────────────┬─────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────────────┐
│  GOOGLE SHEETS — Outreach Tab                                │
│                                                              │
│  /fetch-contacts → Contact Stage: "Contact Found"            │
│       ↓                                                      │
│  GATE 2: [Review contacts in Sheet]                          │
│       → "Contact Approved"  |  "Rejected"  |  "Rework"      │
│       ↓                                                      │
│  /draft-outreach → channels based on email availability:     │
│       Has email → Email + LI Connection + LI Follow-up       │
│       No email  → LI Connection + LI Follow-up only          │
│       ↓                                                      │
│  GATE 3: [Review/edit messages, approve per channel]         │
│       → Email Stage "Approved"    → Email auto-sent          │
│       → LI Connection "Approved"  → /send-linkedin → Sent   │
│       → LI Follow-up "Approved"   → /send-linkedin → Sent   │
│       → Any stage "Rework"        → /review → "Reworked"    │
│       ↓                                                      │
│  /send-linkedin                  → sends via LinkedIn MCP    │
│       ↓                            + updates sheet to Sent   │
│  [Auto-tracking every 30 min]    → Reply detected: Replied   │
│                                    Bounce: auto-pivot to LI  │
│                                    No reply 7 days: No Resp  │
│       ↓                                                      │
│  [Daily follow-up digest email]  Overdue items to action     │
│       ↓                                                      │
│  /dashboard                      Review outreach progress    │
│                                  (filter by Lead Source)     │
└────────────────────┬─────────────────────────────────────────┘
                     │ Lead responds with interest
                     ↓
┌──────────────────────────────────────────────────────────────┐
│  /promote-lead [company]         Sheets → Asana              │
│                                  stage: Connected            │
└────────────────────┬─────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────────────┐
│  ASANA — Lead Pipeline 2026 (Connected+)                     │
│                                                              │
│  Connected → Qualified → [deal stages]                       │
│                                                              │
│  /pipeline-review                Review active pipeline       │
└──────────────────────────────────────────────────────────────┘
```

**Data flow**: Commands → `sheets-sync.sh` → Apps Script webhook → Google Sheet (4 tabs: Companies, Outreach, Dashboard, Log)
**Lead sources**: "Cold Outbound" (from `/find-leads`, `/daily-research`) and "Intent Signal" (from `/process-intent-leads`)
**Three approval gates**: Company approval (Stage), Contact approval (Contact Stage), Outreach approval (per-channel Email/LI stages)
**Outreach approval (per-channel)**: Email Stage "Approved" → email auto-sent; LI Connection/Follow-up Stage "Approved" → run `/send-linkedin` to send via LinkedIn MCP
**Review & feedback**: Set any stage to "Rework" + write Feedback → run `/review` → stage becomes "Reworked" + Feedback column shows what changed. Then approve or rework again
**Email-aware drafting**: `/draft-outreach` checks email availability — contacts without email get LinkedIn-only outreach (no empty email columns cluttering the sheet)
**Auto-tracking**: Every 30 min — detects replies (Sent → Replied + snippet), detects bounces (→ Bounced + auto-suggests LinkedIn pivot + flags alt contacts), auto-sets No Response after 7 days, daily follow-up digest email
**Promotion**: `/promote-lead` reads from Companies + Outreach tabs → creates task in Asana Connected section

---

## Self-Improvement Loop

The workspace has a built-in feedback loop that captures learnings from every command execution and uses them to continuously improve output quality.

```
LOOP 1: Capture (automatic, per-command)
  Every command logs execution data → data/feedback-log.json

LOOP 2: Reflect (on-demand — /reflect)
  Analyses execution data + outreach outcomes → updates memory topic files

LOOP 3: Evolve (weekly — /evolve)
  Reads learnings → proposes changes to reference files → user approves → applies
```

**How it works**: Commands log structured execution records (what ran, outputs, quality signals, rework feedback). `/reflect` synthesises this data into patterns stored in `memory/outreach-learnings.md`, `memory/patterns.md`, and `memory/error-log.md`. `/evolve` reads those learnings and proposes specific changes to `reference/outreach-guidelines.md`, `reference/daily-research-config.md`, etc. Since commands read reference files at runtime, approved changes automatically improve the next execution.

**Memory topic files** (in auto-memory directory):
- `outreach-learnings.md` — proven outreach patterns, read by `/draft-outreach`
- `patterns.md` — operational patterns and command insights
- `error-log.md` — recurring errors and resolutions

**`/prime` checks** the learning system health and suggests `/reflect` or `/evolve` when due.

---

## ICP Quick Reference

**Target**: Global brands in the UAE + strong local brands with real marketing budgets

**Priority sectors (2026)**:
1. Retail + consumer experience (premium retail, F&B, shopping destinations)
2. Sports / wellness / movements (community-building, performance-meets-lifestyle)
3. Automotive incl. EV entrants (secondary)

**No-go**: Low-budget startups, small local brands (unless global budgets), alcohol, tobacco

**Qualification (all 4 required)**: Budget + Urgency + Access + Fit

Full detail: `reference/icp-and-qualification.md`

---

## Key Commercial Context

| Service | Typical Range (AED) |
|---|---|
| SMM retainer | ~25K/month |
| PR retainer | ~15-20K/month |
| Campaigns | 250K+ |
| Branding | 40-80K |
| Activations | Varies |

**Team**: ~33 employees | **Scale**: ~AED 10M/year baseline | **Locations**: Dubai + Riyadh

---

## Integrations

| Tool | Status | What Claude Can Do |
|---|---|---|
| **Asana** | Connected | Lead Pipeline 2026 — only Connected + Qualified leads. `/promote-lead` creates tasks, `/pipeline-review` queries pipeline |
| **Google Sheets** | Connected (webhook) | Outreach tracker — 2 data tabs (Companies, Outreach) with gated approval workflow. `/dashboard` reads live data. Setup: `reference/google-sheets-setup.md` |
| **Canva** | Connected | Search/create/export designs (useful for presentations, future proposals) |
| **Gmail** | Connected (Apps Script) | Email Stage "Approved" → email auto-sent. Auto-tracking (every 30 min): detects replies → "Replied" + snippet, detects bounces → "Bounced" + auto-suggests LinkedIn pivot + flags alt contacts, auto-sets "No Response" after 7 days. Daily follow-up digest email with overdue items. Morning brief newsletter with clickable source links, pipeline health, and team distribution (configure recipients via `set_newsletter_recipients` webhook action or `reference/google-sheets-setup.md` Step 7) |
| **LinkedIn** | Connected (MCP) | Hybrid: Playwright browser (profile, search, connect) + linkedin-api (messaging, conversations, invitations). Auto-authenticates on first use — opens headed Chrome, verifies session, waits for login if expired. Approve per channel in sheet → `/send-linkedin` to send. 300 char limit on connection requests |
| **Apollo** | Connected (Official Connector) | 17 tools via claude.com connector. People search (free), people/org enrichment (credits), bulk enrichment, contacts CRUD, sequences. Used by `/fetch-contacts` for verified emails + LinkedIn. No custom MCP server needed |

---

## Shell Aliases

```bash
alias cs='claude "/prime"'                              # Safe mode — asks permission
alias cr='claude --dangerously-skip-permissions "/prime"' # Run mode — autonomous
```

See `reference/shell-aliases-setup.md` for setup.

---

## Daily Automation

The daily research pipeline runs on-demand via `/daily-research`. The command researches leads and adds them to Google Sheets at Stage "Researched", then sends a morning brief email. It respects all approval gates — no contacts are enriched or outreach drafted until you review and approve.

**How it works:**
1. Run `/daily-research` in a Claude session (or via `claude -p "/daily-research"`)
2. Claude executes: sector rotation → research → sync companies to Sheets at "Researched"
3. Morning brief email sent via Apps Script webhook
4. You review the brief → approve companies in the sheet → run `/fetch-contacts` → `/draft-outreach`

**Sector rotation (Mon-Fri):**
- Mon/Thu: Retail + Consumer Experience
- Tue: Sports / Wellness / Movements
- Wed: Automotive / EV
- Fri: Signal-driven (market news)
- Sat/Sun: No run (unless explicitly invoked)

**Configuration:** `reference/daily-research-config.md`
**State files:** `data/sector-rotation.json`, `data/research-history.json`

**Legacy runners (available but not primary):**
- `scripts/daily-research.sh` — local runner script (also sends email via webhook)
- `.github/workflows/daily-research.yml` — GitHub Actions (cron disabled)

---

## Maintaining This Workspace

**Whenever Claude makes changes to the workspace, Claude MUST consider whether CLAUDE.md needs updating.**

After any change — adding commands, reference files, or modifying structure — ask:
1. Does this change add new functionality?
2. Does it modify the workspace structure?
3. Should a new command be listed?
4. Do reference files need updating?

If yes to any, update the relevant sections of this file.

---

## Phase 2 (Planned)

- **Proposal system**: `/draft-proposal` command + `reference/proposal-structure.md` — complex enough to warrant its own dedicated plan. Use `/create-plan` to design when ready.

## Future Enhancements

- Gmail direct send for batch/bulk scenarios (e.g. approve multiple emails at once)
- `/handover` command (won deal handover packs for CS/Ops/PR)
- `/weekly-digest` command (pipeline movement + key metrics summary)
- Canva proposal generation (designed proposals from draft content)

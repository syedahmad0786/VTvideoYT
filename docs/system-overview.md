# hrmny Sales & Growth System — Complete Documentation

**Version**: 3.0 | **Last Updated**: 2026-02-27 | **Author**: Ayham Homsi, Managing Partner — Creative & Growth

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [What the System Does](#2-what-the-system-does)
3. [Complete Tech Stack](#3-complete-tech-stack)
4. [System Journey — Technical Perspective](#4-system-journey--technical-perspective)
5. [System Journey — Sales Perspective](#5-system-journey--sales-perspective-for-clients)
6. [All 15 Slash Commands Explained](#6-all-15-slash-commands-explained)
7. [Integration Map](#7-integration-map)
8. [Setup To-Do List](#8-setup-to-do-list)
9. [Selling This System to Clients](#9-selling-this-system-to-clients)

---

## 1. Executive Summary

### What This Is

The hrmny Sales & Growth System is an **AI-powered sales co-pilot** built for creative agencies. It automates the entire B2B sales pipeline — from identifying target companies and enriching contacts, to drafting personalised multi-channel outreach, tracking responses, and managing deals through to close — all orchestrated by Claude AI through a terminal-based command interface and a live web dashboard.

### Who It's For

- **Primary user**: The Managing Partner or Head of Sales at a creative agency (currently Ayham Homsi at hrmny, a Dubai-based creative agency with ~33 employees and ~AED 10M/year baseline revenue)
- **Secondary users**: Sales teams at B2B service companies, creative agencies, PR firms, and consultancies who sell to brands and enterprises
- **Client buyers**: Agencies and B2B service companies who want to scale their sales operation without hiring a full sales team

### The Problem It Solves

Creative agencies are great at creative work but typically bad at sales. The sales function is usually:

- **Manual and inconsistent** — research is ad-hoc, outreach is sporadic, follow-ups get missed
- **Time-consuming** — a human spends 2-3 hours per lead doing research, finding contacts, writing personalised emails
- **Unstructured** — no consistent pipeline, no qualification framework, no data on what works
- **Expensive to staff** — a dedicated sales hire costs AED 15-30K/month before they produce results

This system replaces those gaps with an AI that:

1. **Researches** 3-5 companies per day, automatically, on a sector rotation schedule
2. **Enriches** contacts using Apollo.io — verified emails, LinkedIn profiles, decision-maker identification
3. **Drafts** personalised, multi-channel outreach (email + LinkedIn) that reads like a Managing Partner wrote it
4. **Tracks** every touchpoint — email opens, replies, bounces, LinkedIn acceptances — automatically
5. **Learns** from outcomes and continuously improves its own research targeting and outreach quality

### Key Differentiator

This is not a generic CRM or email blast tool. It is a **context-aware AI sales partner** that:

- Knows the agency's ICP (Ideal Customer Profile), services, pricing, and strategy
- Applies a structured qualification framework (BUAF scoring: Budget, Urgency, Access, Fit)
- Enforces 3 human approval gates before any outreach is sent
- Drafts outreach that is specific to each prospect (not templates)
- Tracks its own performance and proposes improvements weekly

---

## 2. What the System Does

### The 5 Core Functions

```
    RESEARCH         ENRICH          OUTREACH         TRACK           CLOSE
   ┌──────────┐   ┌──────────┐   ┌──────────────┐  ┌──────────┐  ┌──────────┐
   │ Identify │   │ Find     │   │ Draft + Send │  │ Monitor  │  │ Manage   │
   │ target   │──>│ decision │──>│ personalised │──>│ replies, │──>│ pipeline │
   │ companies│   │ makers   │   │ multi-channel│  │ bounces, │  │ through  │
   │          │   │          │   │ outreach     │  │ follow-up│  │ to won   │
   └──────────┘   └──────────┘   └──────────────┘  └──────────┘  └──────────┘
    /find-leads    /fetch-         /draft-outreach   Auto-track    /promote-lead
    /daily-        contacts        /send-linkedin    /dashboard    /pipeline-review
    research                       /review
```

#### Function 1: Research

The system identifies target companies that match hrmny's Ideal Customer Profile. It searches the web for brands entering the UAE market, opening new locations, launching campaigns, or hiring marketing roles. Each company is scored on a 100-point scale across Budget, Urgency, Access, Fit, and Sector Priority.

**Daily output**: 3-5 qualified companies added to the pipeline per research session.

**Sector rotation**: Monday/Thursday = Retail, Tuesday = Sports/Wellness, Wednesday = Automotive, Friday = Signal-driven (news/events).

#### Function 2: Enrich

Once a company is approved (Gate 1), the system uses Apollo.io to find decision-makers — their names, titles, verified email addresses, LinkedIn profiles, and seniority levels. It identifies 2-3 contacts per company, prioritising people with budget authority (CMOs, VPs of Marketing, Brand Directors).

#### Function 3: Outreach

After contacts are approved (Gate 2), the system drafts personalised outreach across up to 3 channels:

- **Cold email** (150-200 words): Specific opening observation, bridge to opportunity, credibility signal, direct CTA
- **LinkedIn connection request** (max 300 characters): Personalised, non-salesy introduction
- **LinkedIn follow-up message** (~100 words): Value-forward message with meeting CTA

If the contact has no verified email, the system automatically switches to a LinkedIn-only cadence.

#### Function 4: Track

The system automatically monitors all outreach:

- **Email**: Delivery confirmation, bounce detection, reply detection (via Resend webhooks)
- **LinkedIn**: Connection acceptance, message replies (via LinkedIn MCP)
- **Auto-actions**: Bounced emails trigger a pivot to LinkedIn-only. No response after 7 days triggers auto-flagging. Daily digest emails summarise what needs attention.

#### Function 5: Close

When a prospect responds with interest, the system promotes them to the deal pipeline (Connected stage). From there, it tracks deal progression through Qualified, Proposal, Negotiation, and Won stages — flagging stalled deals, suggesting next steps, and measuring pipeline health against revenue targets.

### The 3-Gate Approval System

Human judgment is required at every critical step. Nothing is sent without explicit approval.

```
GATE 1: Company Approval
  AI researches company  ──>  Human reviews  ──>  Approve / Reject / Rework

GATE 2: Contact Approval
  AI finds contacts      ──>  Human reviews  ──>  Approve / Reject / Rework

GATE 3: Outreach Approval (per channel)
  AI drafts messages     ──>  Human reviews  ──>  Approve per channel
                                                   Email "Approved" → auto-sent
                                                   LinkedIn "Approved" → /send-linkedin
```

This ensures the AI never sends outreach that the human hasn't reviewed. Every message represents the agency's brand.

### The Self-Improvement Loop

The system doesn't just execute — it learns and gets better over time.

```
CAPTURE (automatic)         REFLECT (on-demand)          EVOLVE (weekly)
Every command logs          /reflect analyses             /evolve proposes
execution data, quality     patterns from 14 days        changes to reference
signals, and rework         of data → updates            files → user approves
feedback                    memory topic files            → system improves
```

If a certain type of subject line gets more replies, the system detects that pattern and updates its outreach guidelines. If research in a particular sector yields low approval rates, it refines its search queries. This creates a **compounding quality advantage** — the longer the system runs, the better it gets.

---

## 3. Complete Tech Stack

### Core Infrastructure

| Tool | Purpose | Status | Free Tier |
|------|---------|--------|-----------|
| **Claude AI (Anthropic)** | AI brain — research, analysis, content generation, decision-making | Active | Claude Code CLI subscription |
| **Vercel** | Hosting — web dashboard + serverless API functions | Built | Hobby plan: free (100GB bandwidth, 100hrs compute) |
| **Supabase** | Database (Postgres) — all company, contact, pipeline, and activity data | To set up | Free: 500MB database, 50K monthly active users |
| **Resend** | Email sending + delivery/bounce tracking via webhooks | To set up | Free: 100 emails/day, 3,000/month |
| **React + Vite + Tailwind** | Web portal — dashboard, companies, outreach, pipeline, settings | Built | N/A (frontend framework) |

### External Integrations

| Tool | Purpose | Status | Cost |
|------|---------|--------|------|
| **Apollo.io** | Contact enrichment — verified emails, company data, people search | Connected (via Claude connector) | Free: 10K records/month. Pro: $49/month |
| **LinkedIn (MCP)** | Profile search, connection requests, messaging, conversation tracking | Connected (via MCP server) | Free (uses personal LinkedIn account) |
| **Gmail (Apps Script)** | Legacy email sending + 30-min auto-tracking (being replaced by Resend) | Connected | Free (Google Workspace) |
| **Google Sheets** | Legacy outreach tracker (being replaced by Supabase) | Connected (webhook) | Free |
| **Asana** | Pipeline management for Connected+ deals | Connected | Free: up to 15 users |
| **Canva** | Design tools — presentations, proposals (future) | Connected | Free/Pro |

### Developer Tools

| Tool | Purpose | Status |
|------|---------|--------|
| **Node.js** | Runtime for API serverless functions | Active |
| **npm** | Package management | Active |
| **Git + GitHub** | Version control and code hosting | Active |
| **Vercel REST API** | Deployment automation | Active |

### Key Dependencies (package.json)

| Package | Purpose |
|---------|---------|
| `@supabase/supabase-js` | Supabase client for database operations |
| `resend` | Resend SDK for sending emails and tracking events |
| `react`, `react-dom` | UI framework |
| `react-router-dom` | Client-side routing for the portal |
| `tailwindcss` | Utility-first CSS framework |
| `vite` | Build tool and dev server |

---

## 4. System Journey — Technical Perspective

### Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACES                                  │
│                                                                          │
│   ┌──────────────────┐         ┌─────────────────────────────────────┐   │
│   │  Claude Code CLI │         │  Web Portal (React)                 │   │
│   │  (Primary)       │         │  https://hrmny-sales-growth.vercel  │   │
│   │                  │         │  .app                               │   │
│   │  15 Slash        │         │  Dashboard | Companies | Outreach   │   │
│   │  Commands        │         │  Pipeline  | Settings               │   │
│   └────────┬─────────┘         └──────────────┬──────────────────────┘   │
│            │                                   │                         │
└────────────┼───────────────────────────────────┼─────────────────────────┘
             │                                   │
             │  CLI calls via sheets-sync.sh     │  HTTPS API calls
             │  or direct API calls              │  with Supabase JWT
             │                                   │
┌────────────┼───────────────────────────────────┼─────────────────────────┐
│            ▼                                   ▼                         │
│   ┌──────────────────────────────────────────────────────────────┐       │
│   │              VERCEL SERVERLESS FUNCTIONS                     │       │
│   │                                                              │       │
│   │  /api/sheets.mjs     — Companies + Contacts CRUD            │       │
│   │  /api/pipeline.mjs   — Pipeline deals + promote             │       │
│   │  /api/email/send.mjs — Send email via Resend                │       │
│   │  /api/email/webhook  — Receive Resend delivery events       │       │
│   │  /api/cron/check-responses — Daily 8am stale email check    │       │
│   │  /api/index.mjs      — Health check + integration status    │       │
│   └───────────────────────────────┬──────────────────────────────┘       │
│                                   │                                      │
│                    VERCEL (Hosting + Compute)                            │
└───────────────────────────────────┼──────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
          ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
          │  Supabase   │  │   Resend     │  │  Apollo.io   │
          │  (Postgres) │  │   (Email)    │  │  (Contacts)  │
          │             │  │              │  │              │
          │  companies  │  │  Send emails │  │  People      │
          │  contacts   │  │  Track opens │  │  search      │
          │  pipeline   │  │  Track       │  │  Org         │
          │  activity   │  │  bounces     │  │  enrichment  │
          │  email evts │  │  Webhooks    │  │  Email       │
          └─────────────┘  └──────────────┘  │  verify      │
                                             └──────────────┘
```

### Database Schema

The system uses 5 Postgres tables in Supabase:

#### companies
Stores every researched company. Fields include name, sector, ICP fit rating (Hot/Warm/Cool), estimated deal value, stage (Researched → Approved → Contacts Found → Sent → Replied → Connected), lead source, and feedback for rework cycles.

#### contacts
Stores every identified contact at a company. Flat structure — one row per contact with all outreach channels on the same row. Fields include:
- **Identity**: name, title, email, LinkedIn URL, seniority level
- **Email outreach**: subject, body, stage (Drafted → Approved → Sent → Replied/Bounced/No Response)
- **LinkedIn connection**: message, stage (Drafted → Approved → Sent → Accepted)
- **LinkedIn follow-up**: message, stage (Drafted → Approved → Sent → Replied)
- **Tracking**: send dates, response dates, response summaries, Resend email ID

#### pipeline
Deals that have been promoted from outreach to active pipeline. Tracks stage (Connected → Qualified → Proposal → Negotiation → Won/Lost), estimated value, next steps, and notes.

#### activity_log
Audit trail of all actions taken through the API. Every create, update, and stage change is logged with entity type, entity ID, action description, and JSON details.

#### email_events
Raw event data from Resend webhooks. Tracks delivery, bounce, complaint, and open events for each email sent. Linked to the contact via resend_email_id.

### API Endpoint Map

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `GET /api` | GET | Health check, integration status | None |
| `GET /api/sheets?tab=companies` | GET | List all companies | API key or JWT |
| `GET /api/sheets?tab=outreach` | GET | List all contacts with outreach data | API key or JWT |
| `GET /api/sheets?tab=summary` | GET | Aggregate metrics (counts by stage, totals) | API key or JWT |
| `POST /api/sheets` | POST | Create/update companies, contacts, stages | API key or JWT |
| `GET /api/pipeline` | GET | List active pipeline deals | API key or JWT |
| `POST /api/pipeline` | POST | Promote lead or update deal | API key or JWT |
| `POST /api/email/send` | POST | Send email for a contact via Resend | API key or JWT |
| `POST /api/email/webhook` | POST | Receive Resend webhook events | Webhook signature |
| `GET /api/cron/check-responses` | GET | Mark 7-day stale emails as "No Response" | CRON_SECRET |

### Authentication Flow

The system supports two authentication methods:

1. **API Key** (for CLI access): The `sheets-sync.sh` script reads `api_key` from `data/sheets-config.json` and sends it in the `x-api-key` header. This is used by all 15 slash commands.

2. **Supabase JWT** (for web portal): The React portal uses Supabase Auth for email/password login. After authentication, the JWT token is sent in the `Authorization: Bearer <token>` header with every API request. The backend verifies it using `supabase.auth.getUser(token)`.

When neither Supabase nor an API key is configured, the system falls back to **demo mode** — returning hardcoded sample data so the portal still works as a preview.

### Email Sending + Tracking Flow

```
Contact email_stage set to "Approved"
    │
    ▼
API auto-triggers POST /api/email/send
    │
    ▼
Resend API sends the email
    │
    ├── Success: contact.email_stage → "Sent"
    │              contact.email_date_sent → now
    │              contact.resend_email_id → stored
    │
    └── Failure: logged, stage unchanged

... time passes ...

Resend fires webhook → POST /api/email/webhook
    │
    ├── "bounced" → contact.email_stage → "Bounced"
    ├── "complained" → contact.email_stage → "Bounced"
    └── All events → logged in email_events table

Daily cron (8am UTC) → GET /api/cron/check-responses
    │
    └── Emails sent >7 days ago with no reply → email_stage → "No Response"
```

### CLI Command Execution Flow

```
User types: /find-leads retail brands in Dubai

    ▼
Claude reads: CLAUDE.md + context/*.md + reference/*.md
    ▼
Claude executes web searches, analyses results
    ▼
Claude scores companies using BUAF framework
    ▼
Claude calls: scripts/sheets-sync.sh push_data companies '{...}'
    ▼
sheets-sync.sh sends: POST /api/sheets
    with body: { action: "add_company", data: {...} }
    with header: x-api-key: <from data/sheets-config.json>
    ▼
API validates auth → inserts into Supabase → returns success
    ▼
Claude confirms: "Added 4 companies to pipeline at stage Researched"
```

### Data Flow Summary

| Data | Origin | Storage | Access |
|------|--------|---------|--------|
| Company research | Claude AI web search | Supabase `companies` table | Portal + CLI |
| Contact data | Apollo.io enrichment | Supabase `contacts` table | Portal + CLI |
| Email drafts | Claude AI generation | Supabase `contacts` table (email_subject, email_body) | Portal + CLI |
| LinkedIn messages | Claude AI generation | Supabase `contacts` table (li_connection_message, li_follow_up_message) | Portal + CLI |
| Email delivery events | Resend webhooks | Supabase `email_events` table | Portal |
| Pipeline deals | Promoted from contacts | Supabase `pipeline` table | Portal + CLI |
| Activity audit trail | All API mutations | Supabase `activity_log` table | Portal |

---

## 5. System Journey — Sales Perspective (For Clients)

### The Problem Your Clients Face

Every creative agency and B2B service company has the same problem:

> "We're great at our craft, but we don't have a sales machine. We rely on referrals, inbound, and whoever the founder knows. When those dry up, revenue stalls."

Traditional solutions cost AED 15-30K/month (a sales hire) or AED 5-15K/month (generic sales tools like Outreach.io, Apollo sequences, or HubSpot). Neither is tailored to how agencies actually sell — relationship-first, reputation-driven, service-not-product.

### A Day in the Life (With This System)

**8:00 AM — Morning Brief**

You open your laptop. The system has already run overnight research. Your morning brief email shows:

> *"3 new companies added to your pipeline this morning: On Running (opening Dubai Mall flagship), Lucid Motors (hiring Head of Marketing MENA), and Seddiqi Holding (Ramadan campaign planning). All scored Warm or Hot. Review and approve to proceed."*

You click through to the web portal dashboard. It shows your live pipeline: AED 3.4M active, 22 deals in progress, 5 needing your action today.

**8:30 AM — Review and Approve (2 minutes)**

You open the Companies page. Three new companies are at "Researched" stage. Each has a summary of why they were selected, their BUAF score, and estimated deal value. You click "Approve" on two, "Reject" on one (too small).

**8:35 AM — Contacts Enriched (automatic)**

You type `/fetch-contacts` in the terminal. Within 30 seconds, the system finds 5 decision-makers across the 2 approved companies — verified emails, LinkedIn profiles, job titles. They appear in your Outreach page at "Contact Found" stage.

**8:40 AM — Outreach Drafted (2 minutes to review)**

You type `/draft-outreach`. The system writes:

- 2 personalised cold emails (specific to each company's recent activity)
- 2 LinkedIn connection requests (300 characters, non-salesy)
- 2 LinkedIn follow-up messages (value-forward, with meeting CTA)

You read through them. One email needs a tweak — you set it to "Rework" and type the feedback. The system rewrites it. You approve all 6 messages.

**8:45 AM — Sent (automatic)**

Approved emails are sent automatically via Resend. You type `/send-linkedin` to send the approved LinkedIn messages. Done.

**Total time invested: 15 minutes. Result: 5 contacts across 2 qualified companies now receiving personalised, multi-channel outreach.**

**Throughout the Day — Auto-Tracking**

The system monitors everything:
- Email opened by On Running's VP Marketing at 10:23 AM
- LinkedIn connection accepted by Lucid Motors' Brand Director at 2:15 PM
- Automatic follow-up message triggered 24 hours after LinkedIn acceptance

**Day 3 — First Reply**

> *"Hi Ayham, thanks for reaching out. We are indeed looking for creative support for our UAE launch. Let's schedule a call next week."*

You type `/promote-lead Lucid Motors` — the system moves them to your deal pipeline at "Connected" stage with all context carried over.

### Stage-by-Stage Pipeline Narrative

```
Week 1: RESEARCH (automated)
├── AI identifies 12-18 companies per week matching your ICP
├── Each company scored, researched, and categorised
└── You spend 5 min/day reviewing and approving

Week 1-2: OUTREACH (semi-automated)
├── AI drafts 10-20 personalised messages per week
├── Multi-channel: email + LinkedIn connection + LinkedIn follow-up
├── You review and approve (10-15 min/day)
└── System sends and tracks automatically

Week 2-4: ENGAGEMENT (tracked)
├── System detects replies, bounces, and no-responses
├── Auto-pivots from bounced email to LinkedIn-only
├── Suggests follow-up actions for stalled outreach
└── Dashboard shows real-time funnel metrics

Week 3-6: PIPELINE (managed)
├── Replied leads promoted to active deal pipeline
├── Pipeline review shows deal health, stalled deals, priorities
├── System suggests next steps for each deal
└── Target: 4-8 meetings booked per month

Month 2+: CLOSE (supported)
├── Pipeline coverage maintained at 3x monthly target
├── Deal velocity tracked (max days per stage)
├── Win/loss analysis feeds back into research quality
└── System learns and improves continuously
```

### How the 3-Gate Approval System Works (User's Perspective)

**Gate 1 — Company Approval**
You see a company in your portal with a research summary, BUAF score, and estimated value. You decide:
- **Approve**: AI proceeds to find contacts
- **Reject**: Company removed from active pipeline
- **Rework**: You type feedback ("focus on their Dubai team, not HQ") → AI revises the research

**Gate 2 — Contact Approval**
You see 2-3 contacts per company with their titles, email availability, and seniority. You decide:
- **Approve**: AI proceeds to draft outreach
- **Reject**: Contact removed
- **Rework**: "Find someone more senior" → AI searches again

**Gate 3 — Outreach Approval (per channel)**
You see the drafted email, LinkedIn connection request, and LinkedIn follow-up. Each channel is approved independently:
- **Approve email**: Auto-sent via Resend within minutes
- **Approve LinkedIn messages**: Sent when you run `/send-linkedin`
- **Rework**: "Make the opening more specific to their Ramadan campaign" → AI rewrites

### ROI Metrics

| Metric | Without System | With System | Improvement |
|--------|---------------|-------------|-------------|
| **Time to research 1 company** | 30-60 min (manual) | 2-3 min (AI + review) | 10-20x faster |
| **Time to draft outreach for 1 contact** | 15-30 min (manual) | 1-2 min (review only) | 10-15x faster |
| **Companies researched per week** | 3-5 (manual effort) | 12-18 (automated) | 3-4x volume |
| **Outreach contacts per week** | 5-10 (manual) | 10-20 (automated) | 2-4x volume |
| **Cost per lead researched** | AED 200-400 (sales hire time) | AED 20-40 (AI compute + Apollo) | 10x cheaper |
| **Follow-up discipline** | Inconsistent (human memory) | 100% (automated tracking) | Eliminates missed follow-ups |
| **Time to pipeline visibility** | Days/weeks (manual CRM entry) | Real-time (auto-tracked) | Instant |
| **Monthly capacity (1 person)** | 20-40 leads | 50-70 leads | 2-3x scale |

**Bottom line**: One person using this system can do the prospecting work of 3-4 sales development reps, at a fraction of the cost, with higher personalization quality.

---

## 6. All 15 Slash Commands Explained

### Sales Workflow Commands (8)

#### `/prime` — Session Initialiser

**When to use**: Start of every work session.

**What it does**:
1. Loads all context files (business info, strategy, ICP, current data)
2. Pulls live data from the API (companies, outreach, pipeline)
3. Shows pipeline health vs. targets
4. Lists available commands and suggests priority actions
5. Checks if `/reflect` or `/evolve` are due

**What happens behind the scenes**: Reads 10+ context and reference files into the Claude session. Calls `/api/sheets?tab=summary` and `/api/pipeline` for live metrics. Compares pipeline coverage, meeting velocity, and outreach volume against targets defined in `context/strategy.md`.

---

#### `/find-leads [target]` — Research Companies

**When to use**: When you want to find new target companies in a specific sector, market, or niche.

**What it does**:
1. Searches the web for companies matching the target description
2. Filters against ICP criteria and no-go list (10 fast-reject rules)
3. Scores each company using the 100-point BUAF+Sector rubric
4. Deduplicates against existing pipeline
5. Adds qualified companies to Supabase at stage "Researched"

**What happens behind the scenes**: Runs 3-5 web searches. Reads `reference/icp-and-qualification.md` for scoring criteria. Reads `reference/daily-research-config.md` for search query patterns. Calls `POST /api/sheets` with action `add_company` for each qualified company. Logs execution data to `data/feedback-log.json`.

**Output**: 3-5 companies added to the Companies page, each with a research summary, BUAF score breakdown, estimated deal value, and suggested services.

**Examples**:
- `/find-leads retail brands launching in Dubai Q1 2026`
- `/find-leads EV brands entering GCC market`

---

#### `/fetch-contacts [company]` — Enrich Contacts

**When to use**: After companies are approved at Gate 1. Run without arguments for batch mode (all approved companies at once).

**What it does**:
1. Identifies approved companies with no contacts yet
2. Uses Apollo.io to search for decision-makers by title and seniority
3. Returns verified emails, LinkedIn profiles, and job titles
4. Adds contacts to Supabase at stage "Contact Found"
5. Updates company stage to "Contacts Found"

**What happens behind the scenes**: Uses Apollo.io's 17 tools (via Claude connector) — people search, org enrichment, email verification. Reads `reference/icp-and-qualification.md` for stakeholder profile targets by company size. Calls `POST /api/sheets` with action `add_contact`. Uses Apollo credits based on company score (Hot: 3 contacts, Warm: 2 contacts, Cool: 0).

---

#### `/draft-outreach [company/contact]` — Draft Messages

**When to use**: After contacts are approved at Gate 2. Run without arguments for batch mode.

**What it does**:
1. Checks email availability for each approved contact
2. Drafts up to 3 channels per contact:
   - Cold email (if email available): 150-200 words with power opening
   - LinkedIn connection request: max 300 characters
   - LinkedIn follow-up message: ~100 words with CTA
3. Writes all drafts to Supabase on the contact's row
4. Sets each channel stage to "Drafted"

**What happens behind the scenes**: Reads `reference/outreach-guidelines.md` for tone, structure, subject line patterns, and sector-specific hooks. Reads company research notes for personalisation. Each draft passes a "specificity test" — if you could swap in another company name and it still reads naturally, it's rewritten. Calls `POST /api/sheets` with action `update_outreach`.

---

#### `/review [filter]` — Process Rework Feedback

**When to use**: When you've marked items as "Rework" in the portal and typed feedback.

**What it does**:
1. Pulls all items with stage "Rework" across companies and contacts
2. Reads the feedback column for each
3. Regenerates the content based on your guidance
4. Updates stage to "Reworked" and notes what changed

**Examples**:
- `/review` — all rework items
- `/review companies` — company-level only
- `/review email` — email draft rework only

---

#### `/promote-lead [company]` — Move to Deal Pipeline

**When to use**: When a prospect responds with interest and you want to start managing them as an active deal.

**What it does**:
1. Reads company + contact data from Supabase
2. Creates a new deal in the pipeline table at stage "Connected"
3. Carries over estimated value, contact info, and conversation context
4. Updates the company stage to "Connected"

**What happens behind the scenes**: Calls `POST /api/pipeline` with action `promote`. Also creates the deal in Asana's Lead Pipeline 2026 (Connected section) using the Asana integration.

---

#### `/pipeline-review [filter]` — Analyse Active Deals

**When to use**: Weekly (Sunday recommended) to review all active deals.

**What it does**:
1. Pulls all pipeline deals from Supabase (Connected + Qualified stages)
2. Calculates days-in-stage for each deal
3. Flags stalled deals (exceeding maximum allowed days)
4. Analyses pipeline health vs. targets (coverage ratio, win rate, meeting velocity)
5. Provides prioritised recommendations

---

#### `/dashboard [filter]` — Outreach Performance

**When to use**: Anytime you want to see the current state of your sales funnel.

**What it does**:
1. Pulls live data from Supabase (companies, contacts, pipeline)
2. Shows companies by stage, email + LinkedIn performance metrics
3. Shows approval queue (what needs your action)
4. Shows rework items pending
5. Calculates funnel conversion rates

---

### Automation Commands (3)

#### `/daily-research [mode]` — Automated Daily Pipeline

**When to use**: Run daily (or automated via cron) to keep the pipeline fed.

**What it does**:
1. Determines today's sector based on rotation schedule
2. Runs research using search query templates from `reference/daily-research-config.md`
3. Filters, scores, deduplicates, and adds companies to Supabase
4. Sends a morning brief email with results

**Modes**: Standard run, `dry-run` (no API calls), `sector:automotive` (override rotation).

---

#### `/send-linkedin [filter]` — Send Approved LinkedIn Messages

**When to use**: After approving LinkedIn connection requests or follow-up messages at Gate 3.

**What it does**:
1. Pulls all contacts with LinkedIn stages set to "Approved"
2. Sends each message via the LinkedIn MCP server
3. Updates stage to "Sent" in Supabase
4. Requires confirmation before sending

---

#### `/process-intent-leads [csv-path]` — Process Apollo Intent Data

**When to use**: Monthly, when you export buyer intent data from Apollo.io.

**What it does**:
1. Parses the Apollo intent CSV (companies in UAE showing intent for marketing services)
2. Filters against ICP and no-go list
3. Scores by intent relevance, budget signals, and sector fit
4. Researches each company and adds to Supabase at "Researched"
5. Tags lead source as "Intent Signal"

---

### Self-Improvement Commands (2)

#### `/reflect [filter]` — Analyse Performance

**When to use**: After a batch of work (end of day) or weekly (Friday).

**What it does**:
1. Reads execution data from `data/feedback-log.json`
2. Analyses outreach outcomes (reply rates, acceptance rates, rework frequency)
3. Identifies patterns — what's working, what's not
4. Updates memory topic files (`memory/outreach-learnings.md`, `memory/patterns.md`)
5. Snapshots metrics for trend tracking

---

#### `/evolve [focus]` — Improve System Configuration

**When to use**: Weekly or when `/prime` suggests it.

**What it does**:
1. Reads memory topic files with accumulated learnings
2. Compares current performance against benchmarks
3. Proposes specific changes to reference files (outreach guidelines, search queries, scoring criteria)
4. Presents proposals for your approval
5. Applies approved changes — which automatically improve future command execution

---

### General Commands (2)

#### `/create-plan [request]` — Plan Larger Initiatives

Creates a detailed implementation plan and saves it to `plans/`. Used for complex projects that span multiple sessions.

#### `/implement [plan-path]` — Execute a Plan

Executes a previously created plan step by step.

---

## 7. Integration Map

### Apollo.io — Contact Intelligence

| What | Details |
|------|---------|
| **Connection** | Official Claude connector (17 tools available) |
| **Used by** | `/fetch-contacts`, `/process-intent-leads`, `/find-leads` |
| **Capabilities** | People search (by title, company, location), org enrichment, email verification, bulk enrichment, contact CRUD, sequences |
| **Credentials needed** | Apollo API key (configured in Claude connector settings) |
| **Credit usage** | People enrichment uses credits. Budget: 100-160 credits/month. Hot companies get 3 contacts, Warm get 2, Cool get 0 |
| **Free tier** | 10,000 records/month, basic email credits |

### LinkedIn — Social Selling

| What | Details |
|------|---------|
| **Connection** | MCP server (Playwright browser + LinkedIn API hybrid) |
| **Used by** | `/send-linkedin`, `/find-leads` (profile search) |
| **Capabilities** | Profile viewing, people search, connection requests (300 char limit), messaging, conversation monitoring, invitation tracking |
| **Credentials needed** | Personal LinkedIn account (auto-authenticates via Chrome on first use) |
| **Limits** | ~100 connection requests/week (LinkedIn's limit), 300 character max on connection notes |

### Supabase — Database

| What | Details |
|------|---------|
| **Connection** | REST API via `@supabase/supabase-js` client |
| **Used by** | All API endpoints, web portal |
| **Tables** | companies, contacts, pipeline, activity_log, email_events |
| **Auth** | Supabase Auth (email/password) for portal users; service role key for API functions |
| **Credentials needed** | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| **Free tier** | 500MB database, 2GB file storage, 50K monthly active users, unlimited API requests |

### Resend — Email Delivery

| What | Details |
|------|---------|
| **Connection** | REST API via `resend` npm SDK |
| **Used by** | `/api/email/send.mjs`, `/api/email/webhook.mjs` |
| **Capabilities** | Send transactional email, delivery tracking, bounce detection, open tracking, webhook events |
| **Credentials needed** | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| **Webhook URL** | `https://hrmny-sales-growth.vercel.app/api/email/webhook` (configure in Resend dashboard) |
| **Free tier** | 100 emails/day, 3,000 emails/month |

### Asana — Deal Pipeline

| What | Details |
|------|---------|
| **Connection** | API via Claude integration |
| **Used by** | `/promote-lead`, `/pipeline-review` |
| **Capabilities** | Create tasks, update custom fields, query by section, move between sections |
| **Structure** | Project: "Lead Pipeline 2026" → Sections: Connected, Qualified, Proposal, Negotiation, Won, Lost |
| **Credentials needed** | Asana Personal Access Token (configured in Claude) |

### Gmail / Google Apps Script — Legacy Email (Being Replaced)

| What | Details |
|------|---------|
| **Connection** | Apps Script webhook |
| **Used by** | Legacy: morning brief emails, 30-min auto-tracking |
| **Being replaced by** | Resend for email sending, Supabase for data storage |
| **Status** | Still connected but transitioning. Can be kept as backup for internal notifications. |

### Vercel — Hosting + Compute

| What | Details |
|------|---------|
| **Connection** | Git deployment + REST API |
| **Hosts** | React portal (static), 6 API serverless functions |
| **Cron** | `/api/cron/check-responses` runs daily at 8am UTC |
| **URL** | `https://hrmny-sales-growth.vercel.app` |
| **Credentials needed** | Vercel account, environment variables configured in project settings |

---

## 8. Setup To-Do List

### Already Complete

- [x] Claude Code CLI workspace with 15 slash commands
- [x] Context files (business info, strategy, ICP, current data)
- [x] Reference files (outreach guidelines, daily research config, qualification criteria)
- [x] Sector rotation schedule and search query templates
- [x] BUAF scoring framework (1-10 per dimension, max 40)
- [x] 100-point auto-qualification rubric
- [x] Multi-touch outreach cadence (6 touches, 18 days)
- [x] Self-improvement loop (/reflect + /evolve)
- [x] React web portal with 5 pages (Dashboard, Companies, Outreach, Pipeline, Settings)
- [x] Vercel deployment with working API endpoints
- [x] API functions with dual auth (API key + Supabase JWT)
- [x] Demo mode fallback (portal works without any backend configured)
- [x] Database schema designed (supabase/schema.sql)
- [x] Email sending via Resend (api/email/send.mjs)
- [x] Email webhook tracking (api/email/webhook.mjs)
- [x] Daily cron for stale email detection (api/cron/check-responses.mjs)
- [x] Pipeline CRUD API (api/pipeline.mjs)
- [x] Companies + Contacts CRUD API (api/sheets.mjs)
- [x] Apollo.io integration (via Claude connector)
- [x] LinkedIn MCP integration
- [x] Asana pipeline integration
- [x] Shell script bridge (sheets-sync.sh → API)

### Needs Setup (Priority Order)

#### 1. Create Supabase Project (30 minutes)

- [ ] Go to [supabase.com](https://supabase.com) and create a free project
- [ ] Open the SQL Editor in the Supabase dashboard
- [ ] Copy the contents of `supabase/schema.sql` and run it
- [ ] Verify all 5 tables were created (companies, contacts, pipeline, activity_log, email_events)
- [ ] Go to Project Settings → API to get your credentials:
  - `SUPABASE_URL` (Project URL)
  - `SUPABASE_SERVICE_KEY` (service_role key — keep secret)
  - `SUPABASE_ANON_KEY` (anon/public key)

#### 2. Create Resend Account (15 minutes)

- [ ] Go to [resend.com](https://resend.com) and create a free account
- [ ] Add and verify your sending domain (e.g., hrmny.co)
- [ ] Go to API Keys and create a new key
- [ ] Note down:
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL` (e.g., sales@hrmny.co)
- [ ] Set up webhook: Settings → Webhooks → Add endpoint:
  - URL: `https://hrmny-sales-growth.vercel.app/api/email/webhook`
  - Events: `email.bounced`, `email.complained`, `email.delivered`

#### 3. Configure Vercel Environment Variables (10 minutes)

- [ ] Go to [vercel.com](https://vercel.com) → Project Settings → Environment Variables
- [ ] Add the following variables (all environments: Production, Preview, Development):

| Variable | Value | Required |
|----------|-------|----------|
| `SUPABASE_URL` | Your Supabase project URL | Yes |
| `SUPABASE_SERVICE_KEY` | Your Supabase service role key | Yes |
| `SUPABASE_ANON_KEY` | Your Supabase anon key | Yes |
| `VITE_SUPABASE_URL` | Same as SUPABASE_URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Same as SUPABASE_ANON_KEY | Yes |
| `HRMNY_API_KEY` | Any strong random string (for CLI auth) | Recommended |
| `RESEND_API_KEY` | Your Resend API key | Yes |
| `RESEND_FROM_EMAIL` | Your verified sender email | Yes |
| `CRON_SECRET` | Any strong random string (for cron jobs) | Recommended |

- [ ] Redeploy the project after adding variables (Vercel → Deployments → Redeploy)

#### 4. Configure CLI Access (5 minutes)

- [ ] Update `data/sheets-config.json`:
```json
{
  "api_url": "https://hrmny-sales-growth.vercel.app/api/sheets",
  "api_key": "<same value as HRMNY_API_KEY>"
}
```

#### 5. Create Portal User Account (2 minutes)

- [ ] Open `https://hrmny-sales-growth.vercel.app`
- [ ] Click "Create Account" on the login page
- [ ] Enter your email and password
- [ ] Verify your email (Supabase sends a confirmation link)

#### 6. Test End-to-End (15 minutes)

- [ ] Run `/prime` in Claude Code CLI — verify it pulls live data from API
- [ ] Run `/find-leads test` — verify companies appear in Supabase
- [ ] Open the web portal — verify companies show (not demo data)
- [ ] Approve a company in the portal → verify stage updates
- [ ] Send a test email → verify Resend delivery + webhook

### Future Enhancements

- [ ] Proposal system: `/draft-proposal` command with template engine
- [ ] `/handover` command for won deal packs (routed to CS/Ops/PR)
- [ ] `/weekly-digest` command with pipeline movement summary
- [ ] Canva integration for proposal design generation
- [ ] Gmail direct send for bulk email scenarios
- [ ] Custom domain for email (sales@hrmny.co vs. generic)
- [ ] Webhook from Asana → Supabase sync for deal stage changes
- [ ] Mobile-responsive portal improvements
- [ ] Multi-user support with role-based permissions

---

## 9. Selling This System to Clients

### Value Proposition

**One sentence**: An AI-powered sales co-pilot that automates lead research, contact enrichment, and personalised outreach so your sales team can focus on closing deals instead of finding them.

**Three-sentence pitch**: Most agencies and B2B service companies have the same problem — great at their craft, inconsistent at sales. This system uses AI to research 50-70 target companies per month, enrich contacts with verified emails, and draft personalised multi-channel outreach that reads like a senior partner wrote it. It's 10x faster than manual prospecting and 10x cheaper than hiring, with built-in quality gates so nothing goes out without your approval.

### Target Buyer Persona

| Attribute | Profile |
|-----------|---------|
| **Title** | Founder, CEO, Managing Partner, Head of Growth, Business Development Director |
| **Company type** | Creative agencies, PR firms, digital agencies, management consultancies, B2B SaaS companies, professional services firms |
| **Company size** | 10-200 employees |
| **Pain** | Inconsistent lead generation, founder-dependent sales, no sales process, wasting time on unqualified leads |
| **Budget** | AED 5K-15K/month (less than a sales hire, more than a basic tool) |
| **Trigger** | Revenue plateau, lost a key client, competitor winning deals, growth mandate from board |

### Competitive Advantage

| vs. | This System | Competitor |
|-----|-------------|-----------|
| **Sales hire** | 10x cheaper, works 24/7, scales instantly | Expensive (AED 15-30K/month), ramp time, turnover risk |
| **Generic CRM (HubSpot, Salesforce)** | AI does the work, not just track it | CRM is a database — still need humans to research, write, and send |
| **Email sequence tools (Outreach.io, Lemlist)** | Personalised per-prospect, multi-channel, learns over time | Template-based, spray-and-pray, no research phase |
| **Apollo.io sequences** | Uses Apollo for data but adds AI research + personalisation | Apollo sequences are templates, not AI-written |
| **Hiring an outsourced SDR team** | Higher quality, full control, learns your brand | Generic messaging, brand disconnect, no transparency |

### Pricing Model Suggestions

| Tier | Monthly Price (AED) | What's Included | Target |
|------|--------------------:|-----------------|--------|
| **Starter** | 5,000 | System setup + 50 leads/month research + 30 outreach drafts + dashboard | Solo founders, small agencies |
| **Growth** | 10,000 | Everything in Starter + 100 leads/month + unlimited outreach + pipeline management + weekly reporting | Growing agencies (20-50 people) |
| **Enterprise** | 15,000-25,000 | Everything in Growth + custom ICP configuration + multi-user + dedicated support + integration with their existing CRM | Larger firms (50-200 people) |

**Setup fee**: AED 5,000-10,000 one-time (Supabase setup, ICP configuration, outreach guidelines customisation, team training).

**Gross margin**: 70-80% (primary costs are Claude API compute + Apollo credits + Resend + hosting).

### Demo Script Outline

**Duration**: 15-20 minutes

**Part 1 — The Problem (3 min)**
- "How many hours a week does your team spend on prospecting?"
- "How many qualified meetings are you booking per week?"
- "What happens when your founder stops doing outreach?"

**Part 2 — Live Demo (8 min)**
1. Show the web dashboard with live pipeline data
2. Run `/find-leads [their sector]` and show companies being researched in real-time
3. Show a sample outreach draft — highlight the personalisation depth
4. Show the 3-gate approval flow — "nothing goes out without your approval"
5. Show the auto-tracking — "replies, bounces, and follow-ups happen automatically"
6. Show `/reflect` output — "the system learns what works and gets better over time"

**Part 3 — ROI Conversation (4 min)**
- "This does the work of 2-3 SDRs at 1/10th the cost"
- "Your team goes from prospecting to closing — higher value use of their time"
- "The system improves every week. Month 3 outperforms Month 1"

**Part 4 — Close (2 min)**
- "We can have this configured for your agency in one week"
- "Start with a 30-day pilot — you'll see the pipeline impact within 2 weeks"
- "What's the best email to send the proposal to?"

### Key Selling Points to Emphasise

1. **Human-in-the-loop**: "AI does the research and drafting, but you approve everything. Your brand stays in your hands."

2. **Not another tool to learn**: "The dashboard is simple. Most of the work happens through natural language commands in a terminal. No complex software to configure."

3. **Gets smarter over time**: "The system analyses what gets replies and what doesn't, then automatically improves. Month 3 is significantly better than Month 1."

4. **Multi-channel by default**: "Email, LinkedIn connections, LinkedIn messaging — all coordinated, all tracked, all from one system."

5. **Built for agencies, not SaaS**: "This isn't a generic sales tool. It understands how agencies sell — relationship-first, reputation-driven, service-not-product."

6. **Transparent**: "You see every lead, every score, every message, every metric. Full dashboard visibility into your pipeline health."

---

## Appendix: Quick Reference

### ICP Summary

- **Target**: Global brands in the UAE + strong local brands with real marketing budgets
- **Primary sectors**: Retail + Consumer Experience, Sports / Wellness / Movements
- **Secondary**: Automotive (incl. EV entrants)
- **No-go**: Alcohol, tobacco, low-budget startups, small local brands, crypto/Web3, political, spec-work
- **Minimum company size**: 50+ employees globally or 15+ in MENA
- **Minimum contact seniority**: Director or above (VP+ for enterprise)

### BUAF Scoring

| Score | Label | Action |
|-------|-------|--------|
| 33-40 | Hot | Prioritise immediately |
| 25-32 | Warm | Pursue actively |
| 17-24 | Cool | Park and monitor |
| 1-16 | Cold | Do not pursue |

### Service Pricing (AED)

| Service | Monthly Retainer | Project |
|---------|----------------:|--------:|
| SMM | ~25K/month | 50-120K |
| PR | ~15-20K/month | 80-200K |
| Campaigns | — | 250-800K |
| Branding | — | 40-150K |
| Activations | — | 150-500K+ |
| Bundled (SMM + PR) | ~40K+/month | — |

### H1 2026 Targets

| Metric | Target |
|--------|--------|
| Booked topline | AED 5,000,000 by 30/06/26 |
| PR booked topline | AED 750,000 by 30/06/26 |
| Qualified meetings | 2-3 per week |
| Win rate | 40%+ |
| Pipeline coverage | 3x monthly target |
| Reply rate | 15%+ |

### Key URLs

| Resource | URL |
|----------|-----|
| Web Portal | https://hrmny-sales-growth.vercel.app |
| API Health Check | https://hrmny-sales-growth.vercel.app/api |
| Supabase Console | https://supabase.com/dashboard |
| Resend Dashboard | https://resend.com/overview |
| Vercel Dashboard | https://vercel.com |
| Apollo.io | https://app.apollo.io |

---

*This document is the single source of truth for the hrmny Sales & Growth System. Update it whenever the system evolves.*

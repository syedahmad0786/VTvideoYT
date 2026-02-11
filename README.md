# Malik Zaid — Executive A-Player Agent for A'Y

An always-on executive AI agent built for Ayham "A'Y" (Managing Partner, Co-Founder of HRMNY). Malik thinks, proposes, builds, and queues approvals — nothing goes live without A'Y's sign-off.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                 Malik Portal (React)             │
│  Dashboard │ Approvals │ Work Log │ Deliverables │
│  Decisions │ Tasks │ Risk Flags │ Chat           │
└────────────────────┬────────────────────────────┘
                     │ REST API
┌────────────────────┴────────────────────────────┐
│              Express API Server (:3100)           │
├──────────────────────────────────────────────────┤
│  Agent Engine (Claude AI)                        │
│  ├── Persona + Identity                          │
│  ├── Authority Model + Approval Gates            │
│  ├── Escalation System                           │
│  └── Controlled Memory                           │
├──────────────────────────────────────────────────┤
│  Workflows                                       │
│  ├── Inbox Triage          ├── Meeting Prep      │
│  ├── Calendar Optimizer    ├── Talent Scouting   │
│  ├── Commercial Proposals  ├── Systems Building  │
│  ├── Deep Research         └── GPT/Automations   │
├──────────────────────────────────────────────────┤
│  Integrations                                    │
│  ├── Google (Gmail, Calendar, Drive, Docs,       │
│  │   Sheets, Chat, Tasks)                        │
│  ├── Asana                                       │
│  ├── Canva                                       │
│  └── n8n (workflow orchestration)                │
├──────────────────────────────────────────────────┤
│  Database (SQLite)                               │
│  ├── Approval Queue   ├── Decisions Log          │
│  ├── Work Log          ├── Task Register         │
│  ├── Deliverables      ├── Risk Flags            │
│  └── Memory            └── Conversation History  │
└──────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| AI Engine | Anthropic Claude API |
| Backend | Node.js + Express |
| Frontend | React 18 + Vite + Tailwind CSS |
| Database | SQLite (better-sqlite3) |
| Google APIs | googleapis (OAuth 2.0) |
| Scheduling | node-cron |
| Workflows | n8n (self-hosted) |

## Quick Start

### 1. Install dependencies

```bash
npm install
cd portal && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in your API keys (ANTHROPIC_API_KEY is required)
```

### 3. Run first-time setup

```bash
npm run setup
```

### 4. Start the server

```bash
npm start          # API server on :3100
npm run portal:dev # Portal on :5173 (separate terminal)
```

### 5. Open the portal

Visit `http://localhost:5173` — click "Talk to Malik" to start.

## Authority Model

### Requires A'Y Approval
- External email sends (clients, vendors, partners)
- Financial decisions or spend commitments
- Internal process/governance changes
- HR, legal, or reputational matters
- External file sharing

### Autonomous (Internal Only)
- Creating drafts (emails, docs, decks, proposals)
- Building internal systems, templates, trackers
- Proposing calendar blocks
- Creating Asana tasks on approved boards
- Conducting research with sourced findings
- Logging work, decisions, and risk flags

## Portal Views

| View | Description |
|------|-------------|
| **Dashboard** | Stats, recent activity, pending approvals, risk alerts |
| **Work Log** | Timeline of everything Malik did, with links |
| **Approval Queue** | Pending items for A'Y to approve or reject |
| **Deliverables** | Drafts ready for review (Docs/Slides/Canva links) |
| **Decisions Log** | Decision, rationale, options considered, status |
| **Task Register** | In-flight tasks with milestones and priorities |
| **Risk Flags** | Legal/financial/HR/reputational risk tracking |

## API Endpoints

### Core
- `GET /api/health` — Health check
- `POST /api/chat` — Send a message to Malik
- `GET /api/status` — Agent status summary

### Portal Data
- `GET /api/approvals` — List pending approvals
- `POST /api/approvals/:id/resolve` — Approve or reject
- `GET /api/worklog` — Work log entries
- `GET /api/deliverables` — All deliverables
- `GET /api/decisions` — Decisions log
- `GET /api/tasks` — Task register
- `GET /api/risks` — Risk flags

### Workflows
- `POST /api/workflows/inbox-triage` — Run inbox triage
- `POST /api/workflows/calendar-optimize` — Optimize week
- `POST /api/workflows/proposal` — Generate commercial proposal
- `POST /api/workflows/meeting-prep` — Prepare for meetings
- `POST /api/workflows/research` — Deep research
- `POST /api/workflows/talent-scout` — Talent scouting
- `POST /api/workflows/build-system` — Build internal system
- `POST /api/workflows/automation-spec` — Build automation spec

### Auth
- `GET /api/auth/google` — Get Google OAuth URL
- `GET /api/auth/status` — Check authentication status

## Scheduled Workflows

| Schedule | Workflow | Timezone |
|----------|----------|----------|
| Every 30 min (8AM-6PM, Sun-Thu) | Inbox Triage | Asia/Dubai |
| Daily 7:30 AM (Sun-Thu) | Meeting Prep | Asia/Dubai |
| Saturday 8 PM | Calendar Optimization | Asia/Dubai |

## Security

- No passwords, IDs, or personal documents are stored
- Contract contents are never stored (only links)
- Sensitive memory is OFF by default
- All Google auth uses OAuth 2.0 with offline access
- AES-256-GCM encryption for any local sensitive data
- Strict extension allowlist — no unreviewed plugins

## Onboarding (Day 1-7)

Run `npm run setup` to create the onboarding task register:

**Day 1-2:** Drive folder structure, approval queue, tool connections
**Day 3-5:** Shadow inbox/calendar (drafts only), build templates
**Day 6-7:** Propose 3 missing systems, calibrate tone/behavior

## n8n Integration

The original n8n workflow caller is preserved:

```bash
npm run n8n:start    # CLI interface
npm run n8n:webhook  # Call a webhook
npm run n8n:list     # List workflows
npm run n8n:execute  # Execute a workflow
```

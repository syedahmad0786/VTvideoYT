# Plan: Rework Template into hrmny Sales & Growth Workspace

**Created:** 2026-02-20
**Status:** Implemented
**Request:** Transform the generic Claude Workspace Template into a dedicated Sales & Growth workspace for hrmny, supporting the full sales loop from lead discovery through to outreach, Asana pipeline management, and commercial close.

---

## Overview

### What This Plan Accomplishes

Rewrites the entire workspace — CLAUDE.md, commands, directory structure, and reference materials — so it functions as a purpose-built sales engine for hrmny. The end result is a workspace where Ayham can spin up a session, run `/prime`, and immediately start finding leads, logging them to Asana, drafting outreach, and managing pipeline — all with full context about hrmny's ICP, services, pricing, and strategy.

### Why This Matters

hrmny's #1 constraint is **not enough qualified leads**. The current workspace is a generic template that doesn't know what hrmny sells, who to target, or how to operate the sales process. Every session starts from scratch. This rework turns the workspace into a persistent, context-rich sales co-pilot that accelerates every stage of the funnel — from market scanning to signed proposals — and directly supports the 2026 strategic priorities (qualified lead engine, pipeline hygiene, meeting volume, conversion, and commercial standardisation).

---

## Current State

### Relevant Existing Structure

```
CLAUDE.md                              # Generic template instructions
.claude/commands/prime.md              # Generic session init
.claude/commands/create-plan.md        # Plan creation (keep as-is)
.claude/commands/implement.md          # Plan execution (keep as-is)
context/personal-info.md               # ✅ Filled in (Ayham's role)
context/business-info.md               # ✅ Filled in (hrmny overview)
context/strategy.md                    # ✅ Filled in (2026 sales strategy)
context/current-data.md                # ✅ Filled in (pipeline metrics)
reference/shell-aliases-setup.md       # Shell alias docs (keep)
shell-aliases.md                       # Duplicate of above (clean up)
outputs/                               # Empty
plans/                                 # Empty (this plan will be the first)
scripts/                               # Empty
```

### Available Integrations (MCP Tools)

| Integration | Status | Capabilities |
|---|---|---|
| **Asana** | Connected | Search, create/update tasks, create projects, get status, list tasks/projects |
| **Canva** | Connected | Search designs, create/edit designs, export (useful for proposals/presentations) |
| **Gmail** | Not connected | Would need MCP server setup for send capability |
| **LinkedIn** | Not available | No API — manual send, Claude drafts messages |

### Gaps or Problems Being Addressed

1. **CLAUDE.md is generic** — describes a template, not a sales workspace. Every session wastes time re-orienting.
2. **No sales-specific commands** — no way to say `/find-leads` or `/draft-outreach` and get structured, repeatable output.
3. **No Asana workflow** — Asana tools are connected but the workspace doesn't know which projects, sections, or fields to use.
4. **No outreach system** — no templates, tone guidance, or structured approach for emails/LinkedIn.
5. **No reference materials** — no ICP definition, no outreach templates, no qualification criteria, no proposal structure docs.
6. **Duplicate file** — `shell-aliases.md` at root duplicates `reference/shell-aliases-setup.md`.

---

## Proposed Changes

### Summary of Changes

- **Rewrite CLAUDE.md** from scratch as a sales-specific workspace guide
- **Create 4 new slash commands** for the sales workflow (proposal command deferred to Phase 2)
- **Update `/prime`** to orient around sales context and pipeline status
- **Add reference materials** for ICP, outreach templates, and qualification criteria
- **Add an outreach outputs structure** in `outputs/`
- **Clean up** the duplicate shell-aliases.md at root
- **Discover Asana pipeline structure** to wire commands to real project/section IDs

### New Files to Create

| File Path | Purpose |
|---|---|
| `.claude/commands/find-leads.md` | `/find-leads` — Research and identify potential leads matching hrmny's ICP |
| `.claude/commands/log-lead.md` | `/log-lead` — Log a qualified lead into the Asana sales pipeline |
| `.claude/commands/draft-outreach.md` | `/draft-outreach` — Draft personalised email and LinkedIn messages for a lead |
| `.claude/commands/pipeline-review.md` | `/pipeline-review` — Pull and analyse current pipeline status from Asana |
| `reference/icp-and-qualification.md` | Ideal Customer Profile, no-go list, and qualification criteria |
| `reference/outreach-guidelines.md` | Tone, structure, and templates for cold email and LinkedIn outreach |
| `reference/asana-pipeline-map.md` | Asana project/section/field GID mapping for pipeline commands |
| `outputs/outreach/` | Directory for saved outreach drafts (email + LinkedIn) |
| `outputs/lead-research/` | Directory for saved lead research and target lists |

### Files to Modify

| File Path | Changes |
|---|---|
| `CLAUDE.md` | Complete rewrite — sales-specific workspace documentation |
| `.claude/commands/prime.md` | Update to include Asana pipeline check and sales-specific summary |

### Files to Delete

| File Path | Reason |
|---|---|
| `shell-aliases.md` (root) | Duplicate of `reference/shell-aliases-setup.md` |

---

## Design Decisions

### Key Decisions Made

1. **Keep `/create-plan` and `/implement` unchanged**: These are general-purpose workflow commands that work for any workspace. They don't need sales-specific modifications — they'll be used for planning larger initiatives (e.g., "plan a campaign targeting automotive brands").

2. **Separate `/find-leads` from `/log-lead`**: Finding leads (research) and logging them (Asana action) are distinct steps. Ayham may want to research 10 leads, review them, then selectively log the best ones. Bundling these forces an all-or-nothing flow.

3. **`/draft-outreach` produces both email and LinkedIn in one command**: These are always needed together for the same lead. Generating them separately adds friction with no benefit — the context is identical.

4. **`/pipeline-review` pulls from Asana live**: Rather than maintaining a static pipeline snapshot, this command queries Asana in real-time. This ensures the data is always current and eliminates the need to manually update `current-data.md` for pipeline status.

5. **Reference files for ICP, outreach, and proposals**: These encode Ayham's standards so Claude doesn't need to be re-briefed every session. The outreach guidelines ensure consistent voice; the ICP doc ensures consistent targeting; the proposal structure ensures commercial consistency.

6. **No email send automation yet**: Gmail MCP is not connected. The workspace will draft emails that Ayham copies into Gmail. This is documented as a future enhancement. Trying to solve this now would block the entire workspace rework.

7. **LinkedIn messages are draft-only**: No LinkedIn API exists for messaging. The workspace drafts messages optimised for LinkedIn's format/length constraints, and Ayham sends manually.

8. **Asana project discovery happens during implementation**: Rather than guessing project IDs, Step 1 of implementation will query Asana to find the actual sales pipeline project, its sections, and custom fields — then wire those into the commands.

### Alternatives Considered

- **Single `/prospect` mega-command**: Rejected — too monolithic. The sales loop has natural breakpoints (research → qualify → log → outreach) where Ayham needs to review and decide before proceeding. Granular commands give control.

- **Auto-send emails via scripts**: Rejected for now — requires Gmail API credentials, OAuth setup, and introduces risk (sending wrong emails). Better to start with drafting and add send capability once the workflow is proven and Gmail MCP is connected.

- **Store pipeline data in workspace files**: Rejected — Asana is the source of truth. Duplicating pipeline data in markdown files creates staleness and drift. Better to query live via `/pipeline-review`.

### Resolved Questions

All questions resolved during planning:

1. **Asana sales pipeline project**: "Lead Pipeline 2026" — single project, 4 sections (Lead Submissions, Target List, Connected, Qualified). Structure fully mapped with GIDs.
2. **Email tone**: Highly professional, confident, and direct. Clear with a Call to Action.
3. **LinkedIn format**: Connection requests with notes (300 character limit). Not InMails.
4. **Proposal command**: Deferred to Phase 2 — the proposal building process is complex and needs its own dedicated plan. `/draft-proposal` and `reference/proposal-structure.md` are removed from this plan.

---

## Step-by-Step Tasks

### Step 1: Create Asana Pipeline Map

The Asana structure has been discovered during planning. Write the mapping file with the real GIDs.

**Asana structure (already confirmed):**

- **Project:** Lead Pipeline 2026 — GID: `1212644606086670`
- **Sections:**
  - Lead Submissions — GID: `1212644606086672`
  - Target List — GID: `1212644606086671`
  - Connected — GID: `1212644606086673`
  - Qualified — GID: `1212655337949475`
- **Custom Fields on tasks:**
  - Client/Brand — GID: `1209356923265210`
  - Lead owner — GID: `1209358852727686`
  - Client Contact — GID: `1209358852727690`
  - Lead status — GID: `1209356923265198` (values: Cold, Contacted, Meeting)
  - Lead Source — GID: `1210546371034211` (values: Contact, Inbound, Cold Outbound)
  - Next Steps (Sales) — GID: `1209356923265212` (values: Reach Out, Schedule Initial Meeting)
  - Potential — GID: `1209356923265205` (values: Low, Medium, High)
  - Project Type (Sales) — GID: `1209356923265294` (values: Project)
  - Estimated value — GID: `1209356923265196` (number, AED)
  - Notes — GID: `1211089242073567`
  - Contacted — GID: `1212655346767345`
  - Submitted — GID: `1209356923265301` (date)

**Actions:**

- Create `reference/asana-pipeline-map.md` containing the full mapping above, formatted for easy reference by commands
- Include usage notes: which section to default new leads to, which fields are required vs. optional

**Files affected:**

- `reference/asana-pipeline-map.md` (new)

---

### Step 2: Clean Up Duplicate File

Remove the duplicate shell aliases file at root.

**Actions:**

- Delete `shell-aliases.md` from the workspace root (content already exists in `reference/shell-aliases-setup.md`)

**Files affected:**

- `shell-aliases.md` (delete)

---

### Step 3: Create Reference Materials

Build the three reference documents that encode hrmny's sales standards. These are read by the new commands to ensure consistency.

**Actions:**

- Create `reference/icp-and-qualification.md` with:
  - ICP definition (from business-info.md + strategy.md): global brands in UAE, local brands with real budgets
  - Category focus: retail/consumer experience, sports/wellness/movements, automotive/EV
  - No-go list: low-budget startups, small local brands (unless global budgets), alcohol, tobacco
  - Qualification criteria: budget threshold, urgency, access to decision-maker, fit with hrmny services
  - Minimum qualification bar before investing time in a tailored offer

- Create `reference/outreach-guidelines.md` with:
  - Tone: **highly professional, confident, and direct** — clear CTA always
  - Cold email structure: subject line principles, opener framework, value hook, direct CTA for a meeting
  - LinkedIn connection request: **must be under 300 characters**, punchy, personalised, professional
  - LinkedIn follow-up message: sent after connection accepted, bridges to a call (~100 words)
  - What to avoid: generic pitches, "we do everything" messaging, leading with credentials, casual/informal tone
  - Personalisation requirements: always reference something specific about the brand/company

**Files affected:**

- `reference/icp-and-qualification.md` (new)
- `reference/outreach-guidelines.md` (new)

---

### Step 4: Create Output Directories

Set up the output structure for sales deliverables.

**Actions:**

- Create `outputs/outreach/` directory with a `.gitkeep`
- Create `outputs/lead-research/` directory with a `.gitkeep`

**Files affected:**

- `outputs/outreach/.gitkeep` (new)
- `outputs/lead-research/.gitkeep` (new)

---

### Step 5: Create `/find-leads` Command

Build the lead research command.

**Actions:**

- Create `.claude/commands/find-leads.md` with the following structure:
  - **Purpose**: Research and identify potential leads matching hrmny's ICP
  - **Input variable**: `$ARGUMENTS` — industry/sector, specific company, or market signal to investigate
  - **Behaviour**:
    1. Read `reference/icp-and-qualification.md` for targeting criteria
    2. Read `context/business-info.md` for service alignment
    3. Read `context/strategy.md` for current sector focus
    4. Use web search to research the target area (companies, recent news, brand activity, marketing moves)
    5. For each potential lead, assess against ICP and qualification criteria
    6. Output a structured lead brief for each qualified lead:
       - Company name, sector, HQ/region
       - Why they're relevant (what they're doing that creates an opportunity for hrmny)
       - Likely services needed (SMM, PR, campaign, branding, activation)
       - Estimated deal size range
       - Key stakeholders to target (titles/roles)
       - Recommended outreach angle
       - ICP fit score (High / Medium / Low)
    7. Save output to `outputs/lead-research/YYYY-MM-DD-{topic}.md`
  - **Examples**: `/find-leads retail brands launching in Dubai Q1 2026`, `/find-leads EV brands entering GCC market`

**Files affected:**

- `.claude/commands/find-leads.md` (new)

---

### Step 6: Create `/log-lead` Command

Build the Asana logging command.

**Actions:**

- Create `.claude/commands/log-lead.md` with the following structure:
  - **Purpose**: Log a qualified lead into the hrmny Asana sales pipeline
  - **Input variable**: `$ARGUMENTS` — company name (and optionally key details, or reference to a lead research output)
  - **Behaviour**:
    1. Read `reference/asana-pipeline-map.md` for project GID, section GIDs, custom fields
    2. If the lead was researched via `/find-leads`, read the relevant output file for context
    3. If not, ask for or research key details (company, contact, service interest, estimated value)
    4. Check Asana for duplicates (search existing tasks for the company name)
    5. Create a task in the correct Asana project and section (default: earliest pipeline stage) using `mcp__claude_ai_Asana__create_task_preview` then `create_task_confirm`
    6. Populate task with: company name, contact details, service interest, estimated value, source, outreach angle, next action
    7. Confirm to the user what was created with a link

**Files affected:**

- `.claude/commands/log-lead.md` (new)

---

### Step 7: Create `/draft-outreach` Command

Build the outreach drafting command.

**Actions:**

- Create `.claude/commands/draft-outreach.md` with the following structure:
  - **Purpose**: Draft personalised cold email and LinkedIn message for a specific lead
  - **Input variable**: `$ARGUMENTS` — company name and/or contact name (optionally with context like "just launched a new product line")
  - **Behaviour**:
    1. Read `reference/outreach-guidelines.md` for tone, structure, and templates
    2. Read `reference/icp-and-qualification.md` for positioning context
    3. Read `context/business-info.md` for hrmny service descriptions
    4. Research the lead: company website, recent news, LinkedIn activity, brand moves
    5. Identify the strongest outreach angle (what's happening with their brand that hrmny can help with)
    6. Draft outputs:
       - **Cold email** (subject line + body, ~150-200 words, clear CTA for a meeting)
       - **LinkedIn connection request** (under 300 characters, punchy, personalised)
       - **LinkedIn follow-up message** (sent after connection accepted, ~100 words, bridges to a call)
    7. Save to `outputs/outreach/YYYY-MM-DD-{company-name}.md`
  - **Personalisation requirements**: Every message must reference something specific about the company — never generic

**Files affected:**

- `.claude/commands/draft-outreach.md` (new)

---

### Step 8: Create `/pipeline-review` Command

Build the pipeline review command.

**Actions:**

- Create `.claude/commands/pipeline-review.md` with the following structure:
  - **Purpose**: Pull current pipeline from Asana and provide an actionable review
  - **Input variable**: `$ARGUMENTS` (optional) — filter like "stalled deals" or "PR pipeline" or "this week"
  - **Behaviour**:
    1. Read `reference/asana-pipeline-map.md` for project GID and section mapping
    2. Query Asana for current pipeline tasks using `mcp__claude_ai_Asana__get_tasks` or `get_status_overview`
    3. Analyse and present:
       - Pipeline by stage (with values if available)
       - Deals needing action (no next step, overdue, stalled)
       - Deals by service type (SMM / PR / Campaign / Branding / Activation)
       - Key metrics vs. targets from `context/current-data.md`
    4. Provide specific recommendations:
       - Which deals to prioritise this week
       - Which deals are at risk and why
       - Where pipeline is thin (stages with low coverage)
    5. Suggest next actions for top-priority deals

**Files affected:**

- `.claude/commands/pipeline-review.md` (new)

---

### Step 9: Update `/prime` Command

Rewrite prime to orient around the sales workflow.

**Actions:**

- Rewrite `.claude/commands/prime.md` to:
  1. Run `ls -la` and file discovery (keep existing)
  2. Read `CLAUDE.md` and all `context/` files (keep existing)
  3. **New**: Query Asana for a quick pipeline snapshot (total active pipeline value, deals needing action)
  4. Update the summary section to:
     - Summarise who Ayham is and what hrmny does (brief)
     - State the current strategic priorities (from strategy.md)
     - Report pipeline health from Asana (live data)
     - List available commands with one-line descriptions
     - Highlight suggested actions based on pipeline state and strategy
     - Confirm readiness

**Files affected:**

- `.claude/commands/prime.md` (modify)

---

### Step 10: Rewrite CLAUDE.md

Complete rewrite of the core workspace document.

**Actions:**

- Rewrite `CLAUDE.md` to include:
  - **Header**: "hrmny Sales & Growth Workspace" — what this workspace is, who it's for
  - **The Claude-Ayham Relationship**: Claude as sales co-pilot — context-aware, pipeline-connected, commercially aligned
  - **Workspace Structure**: Updated directory tree reflecting all new files and commands
  - **Commands Reference**: All commands listed with purpose, usage, and examples:
    - `/prime` — Session init with pipeline check
    - `/find-leads [target]` — Lead research
    - `/log-lead [company]` — Log to Asana
    - `/draft-outreach [company/contact]` — Email + LinkedIn drafting
    - `/pipeline-review [filter]` — Pipeline analysis from Asana
    - `/create-plan [request]` — Plan creation (general purpose)
    - `/implement [plan-path]` — Plan execution (general purpose)
  - **Sales Workflow**: The standard flow from lead discovery to close
  - **Integration Notes**: What's connected (Asana, Canva), what's manual (Gmail send, LinkedIn send), what's planned (Gmail MCP)
  - **ICP Quick Reference**: Inline summary (full detail in reference file)
  - **No-Go List**: Inline (low-budget startups, small local brands, alcohol, tobacco)
  - **Key Commercial Context**: Service lines, typical deal ranges, pricing logic summary
  - **Session Workflow**: Updated for sales context
  - **Maintenance Instructions**: Keep CLAUDE.md updated when workspace changes

**Files affected:**

- `CLAUDE.md` (rewrite)

---

### Step 11: Validate Everything

Run through all validation checks.

**Actions:**

- Verify all new command files exist and have correct structure
- Verify all reference files exist with substantive content
- Verify output directories exist
- Verify CLAUDE.md accurately reflects the new workspace structure
- Verify `/prime` reads the right files and produces a useful summary
- Test one Asana query to confirm the pipeline map is correct
- Verify cross-references between files are consistent

**Files affected:**

- (validation only — no files changed)

---

## Connections & Dependencies

### Files That Reference This Area

- `CLAUDE.md` references all commands and the workspace structure — must be updated last (Step 11) to reflect the final state
- `.claude/commands/prime.md` reads `CLAUDE.md` and `context/` — updated in Step 10
- New commands reference `reference/` files — reference files must be created (Step 3) before commands (Steps 5-9)
- Commands that use Asana depend on `reference/asana-pipeline-map.md` — must be created in Step 1

### Updates Needed for Consistency

- All new commands must be documented in CLAUDE.md
- All new directories must appear in the workspace structure diagram in CLAUDE.md
- Context files don't need modification (already well-populated)

### Impact on Existing Workflows

- `/prime` changes: will now include live Asana data and sales-specific summary — sessions start more focused
- `/create-plan` and `/implement`: unchanged — continue to work as general-purpose tools
- Shell aliases (`cs`/`cr`): unchanged — continue to work as before
- `reference/shell-aliases-setup.md`: unchanged

---

## Validation Checklist

How to verify the implementation is complete and correct:

- [ ] `reference/asana-pipeline-map.md` exists with real project/section GIDs from Asana
- [ ] `reference/icp-and-qualification.md` exists with hrmny's ICP, no-go list, and qualification criteria
- [ ] `reference/outreach-guidelines.md` exists with tone, structure, and templates
- [ ] `.claude/commands/find-leads.md` exists and follows the command pattern
- [ ] `.claude/commands/log-lead.md` exists and references correct Asana GIDs
- [ ] `.claude/commands/draft-outreach.md` exists with email + LinkedIn formats
- [ ] `.claude/commands/pipeline-review.md` exists and queries Asana correctly
- [ ] `.claude/commands/prime.md` updated with sales-specific flow and Asana check
- [ ] `CLAUDE.md` completely rewritten with all commands, structure, and workflow documented
- [ ] `outputs/outreach/` and `outputs/lead-research/` directories exist
- [ ] `shell-aliases.md` removed from root
- [ ] At least one Asana query executes successfully to confirm integration works
- [ ] No broken cross-references between files

---

## Success Criteria

The implementation is complete when:

1. **Running `/prime` in a fresh session** produces a sales-oriented summary that includes live pipeline data from Asana, lists all available commands, and suggests actionable next steps.
2. **All 4 new commands** (`/find-leads`, `/log-lead`, `/draft-outreach`, `/pipeline-review`) exist as fully specified command files that follow the same structural pattern as existing commands.
3. **CLAUDE.md accurately describes** the complete workspace — every command, every directory, every workflow — so any future session starts with full orientation.
4. **Reference materials** (ICP, outreach guidelines, Asana pipeline map) contain enough detail that commands can execute without needing Ayham to re-explain his business, targets, or standards.
5. **Asana integration is wired** — at minimum, the pipeline project is mapped and one query works.

---

## Notes

### Phase 2: Proposal System (next plan)

- **`/draft-proposal` command + `reference/proposal-structure.md`**: The proposal building process is complex and needs its own dedicated plan. Will cover scoping, pricing logic, commercial terms framework, proposal template structure, and Canva integration. To be planned via `/create-plan` after Phase 1 is complete.

### Future Enhancements (not in this plan)

- **Gmail MCP integration**: Once connected, `/draft-outreach` can be extended to send emails directly. This would add a `/send-email` command or a `--send` flag to `/draft-outreach`.
- **Apollo integration**: If Apollo provides an API/MCP, lead research could pull intent signals and org charts programmatically rather than through web search.
- **Automated pipeline refresh**: A script in `scripts/` that runs periodically to update `current-data.md` with live Asana metrics.
- **Proposal generation via Canva**: Using the Canva MCP tools to create designed proposals from the draft content, using hrmny's brand templates.
- **Handover command**: `/handover [deal]` that generates a Won Deal Handover Pack from the Asana task and proposal — for CS/Ops/PR. This supports Strategic Priority #6.
- **Weekly digest command**: `/weekly-digest` that pulls pipeline movement, outreach activity, and key metrics into a one-page summary.

---

## Implementation Notes

**Implemented:** 2026-02-20

### Summary

Transformed the generic Claude Workspace Template into a dedicated hrmny Sales & Growth workspace. Created 4 new slash commands (/find-leads, /log-lead, /draft-outreach, /pipeline-review), 3 reference documents (ICP & qualification, outreach guidelines, Asana pipeline map), 2 output directories, rewrote CLAUDE.md and /prime for sales context, and cleaned up the duplicate shell-aliases.md. Asana integration confirmed working with live queries against Lead Pipeline 2026.

### Deviations from Plan

None — all 11 steps executed as specified.

### Issues Encountered

None.

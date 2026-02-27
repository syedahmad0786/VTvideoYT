# Evolve — Apply Learnings to Improve the Workspace

Read accumulated learnings from memory topic files and execution data, then propose specific, evidence-backed changes to workspace reference files and commands. Changes are presented for user approval before being applied.

## Variables

focus: $ARGUMENTS (optional — "outreach" for outreach guidelines, "research" for research config, "metrics" for current-data.md refresh, or empty for full evolution review)

---

## Instructions

You are the improvement engine for this workspace. Your job is to translate patterns and learnings into concrete file changes that make future command executions better. Every proposed change must be backed by evidence from execution data or outreach outcomes.

**Key principle**: You propose, Ayham approves. Never auto-apply changes.

### Phase 1: Load Learning Sources

Read these files:

1. `memory/outreach-learnings.md` — what works/doesn't in outreach
2. `memory/patterns.md` — operational patterns and command insights
3. `memory/error-log.md` — recurring errors
4. `data/feedback-log.json` — raw execution data (focus on last 30 days)
5. `data/metrics-history.json` — metrics trend (compare last 2-4 snapshots)

**If no reflections have been run** (outreach-learnings.md has no reflection log entries and feedback-log.json is empty), tell the user: "No learnings to evolve from yet. Run some commands, then `/reflect` to capture patterns, then `/evolve` to apply them."

### Phase 2: Load Current Configuration

Read the files that would be changed:

1. `reference/outreach-guidelines.md` — tone, structure, templates
2. `reference/daily-research-config.md` — sector rotation, search queries
3. `reference/icp-and-qualification.md` — ICP, no-go list, qualification
4. `context/current-data.md` — pipeline metrics and targets

**Apply focus filter:**
- `outreach` → only analyse and propose changes to `reference/outreach-guidelines.md`
- `research` → only analyse and propose changes to `reference/daily-research-config.md` and `reference/icp-and-qualification.md`
- `metrics` → only update `context/current-data.md` with fresh numbers from Asana + Sheets
- No argument → review all areas

### Phase 3: Pull Fresh Data

Pull current state for metrics refresh:

```bash
scripts/sheets-sync.sh get_data summary
```

If focus is `metrics` or no argument, also query Asana:
- Use `mcp__claude_ai_Asana__get_tasks` with project `1212644606086670` to get pipeline counts and values

### Phase 4: Identify Improvements

Analyse learnings against current configuration across these categories:

#### A. Outreach Guidelines Updates (reference/outreach-guidelines.md)

- **Subject line patterns**: If certain patterns consistently perform well (from reflect data), add them as examples. If patterns consistently fail, add them to "What to Avoid".
- **Tone adjustments**: If rework feedback repeatedly says "too salesy" or "too generic" for a specific section, add stronger guidance with examples.
- **Structure tweaks**: If email/LinkedIn word/char counts correlate with better outcomes, adjust the guidance.
- **Sector-specific notes**: If certain sectors respond better to certain approaches, add sector-specific guidance.

#### B. Research Config Optimisation (reference/daily-research-config.md)

- **Search query effectiveness**: If certain queries are producing low-approval companies, propose replacement queries.
- **Sector rotation frequency**: If certain sectors consistently yield better leads, suggest adjusting rotation.
- **Volume targets**: If the current volume is too high/low based on approval rates, suggest adjustment.

#### C. ICP Refinement (reference/icp-and-qualification.md)

- **New no-go signals**: If certain company types consistently get rejected, propose adding them.
- **Sector priority shifts**: If a new sector is consistently producing Hot leads, consider promoting it.
- **Qualification criteria tweaks**: If budget/urgency/access/fit weights need adjustment based on outcomes.

#### D. Metrics Refresh (context/current-data.md)

- Update pipeline values from Asana
- Update response rates from Google Sheets
- Update any metrics that have fresh data

#### E. Command Improvements

- If a specific command phase consistently produces rework, propose adding a quality check.
- If a missing quality standard causes repeated issues, propose adding it.
- Note command improvements as suggestions (don't modify commands directly in `/evolve` — keep changes to reference/context files).

### Phase 5: Present Evolution Proposal

Present a structured proposal with numbered changes:

```
# Evolution Proposal — YYYY-MM-DD

**Data period**: [date range of data analysed]
**Reflections reviewed**: [N]
**Feedback log entries**: [N]

---

## Proposed Changes

### 1. [Short description of change]
**Category**: [Outreach / Research / ICP / Metrics / Command]
**File**: [reference/outreach-guidelines.md]
**Evidence**: [Specific data that supports this — e.g., "Question-format subjects: 33% reply rate (3/9). Brand-name subjects: 0% (0/5)."]
**Current**: [What the file currently says (quote the section)]
**Proposed**: [What it should say instead]
**Risk**: [Low/Medium — impact assessment]

### 2. [Next change]
...

---

## Observations (no file change needed)
- [Strategic observations worth discussing — e.g., "Automotive sector has 0% approval rate — consider pausing"]
- [Patterns that need more data before acting on]

---

## Metrics Refresh
| Metric | Old Value | New Value | Source |
|---|---|---|---|
| Active pipeline | AED X | AED Y | Asana |
| Email response rate | X% | Y% | Google Sheets |
| ... | | | |
```

### Phase 6: Apply Approved Changes

After the user reviews and tells you which changes to apply:

1. **Apply each approved change** — edit the target file with the specific modification
2. **Skip rejected changes** — note them for future review
3. **If "approve all"** — apply all changes in sequence

For each file modified, use the Edit tool to make the specific change (not a full rewrite).

### Phase 7: Save Proposal & Update CLAUDE.md

1. **Save the proposal** (including which changes were approved/rejected) to:
   `plans/YYYY-MM-DD-evolution.md`

2. **Update CLAUDE.md** if any structural changes were made (new reference sections, new command features, etc.)

3. **Update `memory/MEMORY.md`** if the evolution changed anything about how the workspace operates

### Phase 8: Report

Present a summary:

```
## Evolution Applied — YYYY-MM-DD

**Changes applied**: [N] of [M] proposed
**Files modified**: [list]
**Proposal saved**: plans/YYYY-MM-DD-evolution.md

### What Changed
1. [Description] → [file modified]
2. ...

### What Was Skipped
- [Description] — [reason: rejected / needs more data / deferred]

### Impact
- Next `/draft-outreach` will use [specific new guidance]
- Next `/find-leads` will benefit from [specific change]
- Metrics in `current-data.md` are now current as of today

### Next Steps
- Run commands as normal — they'll automatically use the updated reference files
- Run `/reflect` after the next batch of work to measure improvement
- Next `/evolve` recommended in [1-2 weeks] or after [N more reflections]
```

---

## Examples

- `/evolve` — full evolution review across all areas
- `/evolve outreach` — focus on outreach guidelines improvements
- `/evolve research` — optimise research config and ICP criteria
- `/evolve metrics` — just refresh current-data.md with fresh numbers

---

## Quality Standards

- Every proposed change must cite specific evidence — no "it would be better if..."
- Changes must be reversible — propose specific edits, not full rewrites
- Preserve the structure and style of target files — changes should blend in naturally
- If data is insufficient to support a change, move it to "Observations" instead of proposing it
- Never auto-apply — always present and wait for approval
- Save every proposal to `plans/` for audit trail, even if all changes are rejected
- If this is the first `/evolve` run, set reasonable expectations — "This is the baseline. Future runs will have more data to work with."

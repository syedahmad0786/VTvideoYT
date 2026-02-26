# Pipeline Review

Pull the current sales pipeline from Asana and provide an actionable analysis. The Asana pipeline only contains leads that have **connected and shown interest** (promoted from the Google Sheets outreach tracker via `/promote-lead`).

## Variables

filter: $ARGUMENTS (optional — e.g., "stalled deals", "qualified stage", "this week", or leave blank for full review)

---

## Instructions

You are reviewing hrmny's live sales pipeline from Asana and providing Ayham with a clear, actionable snapshot. Remember: Asana contains only **Connected and Qualified leads** — pre-connection outreach work is tracked in Google Sheets (use `/dashboard` for that).

### Phase 1: Load Context

Read these files:

1. `reference/asana-pipeline-map.md` — project GID, section GIDs, custom field mapping
2. `context/current-data.md` — targets and benchmarks to compare against
3. `context/strategy.md` — current priorities (for contextual recommendations)

### Phase 2: Pull Pipeline Data from Asana

Query the Lead Pipeline 2026 project (GID: `1212644606086670`):

1. Use `mcp__claude_ai_Asana__get_tasks` with the project GID to pull all active tasks
   - Request fields: `name,notes,assignee.name,due_on,memberships.section.name,custom_fields.name,custom_fields.display_value`
   - Paginate if needed (use offset from response)
2. **Focus on Connected and Qualified sections** — these are the active pipeline stages
3. If the user specified a filter (e.g., "stalled" or "qualified"), focus the analysis on that subset

### Phase 3: Analyse

Organise and present the data:

#### Pipeline by Stage
For each section (Connected → Qualified):
- Count of leads
- Estimated total value (from Estimated value field, where available)
- Key leads in each stage

#### Deals Needing Action
Flag leads where:
- **No next step defined** (Next Steps field is empty)
- **Overdue** (due date has passed)
- **Stalled** (in the same stage for >2 weeks with no recent update)
- **Missing critical info** (no contact, no estimated value, no lead status)

#### Lead Owner Distribution
- Breakdown by lead owner (Ayham, Dana, others)
- Identify unassigned leads

#### Performance vs. Targets
Compare against targets from `current-data.md`:
- Qualified meetings booked vs. target (2-3/week)
- Pipeline coverage vs. rule of thumb (3x monthly topline goal)
- Active pipeline value vs. gap to close

### Phase 4: Recommendations

Based on the analysis, provide:

1. **Top 3-5 leads to prioritise this week** — with specific next actions
2. **Deals at risk** — what's stalling and why, with suggested interventions
3. **Pipeline gaps** — where the funnel is thin and what to do about it
4. **Quick wins** — any leads that are close to moving forward with minimal effort
5. **Outreach tracker note** — if the pipeline is thin, suggest checking `/dashboard` for leads ready to promote

### Phase 5: Output

Present the review in a clean format:

```
# Pipeline Review — [Date]

## Summary
- **Total active pipeline leads**: [count] (Connected + Qualified)
- **By stage**: Connected ([n]) → Qualified ([n])
- **Estimated active pipeline value**: AED [total]
- **Leads needing action**: [count]

## Pipeline by Stage
[Detail per stage]

## Deals Needing Action
[Flagged deals with reasons and suggested actions]

## This Week's Priorities
1. [Lead] — [Next action]
2. [Lead] — [Next action]
3. [Lead] — [Next action]

## Pipeline Health
[Assessment vs. targets, gaps, risks]

## Recommendations
[Actionable suggestions]

---
*Pre-connection outreach is tracked in Google Sheets — run `/dashboard` to review outreach progress.*
```

---

## Examples

- `/pipeline-review` — full pipeline review
- `/pipeline-review stalled deals` — focus on deals with no recent movement
- `/pipeline-review qualified stage` — zoom into qualified leads only
- `/pipeline-review this week` — what needs attention this week

---

## Notes

- This command queries Asana live — data is always current
- Asana only contains leads that have connected (promoted via `/promote-lead`)
- If the pipeline is empty or very small, note this and suggest:
  - Check `/dashboard` for leads in the outreach tracker that may be ready to promote
  - Run `/find-leads` to build the top of funnel
- Always ground recommendations in the strategic priorities from `context/strategy.md`

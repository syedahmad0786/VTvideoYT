# Reflect — Synthesise Learnings from Recent Work

Analyse recent command execution data and outreach outcomes. Extract patterns, identify what's working and what isn't, update memory topic files, and snapshot metrics. This is the learning extraction step of the self-improvement loop.

## Variables

filter: $ARGUMENTS (optional — "outreach" for outreach focus, "this-week" for current week only, or empty for full 14-day reflection)

---

## Instructions

You are reviewing recent execution data to extract actionable patterns that will improve future work. This is a reflection exercise — be specific, evidence-based, and honest about what's working and what isn't.

### Phase 1: Load Data Sources

Read these files:

1. `data/feedback-log.json` — execution records from recent commands
2. `memory/outreach-learnings.md` — current outreach learnings
3. `memory/patterns.md` — current operational patterns
4. `memory/error-log.md` — current error log

**Determine timeframe:**
- Default: last 14 days
- If `$ARGUMENTS` contains "this-week": current week only (Mon-today)
- If `$ARGUMENTS` contains "outreach": all data but focus analysis on outreach dimensions

**If `data/feedback-log.json` is empty or doesn't exist**, tell the user: "No execution data found. Run some commands first (e.g., `/find-leads`, `/draft-outreach`, `/review`) — they now log execution data automatically. Then run `/reflect` to analyse patterns."

### Phase 2: Pull Live Outcome Data

Pull current outreach outcomes from Google Sheets:

```bash
scripts/sheets-sync.sh get_data outreach
```

```bash
scripts/sheets-sync.sh get_data summary
```

From the outreach data, build an outcome map:
- **Email outcomes**: Count rows where Email Stage = "Replied" vs "Sent" vs "No Response" — calculate response rate
- **LinkedIn connection outcomes**: Count rows where LI Connection Stage = "Sent" vs "Accepted" (if tracked)
- **Rework frequency**: Count rows that went through "Rework" → "Reworked" cycle
- **Channel comparison**: Which channel (email vs LinkedIn) is performing better?

Cross-reference with `data/feedback-log.json` to connect outreach approaches to outcomes where possible (match by company + contact name).

### Phase 3: Analyse Across 5 Dimensions

#### A. Rework Pattern Analysis

From feedback-log entries where `command = "review"`:
- What `feedback_category` values appear most? (personalisation, tone, length, wrong_contact, wrong_angle, factual_error, other)
- Are certain companies or sectors generating more rework?
- Are specific command phases producing lower quality? (research vs. drafting vs. contact selection)
- Is the rework rate trending up or down compared to previous reflections?

#### B. Outreach Outcome Analysis

From Google Sheets outreach data:
- Which outreach angles are associated with replies? (cross-reference outreach angles in feedback-log with Replied rows)
- Which sectors have the highest response rates?
- Do emails with certain characteristics (shorter/longer, question subjects, event references) perform better?
- Are LinkedIn connections outperforming email, or vice versa?
- What is the typical time-to-reply?

#### C. Operational Analysis

From all feedback-log entries:
- Which commands are logging errors most?
- Are there recurring API issues (Apollo rate limits, LinkedIn auth, webhook failures)?
- Which commands take the most entries (high usage = prioritise improvement)?
- Batch mode vs. single mode — any quality difference?

#### D. Research Quality Analysis

From feedback-log entries where `command = "find-leads"` or `command = "daily-research"`:
- What percentage of researched companies get approved? (compare with Sheets data: count Approved / total Researched)
- Which sectors yield more Hot vs. Cool leads?
- Are search queries producing diminishing returns? (same sectors, fewer new companies)
- Companies with urgency triggers vs. those without — approval rate difference?

#### E. Pipeline Velocity Analysis

From Google Sheets summary + feedback-log:
- How many companies moved from Researched → Approved → Contacts Found → ... → Connected?
- Where are leads getting stuck? (which stage has the most items?)
- How many leads were promoted via `/promote-lead`?
- Is the approval rate improving or declining over time?

### Phase 4: Generate Structured Reflection

Produce a reflection with these sections:

```
## Reflection — YYYY-MM-DD

**Period**: [date range] | **Commands logged**: [N] | **Outreach rows**: [N]

### What Worked
- [Specific observation with evidence — e.g., "Sports/wellness outreach has 2x higher LinkedIn acceptance (40% vs 20%)"]
- [At least 2-3 items]

### What Needs Improvement
- [Specific observation with evidence — e.g., "3 of last 8 rework items were 'too generic' — bridge paragraph is the weak point"]
- [At least 2-3 items]

### Specific Corrections (STOP / START / ADJUST)
- **STOP**: [Something to stop doing — with evidence]
- **START**: [Something to start doing — with evidence]
- **ADJUST**: [Something to modify — with evidence]

### Metrics Snapshot
| Metric | Current | Previous | Delta |
|---|---|---|---|
| Email response rate | X% | Y% | +/-Z% |
| LinkedIn acceptance rate | X% | Y% | +/-Z% |
| Company approval rate | X% | Y% | +/-Z% |
| Rework rate | X% | Y% | +/-Z% |
| Companies researched (period) | N | N | +/-N |
| Leads promoted | N | N | +/-N |
| Active pipeline value | AED X | AED Y | +/-AED Z |

### Rework Breakdown
| Category | Count | % | Trend |
|---|---|---|---|
| Personalisation | N | X% | [up/down/stable] |
| Tone | N | X% | |
| Length | N | X% | |
| Wrong contact | N | X% | |
| Wrong angle | N | X% | |
| Factual error | N | X% | |
| Other | N | X% | |
```

If this is the first reflection (no previous data), skip the "Previous" and "Delta" columns and note "Baseline — first reflection".

### Phase 5: Update Memory Files

#### Update `memory/outreach-learnings.md`

1. Read the current file
2. **Update the "Active Rules" section** if the reflection produced new rules or invalidated existing ones:
   - Add new rules backed by evidence
   - Modify existing rules if data suggests adjustment
   - Remove rules that data contradicts
3. **Append to the "Reflection Log" section** with the dated reflection (keep the most recent at the top)
4. **Prune** reflection log entries older than 60 days
5. Write the updated file

#### Update `memory/patterns.md`

If the reflection revealed new operational patterns (command usage, API behaviour, quality patterns), update the relevant section. Only add patterns that are confirmed across multiple observations — don't add one-off observations.

#### Update `memory/error-log.md`

If the reflection identified new recurring errors, add them to "Active Issues". If previously active issues are now resolved, move them to "Resolved Issues" with the resolution date and fix.

### Phase 6: Snapshot Metrics

Append a metrics snapshot to `data/metrics-history.json`:

```bash
python3 -c "
import json, os
from datetime import datetime

f = 'data/metrics-history.json'
data = json.load(open(f)) if os.path.exists(f) else {'snapshots': []}
data['snapshots'].append({
    'date': datetime.now().strftime('%Y-%m-%d'),
    'email_response_rate': [X.XX],
    'li_connection_accept_rate': [X.XX or null],
    'company_approval_rate': [X.XX],
    'rework_rate': [X.XX],
    'rework_by_category': {'personalisation': [N], 'tone': [N], 'length': [N], 'wrong_contact': [N], 'wrong_angle': [N], 'factual_error': [N], 'other': [N]},
    'companies_researched_period': [N],
    'leads_promoted_period': [N],
    'pipeline_value_active': [N],
    'total_outreach_rows': [N],
    'feedback_log_entries': [N]
})
json.dump(data, open(f, 'w'), indent=2)
"
```

Fill in actual values from the analysis.

### Phase 7: Present Summary

Present the reflection to the user with:

1. The full reflection (from Phase 4)
2. **Key insights** — the 2-3 most important findings
3. **Suggested actions**:
   - If outreach patterns changed: "Consider running `/evolve outreach` to update outreach guidelines with these findings"
   - If research quality dropped: "Review the Companies tab — approval rate has dropped, may need to adjust sector focus"
   - If rework rate is high: "Most rework is about [category] — `/evolve` can add guidance to prevent this"
   - If metrics improved: "Email response rate improved from X% to Y% — the [specific change] is working"
4. **When to reflect again**: "Next reflection recommended after [N more commands] or [date]"

---

## Examples

- `/reflect` — full 14-day reflection
- `/reflect outreach` — focus on outreach effectiveness
- `/reflect this-week` — only this week's data

---

## Quality Standards

- Every observation must cite specific evidence (numbers, examples, dates) — no vague statements
- The STOP/START/ADJUST corrections must be actionable and specific enough to implement
- Memory files must be updated — this is not just a report, it's a learning capture
- Metrics snapshot must be appended — this enables trend tracking across reflections
- If data is insufficient for a dimension (e.g., no rework items), skip that section rather than speculating
- Do not overwrite or clear existing learnings in memory files — append and update

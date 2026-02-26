# Prime — hrmny Sales & Growth

> Initialise a new session with full sales context, live pipeline data, and readiness to execute.

## Read

CLAUDE.md
./context
reference/icp-and-qualification.md
reference/asana-pipeline-map.md

## Google Sheets Outreach Check

Pull a quick snapshot of the outreach tracker from Google Sheets:
- Run `scripts/sheets-sync.sh get_data summary` to get lead counts, outreach stats, and needs-action items
- If the script fails, note it and move on — Google Sheets is supplementary context during prime

## Asana Pipeline Check

Query the Lead Pipeline 2026 project in Asana for the active pipeline (Connected + Qualified leads only):
- Use `mcp__claude_ai_Asana__get_tasks` with project `1212644606086670`, fields: `name,memberships.section.name,custom_fields.name,custom_fields.display_value`, limit 100
- Count leads in **Connected** and **Qualified** stages only (these are promoted leads)
- Identify any leads with overdue dates or missing next steps

## Learning System Check

Check the health of the self-improvement loop:
- Read `data/feedback-log.json` — count total entries and entries since the last `/reflect` run
- Read `data/metrics-history.json` — check when the last metrics snapshot was taken
- If `data/feedback-log.json` has 0 entries, note "Learning system active — execution logging will start with your next command"
- If > 7 days since last `/reflect` OR > 20 new feedback-log entries since last reflection, suggest: "Run `/reflect` to synthesise recent learnings"
- If > 14 days since last `/evolve` (check `plans/` for `*-evolution.md` files), suggest: "Consider running `/evolve` to apply accumulated insights to workspace files"

## Summary

After reading and querying, provide:

1. **Who I am & what this workspace does** (2-3 lines — Ayham, hrmny, sales & growth focus)
2. **Current strategic priorities** (top 3 from strategy.md, one line each)
3. **Outreach tracker snapshot** (from Google Sheets — total companies, companies by stage, contacts by stage, email/LinkedIn performance, rework items, approval queue)
4. **Active pipeline snapshot** (from Asana — Connected and Qualified leads only, estimated value, leads needing action)
5. **Available commands:**
   - `/find-leads [target]` — Research leads → Companies tab (Stage: Researched)
   - `/fetch-contacts [company]` — Enrich contacts for approved companies → Outreach tab (batch mode supported)
   - `/draft-outreach [company/contact]` — Draft email + LinkedIn messages for approved contacts (batch mode supported)
   - `/review [filter]` — Process "Rework" items based on your feedback
   - `/promote-lead [company]` — Promote a connected lead from Google Sheets to Asana pipeline
   - `/pipeline-review [filter]` — Asana pipeline analysis (Connected + Qualified)
   - `/dashboard [filter]` — Google Sheets outreach tracker dashboard
   - `/daily-research [mode]` — Automated full-pipeline: sector rotation → research → contacts → outreach → sync
   - `/process-intent-leads [csv-path]` — Process Apollo intent export → filter, enrich, draft outreach
   - `/reflect [filter]` — Synthesise learnings from recent work into memory
   - `/evolve [focus]` — Propose and apply improvements to workspace files
   - `/create-plan [request]` — Plan a larger initiative
   - `/implement [plan-path]` — Execute a plan
6. **Suggested actions** based on both data sources:
   - From Sheets: "X companies at 'Researched' — review in Companies tab and approve"
   - From Sheets: "X contacts at 'Contact Found' — review and approve for outreach"
   - From Sheets: "X outreach messages drafted — review and approve per channel to send"
   - From Sheets: "X rework items — run `/review` to process feedback"
   - From Asana: "X leads in Connected with no next step — follow up"
   - From Sheets/Asana gap: "X leads replied — may be ready for `/promote-lead`"
   - From learning system: suggest `/reflect` or `/evolve` if due (from Learning System Check above)
7. **Confirmation** you're ready to help

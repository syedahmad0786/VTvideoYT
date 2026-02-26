# Asana Pipeline Map

> This file maps the hrmny sales pipeline in Asana. Commands that interact with Asana (`/promote-lead`, `/pipeline-review`) read this file to know which project, sections, and fields to use.

---

## Project

| | |
|---|---|
| **Project Name** | Lead Pipeline 2026 |
| **Project GID** | `1212644606086670` |
| **URL** | https://app.asana.com/1/1148006162435561/project/1212644606086670 |

---

## Sections (Pipeline Stages)

Ordered by pipeline progression. **Only Connected and Qualified are actively used** — all pre-connection outreach work is tracked in Google Sheets.

| Section | GID | Usage |
|---|---|---|
| **Lead Submissions** | `1212644606086672` | *Legacy — no longer used. Pre-connection leads are tracked in Google Sheets.* |
| **Target List** | `1212644606086671` | *Legacy — no longer used. Target lists live in Google Sheets.* |
| **Connected** | `1212644606086673` | **Entry point from Google Sheets** — leads promoted via `/promote-lead` after responding to outreach |
| **Qualified** | `1212655337949475` | Lead is qualified — budget, fit, and decision-maker access confirmed |

**Default for `/promote-lead`**: Promoted leads go into **Connected** (`1212644606086673`).

---

## Custom Fields

### Required fields (set when creating a lead)

| Field | GID | Type | Notes |
|---|---|---|---|
| **Client/Brand** | `1209356923265210` | Text | Company/brand name |
| **Lead Source** | `1210546371034211` | Enum | Values: `Contact`, `Inbound`, `Cold Outbound` |
| **Next Steps (Sales)** | `1209356923265212` | Enum | Values: `Reach Out`, `Schedule Initial Meeting` |

### Recommended fields (set when available)

| Field | GID | Type | Notes |
|---|---|---|---|
| **Client Contact** | `1209358852727690` | Text | Contact name or email |
| **Lead owner** | `1209358852727686` | People | Default: Ayham Homsi |
| **Lead status** | `1209356923265198` | Enum | Values: `Cold`, `Contacted`, `Meeting` |
| **Potential** | `1209356923265205` | Enum | Values: `Low`, `Medium`, `High` |
| **Estimated value** | `1209356923265196` | Number | AED value |
| **Project Type (Sales)** | `1209356923265294` | Enum | Values: `Project` |
| **Notes** | `1211089242073567` | Text | Free text — outreach angle, context, next action detail |

### Tracking fields

| Field | GID | Type | Notes |
|---|---|---|---|
| **Contacted** | `1212655346767345` | Date/Checkbox | When contact was first made |
| **Submitted** | `1209356923265301` | Date | When proposal was submitted |

---

## Usage Notes

- **Task name** = Company or brand name (e.g., "On Running ME", "Red Bull")
- **Task notes** = Structured brief: vertical, contact, company overview, outreach angle, connection context, next action
- **Duplicate check**: Before creating a new task via `/promote-lead`, search for existing tasks with the company name in the project to avoid duplicates
- **Custom field updates**: Use `mcp__claude_ai_Asana__update_task` with `custom_fields` parameter as JSON string: `{"field_gid": "value"}`
- **Data source**: Lead and contact data is pulled from Google Sheets when promoting — no need to re-enter information
- **Pre-connection work**: All research, contacts, and outreach are tracked in Google Sheets (not Asana). Use `/dashboard` for outreach status.

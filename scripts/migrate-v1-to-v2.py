#!/usr/bin/env python3
"""
Migrate V1 archived data (Contacts_Archive_1 + Outreach_Archive_1) to V2 Outreach tab.

Reads from cached JSON files (fetched via sheets-sync.sh get_data),
merges contacts with their outreach messages, and pushes to V2 via webhook.
"""

import json
import subprocess
import sys
import time
from pathlib import Path

WORKSPACE = Path(__file__).parent.parent
SYNC_SCRIPT = WORKSPACE / "scripts" / "sheets-sync.sh"

# V1 status → V2 stage mapping
STATUS_TO_STAGE = {
    "Drafted": "Drafted",
    "Approved": "Approved",
    "Draft Created": "Draft Created",
    "Sent": "Sent",
    "Replied": "Replied",
    "No Response": "No Response",
    "Send Failed": "Send Failed",
    "Not Contacted": "",
}

# V1 outreach status → V2 contact stage
OUTREACH_STATUS_TO_CONTACT_STAGE = {
    "Not Contacted": "Contact Approved",  # They were enriched, treat as approved
    "LinkedIn Sent": "Contact Approved",
    "Email Sent": "Contact Approved",
    "Replied": "Contact Approved",
    "Meeting": "Contact Approved",
}


def run_sync(action, data):
    """Run sheets-sync.sh and return parsed JSON."""
    if action == "get_data":
        cmd = [str(SYNC_SCRIPT), "get_data", data]
    else:
        cmd = [str(SYNC_SCRIPT), action, json.dumps(data)]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        print(f"  ERROR: {result.stderr.strip()}", file=sys.stderr)
        return None

    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        print(f"  ERROR: Invalid JSON: {result.stdout[:200]}", file=sys.stderr)
        return None


def load_cached(path):
    """Load from cached JSON file."""
    with open(path) as f:
        return json.load(f)


def build_v2_rows(contacts_data, outreach_data):
    """Merge V1 contacts + outreach into V2 format rows."""
    # Index outreach by (company_lower, contact_lower, channel)
    outreach_index = {}
    for msg in outreach_data["rows"]:
        key = (
            msg["Company"].strip().lower(),
            msg["Contact Name"].strip().lower(),
            msg.get("Channel", "").strip(),
        )
        outreach_index[key] = msg

    rows = []
    for contact in contacts_data["rows"]:
        company = contact["Company"].strip()
        name = contact["Contact Name"].strip()
        key_base = (company.lower(), name.lower())

        # Find outreach messages for each channel
        email_msg = outreach_index.get((*key_base, "Email"), {})
        li_conn_msg = outreach_index.get((*key_base, "LinkedIn Connection"), {})
        li_fu_msg = outreach_index.get((*key_base, "LinkedIn Follow-up"), {})

        # Map V1 outreach status to V2 contact stage
        v1_status = contact.get("Outreach Status", "Not Contacted")
        contact_stage = OUTREACH_STATUS_TO_CONTACT_STAGE.get(v1_status, "Contact Approved")

        # If any outreach was drafted, set contact stage to Contact Approved
        has_outreach = bool(email_msg or li_conn_msg or li_fu_msg)
        if has_outreach:
            contact_stage = "Contact Approved"

        # Map outreach statuses
        email_status = STATUS_TO_STAGE.get(email_msg.get("Status", ""), "")
        li_conn_status = STATUS_TO_STAGE.get(li_conn_msg.get("Status", ""), "")
        li_fu_status = STATUS_TO_STAGE.get(li_fu_msg.get("Status", ""), "")

        row = {
            "company": company,
            "name": name,
            "title": contact.get("Title", ""),
            "email": contact.get("Email", ""),
            "email_status": contact.get("Email Status", "Unavailable"),
            "linkedin_url": contact.get("LinkedIn URL", ""),
            "seniority": contact.get("Seniority", ""),
            "why_this_person": contact.get("Why This Person", ""),
            "contact_stage": contact_stage,
            # Email outreach
            "email_subject": email_msg.get("Subject/Hook", ""),
            "email_body": email_msg.get("Message Body", ""),
            "email_stage": email_status,
            "email_date_sent": email_msg.get("Date Sent", ""),
            # LinkedIn Connection
            "li_connection_msg": li_conn_msg.get("Message Body", ""),
            "li_connection_stage": li_conn_status,
            # LinkedIn Follow-up
            "li_follow_up_msg": li_fu_msg.get("Message Body", ""),
            "li_follow_up_stage": li_fu_status,
            # Metadata
            "date_added": contact.get("Date Added", ""),
            "follow_up_due": email_msg.get("Follow-up Due", ""),
        }

        rows.append(row)

    return rows


def push_contact(row):
    """Push a single contact to V2 Outreach tab via add_contact, then update_outreach."""
    # Step 1: Add the contact
    contact_payload = {
        "company": row["company"],
        "name": row["name"],
        "title": row["title"],
        "email": row["email"],
        "email_status": row["email_status"],
        "linkedin_url": row["linkedin_url"],
        "seniority": row["seniority"],
        "why_this_person": row["why_this_person"],
        "contact_stage": row["contact_stage"],
    }

    result = run_sync("add_contact", contact_payload)
    if not result:
        return False, "add_contact failed"
    if not result.get("success"):
        return False, result.get("error", "unknown error")

    # Step 2: Update outreach fields (email + LinkedIn)
    has_outreach = any([
        row["email_subject"], row["email_body"],
        row["li_connection_msg"], row["li_follow_up_msg"],
    ])

    if has_outreach:
        outreach_payload = {
            "company": row["company"],
            "contact_name": row["name"],
        }
        if row["email_subject"]:
            outreach_payload["email_subject"] = row["email_subject"]
        if row["email_body"]:
            outreach_payload["email_body"] = row["email_body"]
        if row["email_stage"]:
            outreach_payload["email_stage"] = row["email_stage"]
        if row["li_connection_msg"]:
            outreach_payload["li_connection_msg"] = row["li_connection_msg"]
        if row["li_connection_stage"]:
            outreach_payload["li_connection_stage"] = row["li_connection_stage"]
        if row["li_follow_up_msg"]:
            outreach_payload["li_follow_up_msg"] = row["li_follow_up_msg"]
        if row["li_follow_up_stage"]:
            outreach_payload["li_follow_up_stage"] = row["li_follow_up_stage"]

        result2 = run_sync("update_outreach", outreach_payload)
        if not result2 or not result2.get("success"):
            return True, "contact added but outreach update failed: " + str(result2)

    return True, "ok"


def update_company_stages(contacts_data, companies_data):
    """Update Companies tab stages based on whether contacts have outreach."""
    # Group contacts by company
    company_contacts = {}
    for c in contacts_data["rows"]:
        co = c["Company"].strip()
        company_contacts.setdefault(co, []).append(c)

    # Check current company stages
    current_stages = {}
    for co in companies_data["rows"]:
        current_stages[co["Company"].strip()] = co.get("Stage", "")

    updates = []
    for company, contacts in company_contacts.items():
        current = current_stages.get(company, "")
        # If company is at Outreach Ready and has contacts, update to Contacts Found
        # (contacts are being added, so the stage should reflect that)
        if current in ("Outreach Ready", "Researched", "Approved"):
            updates.append(company)

    return updates


def main():
    dry_run = "--dry-run" in sys.argv

    print("=" * 60)
    print("V1 → V2 Migration: Contacts + Outreach")
    print("=" * 60)

    if dry_run:
        print("MODE: DRY RUN (no data will be pushed)\n")
    else:
        print("MODE: LIVE (pushing data to Google Sheets)\n")

    # Load cached data
    print("Loading cached data...")
    contacts = load_cached("/tmp/contacts_archive.json")
    outreach = load_cached("/tmp/outreach_archive.json")
    companies = load_cached("/tmp/companies_current.json")

    print(f"  Contacts: {contacts['count']}")
    print(f"  Outreach messages: {outreach['count']}")
    print(f"  Current companies: {companies['count']}")

    # Build merged V2 rows
    print("\nMerging contacts with outreach...")
    v2_rows = build_v2_rows(contacts, outreach)
    print(f"  Built {len(v2_rows)} V2 outreach rows")

    # Stats
    with_email = sum(1 for r in v2_rows if r["email_body"])
    with_li_conn = sum(1 for r in v2_rows if r["li_connection_msg"])
    with_li_fu = sum(1 for r in v2_rows if r["li_follow_up_msg"])
    print(f"  With email draft: {with_email}")
    print(f"  With LI connection: {with_li_conn}")
    print(f"  With LI follow-up: {with_li_fu}")

    if dry_run:
        print("\n--- DRY RUN: Sample rows ---")
        for i, row in enumerate(v2_rows[:3]):
            print(f"\n  [{i+1}] {row['name']} at {row['company']}")
            print(f"      Email: {row['email']} ({row['email_status']})")
            print(f"      Contact Stage: {row['contact_stage']}")
            print(f"      Email Stage: {row['email_stage'] or '(none)'}")
            print(f"      LI Conn Stage: {row['li_connection_stage'] or '(none)'}")
            print(f"      LI FU Stage: {row['li_follow_up_stage'] or '(none)'}")
        print(f"\n  ... and {len(v2_rows) - 3} more")
        print("\nRun without --dry-run to execute migration.")
        return

    # Push contacts
    print("\nPushing contacts to V2 Outreach tab...")
    success_count = 0
    error_count = 0
    errors = []

    for i, row in enumerate(v2_rows):
        label = f"  [{i+1}/{len(v2_rows)}] {row['name']} at {row['company']}"
        ok, msg = push_contact(row)
        if ok:
            success_count += 1
            outreach_label = []
            if row["email_body"]:
                outreach_label.append("email")
            if row["li_connection_msg"]:
                outreach_label.append("LI conn")
            if row["li_follow_up_msg"]:
                outreach_label.append("LI fu")
            channels = ", ".join(outreach_label) if outreach_label else "no outreach"
            print(f"{label} ✓ ({channels})")
        else:
            error_count += 1
            errors.append((row["name"], row["company"], msg))
            print(f"{label} ✗ {msg}")

        # Small delay to avoid hitting rate limits
        if (i + 1) % 5 == 0:
            time.sleep(1)

    # Update company stages
    print("\nUpdating company stages...")
    company_updates = update_company_stages(contacts, companies)
    stage_updated = 0
    for company in company_updates:
        result = run_sync("update_stage", {
            "company": company,
            "tab": "companies",
            "stage": "Contacts Found",
        })
        if result and result.get("success"):
            stage_updated += 1
            print(f"  {company}: → Contacts Found ✓")
        time.sleep(0.3)

    # Summary
    print("\n" + "=" * 60)
    print("MIGRATION COMPLETE")
    print("=" * 60)
    print(f"  Contacts migrated: {success_count}/{len(v2_rows)}")
    print(f"  Errors: {error_count}")
    print(f"  Company stages updated: {stage_updated}")

    if errors:
        print("\n  Errors:")
        for name, company, msg in errors:
            print(f"    - {name} at {company}: {msg}")


if __name__ == "__main__":
    main()

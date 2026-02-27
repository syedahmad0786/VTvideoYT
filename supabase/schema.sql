-- hrmny Sales & Growth — Supabase Database Schema
-- Run this in Supabase SQL Editor to set up your database

-- ============================================
-- COMPANIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sector TEXT,
  icp_fit TEXT CHECK (icp_fit IN ('Hot', 'Warm', 'Cool')),
  why_this_company TEXT,
  services_match TEXT,
  est_value INTEGER DEFAULT 0,
  outreach_angle TEXT,
  evidence TEXT,
  lead_source TEXT DEFAULT 'Cold Outbound' CHECK (lead_source IN ('Cold Outbound', 'Intent Signal', 'Inbound', 'Contact', 'Referral')),
  stage TEXT DEFAULT 'Researched' CHECK (stage IN ('Researched', 'Approved', 'Rejected', 'Contacts Found', 'Outreach Ready', 'Sent', 'Replied', 'Connected', 'Rework', 'Reworked')),
  feedback TEXT,
  asana_task_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_stage ON companies(stage);
CREATE INDEX IF NOT EXISTS idx_companies_sector ON companies(sector);
CREATE INDEX IF NOT EXISTS idx_companies_icp_fit ON companies(icp_fit);

-- ============================================
-- CONTACTS TABLE (flat — one row per contact, all channels on same row)
-- ============================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  email_status TEXT CHECK (email_status IN ('Verified', 'Unverified', 'Unavailable')),
  linkedin_url TEXT,
  seniority TEXT CHECK (seniority IN ('C-Suite', 'VP', 'Director', 'Head', 'Manager')),
  why_this_contact TEXT,
  contact_stage TEXT DEFAULT 'Contact Found' CHECK (contact_stage IN ('Contact Found', 'Contact Approved', 'Rejected', 'Rework', 'Reworked')),
  feedback TEXT,
  -- Email outreach
  email_subject TEXT,
  email_body TEXT,
  email_stage TEXT DEFAULT '' CHECK (email_stage IN ('', 'Drafted', 'Approved', 'Sent', 'Replied', 'No Response', 'Bounced', 'Rework', 'Reworked')),
  email_date_sent TIMESTAMPTZ,
  email_response_date TIMESTAMPTZ,
  email_response_summary TEXT,
  -- LinkedIn connection
  li_connection_message TEXT,
  li_connection_stage TEXT DEFAULT '' CHECK (li_connection_stage IN ('', 'Drafted', 'Approved', 'Sent', 'Accepted', 'No Response', 'Rework', 'Reworked')),
  -- LinkedIn follow-up
  li_follow_up_message TEXT,
  li_follow_up_stage TEXT DEFAULT '' CHECK (li_follow_up_stage IN ('', 'Drafted', 'Approved', 'Sent', 'Replied', 'No Response', 'Rework', 'Reworked')),
  -- Tracking
  follow_up_due TIMESTAMPTZ,
  resend_email_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_name, name)
);

CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_stage ON contacts(contact_stage);
CREATE INDEX IF NOT EXISTS idx_contacts_email_stage ON contacts(email_stage);

-- ============================================
-- PIPELINE TABLE (deals in Connected+ stages)
-- ============================================
CREATE TABLE IF NOT EXISTS pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  contact_name TEXT,
  stage TEXT DEFAULT 'Connected' CHECK (stage IN ('Connected', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost')),
  est_value INTEGER DEFAULT 0,
  next_step TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_stage ON pipeline(stage);

-- ============================================
-- ACTIVITY LOG
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);

-- ============================================
-- EMAIL EVENTS (Resend webhook tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  resend_email_id TEXT,
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_events_contact ON email_events(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_events_resend ON email_events(resend_email_id);

-- ============================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER pipeline_updated_at BEFORE UPDATE ON pipeline
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (enable but allow all for service key)
-- ============================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "Allow authenticated access" ON companies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON pipeline FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON activity_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON email_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow service role full access (for API functions)
CREATE POLICY "Allow service role" ON companies FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role" ON contacts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role" ON pipeline FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role" ON activity_log FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role" ON email_events FOR ALL TO service_role USING (true) WITH CHECK (true);

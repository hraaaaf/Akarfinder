-- P11D/P11D-C — buyer_leads table for AkarFinder Pro lead inbox.
-- Covers: onboarding buyer profiles (P11D) + visit requests (P11D-C).
-- Apply with: npm run apply:leads-migration  OR  Supabase Dashboard → SQL Editor
--
-- Leads are created via /api/leads and /api/visit-requests (server-side, service role key only).
-- No public SELECT, UPDATE, or DELETE is allowed.
-- Full auth/dashboard to be added in a future phase.

CREATE TABLE IF NOT EXISTS buyer_leads (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lead_type               TEXT        DEFAULT 'buyer_profile',
  source_channel          TEXT        NOT NULL DEFAULT 'onboarding',
  source_page             TEXT,
  listing_id              TEXT,
  project_id              TEXT,
  project_type            TEXT,
  city                    TEXT,
  neighborhood            TEXT,
  zones_accepted          TEXT,
  budget_total            NUMERIC,
  down_payment            NUMERIC,
  needs_credit            BOOLEAN,
  target_monthly_payment  NUMERIC,
  currency                TEXT        DEFAULT 'MAD',
  property_type           TEXT,
  desired_surface_m2      NUMERIC,
  bedrooms                INTEGER,
  condition_preference    TEXT,
  timing                  TEXT,
  is_mre                  BOOLEAN     NOT NULL DEFAULT FALSE,
  residence_country       TEXT,
  full_name               TEXT,
  phone_whatsapp          TEXT        NOT NULL,
  message                 TEXT,
  consent_contact         BOOLEAN     NOT NULL,
  consent_indicative      BOOLEAN     NOT NULL,
  lead_temperature        TEXT        NOT NULL DEFAULT 'froid',
  lead_score              INTEGER,
  lead_reasons            JSONB,
  status                  TEXT        NOT NULL DEFAULT 'new',
  visit_status                    TEXT,
  visit_preferred_slot_1          TIMESTAMPTZ,
  visit_preferred_slot_2          TIMESTAMPTZ,
  visit_preferred_daypart         TEXT,
  visit_message                   TEXT,
  listing_title                   TEXT,
  listing_city                    TEXT,
  listing_neighborhood            TEXT,
  listing_price                   NUMERIC,
  listing_source_url              TEXT,
  listing_source_access_level     TEXT,
  listing_image_permission_status TEXT,
  user_agent              TEXT,
  internal_notes          TEXT,

  CONSTRAINT buyer_leads_temperature_check
    CHECK (lead_temperature IN ('chaud', 'tiède', 'froid')),
  CONSTRAINT buyer_leads_status_check
    CHECK (status IN ('new', 'contacted', 'qualified', 'archived')),
  CONSTRAINT buyer_leads_lead_type_check
    CHECK (lead_type IN ('buyer_profile', 'visit_request', 'contact_request')),
  CONSTRAINT buyer_leads_visit_status_check
    CHECK (visit_status IS NULL OR visit_status IN ('pending', 'contacted', 'confirmed', 'reschedule_requested', 'cancelled', 'archived'))
);

-- Indexes for common inbox queries and the bounded anti-abuse lookup.
CREATE INDEX IF NOT EXISTS buyer_leads_status_idx ON buyer_leads (status);
CREATE INDEX IF NOT EXISTS buyer_leads_temperature_idx ON buyer_leads (lead_temperature);
CREATE INDEX IF NOT EXISTS buyer_leads_created_at_idx ON buyer_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS buyer_leads_lead_type_idx ON buyer_leads (lead_type);
CREATE INDEX IF NOT EXISTS buyer_leads_visit_status_idx ON buyer_leads (visit_status) WHERE visit_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS buyer_leads_phone_created_at_idx ON buyer_leads (phone_whatsapp, created_at DESC);

ALTER TABLE buyer_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON buyer_leads;
CREATE POLICY "service_role_all" ON buyer_leads
  FOR ALL USING (true);

CREATE OR REPLACE FUNCTION update_buyer_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_buyer_leads_updated_at ON buyer_leads;
CREATE TRIGGER set_buyer_leads_updated_at
  BEFORE UPDATE ON buyer_leads
  FOR EACH ROW EXECUTE FUNCTION update_buyer_leads_updated_at();

-- P11D-C — visit requests extension on buyer_leads
-- Apply manually in Supabase SQL Editor or via:
--   npm run apply:visit-migration
--
-- Goal:
-- - keep buyer_leads as the single CRM inbox table
-- - add visit-request-specific columns
-- - preserve existing RLS posture (service role only)

ALTER TABLE buyer_leads
  ADD COLUMN IF NOT EXISTS lead_type TEXT DEFAULT 'buyer_profile',
  ADD COLUMN IF NOT EXISTS visit_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS visit_preferred_slot_1 TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS visit_preferred_slot_2 TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS visit_preferred_daypart TEXT,
  ADD COLUMN IF NOT EXISTS visit_message TEXT,
  ADD COLUMN IF NOT EXISTS listing_title TEXT,
  ADD COLUMN IF NOT EXISTS listing_city TEXT,
  ADD COLUMN IF NOT EXISTS listing_neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS listing_price NUMERIC,
  ADD COLUMN IF NOT EXISTS listing_source_url TEXT,
  ADD COLUMN IF NOT EXISTS listing_source_access_level TEXT,
  ADD COLUMN IF NOT EXISTS listing_image_permission_status TEXT;

ALTER TABLE buyer_leads
  DROP CONSTRAINT IF EXISTS buyer_leads_lead_type_check;

ALTER TABLE buyer_leads
  ADD CONSTRAINT buyer_leads_lead_type_check
  CHECK (lead_type IN ('buyer_profile', 'visit_request', 'contact_request'));

ALTER TABLE buyer_leads
  DROP CONSTRAINT IF EXISTS buyer_leads_visit_status_check;

ALTER TABLE buyer_leads
  ADD CONSTRAINT buyer_leads_visit_status_check
  CHECK (
    visit_status IS NULL OR
    visit_status IN (
      'pending',
      'contacted',
      'confirmed',
      'reschedule_requested',
      'cancelled',
      'archived'
    )
  );

CREATE INDEX IF NOT EXISTS buyer_leads_lead_type_idx
  ON buyer_leads (lead_type);

CREATE INDEX IF NOT EXISTS buyer_leads_visit_status_idx
  ON buyer_leads (visit_status);

CREATE INDEX IF NOT EXISTS buyer_leads_listing_id_idx
  ON buyer_leads (listing_id);

CREATE INDEX IF NOT EXISTS buyer_leads_city_idx
  ON buyer_leads (city);

CREATE INDEX IF NOT EXISTS buyer_leads_created_at_desc_idx
  ON buyer_leads (created_at DESC);

CREATE INDEX IF NOT EXISTS buyer_leads_temperature_created_idx
  ON buyer_leads (lead_temperature, created_at DESC);

ALTER TABLE buyer_leads ENABLE ROW LEVEL SECURITY;

-- Existing "service_role_all" policy remains the only access path.
-- No anon/public SELECT, UPDATE, DELETE or unrestricted GET route should be added.

-- P18A — saved_alerts table for rent/buy alert subscriptions.
-- Apply with: npm run apply:alerts-migration  OR  Supabase Dashboard → SQL Editor
-- Inserts via /api/alerts (server-side, service role key only). No public access.

CREATE TABLE IF NOT EXISTS saved_alerts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Alert criteria
  transaction_type TEXT        NOT NULL DEFAULT 'rent',
  city             TEXT,
  budget_min       NUMERIC,
  budget_max       NUMERIC,
  property_type    TEXT,

  -- Contact (at least one required — enforced at API level)
  phone_whatsapp   TEXT,
  email            TEXT,

  -- Consent
  consent          BOOLEAN     NOT NULL DEFAULT false,

  -- Workflow
  status           TEXT        NOT NULL DEFAULT 'active',

  CONSTRAINT saved_alerts_status_check
    CHECK (status IN ('active', 'archived'))
);

CREATE INDEX IF NOT EXISTS saved_alerts_created_at_idx ON saved_alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS saved_alerts_status_idx ON saved_alerts (status);
CREATE INDEX IF NOT EXISTS saved_alerts_city_idx ON saved_alerts (city) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS saved_alerts_type_idx ON saved_alerts (transaction_type);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE saved_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON saved_alerts;

CREATE POLICY "service_role_all" ON saved_alerts
  FOR ALL USING (true);

-- No anon access. Inserts via /api/alerts server route (service role key only).
-- Reads via /pro/alerts server page (service role key only).

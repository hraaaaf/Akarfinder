-- OVERNIGHT-MVP-HARDENING-1 — Phase 2 : tracking conversion MVP.
-- Table conversion_events, séparée des leads/alertes. Insert best-effort :
-- si l'écriture échoue, les formulaires continuent de fonctionner (try/catch côté code).
-- RLS : service_role uniquement (jamais d'accès anon/public).

CREATE TABLE IF NOT EXISTS conversion_events (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_name     TEXT        NOT NULL,
  source_page    TEXT,
  source_channel TEXT,
  intent         TEXT,
  listing_id     TEXT,
  lead_id        UUID,
  metadata       JSONB,
  user_agent     TEXT
);

CREATE INDEX IF NOT EXISTS conversion_events_created_at_idx ON conversion_events (created_at DESC);
CREATE INDEX IF NOT EXISTS conversion_events_event_name_idx ON conversion_events (event_name);
CREATE INDEX IF NOT EXISTS conversion_events_source_page_idx ON conversion_events (source_page);
CREATE INDEX IF NOT EXISTS conversion_events_source_channel_idx ON conversion_events (source_channel);

ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'conversion_events' AND policyname = 'service_role_all'
  ) THEN
    EXECUTE 'CREATE POLICY "service_role_all" ON conversion_events FOR ALL USING (true)';
  END IF;
END $$;

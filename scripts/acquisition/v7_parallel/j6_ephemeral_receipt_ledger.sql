-- Akarfinder V7 J6 provenance registry: ISOLATED CI-ONLY SQL PROPOSAL.
-- NOT applied to a live database; NEVER enables admission or collection.
-- Operator pins and attestation receipts are public SHA256s, no HMAC keys.
-- Caller must verify signatures, source identity, rights and source truth
-- OUTSIDE SQL before invoking these privileged receipt functions.
BEGIN;
CREATE SCHEMA IF NOT EXISTS v7_capture;
REVOKE ALL ON SCHEMA v7_capture FROM PUBLIC;

DO $$
BEGIN
  IF to_regrole('v7_capture_owner') IS NULL THEN
    CREATE ROLE v7_capture_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
  IF to_regrole('v7_capture_operator') IS NULL THEN
    CREATE ROLE v7_capture_operator NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
  IF to_regrole('v7_capture_reviewer') IS NULL THEN
    CREATE ROLE v7_capture_reviewer NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS v7_capture.policy_head (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton = true),
  generation bigint NOT NULL CHECK (generation BETWEEN 1 AND 1000000),
  registry_sha256 text NOT NULL CHECK (registry_sha256 ~ '^[0-9a-f]{64}$'),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE IF NOT EXISTS v7_capture.capture_receipts (
  attestation_mac_sha256 text PRIMARY KEY
      CHECK (attestation_mac_sha256 ~ '^[0-9a-f]{64}$'),
  source_domain text NOT NULL
      CHECK (source_domain IN ('agenz.ma', 'mubawab.ma', 'sarouty.ma')),
  source_offer_id text NOT NULL
      CHECK (source_offer_id ~ '^[0-9]{4,12}$'),
  html_sha256 text NOT NULL
      CHECK (html_sha256 ~ '^[0-9a-f]{64}$'),
  registry_generation bigint NOT NULL CHECK (registry_generation > 0),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (source_domain, source_offer_id, html_sha256)
);
REVOKE ALL ON ALL TABLES IN SCHEMA v7_capture FROM PUBLIC;
REVOKE ALL ON v7_capture.policy_head, v7_capture.capture_receipts
  FROM v7_capture_operator, v7_capture_reviewer;
GRANT USAGE ON SCHEMA v7_capture TO v7_capture_operator, v7_capture_reviewer;

-- Entire registry is supplied/authenticated by an operator OUTSIDE DB.
-- Only this role may move the policy generation forward exactly by one.
-- Fail-closed on stale or concurrent expected versions.
CREATE OR REPLACE FUNCTION v7_capture.advance_policy(
  p_expected_generation bigint, p_next_generation bigint, p_registry_sha256 text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, v7_capture, pg_temp
AS $$
BEGIN
  IF p_expected_generation IS NULL OR p_next_generation IS NULL
     OR p_expected_generation < 0 OR p_next_generation <> p_expected_generation + 1
     OR p_next_generation > 1000000 OR p_registry_sha256 IS NULL
     OR p_registry_sha256 !~ '^[0-9a-f]{64}$'
  THEN
    RETURN false;
  END IF;
  IF p_expected_generation = 0 THEN
    INSERT INTO v7_capture.policy_head(singleton, generation, registry_sha256)
    VALUES (true, p_next_generation, p_registry_sha256)
    ON CONFLICT (singleton) DO NOTHING;
    RETURN FOUND;
  END IF;
  UPDATE v7_capture.policy_head
     SET generation = p_next_generation,
         registry_sha256 = p_registry_sha256,
         updated_at = clock_timestamp()
   WHERE singleton = true AND generation = p_expected_generation;
  RETURN FOUND;
END;
$$;

-- A successful marker is NOT a signed/source-certified admission.  It is
-- solely a one-time DB receipt available to an authenticated reviewer role
-- after external checks. It has no publication or staging effect.
CREATE OR REPLACE FUNCTION v7_capture.record_review_receipt(
  p_generation bigint, p_registry_sha256 text,
  p_attestation_mac_sha256 text, p_source_domain text,
  p_source_offer_id text, p_html_sha256 text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, v7_capture, pg_temp
AS $$
BEGIN
  IF p_generation IS NULL OR p_generation < 1
     OR p_registry_sha256 IS NULL OR p_registry_sha256 !~ '^[0-9a-f]{64}$'
     OR p_attestation_mac_sha256 IS NULL
     OR p_attestation_mac_sha256 !~ '^[0-9a-f]{64}$'
     OR p_source_domain IS NULL
     OR p_source_domain NOT IN ('agenz.ma', 'mubawab.ma', 'sarouty.ma')
     OR p_source_offer_id IS NULL
     OR p_source_offer_id !~ '^[0-9]{4,12}$'
     OR p_html_sha256 IS NULL OR p_html_sha256 !~ '^[0-9a-f]{64}$'
  THEN
    RETURN false;
  END IF;
  -- Blocks conflicting policy updates until the receipt transaction ends.
  PERFORM 1 FROM v7_capture.policy_head
   WHERE singleton=true AND generation=p_generation
     AND registry_sha256=p_registry_sha256 FOR SHARE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  INSERT INTO v7_capture.capture_receipts(
    attestation_mac_sha256,source_domain,source_offer_id,html_sha256,registry_generation
  ) VALUES (
    p_attestation_mac_sha256,p_source_domain,p_source_offer_id,p_html_sha256,p_generation
  ) ON CONFLICT DO NOTHING;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION v7_capture.advance_policy(bigint,bigint,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION v7_capture.record_review_receipt(bigint,text,text,text,text,text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION v7_capture.advance_policy(bigint,bigint,text)
  TO v7_capture_operator;
GRANT EXECUTE ON FUNCTION v7_capture.record_review_receipt(bigint,text,text,text,text,text)
  TO v7_capture_reviewer;

-- Owner is not superuser and is itself subject to explicit RLS policy.
ALTER SCHEMA v7_capture OWNER TO v7_capture_owner;
ALTER TABLE v7_capture.policy_head OWNER TO v7_capture_owner;
ALTER TABLE v7_capture.capture_receipts OWNER TO v7_capture_owner;
ALTER TABLE v7_capture.policy_head ENABLE ROW LEVEL SECURITY;
ALTER TABLE v7_capture.policy_head FORCE ROW LEVEL SECURITY;
ALTER TABLE v7_capture.capture_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE v7_capture.capture_receipts FORCE ROW LEVEL SECURITY;
CREATE POLICY v7_capture_owner_policy_head ON v7_capture.policy_head
  FOR ALL TO v7_capture_owner USING (true) WITH CHECK (true);
CREATE POLICY v7_capture_owner_receipts ON v7_capture.capture_receipts
  FOR ALL TO v7_capture_owner USING (true) WITH CHECK (true);
ALTER FUNCTION v7_capture.advance_policy(bigint,bigint,text)
  OWNER TO v7_capture_owner;
ALTER FUNCTION v7_capture.record_review_receipt(bigint,text,text,text,text,text)
  OWNER TO v7_capture_owner;
COMMIT;

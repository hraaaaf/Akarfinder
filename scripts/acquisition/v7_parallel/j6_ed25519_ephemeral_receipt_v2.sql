-- V7 J6 Ed25519 V2: ISOLATED POSTGRESQL17 CI ONLY. NEVER LIVE.
-- Separate namespace/roles from legacy HMAC V1. A stored SHA256 of an
-- Ed25519 signature is NOT signature verification; the verifier must run
-- independently BEFORE an authorized reviewer calls record_receipt.
-- No staging/publication tables, no secret keys, no real operator identity.
BEGIN;
CREATE SCHEMA IF NOT EXISTS v7_capture_ed;
REVOKE ALL ON SCHEMA v7_capture_ed FROM PUBLIC;
DO $$
BEGIN
 IF to_regrole('v7_capture_ed_owner') IS NULL THEN
   CREATE ROLE v7_capture_ed_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
 END IF;
 IF to_regrole('v7_capture_ed_operator') IS NULL THEN
   CREATE ROLE v7_capture_ed_operator NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
 END IF;
 IF to_regrole('v7_capture_ed_reviewer') IS NULL THEN
   CREATE ROLE v7_capture_ed_reviewer NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
 END IF;
END $$;
CREATE TABLE v7_capture_ed.policy_head (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton=true),
 generation bigint NOT NULL CHECK(generation BETWEEN 1 AND 1000000),
 registry_sha256 text NOT NULL CHECK(registry_sha256 ~ '^[0-9a-f]{64}$'),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE v7_capture_ed.receipts (
 signature_sha256 text PRIMARY KEY CHECK(signature_sha256 ~ '^[0-9a-f]{64}$'),
 proof_algorithm text NOT NULL DEFAULT 'Ed25519'
   CHECK (proof_algorithm='Ed25519'),
 key_id text NOT NULL CHECK(key_id ~ '^[A-Za-z0-9._:-]{1,80}$'),
 registry_generation bigint NOT NULL CHECK(registry_generation BETWEEN 1 AND 1000000),
 registry_sha256 text NOT NULL CHECK(registry_sha256 ~ '^[0-9a-f]{64}$'),
 source_domain text NOT NULL CHECK(source_domain IN ('agenz.ma','mubawab.ma','sarouty.ma')),
 source_offer_id text NOT NULL CHECK(source_offer_id ~ '^[0-9]{4,12}$'),
 html_sha256 text NOT NULL CHECK(html_sha256 ~ '^[0-9a-f]{64}$'),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(source_domain,source_offer_id,html_sha256)
);
REVOKE ALL ON ALL TABLES IN SCHEMA v7_capture_ed FROM PUBLIC;
REVOKE ALL ON v7_capture_ed.policy_head,v7_capture_ed.receipts
 FROM v7_capture_ed_operator,v7_capture_ed_reviewer;
GRANT USAGE ON SCHEMA v7_capture_ed
 TO v7_capture_ed_operator,v7_capture_ed_reviewer;
CREATE OR REPLACE FUNCTION v7_capture_ed.advance_policy(
 p_expected bigint,p_next bigint,p_pin text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,v7_capture_ed,pg_temp
AS $$
BEGIN
 IF p_expected IS NULL OR p_next IS NULL OR p_expected<0
    OR p_next <> p_expected+1 OR p_next>1000000
    OR p_pin IS NULL OR p_pin !~ '^[0-9a-f]{64}$'
 THEN RETURN false; END IF;
 IF p_expected=0 THEN
    INSERT INTO v7_capture_ed.policy_head(singleton,generation,registry_sha256)
    VALUES(true,p_next,p_pin) ON CONFLICT(singleton) DO NOTHING;
    RETURN FOUND;
 END IF;
 UPDATE v7_capture_ed.policy_head
 SET generation=p_next,registry_sha256=p_pin,recorded_at=clock_timestamp()
 WHERE singleton=true AND generation=p_expected;
 RETURN FOUND;
END;
$$;
CREATE OR REPLACE FUNCTION v7_capture_ed.record_receipt(
 p_generation bigint,p_pin text,p_signature_sha256 text,
 p_key_id text,p_domain text,p_offer text,p_html_sha256 text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,v7_capture_ed,pg_temp
AS $$
BEGIN
 IF p_generation IS NULL OR p_generation<1
    OR p_pin IS NULL OR p_pin !~ '^[0-9a-f]{64}$'
    OR p_signature_sha256 IS NULL OR p_signature_sha256 !~ '^[0-9a-f]{64}$'
    OR p_key_id IS NULL OR p_key_id !~ '^[A-Za-z0-9._:-]{1,80}$'
    OR p_domain IS NULL OR p_domain NOT IN ('agenz.ma','mubawab.ma','sarouty.ma')
    OR p_offer IS NULL OR p_offer !~ '^[0-9]{4,12}$'
    OR p_html_sha256 IS NULL OR p_html_sha256 !~ '^[0-9a-f]{64}$'
 THEN RETURN false; END IF;
 -- FOR SHARE serializes policy rotation against this receipt transaction.
 PERFORM 1 FROM v7_capture_ed.policy_head
  WHERE singleton=true AND generation=p_generation AND registry_sha256=p_pin FOR SHARE;
 IF NOT FOUND THEN RETURN false; END IF;
 INSERT INTO v7_capture_ed.receipts(
   signature_sha256,proof_algorithm,key_id,registry_generation,registry_sha256,
   source_domain,source_offer_id,html_sha256
 ) VALUES (
   p_signature_sha256,'Ed25519',p_key_id,p_generation,p_pin,p_domain,p_offer,p_html_sha256
 ) ON CONFLICT DO NOTHING;
 RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION v7_capture_ed.advance_policy(bigint,bigint,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION v7_capture_ed.record_receipt(bigint,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION v7_capture_ed.advance_policy(bigint,bigint,text)
 TO v7_capture_ed_operator;
GRANT EXECUTE ON FUNCTION v7_capture_ed.record_receipt(bigint,text,text,text,text,text,text)
 TO v7_capture_ed_reviewer;
ALTER SCHEMA v7_capture_ed OWNER TO v7_capture_ed_owner;
ALTER TABLE v7_capture_ed.policy_head OWNER TO v7_capture_ed_owner;
ALTER TABLE v7_capture_ed.receipts OWNER TO v7_capture_ed_owner;
ALTER TABLE v7_capture_ed.policy_head ENABLE ROW LEVEL SECURITY;
ALTER TABLE v7_capture_ed.policy_head FORCE ROW LEVEL SECURITY;
ALTER TABLE v7_capture_ed.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE v7_capture_ed.receipts FORCE ROW LEVEL SECURITY;
CREATE POLICY v7_capture_ed_owner_head ON v7_capture_ed.policy_head
 FOR ALL TO v7_capture_ed_owner USING(true) WITH CHECK(true);
CREATE POLICY v7_capture_ed_owner_receipts ON v7_capture_ed.receipts
 FOR ALL TO v7_capture_ed_owner USING(true) WITH CHECK(true);
ALTER FUNCTION v7_capture_ed.advance_policy(bigint,bigint,text) OWNER TO v7_capture_ed_owner;
ALTER FUNCTION v7_capture_ed.record_receipt(bigint,text,text,text,text,text,text)
 OWNER TO v7_capture_ed_owner;
COMMIT;

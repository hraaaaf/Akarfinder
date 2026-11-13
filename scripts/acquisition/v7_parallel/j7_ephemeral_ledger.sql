-- V7 J7: EPHEMERAL TEST PROPOSAL ONLY; never applied to a real DB.
-- A slot is permanently unique: no automatic takeover/retry after a crash.
-- CI bootstraps the schema as postgres, then transfers all SECURITY DEFINER
-- ownership to dedicated non-superuser NOLOGIN v7_schedule_owner.
BEGIN;
CREATE SCHEMA IF NOT EXISTS v7_schedule;
REVOKE ALL ON SCHEMA v7_schedule FROM PUBLIC;
CREATE TABLE IF NOT EXISTS v7_schedule.slots (
  slot_index bigint PRIMARY KEY CHECK (slot_index >= 0),
  claim_token uuid NOT NULL,
  status text NOT NULL DEFAULT 'claimed'
      CHECK (status IN ('claimed', 'completed', 'failed')),
  claimed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  finished_at timestamptz,
  CHECK ((status = 'claimed' AND finished_at IS NULL) OR
         (status <> 'claimed' AND finished_at IS NOT NULL))
);
REVOKE ALL ON ALL TABLES IN SCHEMA v7_schedule FROM PUBLIC;
DO $$
BEGIN
 IF to_regrole('v7_schedule_worker') IS NULL THEN
  CREATE ROLE v7_schedule_worker NOLOGIN;
 END IF;
END $$;
GRANT USAGE ON SCHEMA v7_schedule TO v7_schedule_worker;
REVOKE ALL ON v7_schedule.slots FROM v7_schedule_worker;
ALTER TABLE v7_schedule.slots ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION v7_schedule.claim_slot(
  requested_slot bigint, worker_token uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, v7_schedule, pg_temp
AS $$
DECLARE
 current_slot bigint;
BEGIN
 IF requested_slot IS NULL OR requested_slot < 0 OR worker_token IS NULL THEN
  RETURN false;
 END IF;
 -- PostgreSQL authoritative UTC epoch: never allow remote workers to reserve
 -- arbitrary future slots or long-ago slots permanently.
 current_slot := floor(extract(epoch FROM clock_timestamp()) / 600)::bigint;
 IF requested_slot > current_slot OR requested_slot < current_slot - 2 THEN
  RETURN false;
 END IF;
 INSERT INTO v7_schedule.slots(slot_index, claim_token)
 VALUES (requested_slot, worker_token)
 ON CONFLICT (slot_index) DO NOTHING;
 RETURN FOUND;
END;
$$;
CREATE OR REPLACE FUNCTION v7_schedule.finish_slot(
  requested_slot bigint, worker_token uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, v7_schedule, pg_temp
AS $$
BEGIN
 IF requested_slot IS NULL OR worker_token IS NULL THEN
  RETURN false;
 END IF;
 UPDATE v7_schedule.slots SET status='completed', finished_at=clock_timestamp()
 WHERE slot_index=requested_slot AND claim_token=worker_token AND status='claimed'
   AND claimed_at > clock_timestamp() - interval '30 minutes';
 RETURN FOUND;
END;
$$;
CREATE OR REPLACE FUNCTION v7_schedule.fail_slot(
  requested_slot bigint, worker_token uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, v7_schedule, pg_temp
AS $$
BEGIN
 IF requested_slot IS NULL OR worker_token IS NULL THEN
  RETURN false;
 END IF;
 UPDATE v7_schedule.slots SET status='failed', finished_at=clock_timestamp()
 WHERE slot_index=requested_slot AND claim_token=worker_token AND status='claimed'
   AND claimed_at > clock_timestamp() - interval '30 minutes';
 RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION v7_schedule.claim_slot(bigint, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION v7_schedule.finish_slot(bigint, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION v7_schedule.fail_slot(bigint, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION v7_schedule.claim_slot(bigint, uuid) TO v7_schedule_worker;
GRANT EXECUTE ON FUNCTION v7_schedule.finish_slot(bigint, uuid) TO v7_schedule_worker;
GRANT EXECUTE ON FUNCTION v7_schedule.fail_slot(bigint, uuid) TO v7_schedule_worker;

-- J7 next slice: dedicated NOLOGIN/NO-BYPASSRLS owner, not postgres.
-- This ownership transfer is validated ONLY in ephemeral PostgreSQL 17 CI.
DO $$
BEGIN
 IF to_regrole('v7_schedule_owner') IS NULL THEN
  CREATE ROLE v7_schedule_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
 END IF;
END $$;

-- Transaction-fenced marker: proof of an authorized, current worker token
-- within the SAME database transaction. NOT a network side effect, not an
-- externally durable registry and not a permit to collect or publish.
CREATE TABLE IF NOT EXISTS v7_schedule.fenced_markers (
  slot_index bigint NOT NULL REFERENCES v7_schedule.slots(slot_index),
  marker_name text NOT NULL CHECK (marker_name ~ '^[a-z0-9][a-z0-9:_-]{0,63}$'),
  evidence_sha256 text NOT NULL CHECK (evidence_sha256 ~ '^[0-9a-f]{64}$'),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (slot_index, marker_name)
);
REVOKE ALL ON v7_schedule.fenced_markers FROM PUBLIC;
REVOKE ALL ON v7_schedule.fenced_markers FROM v7_schedule_worker;
ALTER TABLE v7_schedule.fenced_markers ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION v7_schedule.record_fenced_marker(
  requested_slot bigint, worker_token uuid, marker_name text,
  evidence_sha256 text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, v7_schedule, pg_temp
AS $$
BEGIN
 IF requested_slot IS NULL OR requested_slot < 0 OR worker_token IS NULL
    OR marker_name IS NULL OR marker_name !~ '^[a-z0-9][a-z0-9:_-]{0,63}$'
    OR evidence_sha256 IS NULL OR evidence_sha256 !~ '^[0-9a-f]{64}$'
 THEN
  RETURN false;
 END IF;
 -- Serializes against a concurrent finish/fail; stale or foreign tokens fail.
 PERFORM 1 FROM v7_schedule.slots
 WHERE slot_index=requested_slot AND claim_token=worker_token
   AND status='claimed'
   AND claimed_at > clock_timestamp() - interval '30 minutes' FOR UPDATE;
 IF NOT FOUND THEN
  RETURN false;
 END IF;
 INSERT INTO v7_schedule.fenced_markers(slot_index, marker_name, evidence_sha256)
 VALUES (requested_slot, marker_name, evidence_sha256)
 ON CONFLICT ON CONSTRAINT fenced_markers_pkey DO NOTHING;
 RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION v7_schedule.record_fenced_marker(bigint, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION v7_schedule.record_fenced_marker(bigint, uuid, text, text)
 TO v7_schedule_worker;

-- Functions execute with this dedicated unprivileged owner. FORCE RLS
-- subjects even the table owner to an explicit policy. Worker has no table
-- privileges; separate functions remain its sole mutation entrypoints.
ALTER SCHEMA v7_schedule OWNER TO v7_schedule_owner;
ALTER TABLE v7_schedule.slots OWNER TO v7_schedule_owner;
ALTER TABLE v7_schedule.fenced_markers OWNER TO v7_schedule_owner;
ALTER TABLE v7_schedule.slots FORCE ROW LEVEL SECURITY;
ALTER TABLE v7_schedule.fenced_markers FORCE ROW LEVEL SECURITY;
CREATE POLICY v7_schedule_owner_slots ON v7_schedule.slots
 FOR ALL TO v7_schedule_owner USING (true) WITH CHECK (true);
CREATE POLICY v7_schedule_owner_markers ON v7_schedule.fenced_markers
 FOR ALL TO v7_schedule_owner USING (true) WITH CHECK (true);
ALTER FUNCTION v7_schedule.claim_slot(bigint, uuid) OWNER TO v7_schedule_owner;
ALTER FUNCTION v7_schedule.finish_slot(bigint, uuid) OWNER TO v7_schedule_owner;
ALTER FUNCTION v7_schedule.fail_slot(bigint, uuid) OWNER TO v7_schedule_owner;
ALTER FUNCTION v7_schedule.record_fenced_marker(bigint, uuid, text, text)
 OWNER TO v7_schedule_owner;

COMMIT;

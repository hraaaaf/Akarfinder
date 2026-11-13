-- V7 J7: EPHEMERAL TEST PROPOSAL ONLY; never applied to a real DB.
-- A slot is permanently unique: no automatic takeover/retry after a crash.
-- SECURITY DEFINER is only exercised with a superuser OWNER IN TEST CI.
-- A real migration would need an audited dedicated non-superuser owner.
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
SET search_path = pg_catalog, v7_schedule
AS $$
BEGIN
 IF requested_slot IS NULL OR requested_slot < 0 OR worker_token IS NULL THEN
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
SET search_path = pg_catalog, v7_schedule
AS $$
BEGIN
 IF requested_slot IS NULL OR worker_token IS NULL THEN
  RETURN false;
 END IF;
 UPDATE v7_schedule.slots SET status='completed', finished_at=clock_timestamp()
 WHERE slot_index=requested_slot AND claim_token=worker_token AND status='claimed';
 RETURN FOUND;
END;
$$;
CREATE OR REPLACE FUNCTION v7_schedule.fail_slot(
  requested_slot bigint, worker_token uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, v7_schedule
AS $$
BEGIN
 IF requested_slot IS NULL OR worker_token IS NULL THEN
  RETURN false;
 END IF;
 UPDATE v7_schedule.slots SET status='failed', finished_at=clock_timestamp()
 WHERE slot_index=requested_slot AND claim_token=worker_token AND status='claimed';
 RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION v7_schedule.claim_slot(bigint, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION v7_schedule.finish_slot(bigint, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION v7_schedule.fail_slot(bigint, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION v7_schedule.claim_slot(bigint, uuid) TO v7_schedule_worker;
GRANT EXECUTE ON FUNCTION v7_schedule.finish_slot(bigint, uuid) TO v7_schedule_worker;
GRANT EXECUTE ON FUNCTION v7_schedule.fail_slot(bigint, uuid) TO v7_schedule_worker;
COMMIT;

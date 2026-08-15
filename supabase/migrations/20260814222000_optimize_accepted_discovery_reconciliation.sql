-- DATA-FUNNEL-RECONCILIATION-PERF-1
-- The reconciliation worker keyset-paginates accepted discovery rows by UUID id.
-- A status-only index cannot satisfy WHERE discovery_status='accepted' ORDER BY id,
-- causing PostgreSQL to walk the primary-key index and filter large numbers of rows.
-- This partial index matches the worker's exact access path and keeps the index small.

create index if not exists discovery_candidates_accepted_id_idx
on discovery_candidates (id)
where discovery_status = 'accepted';

-- Rollback (manual):
-- drop index if exists discovery_candidates_accepted_id_idx;

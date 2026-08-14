-- OPENSERP-DB-RECONCILIATION-TIMEOUT-1
-- Target the two query shapes proven slow in Production:
--   1) national-writer lookup by canonical_url;
--   2) automated reconciliation of accepted discovery rows in stable id order.
--
-- discovery_candidates currently has a partial composite unique index on
-- (provider, query_hash, canonical_url). PostgreSQL can use it for a
-- canonical_url-only predicate, but at high estimated cost because the two
-- leading keys are unconstrained. This dedicated partial index makes that
-- lookup direct.
--
-- The automated reconciler is intentionally restricted to accepted rows
-- (the actual accepted->listing gap it exists to heal) and keyset-paginates
-- by id. The composite index supports both the status predicate and cursor.

create index if not exists discovery_candidates_canonical_url_idx
  on public.discovery_candidates (canonical_url)
  where canonical_url is not null;

create index if not exists discovery_candidates_status_id_idx
  on public.discovery_candidates (discovery_status, id);

analyze public.discovery_candidates;

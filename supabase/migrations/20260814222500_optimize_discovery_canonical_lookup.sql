-- DATA-FUNNEL-RECONCILIATION-PERF-2
-- The national writer batches discovery_candidates lookups by canonical_url.
-- The existing partial unique index starts with (provider, query_hash), so it
-- cannot efficiently satisfy canonical_url IN (...). Add the direct lookup
-- index used by writer_discovery_candidates_lookup.

create index if not exists discovery_candidates_canonical_url_idx
on discovery_candidates (canonical_url)
where canonical_url is not null;

-- Rollback (manual):
-- drop index if exists discovery_candidates_canonical_url_idx;

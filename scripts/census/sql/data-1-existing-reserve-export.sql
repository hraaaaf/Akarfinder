-- DATA-1.2 — Existing Reserve Census
-- READ ONLY. This query exports the already-persisted B3 reserve lane.
-- It does not mutate Source Registry, seeds, listings, ranking, or publication.

select
  lower(source_domain) as source_domain,
  canonical_url,
  provider,
  last_seen_at,
  decision
from public.odm_b3_discovery_expansion_audit_v1
where decision = 'reserve_unregistered_source'
order by lower(source_domain), canonical_url, provider;

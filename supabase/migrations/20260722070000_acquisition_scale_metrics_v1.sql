-- DATA-MASS-ACQUISITION-QUERY-UNIVERSE-V2-1
-- Objective: expose one service-role-only snapshot of progress toward the
-- 100k raw-observation / 37k unique-cluster scale targets.
-- Preconditions: discovery_candidates, source_offer_observations,
-- property_listings and property_clusters already exist.
-- Impact: additive view only; no existing row is modified.
-- Re-run behavior: CREATE OR REPLACE VIEW is idempotent.
-- Rollback: DROP VIEW public.acquisition_scale_metrics_v1.

create or replace view public.acquisition_scale_metrics_v1
with (security_invoker = true)
as
select
  100000::bigint as target_raw_observations,
  37000::bigint as target_unique_clusters,
  (select count(*)::bigint from public.discovery_candidates) as discovery_candidate_rows,
  (select count(*)::bigint from public.source_offer_observations) as source_offer_observation_rows,
  (
    (select count(*)::bigint from public.discovery_candidates) +
    (select count(*)::bigint from public.source_offer_observations)
  ) as raw_observations,
  (
    select count(distinct canonical_url)::bigint
    from public.discovery_candidates
    where canonical_url is not null
  ) as unique_canonical_urls,
  (select count(*)::bigint from public.property_listings) as property_listings,
  (select count(*)::bigint from public.property_clusters) as property_clusters,
  now() as measured_at;

revoke all on public.acquisition_scale_metrics_v1 from anon, authenticated;
grant select on public.acquisition_scale_metrics_v1 to service_role;

-- ROLLBACK (manual, not auto-applied):
-- drop view if exists public.acquisition_scale_metrics_v1;

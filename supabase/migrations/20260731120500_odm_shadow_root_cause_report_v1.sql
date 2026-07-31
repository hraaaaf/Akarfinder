create or replace view public.odm_shadow_divergence_root_cause_report_v1
with (security_invoker = true)
as
select
  case
    when legacy_result_count = 0 and odm_result_count > 0 then 'coverage_gain_odm'
    when legacy_result_count > 0 and odm_result_count = 0 then 'coverage_loss_odm'
    when legacy_comparable_count = 0 and legacy_result_count > 0 then 'legacy_identity_missing'
    when odm_comparable_count = 0 and odm_result_count > 0 then 'odm_identity_missing'
    when legacy_result_count > 0
      and odm_result_count > 0
      and canonical_overlap_count = 0 then 'identity_or_filter_mismatch'
    when canonical_overlap_rate < 0.25 then 'low_overlap'
    when trusted_surface_comparisons > 0
      and trusted_surface_divergences::numeric / trusted_surface_comparisons > 0.20 then 'surface_divergence'
    when trusted_price_comparisons > 0
      and trusted_price_divergences::numeric / trusted_price_comparisons > 0.20 then 'price_divergence'
    else 'healthy_or_inconclusive'
  end as root_cause_bucket,
  count(*)::bigint as event_count,
  count(*) filter (where legacy_result_count > 0)::bigint as events_with_legacy,
  count(*) filter (where odm_result_count > 0)::bigint as events_with_odm,
  count(*) filter (where canonical_overlap_count > 0)::bigint as events_with_overlap,
  avg(canonical_overlap_rate) as avg_overlap_rate,
  avg(rank_overlap_at_10::numeric) as avg_rank_overlap_at_10,
  sum(trusted_price_comparisons)::bigint as price_comparisons,
  sum(trusted_price_divergences)::bigint as price_divergences,
  sum(trusted_surface_comparisons)::bigint as surface_comparisons,
  sum(trusted_surface_divergences)::bigint as surface_divergences,
  min(created_at) as first_event_at,
  max(created_at) as last_event_at
from public.odm_shadow_divergence_events_v1
where created_at >= now() - interval '14 days'
group by 1;

revoke all on public.odm_shadow_divergence_root_cause_report_v1 from public, anon, authenticated;
grant select on public.odm_shadow_divergence_root_cause_report_v1 to service_role;

comment on view public.odm_shadow_divergence_root_cause_report_v1 is
  'Private 14-day ODM shadow divergence classification. No public response or ranking impact.';

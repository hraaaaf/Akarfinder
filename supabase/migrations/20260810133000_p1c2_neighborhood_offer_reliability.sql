-- P1C.2 — Neighborhood Offer Reliability Engine
-- Internal-only reliability evaluation over P1C.1 Shadow metrics.
-- Thresholds are explicit AkarFinder policy, not an external statistical standard.
-- No public activation. No market-representativeness claim. No Search/Geo mutation.

create or replace function public.odm_p1c2_metric_reliability_level_v1(
  p_sample_count bigint,
  p_field_coverage_percent numeric,
  p_fresh_sample_percent numeric,
  p_source_domain_count bigint,
  p_outlier_percent numeric,
  p_iqr_to_median_ratio numeric
)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
select case
  when p_sample_count >= 20
   and p_field_coverage_percent >= 75
   and p_fresh_sample_percent >= 70
   and p_source_domain_count >= 3
   and p_outlier_percent <= 15
   and p_iqr_to_median_ratio <= 0.75 then 'strong'
  when p_sample_count >= 10
   and p_field_coverage_percent >= 60
   and p_fresh_sample_percent >= 60
   and p_source_domain_count >= 2
   and p_outlier_percent <= 20
   and p_iqr_to_median_ratio <= 1.00 then 'moderate'
  when p_sample_count >= 5
   and p_field_coverage_percent >= 50
   and p_fresh_sample_percent >= 50
   and p_source_domain_count >= 2
   and p_outlier_percent <= 30
   and p_iqr_to_median_ratio <= 1.50 then 'limited'
  else 'insufficient'
end;
$$;

revoke all on function public.odm_p1c2_metric_reliability_level_v1(bigint,numeric,numeric,bigint,numeric,numeric) from public, anon, authenticated;
grant execute on function public.odm_p1c2_metric_reliability_level_v1(bigint,numeric,numeric,bigint,numeric,numeric) to service_role;

create or replace function public.odm_p1c2_segment_sample_health_level_v1(
  p_listing_count bigint,
  p_fresh_listing_percent numeric,
  p_source_domain_count bigint
)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
select case
  when p_listing_count >= 20
   and p_fresh_listing_percent >= 70
   and p_source_domain_count >= 3 then 'strong'
  when p_listing_count >= 10
   and p_fresh_listing_percent >= 60
   and p_source_domain_count >= 2 then 'moderate'
  when p_listing_count >= 5
   and p_fresh_listing_percent >= 50
   and p_source_domain_count >= 2 then 'limited'
  else 'insufficient'
end;
$$;

revoke all on function public.odm_p1c2_segment_sample_health_level_v1(bigint,numeric,bigint) from public, anon, authenticated;
grant execute on function public.odm_p1c2_segment_sample_health_level_v1(bigint,numeric,bigint) to service_role;

create or replace function public.odm_p1c2_reliability_policy_v1()
returns jsonb
language sql
immutable
security invoker
set search_path = ''
as $$
select jsonb_build_object(
  'contract_version', 'p1c2_neighborhood_offer_reliability_v1',
  'metric_levels', jsonb_build_array('insufficient','limited','moderate','strong'),
  'metric_thresholds', jsonb_build_object(
    'limited', jsonb_build_object('min_sample_count',5,'min_field_coverage_percent',50,'min_fresh_sample_percent',50,'min_source_domain_count',2,'max_outlier_percent',30,'max_iqr_to_median_ratio',1.50),
    'moderate', jsonb_build_object('min_sample_count',10,'min_field_coverage_percent',60,'min_fresh_sample_percent',60,'min_source_domain_count',2,'max_outlier_percent',20,'max_iqr_to_median_ratio',1.00),
    'strong', jsonb_build_object('min_sample_count',20,'min_field_coverage_percent',75,'min_fresh_sample_percent',70,'min_source_domain_count',3,'max_outlier_percent',15,'max_iqr_to_median_ratio',0.75)
  ),
  'segment_sample_health_thresholds', jsonb_build_object(
    'limited', jsonb_build_object('min_listing_count',5,'min_fresh_listing_percent',50,'min_source_domain_count',2),
    'moderate', jsonb_build_object('min_listing_count',10,'min_fresh_listing_percent',60,'min_source_domain_count',2),
    'strong', jsonb_build_object('min_listing_count',20,'min_fresh_listing_percent',70,'min_source_domain_count',3)
  ),
  'outlier_rule', 'tukey_1_5_iqr',
  'dispersion_rule', 'iqr_divided_by_median',
  'thresholds_are_internal_policy_not_external_standard', true,
  'market_representativeness_certified', false,
  'public_activation', false,
  'metric_layers_activated', false,
  'p1c3_auto_activation', false
);
$$;

revoke all on function public.odm_p1c2_reliability_policy_v1() from public, anon, authenticated;
grant execute on function public.odm_p1c2_reliability_policy_v1() to service_role;

create or replace view public.odm_neighborhood_offer_reliability_segment_health_v1
with (security_invoker = true)
as
with aggregated as (
  select
    city_id,
    city_slug,
    city_name,
    neighborhood_id,
    neighborhood_slug,
    neighborhood_name,
    coalesce(transaction_type, 'unknown') as transaction_type,
    count(*)::bigint as listing_count,
    count(*) filter (where freshness_status = 'fresh_confirmed')::bigint as fresh_confirmed_count,
    count(*) filter (where freshness_status = 'seed_only')::bigint as seed_only_count,
    count(distinct source_domain)::bigint as source_domain_count,
    round(
      (count(*) filter (where freshness_status = 'fresh_confirmed'))::numeric
      / nullif(count(*)::numeric, 0) * 100,
      2
    ) as fresh_listing_percent
  from public.odm_neighborhood_offer_shadow_listing_v1
  group by
    city_id, city_slug, city_name,
    neighborhood_id, neighborhood_slug, neighborhood_name,
    coalesce(transaction_type, 'unknown')
)
select
  a.*,
  public.odm_p1c2_segment_sample_health_level_v1(
    a.listing_count,
    a.fresh_listing_percent,
    a.source_domain_count
  ) as sample_health_level,
  true as reliability_evaluated,
  false as market_representativeness_certified,
  false as public_activation,
  false as metric_layers_activated,
  'shadow'::text as metric_state
from aggregated a;

revoke all on public.odm_neighborhood_offer_reliability_segment_health_v1 from public, anon, authenticated;
grant select on public.odm_neighborhood_offer_reliability_segment_health_v1 to service_role;

create or replace view public.odm_neighborhood_offer_reliability_metric_v1
with (security_invoker = true)
as
with segments as (
  select
    city_id,
    city_slug,
    city_name,
    neighborhood_id,
    neighborhood_slug,
    neighborhood_name,
    transaction_type,
    listing_count
  from public.odm_neighborhood_offer_reliability_segment_health_v1
), metric_catalog(metric_name) as (
  values ('price_mad'::text), ('surface_m2'::text), ('price_per_m2_mad'::text)
), metric_values as (
  select city_id, neighborhood_id, coalesce(transaction_type,'unknown') as transaction_type,
         'price_mad'::text as metric_name, price_mad::numeric as metric_value,
         freshness_status, source_domain
  from public.odm_neighborhood_offer_shadow_listing_v1
  where price_mad is not null
  union all
  select city_id, neighborhood_id, coalesce(transaction_type,'unknown'),
         'surface_m2'::text, surface_m2::numeric, freshness_status, source_domain
  from public.odm_neighborhood_offer_shadow_listing_v1
  where surface_m2 is not null
  union all
  select city_id, neighborhood_id, coalesce(transaction_type,'unknown'),
         'price_per_m2_mad'::text, price_per_m2_mad::numeric, freshness_status, source_domain
  from public.odm_neighborhood_offer_shadow_listing_v1
  where price_per_m2_mad is not null
), base_stats as (
  select
    s.city_id,
    s.city_slug,
    s.city_name,
    s.neighborhood_id,
    s.neighborhood_slug,
    s.neighborhood_name,
    s.transaction_type,
    s.listing_count,
    m.metric_name,
    count(v.metric_value)::bigint as sample_count,
    count(v.metric_value) filter (where v.freshness_status = 'fresh_confirmed')::bigint as fresh_sample_count,
    count(distinct v.source_domain)::bigint as source_domain_count,
    percentile_cont(0.25) within group (order by v.metric_value) filter (where v.metric_value is not null)::numeric as q1,
    percentile_cont(0.50) within group (order by v.metric_value) filter (where v.metric_value is not null)::numeric as median,
    percentile_cont(0.75) within group (order by v.metric_value) filter (where v.metric_value is not null)::numeric as q3
  from segments s
  cross join metric_catalog m
  left join metric_values v
    on v.city_id = s.city_id
   and v.neighborhood_id = s.neighborhood_id
   and v.transaction_type = s.transaction_type
   and v.metric_name = m.metric_name
  group by
    s.city_id, s.city_slug, s.city_name,
    s.neighborhood_id, s.neighborhood_slug, s.neighborhood_name,
    s.transaction_type, s.listing_count, m.metric_name
), derived as (
  select
    b.*,
    round((b.sample_count::numeric / nullif(b.listing_count::numeric,0)) * 100, 2) as field_coverage_percent,
    case when b.sample_count = 0 then 0::numeric
         else round((b.fresh_sample_count::numeric / b.sample_count::numeric) * 100, 2) end as fresh_sample_percent,
    case when b.q1 is null or b.q3 is null then null::numeric else round(b.q3 - b.q1, 4) end as iqr,
    case when b.median is null or b.median <= 0 or b.q1 is null or b.q3 is null then null::numeric
         else round((b.q3 - b.q1) / b.median, 4) end as iqr_to_median_ratio
  from base_stats b
), outlier_stats as (
  select
    d.city_id,
    d.neighborhood_id,
    d.transaction_type,
    d.metric_name,
    count(v.metric_value) filter (
      where d.iqr is not null
        and (v.metric_value < d.q1 - (1.5 * d.iqr)
          or v.metric_value > d.q3 + (1.5 * d.iqr))
    )::bigint as outlier_count
  from derived d
  left join metric_values v
    on v.city_id = d.city_id
   and v.neighborhood_id = d.neighborhood_id
   and v.transaction_type = d.transaction_type
   and v.metric_name = d.metric_name
  group by d.city_id, d.neighborhood_id, d.transaction_type, d.metric_name
), scored as (
  select
    d.*,
    o.outlier_count,
    case when d.sample_count = 0 then 0::numeric
         else round((o.outlier_count::numeric / d.sample_count::numeric) * 100, 2) end as outlier_percent
  from derived d
  join outlier_stats o
    on o.city_id = d.city_id
   and o.neighborhood_id = d.neighborhood_id
   and o.transaction_type = d.transaction_type
   and o.metric_name = d.metric_name
), classified as (
  select
    s.*,
    public.odm_p1c2_metric_reliability_level_v1(
      s.sample_count,
      s.field_coverage_percent,
      s.fresh_sample_percent,
      s.source_domain_count,
      s.outlier_percent,
      s.iqr_to_median_ratio
    ) as reliability_level
  from scored s
)
select
  c.*,
  (c.reliability_level in ('moderate','strong')) as p1c3_review_candidate,
  jsonb_build_object(
    'sample_count', c.sample_count,
    'listing_count', c.listing_count,
    'field_coverage_percent', c.field_coverage_percent,
    'fresh_sample_percent', c.fresh_sample_percent,
    'source_domain_count', c.source_domain_count,
    'q1', c.q1,
    'median', c.median,
    'q3', c.q3,
    'iqr', c.iqr,
    'iqr_to_median_ratio', c.iqr_to_median_ratio,
    'outlier_count', c.outlier_count,
    'outlier_percent', c.outlier_percent
  ) as reliability_evidence,
  true as reliability_evaluated,
  false as market_representativeness_certified,
  false as public_activation,
  false as metric_layers_activated,
  false as p1c3_auto_activation,
  'shadow'::text as metric_state,
  'p1c2_neighborhood_offer_reliability_v1'::text as reliability_policy_version
from classified c;

revoke all on public.odm_neighborhood_offer_reliability_metric_v1 from public, anon, authenticated;
grant select on public.odm_neighborhood_offer_reliability_metric_v1 to service_role;

create or replace function public.odm_neighborhood_offer_reliability_report_v1()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
with metric as (
  select * from public.odm_neighborhood_offer_reliability_metric_v1
), segment as (
  select * from public.odm_neighborhood_offer_reliability_segment_health_v1
), p1c1 as (
  select public.odm_neighborhood_offer_shadow_report_v1() as report
)
select jsonb_build_object(
  'contract_version', 'p1c2_neighborhood_offer_reliability_v1',
  'metric_rows', count(*)::bigint,
  'segments', (select count(*)::bigint from segment),
  'metric_levels', jsonb_build_object(
    'insufficient', count(*) filter (where reliability_level='insufficient'),
    'limited', count(*) filter (where reliability_level='limited'),
    'moderate', count(*) filter (where reliability_level='moderate'),
    'strong', count(*) filter (where reliability_level='strong')
  ),
  'p1c3_review_candidates', count(*) filter (where p1c3_review_candidate),
  'price_metric_review_candidates', count(*) filter (where metric_name in ('price_mad','price_per_m2_mad') and p1c3_review_candidate),
  'segment_sample_health_levels', jsonb_build_object(
    'insufficient', (select count(*) from segment where sample_health_level='insufficient'),
    'limited', (select count(*) from segment where sample_health_level='limited'),
    'moderate', (select count(*) from segment where sample_health_level='moderate'),
    'strong', (select count(*) from segment where sample_health_level='strong')
  ),
  'p1c1_contract_version', p1c1.report->>'contract_version',
  'p1c1_listing_rows', (p1c1.report->>'listing_rows')::bigint,
  'p1c1_neighborhoods', (p1c1.report->>'neighborhoods')::bigint,
  'thresholds_are_internal_policy_not_external_standard', true,
  'reliability_evaluated', true,
  'market_representativeness_certified', false,
  'public_activation', false,
  'metric_layers_activated', false,
  'p1c3_auto_activation', false,
  'next_boundary', 'P1C.3 may review moderate/strong metric rows individually; no metric is auto-published.'
)
from metric
cross join p1c1
;
$$;

revoke all on function public.odm_neighborhood_offer_reliability_report_v1() from public, anon, authenticated;
grant execute on function public.odm_neighborhood_offer_reliability_report_v1() to service_role;

comment on function public.odm_p1c2_metric_reliability_level_v1(bigint,numeric,numeric,bigint,numeric,numeric) is
  'P1C.2 conservative internal reliability classifier. Fewer than five metric samples always means insufficient.';
comment on view public.odm_neighborhood_offer_reliability_metric_v1 is
  'P1C.2 metric-specific reliability by neighborhood x transaction. Missing metrics remain explicit zero-sample rows. No public activation.';
comment on view public.odm_neighborhood_offer_reliability_segment_health_v1 is
  'P1C.2 observed sample health only. It never certifies market representativeness.';
comment on function public.odm_neighborhood_offer_reliability_report_v1() is
  'P1C.2 internal report. Moderate/strong rows are review candidates for P1C.3, never auto-published.';

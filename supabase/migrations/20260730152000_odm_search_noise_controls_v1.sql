-- ODM SEARCH NOISE CONTROLS V1
-- Shadow-only user search modes and honest filter capability registry.
-- No public search, Thin Index, SERP, publication, ranking policy or display-policy mutation.

create or replace function public.odm_search_control_capabilities_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
select jsonb_build_object(
  'version','odm_search_noise_controls_v1',
  'modes',jsonb_build_array('default','maximum_coverage','low_noise'),
  'filters',jsonb_build_object(
    'price',true,
    'surface',true,
    'fresh_only',true,
    'require_price',true,
    'require_surface',true,
    'photo',false,
    'owner',false,
    'premium',false,
    'partner',false
  ),
  'unavailable_reasons',jsonb_build_object(
    'photo','no reliable media signal is joined to ODM observations',
    'owner','no reliable owner identity is joined to ODM observations',
    'premium','commercial tier is not reliably mapped to ODM observations',
    'partner','partner status is not reliably mapped to ODM observations'
  ),
  'shadow_only',true,
  'public_activation',false
);
$$;

create or replace function public.search_odm_noise_controls_shadow_v1(
  p_query text default null,
  p_city text default null,
  p_property_type text default null,
  p_intent text default null,
  p_mode text default 'default',
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_min_surface numeric default null,
  p_max_surface numeric default null,
  p_fresh_only boolean default false,
  p_require_price boolean default false,
  p_require_surface boolean default false,
  p_limit integer default 100
)
returns table(
  observation_id text,
  seed_id uuid,
  canonical_url text,
  source_domain text,
  title text,
  snippet text,
  normalized_city text,
  normalized_property_type text,
  normalized_intent text,
  normalized_price_mad numeric,
  normalized_surface_m2 numeric,
  freshness_status_v2 text,
  display_tier_v2 text,
  ranking_score_v2 real,
  lane_weight smallint,
  applied_mode text,
  noise_control_reasons text[],
  controls_version text
)
language sql
stable
security invoker
set search_path=''
as $$
with params as (
  select
    case when p_mode in ('default','maximum_coverage','low_noise') then p_mode else 'default' end as mode,
    least(greatest(coalesce(p_limit,100),1),500) as result_limit
), candidates as (
  select
    r.*,
    v.freshness_status_v2,
    v.economic_status,
    v.has_exploitable_evidence,
    array_remove(array[
      case when p_min_price is not null then 'min_price' end,
      case when p_max_price is not null then 'max_price' end,
      case when p_min_surface is not null then 'min_surface' end,
      case when p_max_surface is not null then 'max_surface' end,
      case when p_fresh_only then 'fresh_only' end,
      case when p_require_price then 'require_price' end,
      case when p_require_surface then 'require_surface' end
    ],null)::text[] as control_reasons
  from public.search_odm_ranking_shadow_v2(
    p_query,p_city,p_property_type,p_intent,500
  ) r
  join public.odm_display_policy_shadow_v2 v on v.observation_id=r.observation_id
), filtered as (
  select c.*,p.mode
  from candidates c cross join params p
  where (p_min_price is null or c.normalized_price_mad>=p_min_price)
    and (p_max_price is null or c.normalized_price_mad<=p_max_price)
    and (p_min_surface is null or c.normalized_surface_m2>=p_min_surface)
    and (p_max_surface is null or c.normalized_surface_m2<=p_max_surface)
    and (not p_fresh_only or c.freshness_status_v2='fresh')
    and (not p_require_price or c.normalized_price_mad is not null)
    and (not p_require_surface or c.normalized_surface_m2 is not null)
    and (
      p.mode='maximum_coverage'
      or (p.mode='default' and (c.display_tier_v2='displayable_ranked' or c.ranking_score_v2>=0.08))
      or (p.mode='low_noise' and (
        c.display_tier_v2='displayable_ranked'
        or (
          c.ranking_score_v2>=0.28
          and c.freshness_status_v2 in ('fresh','aging')
          and c.has_exploitable_evidence
          and not ('low_or_unscored_quality'=any(c.decision_reasons_v2))
          and not ('price_rejected'=any(c.decision_reasons_v2))
          and not ('price_ambiguous'=any(c.decision_reasons_v2))
          and not ('economic_policy_blocked'=any(c.decision_reasons_v2))
        )
      ))
    )
)
select
  observation_id,seed_id,canonical_url,source_domain,title,snippet,
  normalized_city,normalized_property_type,normalized_intent,
  normalized_price_mad,normalized_surface_m2,freshness_status_v2,
  display_tier_v2,ranking_score_v2,lane_weight,mode,
  control_reasons,'odm_search_noise_controls_v1'::text
from filtered
order by lane_weight asc,ranking_score_v2 desc,seed_id desc
limit (select result_limit from params);
$$;

create or replace function public.odm_search_noise_controls_report_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
with maximum_coverage as (
  select * from public.search_odm_noise_controls_shadow_v1(null,null,null,null,'maximum_coverage',null,null,null,null,false,false,false,500)
), default_mode as (
  select * from public.search_odm_noise_controls_shadow_v1(null,null,null,null,'default',null,null,null,null,false,false,false,500)
), low_noise as (
  select * from public.search_odm_noise_controls_shadow_v1(null,null,null,null,'low_noise',null,null,null,null,false,false,false,500)
), fresh_only as (
  select * from public.search_odm_noise_controls_shadow_v1(null,null,null,null,'maximum_coverage',null,null,null,null,true,false,false,500)
), with_price as (
  select * from public.search_odm_noise_controls_shadow_v1(null,null,null,null,'maximum_coverage',null,null,null,null,false,true,false,500)
), with_surface as (
  select * from public.search_odm_noise_controls_shadow_v1(null,null,null,null,'maximum_coverage',null,null,null,null,false,false,true,500)
), counts as (
  select
    (select count(*) from maximum_coverage)::bigint max_rows,
    (select count(*) from default_mode)::bigint default_rows,
    (select count(*) from low_noise)::bigint low_rows,
    (select count(*) from fresh_only)::bigint fresh_rows,
    (select count(*) from with_price)::bigint price_rows,
    (select count(*) from with_surface)::bigint surface_rows
), gates as (
  select jsonb_build_object(
    'mode_counts_monotonic',max_rows>=default_rows and default_rows>=low_rows,
    'maximum_coverage_preserves_rankable',(select count(*) from maximum_coverage)=(select count(*) from public.odm_display_policy_shadow_v2 where display_tier_v2 in ('displayable_ranked','displayable_degraded')),
    'blocked_rows_absent',(select count(*) from maximum_coverage where display_tier_v2='blocked')=0,
    'fresh_filter_honored',(select count(*) from fresh_only where freshness_status_v2<>'fresh')=0,
    'price_filter_honored',(select count(*) from with_price where normalized_price_mad is null)=0,
    'surface_filter_honored',(select count(*) from with_surface where normalized_surface_m2 is null)=0,
    'unsupported_filters_not_fabricated',
      (public.odm_search_control_capabilities_v1()#>>'{filters,photo}')='false'
      and (public.odm_search_control_capabilities_v1()#>>'{filters,owner}')='false'
      and (public.odm_search_control_capabilities_v1()#>>'{filters,premium}')='false'
      and (public.odm_search_control_capabilities_v1()#>>'{filters,partner}')='false',
    'active_search_unchanged',true,
    'serp_unchanged',true,
    'publication_remains_disabled',true
  ) value from counts
)
select jsonb_build_object(
  'audit_version','odm_search_noise_controls_v1',
  'generated_at',now(),
  'counts',jsonb_build_object(
    'maximum_coverage',(select max_rows from counts),
    'default',(select default_rows from counts),
    'low_noise',(select low_rows from counts),
    'fresh_only',(select fresh_rows from counts),
    'require_price',(select price_rows from counts),
    'require_surface',(select surface_rows from counts)
  ),
  'capabilities',public.odm_search_control_capabilities_v1(),
  'gates',(select value from gates),
  'active_search_changed',false,
  'serp_changed',false,
  'publication_activated',false
);
$$;

revoke all on function public.odm_search_control_capabilities_v1() from public,anon,authenticated;
revoke all on function public.search_odm_noise_controls_shadow_v1(text,text,text,text,text,numeric,numeric,numeric,numeric,boolean,boolean,boolean,integer) from public,anon,authenticated;
revoke all on function public.odm_search_noise_controls_report_v1() from public,anon,authenticated;
grant execute on function public.odm_search_control_capabilities_v1() to service_role;
grant execute on function public.search_odm_noise_controls_shadow_v1(text,text,text,text,text,numeric,numeric,numeric,numeric,boolean,boolean,boolean,integer) to service_role;
grant execute on function public.odm_search_noise_controls_report_v1() to service_role;

comment on function public.search_odm_noise_controls_shadow_v1(text,text,text,text,text,numeric,numeric,numeric,numeric,boolean,boolean,boolean,integer) is 'Shadow-only Search Noise Controls V1: default, maximum coverage and low-noise modes plus evidence-backed numeric/freshness filters.';

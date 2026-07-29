-- ODM-FRESHNESS-SCORE-V1
-- Deterministic, source-aware freshness scoring for Shadow only.
-- No public read model, ranking, display eligibility or SERP state is mutated.

create or replace function public.odm_audit_freshness_score_v1(
  p_observed_at timestamptz,
  p_seed_provider text,
  p_observation_source text,
  p_freshness_status text,
  p_now timestamptz default now()
) returns jsonb
language sql
stable
set search_path = ''
as $$
with cadence as (
  select case
    when p_seed_provider in ('direct_feed','partner_feed') then 7::numeric
    when p_observation_source in ('public_index_result','serper_search') then 21::numeric
    when p_seed_provider='commoncrawl_cdx' then 45::numeric
    else 30::numeric
  end as expected_days
), measured as (
  select
    expected_days,
    case
      when p_observed_at is null then null
      else extract(epoch from (p_now-p_observed_at))/86400.0
    end as signed_age_days
  from cadence
), classified as (
  select
    expected_days,
    signed_age_days,
    case
      when p_observed_at is null then 'unconfirmed_timestamp'
      when signed_age_days < -0.25 then 'invalid_future_timestamp'
      when p_seed_provider='commoncrawl_cdx' and coalesce(p_freshness_status,'')<>'fresh_confirmed' then 'archive_unconfirmed'
      when signed_age_days <= expected_days then 'fresh'
      when signed_age_days <= expected_days*2 then 'aging'
      else 'stale'
    end as freshness_class
  from measured
), scored as (
  select
    *,
    case freshness_class
      when 'unconfirmed_timestamp' then 0::numeric
      when 'invalid_future_timestamp' then 0::numeric
      when 'archive_unconfirmed' then 10::numeric
      when 'fresh' then greatest(70,100-(greatest(signed_age_days,0)/expected_days)*30)
      when 'aging' then greatest(30,70-((signed_age_days-expected_days)/expected_days)*40)
      else greatest(0,30-least(30,((signed_age_days-(expected_days*2))/expected_days)*30))
    end as score_raw
  from classified
)
select jsonb_build_object(
  'freshness_score_v1',round(least(100,greatest(0,score_raw)),2),
  'freshness_class',freshness_class,
  'age_days',case when signed_age_days is null then null else round(greatest(signed_age_days,0),2) end,
  'expected_revisit_days',expected_days,
  'score_version','odm_freshness_score_v1',
  'reason_codes',jsonb_build_array(
    case freshness_class
      when 'unconfirmed_timestamp' then 'missing_observed_at'
      when 'invalid_future_timestamp' then 'future_observed_at'
      when 'archive_unconfirmed' then 'archive_requires_live_confirmation'
      when 'fresh' then 'within_expected_revisit_window'
      when 'aging' then 'beyond_expected_revisit_window'
      else 'beyond_double_revisit_window'
    end,
    case
      when p_seed_provider in ('direct_feed','partner_feed') then 'cadence_direct_or_partner_feed_7d'
      when p_observation_source in ('public_index_result','serper_search') then 'cadence_public_index_21d'
      when p_seed_provider='commoncrawl_cdx' then 'cadence_archive_45d'
      else 'cadence_default_30d'
    end
  ),
  'ranking_eligible',false,
  'publication_eligible',false
)
from scored;
$$;

create or replace view public.odm_audit_freshness_score_shadow_v1 as
select
  a.seed_id,
  a.observation_id,
  a.source_domain,
  a.seed_provider,
  a.observation_source,
  a.observation_observed_at,
  a.freshness_status,
  public.odm_audit_freshness_score_v1(
    a.observation_observed_at,
    a.seed_provider,
    a.observation_source,
    a.freshness_status
  ) as freshness_score_v1
from public.odm_audit_atomic_observation_v1 a;

create or replace function public.odm_audit_freshness_score_report_v1(
  p_sample_size integer default 240,
  p_sample_salt text default 'odm-freshness-score-v1'
) returns jsonb
language sql
stable
set search_path = ''
as $$
with sampled as (
  select *
  from public.odm_audit_freshness_score_shadow_v1
  order by md5(seed_id::text||coalesce(p_sample_salt,''))
  limit least(greatest(coalesce(p_sample_size,240),1),2000)
)
select jsonb_build_object(
  'audit_version','odm_freshness_score_v1',
  'sample_size',count(*),
  'fresh',count(*) filter(where freshness_score_v1#>>'{freshness_class}'='fresh'),
  'aging',count(*) filter(where freshness_score_v1#>>'{freshness_class}'='aging'),
  'stale',count(*) filter(where freshness_score_v1#>>'{freshness_class}'='stale'),
  'archive_unconfirmed',count(*) filter(where freshness_score_v1#>>'{freshness_class}'='archive_unconfirmed'),
  'invalid_or_missing_timestamp',count(*) filter(where freshness_score_v1#>>'{freshness_class}' in ('invalid_future_timestamp','unconfirmed_timestamp')),
  'average_score',round(avg((freshness_score_v1#>>'{freshness_score_v1}')::numeric),2),
  'gates',jsonb_build_object(
    'all_scores_bounded',count(*) filter(where (freshness_score_v1#>>'{freshness_score_v1}')::numeric not between 0 and 100)=0,
    'missing_timestamp_scores_zero',count(*) filter(where freshness_score_v1#>>'{freshness_class}'='unconfirmed_timestamp' and (freshness_score_v1#>>'{freshness_score_v1}')::numeric<>0)=0,
    'future_timestamp_scores_zero',count(*) filter(where freshness_score_v1#>>'{freshness_class}'='invalid_future_timestamp' and (freshness_score_v1#>>'{freshness_score_v1}')::numeric<>0)=0,
    'archive_unconfirmed_capped_at_ten',count(*) filter(where freshness_score_v1#>>'{freshness_class}'='archive_unconfirmed' and (freshness_score_v1#>>'{freshness_score_v1}')::numeric>10)=0,
    'no_ranking_activation',count(*) filter(where (freshness_score_v1#>>'{ranking_eligible}')::boolean)=0,
    'no_publication_activation',count(*) filter(where (freshness_score_v1#>>'{publication_eligible}')::boolean)=0
  )
)
from sampled;
$$;

revoke all on function public.odm_audit_freshness_score_v1(timestamptz,text,text,text,timestamptz) from public,anon,authenticated;
revoke all on function public.odm_audit_freshness_score_report_v1(integer,text) from public,anon,authenticated;
revoke all on public.odm_audit_freshness_score_shadow_v1 from public,anon,authenticated;
grant execute on function public.odm_audit_freshness_score_report_v1(integer,text) to service_role;
grant select on public.odm_audit_freshness_score_shadow_v1 to service_role;

comment on function public.odm_audit_freshness_score_v1(timestamptz,text,text,text,timestamptz) is 'Shadow-only deterministic freshness score. Never activates ranking or publication.';
comment on view public.odm_audit_freshness_score_shadow_v1 is 'Shadow-only freshness score projection with explicit cadence and reason codes.';
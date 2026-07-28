-- ODM-AUDIT-PILOT-01 — fail-closed validation layer for price, surface,
-- freshness and source-policy decisions.
--
-- This migration is intentionally non-destructive:
--   * no existing representation is updated;
--   * no ranking or display decision is changed;
--   * all output is exposed through functions/views for shadow evaluation.

create or replace function public.odm_audit_safe_timestamptz(p_value text)
returns timestamptz
language plpgsql
immutable
set search_path = ''
as $$
begin
  if nullif(btrim(p_value), '') is null then
    return null;
  end if;
  return p_value::timestamptz;
exception when others then
  return null;
end;
$$;

create or replace function public.odm_audit_numeric_candidates_v2(
  p_text text,
  p_kind text
) returns numeric[]
language sql
immutable
set search_path = ''
as $$
  with matches as (
    select case
      when p_kind = 'price' then nullif(regexp_replace(m[1], '[^0-9]', '', 'g'), '')::numeric
      when p_kind = 'surface' then replace(m[1], ',', '.')::numeric
      else null::numeric
    end as value
    from regexp_matches(
      coalesce(p_text, ''),
      case
        when p_kind = 'price' then
          '([0-9]{1,3}(?:[ .,''’][0-9]{3})+|[0-9]{4,10})[[:space:]]*(?:dh|dhs|mad)(?:[[:space:]]*/[[:space:]]*(?:mois|month))?'
        when p_kind = 'surface' then
          '([0-9]{1,6}(?:[.,][0-9]+)?)[[:space:]]*(?:m2|m²)'
        else '(?!)'
      end,
      'gi'
    ) as m
  )
  select coalesce(array_agg(distinct value order by value), '{}'::numeric[])
  from matches
  where value is not null
    and (
      (p_kind = 'price' and value between 500 and 1000000000)
      or (p_kind = 'surface' and value between 9 and 100000)
    );
$$;

create or replace function public.odm_audit_merge_numeric_candidates(
  p_left numeric[],
  p_right numeric[]
) returns numeric[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(distinct value order by value), '{}'::numeric[])
  from unnest(coalesce(p_left, '{}'::numeric[]) || coalesce(p_right, '{}'::numeric[])) value;
$$;

create or replace function public.odm_audit_signal_status_v1(
  p_candidates numeric[],
  p_observed_at timestamptz,
  p_seed_provider text,
  p_freshness_status text,
  p_now timestamptz default now()
) returns text
language sql
stable
set search_path = ''
as $$
  select case
    when cardinality(coalesce(p_candidates, '{}'::numeric[])) = 0 then 'missing'
    when cardinality(coalesce(p_candidates, '{}'::numeric[])) > 1 then 'ambiguous'
    when p_observed_at is null then 'unconfirmed_timestamp'
    when p_observed_at < p_now - interval '45 days' then 'stale'
    when p_seed_provider = 'commoncrawl_cdx' and p_freshness_status <> 'fresh_confirmed' then 'archive_unconfirmed'
    when p_freshness_status not in ('fresh_confirmed', 'fresh', 'observed', 'recent') then 'freshness_unconfirmed'
    else 'trusted_candidate'
  end;
$$;

create or replace view public.odm_audit_signal_validation_v1 as
with evidence as (
  select
    d.seed_id,
    d.canonical_url,
    d.source_domain,
    d.seed_provider,
    d.freshness_status,
    d.quality_tier,
    d.quality_score,
    d.vertical_classification,
    d.title as indexed_title,
    d.snippet as indexed_snippet,
    d.normalized_price_mad as persisted_price_mad,
    d.normalized_surface_m2 as persisted_surface_m2,
    r.discovery_policy,
    r.display_policy,
    r.no_bypass_required,
    coalesce(
      nullif(btrim(s.metadata #>> '{public_index_result,title}'), ''),
      nullif(btrim(s.metadata #>> '{serper_search,title}'), ''),
      nullif(btrim(d.title), '')
    ) as evidence_title,
    coalesce(
      nullif(btrim(s.metadata #>> '{public_index_result,snippet}'), ''),
      nullif(btrim(s.metadata #>> '{serper_search,snippet}'), ''),
      nullif(btrim(d.snippet), '')
    ) as evidence_snippet,
    coalesce(
      public.odm_audit_safe_timestamptz(s.metadata #>> '{public_index_result,observed_at}'),
      public.odm_audit_safe_timestamptz(s.metadata #>> '{serper_search,observed_at}'),
      s.fresh_last_seen_at,
      s.last_observed_at
    ) as evidence_observed_at
  from public.thin_index_search_documents d
  join public.source_offer_seeds s on s.id = d.seed_id
  left join public.source_policy_registry r on r.source_domain = d.source_domain
  where d.vertical_classification = 'real_estate_likely'
), candidates as (
  select
    e.*,
    public.odm_audit_merge_numeric_candidates(
      public.odm_audit_numeric_candidates_v2(e.evidence_title, 'price'),
      public.odm_audit_numeric_candidates_v2(e.evidence_snippet, 'price')
    ) as price_candidates,
    public.odm_audit_merge_numeric_candidates(
      public.odm_audit_numeric_candidates_v2(e.evidence_title, 'surface'),
      public.odm_audit_numeric_candidates_v2(e.evidence_snippet, 'surface')
    ) as surface_candidates
  from evidence e
), evaluated as (
  select
    c.*,
    public.odm_audit_signal_status_v1(
      c.price_candidates, c.evidence_observed_at,
      c.seed_provider, c.freshness_status
    ) as price_status,
    public.odm_audit_signal_status_v1(
      c.surface_candidates, c.evidence_observed_at,
      c.seed_provider, c.freshness_status
    ) as surface_status
  from candidates c
)
select
  e.*,
  case when cardinality(e.price_candidates) = 1 then e.price_candidates[1] end as candidate_price_mad,
  case when cardinality(e.surface_candidates) = 1 then e.surface_candidates[1] end as candidate_surface_m2,
  case
    when e.display_policy is null then 'blocked_missing_policy'
    when e.display_policy = 'internal_signal_only' then 'blocked_internal_signal_only'
    when coalesce(e.no_bypass_required, true) is not true then 'blocked_invalid_policy'
    when e.quality_tier in ('D', 'E', 'REJECTED', 'UNSCORED') then 'blocked_quality'
    when e.display_policy = 'canonical_link_only' then 'candidate_canonical_link'
    else 'blocked_unsupported_display_policy'
  end as shadow_display_decision,
  case
    when e.price_status = 'trusted_candidate'
      and cardinality(e.price_candidates) = 1
      and e.persisted_price_mad is distinct from e.price_candidates[1]
      then true else false
  end as persisted_price_conflict,
  case
    when e.surface_status = 'trusted_candidate'
      and cardinality(e.surface_candidates) = 1
      and e.persisted_surface_m2 is distinct from e.surface_candidates[1]
      then true else false
  end as persisted_surface_conflict
from evaluated e;

create or replace function public.odm_audit_pilot_report_v1(
  p_sample_size integer default 240,
  p_sample_salt text default 'odm-audit-pilot-01'
) returns jsonb
language sql
stable
set search_path = ''
as $$
with ranked as (
  select
    v.*,
    row_number() over (
      partition by v.source_domain, v.quality_tier, v.seed_provider
      order by md5(v.seed_id::text || coalesce(p_sample_salt, ''))
    ) as stratum_rank
  from public.odm_audit_signal_validation_v1 v
), sampled as (
  select *
  from ranked
  order by
    case quality_tier when 'A' then 1 when 'B' then 2 when 'C' then 3 else 4 end,
    stratum_rank,
    md5(seed_id::text || coalesce(p_sample_salt, ''))
  limit least(greatest(coalesce(p_sample_size, 240), 1), 2000)
), summary as (
  select jsonb_build_object(
    'sample_size', count(*),
    'with_persisted_price', count(*) filter (where persisted_price_mad is not null),
    'with_persisted_surface', count(*) filter (where persisted_surface_m2 is not null),
    'trusted_price_candidates', count(*) filter (where price_status = 'trusted_candidate'),
    'trusted_surface_candidates', count(*) filter (where surface_status = 'trusted_candidate'),
    'ambiguous_prices', count(*) filter (where price_status = 'ambiguous'),
    'ambiguous_surfaces', count(*) filter (where surface_status = 'ambiguous'),
    'stale_or_unconfirmed_prices', count(*) filter (where price_status in ('stale','archive_unconfirmed','unconfirmed_timestamp','freshness_unconfirmed')),
    'stale_or_unconfirmed_surfaces', count(*) filter (where surface_status in ('stale','archive_unconfirmed','unconfirmed_timestamp','freshness_unconfirmed')),
    'persisted_price_conflicts', count(*) filter (where persisted_price_conflict),
    'persisted_surface_conflicts', count(*) filter (where persisted_surface_conflict)
  ) as value
  from sampled
), decisions as (
  select coalesce(jsonb_object_agg(shadow_display_decision, n), '{}'::jsonb) as value
  from (
    select shadow_display_decision, count(*)::integer n
    from sampled group by shadow_display_decision
  ) x
), statuses as (
  select jsonb_build_object(
    'price', coalesce((select jsonb_object_agg(price_status, n) from (
      select price_status, count(*)::integer n from sampled group by price_status
    ) p), '{}'::jsonb),
    'surface', coalesce((select jsonb_object_agg(surface_status, n) from (
      select surface_status, count(*)::integer n from sampled group by surface_status
    ) s), '{}'::jsonb)
  ) as value
), gates as (
  select jsonb_build_object(
    'no_public_policy_bypass', count(*) filter (
      where display_policy = 'internal_signal_only'
        and shadow_display_decision <> 'blocked_internal_signal_only'
    ) = 0,
    'no_quality_d_admission', count(*) filter (
      where quality_tier in ('D','E','REJECTED','UNSCORED')
        and shadow_display_decision like 'candidate%'
    ) = 0,
    'no_ambiguous_structured_publication', count(*) filter (
      where shadow_display_decision like 'candidate%'
        and (price_status = 'ambiguous' or surface_status = 'ambiguous')
    ) = 0,
    'no_stale_structured_publication', count(*) filter (
      where shadow_display_decision like 'candidate%'
        and (price_status in ('stale','archive_unconfirmed','unconfirmed_timestamp','freshness_unconfirmed')
          or surface_status in ('stale','archive_unconfirmed','unconfirmed_timestamp','freshness_unconfirmed'))
    ) = 0
  ) as value
  from sampled
)
select jsonb_build_object(
  'audit_version', 'odm_audit_pilot_v1',
  'generated_at', now(),
  'summary', (select value from summary),
  'shadow_decisions', (select value from decisions),
  'signal_statuses', (select value from statuses),
  'gates', (select value from gates)
);
$$;

revoke all on function public.odm_audit_safe_timestamptz(text) from public, anon, authenticated;
revoke all on function public.odm_audit_numeric_candidates_v2(text,text) from public, anon, authenticated;
revoke all on function public.odm_audit_merge_numeric_candidates(numeric[],numeric[]) from public, anon, authenticated;
revoke all on function public.odm_audit_signal_status_v1(numeric[],timestamptz,text,text,timestamptz) from public, anon, authenticated;
revoke all on function public.odm_audit_pilot_report_v1(integer,text) from public, anon, authenticated;
revoke all on public.odm_audit_signal_validation_v1 from public, anon, authenticated;

grant execute on function public.odm_audit_pilot_report_v1(integer,text) to service_role;
grant select on public.odm_audit_signal_validation_v1 to service_role;

comment on view public.odm_audit_signal_validation_v1 is
  'Shadow-only signal validation. Does not change public eligibility, ranking, or persisted economics.';

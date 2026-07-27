-- ODM-10D — explainable representation quality engine.
-- Computes a versioned 0–100 score without changing display eligibility or ranking.

create table if not exists public.odm_10d_quality_runs (
  id bigserial primary key,
  run_key text not null unique,
  quality_version text not null,
  evaluated_rows integer not null,
  real_estate_rows integer not null,
  tier_a integer not null,
  tier_b integer not null,
  tier_c integer not null,
  tier_d integer not null,
  tier_e integer not null,
  average_score numeric(6,2) not null,
  public_ranking_activated boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.odm_10d_quality_runs enable row level security;
revoke all on public.odm_10d_quality_runs from public, anon, authenticated;
grant select, insert on public.odm_10d_quality_runs to service_role;

create or replace function public.odm_10d_quality_payload(
  p_vertical text,
  p_canonical_url text,
  p_source_domain text,
  p_seed_provider text,
  p_freshness_status text,
  p_title text,
  p_snippet text,
  p_normalized_city text,
  p_normalized_property_type text,
  p_normalized_intent text,
  p_normalized_price numeric,
  p_normalized_surface numeric,
  p_price_m2 numeric,
  p_recovery_confidence text,
  p_normalization_status text
) returns jsonb
language plpgsql
immutable
as $$
declare
  v_provenance integer := 0;
  v_content integer := 0;
  v_economics integer := 0;
  v_normalization integer := 0;
  v_freshness integer := 0;
  v_confidence integer := 0;
  v_score integer := 0;
  v_tier text := 'E';
begin
  if p_vertical is distinct from 'real_estate_likely' then
    return jsonb_build_object(
      'score', 0,
      'tier', case when p_vertical = 'non_real_estate' then 'REJECTED' else 'UNSCORED' end,
      'dimensions', jsonb_build_object(
        'provenance', 0, 'content', 0, 'economics', 0,
        'normalization', 0, 'freshness', 0, 'confidence', 0,
        'reason', coalesce(p_vertical, 'unclassified')
      )
    );
  end if;

  v_provenance :=
    (case when nullif(btrim(p_canonical_url), '') is not null then 6 else 0 end) +
    (case when nullif(btrim(p_source_domain), '') is not null then 5 else 0 end) +
    (case when nullif(btrim(p_seed_provider), '') is not null then 4 else 0 end);

  v_content :=
    (case when length(coalesce(btrim(p_title), '')) >= 20 then 10 when length(coalesce(btrim(p_title), '')) >= 8 then 6 else 0 end) +
    (case when length(coalesce(btrim(p_snippet), '')) >= 80 then 6 when length(coalesce(btrim(p_snippet), '')) >= 25 then 3 else 0 end) +
    (case when nullif(btrim(p_normalized_city), '') is not null then 4 else 0 end) +
    (case when nullif(btrim(p_normalized_property_type), '') is not null then 3 else 0 end) +
    (case when nullif(btrim(p_normalized_intent), '') is not null then 2 else 0 end);

  v_economics :=
    (case when p_normalized_price between 1000 and 1000000000 then 8 else 0 end) +
    (case when p_normalized_surface between 5 and 100000 then 7 else 0 end) +
    (case when p_price_m2 between 10 and 1000000 then 5 else 0 end);

  v_normalization :=
    (case when nullif(btrim(p_normalized_city), '') is not null then 5 else 0 end) +
    (case when nullif(btrim(p_normalized_property_type), '') is not null then 5 else 0 end) +
    (case when nullif(btrim(p_normalized_intent), '') is not null then 4 else 0 end) +
    (case when p_normalized_price is not null then 3 else 0 end) +
    (case when p_normalized_surface is not null then 3 else 0 end);

  v_freshness := case
    when p_freshness_status in ('fresh_confirmed','fresh') then 10
    when p_freshness_status in ('observed','recent') then 7
    when p_freshness_status = 'seed_only' then 3
    else 0
  end;

  v_confidence :=
    (case lower(coalesce(p_recovery_confidence, '')) when 'high' then 5 when 'medium' then 3 when 'low' then 1 else 0 end) +
    (case lower(coalesce(p_normalization_status, '')) when 'normalized' then 5 when 'complete' then 5 when 'partial' then 3 when 'recovered' then 3 else 0 end);

  v_score := least(100, greatest(0, v_provenance + v_content + v_economics + v_normalization + v_freshness + v_confidence));
  v_tier := case
    when v_score >= 75 then 'A'
    when v_score >= 55 then 'B'
    when v_score >= 35 then 'C'
    when v_score >= 15 then 'D'
    else 'E'
  end;

  return jsonb_build_object(
    'score', v_score,
    'tier', v_tier,
    'dimensions', jsonb_build_object(
      'provenance', v_provenance,
      'content', v_content,
      'economics', v_economics,
      'normalization', v_normalization,
      'freshness', v_freshness,
      'confidence', v_confidence,
      'maxima', jsonb_build_object(
        'provenance', 15, 'content', 25, 'economics', 20,
        'normalization', 20, 'freshness', 10, 'confidence', 10
      )
    )
  );
end;
$$;

create or replace function public.odm_10d_apply_quality_row()
returns trigger
language plpgsql
as $$
declare
  v_payload jsonb;
begin
  v_payload := public.odm_10d_quality_payload(
    new.vertical_classification, new.canonical_url, new.source_domain,
    new.seed_provider, new.freshness_status, new.title, new.snippet,
    new.normalized_city, new.normalized_property_type, new.normalized_intent,
    new.normalized_price_mad, new.normalized_surface_m2, new.normalized_price_m2,
    new.recovery_confidence, new.normalization_status
  );
  new.quality_score := (v_payload->>'score')::smallint;
  new.quality_tier := v_payload->>'tier';
  new.quality_dimensions := v_payload->'dimensions';
  new.quality_version := 'odm_10d_v1';
  return new;
end;
$$;

drop trigger if exists trg_odm_10d_quality on public.thin_index_search_documents;
create trigger trg_odm_10d_quality
before insert or update of
  vertical_classification, canonical_url, source_domain, seed_provider,
  freshness_status, title, snippet, normalized_city,
  normalized_property_type, normalized_intent, normalized_price_mad,
  normalized_surface_m2, normalized_price_m2, recovery_confidence,
  normalization_status
on public.thin_index_search_documents
for each row execute function public.odm_10d_apply_quality_row();

create or replace function public.odm_10d_recompute_quality(p_run_key text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := coalesce(nullif(btrim(p_run_key), ''), 'odm-10d-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS'));
  v_evaluated integer;
  v_real integer;
  v_a integer;
  v_b integer;
  v_c integer;
  v_d integer;
  v_e integer;
  v_avg numeric(6,2);
begin
  update public.thin_index_search_documents d
  set
    quality_score = (q.payload->>'score')::smallint,
    quality_tier = q.payload->>'tier',
    quality_dimensions = q.payload->'dimensions',
    quality_version = 'odm_10d_v1'
  from lateral (
    select public.odm_10d_quality_payload(
      d.vertical_classification, d.canonical_url, d.source_domain,
      d.seed_provider, d.freshness_status, d.title, d.snippet,
      d.normalized_city, d.normalized_property_type, d.normalized_intent,
      d.normalized_price_mad, d.normalized_surface_m2, d.normalized_price_m2,
      d.recovery_confidence, d.normalization_status
    ) as payload
  ) q;

  select
    count(*)::integer,
    count(*) filter (where vertical_classification = 'real_estate_likely')::integer,
    count(*) filter (where quality_tier = 'A')::integer,
    count(*) filter (where quality_tier = 'B')::integer,
    count(*) filter (where quality_tier = 'C')::integer,
    count(*) filter (where quality_tier = 'D')::integer,
    count(*) filter (where quality_tier = 'E')::integer,
    round(avg(quality_score) filter (where vertical_classification = 'real_estate_likely'), 2)
  into v_evaluated, v_real, v_a, v_b, v_c, v_d, v_e, v_avg
  from public.thin_index_search_documents;

  insert into public.odm_10d_quality_runs(
    run_key, quality_version, evaluated_rows, real_estate_rows,
    tier_a, tier_b, tier_c, tier_d, tier_e, average_score,
    public_ranking_activated
  ) values (
    v_key, 'odm_10d_v1', v_evaluated, v_real,
    v_a, v_b, v_c, v_d, v_e, coalesce(v_avg, 0), false
  ) on conflict (run_key) do nothing;

  return jsonb_build_object(
    'run_key', v_key,
    'quality_version', 'odm_10d_v1',
    'evaluated_rows', v_evaluated,
    'real_estate_rows', v_real,
    'tiers', jsonb_build_object('A',v_a,'B',v_b,'C',v_c,'D',v_d,'E',v_e),
    'average_score', coalesce(v_avg,0),
    'public_ranking_activated', false
  );
end;
$$;

revoke all on function public.odm_10d_recompute_quality(text) from public, anon, authenticated;
grant execute on function public.odm_10d_recompute_quality(text) to service_role;

create or replace view public.odm_10d_source_quality_report as
select
  source_domain,
  count(*) filter (where vertical_classification = 'real_estate_likely')::integer as real_estate_rows,
  round(avg(quality_score) filter (where vertical_classification = 'real_estate_likely'),2) as average_score,
  percentile_cont(0.5) within group (order by quality_score) filter (where vertical_classification = 'real_estate_likely') as median_score,
  count(*) filter (where quality_tier = 'A')::integer as tier_a,
  count(*) filter (where quality_tier = 'B')::integer as tier_b,
  count(*) filter (where quality_tier = 'C')::integer as tier_c,
  count(*) filter (where quality_tier = 'D')::integer as tier_d,
  count(*) filter (where quality_tier = 'E')::integer as tier_e,
  count(*) filter (where normalized_city is not null and vertical_classification='real_estate_likely')::integer as with_city,
  count(*) filter (where normalized_price_mad is not null and vertical_classification='real_estate_likely')::integer as with_price,
  count(*) filter (where normalized_surface_m2 is not null and vertical_classification='real_estate_likely')::integer as with_surface
from public.thin_index_search_documents
group by source_domain;

revoke all on public.odm_10d_source_quality_report from public, anon, authenticated;
grant select on public.odm_10d_source_quality_report to service_role;

comment on function public.odm_10d_recompute_quality(text) is
  'ODM-10D backfill: explainable 0–100 representation quality, no automatic public ranking activation.';

-- ODM-05 QUALITY TIERS
-- Deterministic information-usability classification over ODM-04 normalized facts.
-- This is not a truth, legal, professional or source-reliability score.

alter table public.thin_index_search_documents
  add column if not exists quality_tier text,
  add column if not exists quality_score smallint,
  add column if not exists quality_dimensions jsonb not null default '{}'::jsonb,
  add column if not exists quality_version text;

create or replace function public.odm05_quality_dimensions(
  p_freshness_status text,
  p_seed_provider text,
  p_normalized_city text,
  p_normalized_property_type text,
  p_normalized_intent text,
  p_normalized_price_mad numeric,
  p_normalized_surface_m2 numeric,
  p_normalized_price_m2 numeric,
  p_title text,
  p_snippet text
)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'freshness', case when p_freshness_status = 'fresh_confirmed' then 2 else 0 end,
    'provenance', case
      when p_seed_provider = 'serper_search' then 2
      when p_seed_provider in ('public_sitemap','commoncrawl_cdx') then 1
      else 0
    end,
    'classification',
      (case when p_normalized_city is not null then 1 else 0 end) +
      (case when p_normalized_property_type is not null then 1 else 0 end) +
      (case when p_normalized_intent is not null then 1 else 0 end),
    'market_facts',
      (case when p_normalized_price_mad is not null then 1 else 0 end) +
      (case when p_normalized_surface_m2 is not null then 1 else 0 end) +
      (case when p_normalized_price_m2 is not null then 1 else 0 end),
    'descriptive_context',
      (case when nullif(btrim(p_title), '') is not null then 1 else 0 end) +
      (case when length(coalesce(nullif(btrim(p_snippet), ''), '')) >= 40 then 1 else 0 end)
  );
$$;

create or replace function public.odm05_quality_score(p_dimensions jsonb)
returns smallint
language sql
immutable
strict
set search_path = ''
as $$
  select least(10, greatest(0,
    coalesce((p_dimensions->>'freshness')::integer, 0) +
    coalesce((p_dimensions->>'provenance')::integer, 0) +
    coalesce((p_dimensions->>'classification')::integer, 0) +
    coalesce((p_dimensions->>'market_facts')::integer, 0) +
    coalesce((p_dimensions->>'descriptive_context')::integer, 0)
  ))::smallint;
$$;

create or replace function public.odm05_quality_tier(p_dimensions jsonb, p_score integer)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select case
    -- Q3 requires current evidence, complete classification and comparable market facts.
    when p_score >= 8
      and coalesce((p_dimensions->>'freshness')::integer, 0) = 2
      and coalesce((p_dimensions->>'classification')::integer, 0) = 3
      and coalesce((p_dimensions->>'market_facts')::integer, 0) >= 2
      then 'Q3_intelligence_ready'
    -- Q2 is filterable/comparable but may lack current confirmation or one market fact.
    when p_score >= 6
      and coalesce((p_dimensions->>'classification')::integer, 0) >= 2
      and coalesce((p_dimensions->>'market_facts')::integer, 0) >= 1
      then 'Q2_comparable'
    -- Q1 carries useful context but is not sufficiently structured for comparison.
    when p_score >= 3
      then 'Q1_contextual'
    else 'Q0_link_only'
  end;
$$;

create or replace function public.odm05_set_quality_tier()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  dims jsonb;
  score_value smallint;
begin
  dims := public.odm05_quality_dimensions(
    new.freshness_status,
    new.seed_provider,
    new.normalized_city,
    new.normalized_property_type,
    new.normalized_intent,
    new.normalized_price_mad,
    new.normalized_surface_m2,
    new.normalized_price_m2,
    new.title,
    new.snippet
  );
  score_value := public.odm05_quality_score(dims);
  new.quality_dimensions := dims;
  new.quality_score := score_value;
  new.quality_tier := public.odm05_quality_tier(dims, score_value);
  new.quality_version := 'odm05-v1';
  return new;
end;
$$;

drop trigger if exists thin_index_quality_tier_write on public.thin_index_search_documents;
create trigger thin_index_quality_tier_write
before insert or update of freshness_status, seed_provider, normalized_city,
  normalized_property_type, normalized_intent, normalized_price_mad,
  normalized_surface_m2, normalized_price_m2, title, snippet
on public.thin_index_search_documents
for each row execute function public.odm05_set_quality_tier();

-- Idempotent backfill. The BEFORE trigger computes every tier from current facts.
update public.thin_index_search_documents
set updated_at = updated_at;

alter table public.thin_index_search_documents
  drop constraint if exists thin_index_quality_tier_check;
alter table public.thin_index_search_documents
  add constraint thin_index_quality_tier_check check (
    quality_tier in ('Q0_link_only','Q1_contextual','Q2_comparable','Q3_intelligence_ready')
  );

alter table public.thin_index_search_documents
  drop constraint if exists thin_index_quality_score_check;
alter table public.thin_index_search_documents
  add constraint thin_index_quality_score_check check (quality_score between 0 and 10);

create index if not exists thin_index_quality_tier_idx
  on public.thin_index_search_documents (quality_tier, freshness_status, updated_at desc);

create index if not exists thin_index_quality_score_idx
  on public.thin_index_search_documents (quality_score desc, updated_at desc);

create or replace view public.thin_index_quality_documents_v1 as
select
  seed_id,
  canonical_url,
  source_domain,
  seed_provider,
  freshness_status,
  title,
  snippet,
  normalized_city,
  normalized_property_type,
  normalized_intent,
  normalized_price_mad,
  normalized_surface_m2,
  normalized_price_m2,
  quality_tier,
  quality_score,
  quality_dimensions,
  quality_version,
  updated_at
from public.thin_index_search_documents
where quality_tier is not null;

revoke all on function public.odm05_quality_dimensions(text,text,text,text,text,numeric,numeric,numeric,text,text) from public, anon, authenticated;
revoke all on function public.odm05_quality_score(jsonb) from public, anon, authenticated;
revoke all on function public.odm05_quality_tier(jsonb,integer) from public, anon, authenticated;
revoke all on function public.odm05_set_quality_tier() from public, anon, authenticated;
revoke all on public.thin_index_quality_documents_v1 from public, anon, authenticated;
grant select on public.thin_index_quality_documents_v1 to service_role;

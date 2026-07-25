-- ODM-06 DISPLAY ELIGIBILITY & QUALITY-AWARE RANKING
-- Additive policy layer over ODM-05 quality tiers.
-- Eligibility controls where a result may appear; quality contributes only a bounded ranking boost.

alter table public.thin_index_search_documents
  add column if not exists display_eligibility text,
  add column if not exists display_eligibility_reason text,
  add column if not exists ranking_quality_boost real,
  add column if not exists ranking_policy_version text;

create or replace function public.odm06_display_eligibility(
  p_canonical_url text,
  p_seed_provider text,
  p_freshness_status text,
  p_quality_tier text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when nullif(btrim(p_canonical_url), '') is null then 'ineligible'
    when p_seed_provider not in ('public_sitemap','commoncrawl_cdx','serper_search') then 'ineligible'
    when p_freshness_status not in ('seed_only','fresh_confirmed') then 'ineligible'
    when p_quality_tier in ('Q2_comparable','Q3_intelligence_ready') then 'eligible_primary'
    when p_quality_tier in ('Q0_link_only','Q1_contextual') then 'eligible_secondary'
    else 'ineligible'
  end;
$$;

create or replace function public.odm06_display_eligibility_reason(
  p_canonical_url text,
  p_seed_provider text,
  p_freshness_status text,
  p_quality_tier text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when nullif(btrim(p_canonical_url), '') is null then 'missing_canonical_url'
    when p_seed_provider not in ('public_sitemap','commoncrawl_cdx','serper_search') then 'unsupported_provider'
    when p_freshness_status not in ('seed_only','fresh_confirmed') then 'unsupported_freshness_state'
    when p_quality_tier = 'Q3_intelligence_ready' then 'intelligence_ready'
    when p_quality_tier = 'Q2_comparable' then 'comparable'
    when p_quality_tier = 'Q1_contextual' then 'contextual_only'
    when p_quality_tier = 'Q0_link_only' then 'link_only'
    else 'missing_quality_tier'
  end;
$$;

create or replace function public.odm06_ranking_quality_boost(
  p_quality_tier text,
  p_quality_score integer,
  p_freshness_status text
)
returns real
language sql
immutable
set search_path = ''
as $$
  select least(0.35::real, greatest(0::real,
    case p_quality_tier
      when 'Q3_intelligence_ready' then 0.25::real
      when 'Q2_comparable' then 0.16::real
      when 'Q1_contextual' then 0.06::real
      else 0::real
    end
    + case when p_freshness_status = 'fresh_confirmed' then 0.05::real else 0::real end
    + least(0.05::real, greatest(0::real, coalesce(p_quality_score, 0)::real / 200::real))
  ));
$$;

create or replace function public.odm06_set_display_policy()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.display_eligibility := public.odm06_display_eligibility(
    new.canonical_url,
    new.seed_provider,
    new.freshness_status,
    new.quality_tier
  );
  new.display_eligibility_reason := public.odm06_display_eligibility_reason(
    new.canonical_url,
    new.seed_provider,
    new.freshness_status,
    new.quality_tier
  );
  new.ranking_quality_boost := public.odm06_ranking_quality_boost(
    new.quality_tier,
    new.quality_score,
    new.freshness_status
  );
  new.ranking_policy_version := 'odm06-v1';
  return new;
end;
$$;

drop trigger if exists thin_index_display_policy_write on public.thin_index_search_documents;
create trigger thin_index_display_policy_write
before insert or update of canonical_url, seed_provider, freshness_status, quality_tier, quality_score
on public.thin_index_search_documents
for each row execute function public.odm06_set_display_policy();

-- Idempotent backfill through the deterministic trigger.
update public.thin_index_search_documents
set updated_at = updated_at;

alter table public.thin_index_search_documents
  drop constraint if exists thin_index_display_eligibility_check;
alter table public.thin_index_search_documents
  add constraint thin_index_display_eligibility_check check (
    display_eligibility in ('ineligible','eligible_secondary','eligible_primary')
  );

alter table public.thin_index_search_documents
  drop constraint if exists thin_index_ranking_quality_boost_check;
alter table public.thin_index_search_documents
  add constraint thin_index_ranking_quality_boost_check check (
    ranking_quality_boost between 0 and 0.35
  );

create index if not exists thin_index_display_eligibility_idx
  on public.thin_index_search_documents (display_eligibility, quality_tier, updated_at desc);

create index if not exists thin_index_quality_ranking_idx
  on public.thin_index_search_documents (ranking_quality_boost desc, quality_score desc, updated_at desc)
  where display_eligibility <> 'ineligible';

create or replace view public.thin_index_display_eligible_v1 as
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
  display_eligibility,
  display_eligibility_reason,
  ranking_quality_boost,
  ranking_policy_version,
  updated_at
from public.thin_index_search_documents
where display_eligibility in ('eligible_secondary','eligible_primary');

revoke all on function public.odm06_display_eligibility(text,text,text,text) from public, anon, authenticated;
revoke all on function public.odm06_display_eligibility_reason(text,text,text,text) from public, anon, authenticated;
revoke all on function public.odm06_ranking_quality_boost(text,integer,text) from public, anon, authenticated;
revoke all on function public.odm06_set_display_policy() from public, anon, authenticated;
revoke all on public.thin_index_display_eligible_v1 from public, anon, authenticated;
grant select on public.thin_index_display_eligible_v1 to service_role;

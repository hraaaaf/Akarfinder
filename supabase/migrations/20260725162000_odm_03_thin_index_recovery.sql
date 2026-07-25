-- ODM-03 PRICE / SURFACE / GEO RECOVERY
-- Additive, deterministic and source-preserving. Missing facts remain NULL.

alter table public.thin_index_search_documents
  add column if not exists price_mad numeric(14,2),
  add column if not exists surface_m2 numeric(10,2),
  add column if not exists recovered_city text,
  add column if not exists recovery_confidence text,
  add column if not exists recovery_evidence jsonb not null default '{}'::jsonb;

create or replace function public.odm03_extract_surface_m2(p_text text)
returns numeric
language sql
immutable
strict
set search_path = ''
as $$
  with m as (
    select (regexp_match(lower(p_text), '(?:^|[^0-9])([0-9]{2,4})\s*(?:m2|m²|metres? carres?)(?:[^0-9]|$)', 'i'))[1] as raw
  ), v as (
    select case when raw is null then null else raw::numeric end as n from m
  )
  select case when n between 10 and 5000 then n else null end from v;
$$;

create or replace function public.odm03_extract_price_mad(p_text text)
returns numeric
language sql
immutable
strict
set search_path = ''
as $$
  with m as (
    select (regexp_match(lower(p_text), '(?:^|[^0-9])([0-9]{2,7}(?:[ .,][0-9]{3})*)\s*(?:dh|dhs|mad)(?:[^a-z]|$)', 'i'))[1] as raw
  ), v as (
    select case when raw is null then null else regexp_replace(raw, '[^0-9]', '', 'g')::numeric end as n from m
  )
  select case when n between 10000 and 1000000000 then n else null end from v;
$$;

create or replace function public.odm03_recover_city(p_text text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select case
    when lower(p_text) ~ '(^|[^a-z])casablanca([^a-z]|$)' then 'Casablanca'
    when lower(p_text) ~ '(^|[^a-z])rabat([^a-z]|$)' then 'Rabat'
    when lower(p_text) ~ '(^|[^a-z])marrakech([^a-z]|$)' then 'Marrakech'
    when lower(p_text) ~ '(^|[^a-z])(tanger|tangier)([^a-z]|$)' then 'Tanger'
    when lower(p_text) ~ '(^|[^a-z])agadir([^a-z]|$)' then 'Agadir'
    when lower(p_text) ~ '(^|[^a-z])(fes|fès)([^a-z]|$)' then 'Fès'
    when lower(p_text) ~ '(^|[^a-z])meknes([^a-z]|$)' then 'Meknès'
    when lower(p_text) ~ '(^|[^a-z])kenitra([^a-z]|$)' then 'Kénitra'
    when lower(p_text) ~ '(^|[^a-z])temara([^a-z]|$)' then 'Témara'
    when lower(p_text) ~ '(^|[^a-z])sale([^a-z]|$)' then 'Salé'
    when lower(p_text) ~ '(^|[^a-z])tetouan([^a-z]|$)' then 'Tétouan'
    when lower(p_text) ~ '(^|[^a-z])oujda([^a-z]|$)' then 'Oujda'
    when lower(p_text) ~ '(^|[^a-z])(el[ -]?jadida|jadida)([^a-z]|$)' then 'El Jadida'
    when lower(p_text) ~ '(^|[^a-z])mohammedia([^a-z]|$)' then 'Mohammedia'
    when lower(p_text) ~ '(^|[^a-z])nador([^a-z]|$)' then 'Nador'
    when lower(p_text) ~ '(^|[^a-z])essaouira([^a-z]|$)' then 'Essaouira'
    when lower(p_text) ~ '(^|[^a-z])safi([^a-z]|$)' then 'Safi'
    when lower(p_text) ~ '(^|[^a-z])settat([^a-z]|$)' then 'Settat'
    when lower(p_text) ~ '(^|[^a-z])berrechid([^a-z]|$)' then 'Berrechid'
    when lower(p_text) ~ '(^|[^a-z])khouribga([^a-z]|$)' then 'Khouribga'
    when lower(p_text) ~ '(^|[^a-z])dakhla([^a-z]|$)' then 'Dakhla'
    when lower(p_text) ~ '(^|[^a-z])laayoune([^a-z]|$)' then 'Laâyoune'
    else null
  end;
$$;

create or replace function public.sync_thin_index_search_document_row()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  evidence_text text;
  explicit_city text;
  recovered_surface numeric;
  recovered_price numeric;
  recovered_geo text;
begin
  if tg_op = 'DELETE' then
    delete from public.thin_index_search_documents where seed_id = old.id;
    return old;
  end if;

  if new.freshness_status not in ('seed_only', 'fresh_confirmed')
     or new.seed_provider not in ('public_sitemap', 'commoncrawl_cdx', 'serper_search') then
    delete from public.thin_index_search_documents where seed_id = new.id;
    return new;
  end if;

  evidence_text := concat_ws(' ', new.metadata #>> '{serper_search,title}', new.metadata #>> '{serper_search,snippet}', new.canonical_url);
  explicit_city := nullif(new.metadata #>> '{serper_search,city}', '');
  recovered_surface := public.odm03_extract_surface_m2(evidence_text);
  recovered_price := public.odm03_extract_price_mad(evidence_text);
  recovered_geo := coalesce(explicit_city, public.odm03_recover_city(new.canonical_url));

  insert into public.thin_index_search_documents (
    seed_id, canonical_url, source_domain, seed_provider, freshness_status,
    title, snippet, query_text, city, property_type, intent, updated_at,
    price_mad, surface_m2, recovered_city, recovery_confidence, recovery_evidence
  ) values (
    new.id, new.canonical_url, new.source_domain, new.seed_provider, new.freshness_status,
    nullif(new.metadata #>> '{serper_search,title}', ''),
    nullif(new.metadata #>> '{serper_search,snippet}', ''),
    nullif(new.metadata #>> '{serper_search,query}', ''),
    explicit_city,
    nullif(new.metadata #>> '{serper_search,property_type}', ''),
    nullif(new.metadata #>> '{serper_search,intent}', ''),
    new.updated_at,
    recovered_price,
    recovered_surface,
    recovered_geo,
    case
      when recovered_price is not null or recovered_surface is not null or explicit_city is not null then 'explicit'
      when recovered_geo is not null then 'url_token'
      else null
    end,
    jsonb_strip_nulls(jsonb_build_object(
      'price', case when recovered_price is not null then 'explicit_mad_marker' end,
      'surface', case when recovered_surface is not null then 'explicit_m2_marker' end,
      'city', case when explicit_city is not null then 'approved_metadata' when recovered_geo is not null then 'canonical_url_token' end
    ))
  )
  on conflict (seed_id) do update set
    canonical_url = excluded.canonical_url,
    source_domain = excluded.source_domain,
    seed_provider = excluded.seed_provider,
    freshness_status = excluded.freshness_status,
    title = excluded.title,
    snippet = excluded.snippet,
    query_text = excluded.query_text,
    city = excluded.city,
    property_type = excluded.property_type,
    intent = excluded.intent,
    updated_at = excluded.updated_at,
    price_mad = excluded.price_mad,
    surface_m2 = excluded.surface_m2,
    recovered_city = excluded.recovered_city,
    recovery_confidence = excluded.recovery_confidence,
    recovery_evidence = excluded.recovery_evidence;

  return new;
end;
$$;

revoke all on function public.odm03_extract_surface_m2(text) from public, anon, authenticated;
revoke all on function public.odm03_extract_price_mad(text) from public, anon, authenticated;
revoke all on function public.odm03_recover_city(text) from public, anon, authenticated;

-- Idempotent backfill through the canonical projection contract.
update public.source_offer_seeds
set updated_at = updated_at
where freshness_status in ('seed_only', 'fresh_confirmed')
  and seed_provider in ('public_sitemap', 'commoncrawl_cdx', 'serper_search');

create index if not exists thin_index_search_documents_price_idx
  on public.thin_index_search_documents (price_mad)
  where price_mad is not null;

create index if not exists thin_index_search_documents_surface_idx
  on public.thin_index_search_documents (surface_m2)
  where surface_m2 is not null;

create index if not exists thin_index_search_documents_recovered_city_idx
  on public.thin_index_search_documents (recovered_city)
  where recovered_city is not null;

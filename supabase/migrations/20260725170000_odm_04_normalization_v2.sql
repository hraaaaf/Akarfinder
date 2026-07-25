-- ODM-04 NORMALIZATION V2
-- Additive canonical normalization over ODM-03 recovered facts.
-- Raw source evidence and recovered values remain untouched; unknown remains NULL.

alter table public.thin_index_search_documents
  add column if not exists normalized_city text,
  add column if not exists normalized_property_type text,
  add column if not exists normalized_intent text,
  add column if not exists normalized_price_mad numeric(14,2),
  add column if not exists normalized_surface_m2 numeric(10,2),
  add column if not exists price_per_m2_mad numeric(14,2),
  add column if not exists normalization_status text,
  add column if not exists normalization_version text,
  add column if not exists normalization_evidence jsonb not null default '{}'::jsonb;

create or replace function public.odm04_normalize_city(p_value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select case
    when lower(public.unaccent(p_value)) in ('casablanca','casa') then 'Casablanca'
    when lower(public.unaccent(p_value)) = 'rabat' then 'Rabat'
    when lower(public.unaccent(p_value)) = 'marrakech' then 'Marrakech'
    when lower(public.unaccent(p_value)) in ('tanger','tangier') then 'Tanger'
    when lower(public.unaccent(p_value)) = 'agadir' then 'Agadir'
    when lower(public.unaccent(p_value)) = 'fes' then 'Fès'
    when lower(public.unaccent(p_value)) = 'meknes' then 'Meknès'
    when lower(public.unaccent(p_value)) = 'kenitra' then 'Kénitra'
    when lower(public.unaccent(p_value)) = 'temara' then 'Témara'
    when lower(public.unaccent(p_value)) = 'sale' then 'Salé'
    when lower(public.unaccent(p_value)) = 'tetouan' then 'Tétouan'
    when lower(public.unaccent(p_value)) = 'oujda' then 'Oujda'
    when lower(public.unaccent(p_value)) in ('el jadida','jadida') then 'El Jadida'
    when lower(public.unaccent(p_value)) = 'mohammedia' then 'Mohammedia'
    when lower(public.unaccent(p_value)) = 'nador' then 'Nador'
    when lower(public.unaccent(p_value)) = 'essaouira' then 'Essaouira'
    when lower(public.unaccent(p_value)) = 'safi' then 'Safi'
    when lower(public.unaccent(p_value)) = 'settat' then 'Settat'
    when lower(public.unaccent(p_value)) = 'berrechid' then 'Berrechid'
    when lower(public.unaccent(p_value)) = 'khouribga' then 'Khouribga'
    when lower(public.unaccent(p_value)) = 'dakhla' then 'Dakhla'
    when lower(public.unaccent(p_value)) = 'laayoune' then 'Laâyoune'
    when lower(public.unaccent(p_value)) = 'beni mellal' then 'Béni Mellal'
    else null
  end;
$$;

create or replace function public.odm04_normalize_property_type(p_value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select case
    when lower(public.unaccent(btrim(p_value))) in ('appartement','apartment','flat') then 'apartment'
    when lower(public.unaccent(btrim(p_value))) = 'villa' then 'villa'
    when lower(public.unaccent(btrim(p_value))) in ('maison','house') then 'house'
    when lower(public.unaccent(btrim(p_value))) = 'studio' then 'studio'
    when lower(public.unaccent(btrim(p_value))) in ('terrain','land','plot') then 'land'
    when lower(public.unaccent(btrim(p_value))) in ('bureau','office') then 'office'
    when lower(public.unaccent(btrim(p_value))) in ('local commercial','commercial','commerce','shop') then 'commercial'
    when lower(public.unaccent(btrim(p_value))) = 'riad' then 'riad'
    when lower(public.unaccent(btrim(p_value))) in ('ferme','farm') then 'farm'
    else null
  end;
$$;

create or replace function public.odm04_normalize_intent(p_value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select case
    when lower(public.unaccent(btrim(p_value))) in ('sale','sell','vente','vendre','buy','acheter') then 'sale'
    when lower(public.unaccent(btrim(p_value))) in ('rent','rental','lease','location','louer') then 'rent'
    when lower(public.unaccent(btrim(p_value))) in ('new','neuf','programme','project') then 'new'
    else null
  end;
$$;

create or replace function public.odm04_safe_price_per_m2(p_price numeric, p_surface numeric)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when p_price is null or p_surface is null or p_surface <= 0 then null
    when round(p_price / p_surface, 2) between 100 and 1000000 then round(p_price / p_surface, 2)
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
  canonical_city text;
  canonical_type text;
  canonical_intent text;
  canonical_price numeric;
  canonical_surface numeric;
  canonical_price_m2 numeric;
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

  canonical_city := public.odm04_normalize_city(recovered_geo);
  canonical_type := public.odm04_normalize_property_type(nullif(new.metadata #>> '{serper_search,property_type}', ''));
  canonical_intent := public.odm04_normalize_intent(nullif(new.metadata #>> '{serper_search,intent}', ''));
  canonical_price := case when recovered_price between 10000 and 1000000000 then recovered_price else null end;
  canonical_surface := case when recovered_surface between 10 and 5000 then recovered_surface else null end;
  canonical_price_m2 := public.odm04_safe_price_per_m2(canonical_price, canonical_surface);

  insert into public.thin_index_search_documents (
    seed_id, canonical_url, source_domain, seed_provider, freshness_status,
    title, snippet, query_text, city, property_type, intent, updated_at,
    price_mad, surface_m2, recovered_city, recovery_confidence, recovery_evidence,
    normalized_city, normalized_property_type, normalized_intent,
    normalized_price_mad, normalized_surface_m2, price_per_m2_mad,
    normalization_status, normalization_version, normalization_evidence
  ) values (
    new.id, new.canonical_url, new.source_domain, new.seed_provider, new.freshness_status,
    nullif(new.metadata #>> '{serper_search,title}', ''),
    nullif(new.metadata #>> '{serper_search,snippet}', ''),
    nullif(new.metadata #>> '{serper_search,query}', ''),
    explicit_city,
    nullif(new.metadata #>> '{serper_search,property_type}', ''),
    nullif(new.metadata #>> '{serper_search,intent}', ''),
    new.updated_at,
    recovered_price, recovered_surface, recovered_geo,
    case
      when recovered_price is not null or recovered_surface is not null or explicit_city is not null then 'explicit'
      when recovered_geo is not null then 'url_token'
      else null
    end,
    jsonb_strip_nulls(jsonb_build_object(
      'price', case when recovered_price is not null then 'explicit_mad_marker' end,
      'surface', case when recovered_surface is not null then 'explicit_m2_marker' end,
      'city', case when explicit_city is not null then 'approved_metadata' when recovered_geo is not null then 'canonical_url_token' end
    )),
    canonical_city, canonical_type, canonical_intent,
    canonical_price, canonical_surface, canonical_price_m2,
    case
      when canonical_city is null and canonical_type is null and canonical_intent is null
       and canonical_price is null and canonical_surface is null then 'unavailable'
      when (recovered_geo is not null and canonical_city is null)
        or (nullif(new.metadata #>> '{serper_search,property_type}', '') is not null and canonical_type is null)
        or (nullif(new.metadata #>> '{serper_search,intent}', '') is not null and canonical_intent is null) then 'partial'
      else 'normalized'
    end,
    'odm04-v2',
    jsonb_strip_nulls(jsonb_build_object(
      'city', case when canonical_city is not null then 'canonical_alias_v2' end,
      'property_type', case when canonical_type is not null then 'canonical_taxonomy_v2' end,
      'intent', case when canonical_intent is not null then 'canonical_intent_v2' end,
      'price', case when canonical_price is not null then 'bounded_mad_v2' end,
      'surface', case when canonical_surface is not null then 'bounded_m2_v2' end,
      'price_per_m2', case when canonical_price_m2 is not null then 'derived_from_normalized_price_surface_v2' end
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
    recovery_evidence = excluded.recovery_evidence,
    normalized_city = excluded.normalized_city,
    normalized_property_type = excluded.normalized_property_type,
    normalized_intent = excluded.normalized_intent,
    normalized_price_mad = excluded.normalized_price_mad,
    normalized_surface_m2 = excluded.normalized_surface_m2,
    price_per_m2_mad = excluded.price_per_m2_mad,
    normalization_status = excluded.normalization_status,
    normalization_version = excluded.normalization_version,
    normalization_evidence = excluded.normalization_evidence;

  return new;
end;
$$;

revoke all on function public.odm04_normalize_city(text) from public, anon, authenticated;
revoke all on function public.odm04_normalize_property_type(text) from public, anon, authenticated;
revoke all on function public.odm04_normalize_intent(text) from public, anon, authenticated;
revoke all on function public.odm04_safe_price_per_m2(numeric, numeric) from public, anon, authenticated;

-- Idempotent canonical backfill through the source-of-truth trigger.
update public.source_offer_seeds
set updated_at = updated_at
where freshness_status in ('seed_only', 'fresh_confirmed')
  and seed_provider in ('public_sitemap', 'commoncrawl_cdx', 'serper_search');

create index if not exists thin_index_search_documents_normalized_city_idx
  on public.thin_index_search_documents (normalized_city)
  where normalized_city is not null;

create index if not exists thin_index_search_documents_normalized_type_intent_idx
  on public.thin_index_search_documents (normalized_property_type, normalized_intent)
  where normalized_property_type is not null or normalized_intent is not null;

create index if not exists thin_index_search_documents_normalized_price_surface_idx
  on public.thin_index_search_documents (normalized_price_mad, normalized_surface_m2)
  where normalized_price_mad is not null or normalized_surface_m2 is not null;

create index if not exists thin_index_search_documents_price_per_m2_idx
  on public.thin_index_search_documents (price_per_m2_mad)
  where price_per_m2_mad is not null;

create or replace view public.thin_index_normalized_documents_v2 as
select
  seed_id,
  canonical_url,
  source_domain,
  seed_provider,
  freshness_status,
  title,
  snippet,
  normalized_city as city,
  normalized_property_type as property_type,
  normalized_intent as intent,
  normalized_price_mad as price_mad,
  normalized_surface_m2 as surface_m2,
  price_per_m2_mad,
  normalization_status,
  normalization_version,
  normalization_evidence,
  updated_at
from public.thin_index_search_documents
where seed_provider in ('public_sitemap','commoncrawl_cdx','serper_search')
  and freshness_status in ('seed_only','fresh_confirmed');

revoke all on public.thin_index_normalized_documents_v2 from public, anon, authenticated;
grant select on public.thin_index_normalized_documents_v2 to service_role;

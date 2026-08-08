-- DATA-4.4C — freshness-only projection safety
--
-- A freshness/evidence update on source_offer_seeds must not rebuild an already
-- enriched Thin Index row from sparse seed metadata. Preserve the existing
-- projection and only propagate freshness_status/updated_at when every
-- content-bearing seed field is unchanged and metadata differs only by
-- freshness_evidence.

create or replace function public.sync_thin_index_search_document_row()
returns trigger
language plpgsql
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

  -- DATA-4.4C safety gate: freshness-only writes may add/remove
  -- freshness_evidence and change freshness_status, but must preserve the
  -- authoritative/enriched search projection already materialized for the row.
  if tg_op = 'UPDATE'
     and new.id is not distinct from old.id
     and new.canonical_url is not distinct from old.canonical_url
     and new.source_domain is not distinct from old.source_domain
     and new.seed_provider is not distinct from old.seed_provider
     and (coalesce(new.metadata, '{}'::jsonb) - 'freshness_evidence')
         is not distinct from
         (coalesce(old.metadata, '{}'::jsonb) - 'freshness_evidence')
  then
    update public.thin_index_search_documents
       set freshness_status = new.freshness_status,
           updated_at = new.updated_at
     where seed_id = new.id;
    return new;
  end if;

  if new.freshness_status not in ('seed_only','fresh_confirmed')
     or new.seed_provider not in ('public_sitemap','commoncrawl_cdx','serper_search') then
    delete from public.thin_index_search_documents where seed_id = new.id;
    return new;
  end if;

  evidence_text := concat_ws(' ',
    new.metadata #>> '{serper_search,title}',
    new.metadata #>> '{serper_search,snippet}',
    new.canonical_url
  );
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
    normalized_price_m2, normalization_status, normalization_version,
    normalization_evidence
  ) values (
    new.id,new.canonical_url,new.source_domain,new.seed_provider,new.freshness_status,
    nullif(new.metadata #>> '{serper_search,title}',''),
    nullif(new.metadata #>> '{serper_search,snippet}',''),
    nullif(new.metadata #>> '{serper_search,query}',''),
    explicit_city,
    nullif(new.metadata #>> '{serper_search,property_type}',''),
    nullif(new.metadata #>> '{serper_search,intent}',''),
    new.updated_at,
    recovered_price,recovered_surface,recovered_geo,
    case
      when recovered_price is not null or recovered_surface is not null or explicit_city is not null then 'explicit'
      when recovered_geo is not null then 'url_token'
      else null
    end,
    jsonb_strip_nulls(jsonb_build_object(
      'price',case when recovered_price is not null then 'explicit_mad_marker' end,
      'surface',case when recovered_surface is not null then 'explicit_m2_marker' end,
      'city',case when explicit_city is not null then 'approved_metadata' when recovered_geo is not null then 'canonical_url_token' end
    )),
    canonical_city,canonical_type,canonical_intent,canonical_price,canonical_surface,canonical_price_m2,canonical_price_m2,
    case
      when canonical_city is null and canonical_type is null and canonical_intent is null and canonical_price is null and canonical_surface is null then 'unavailable'
      when (recovered_geo is not null and canonical_city is null)
        or (nullif(new.metadata #>> '{serper_search,property_type}','') is not null and canonical_type is null)
        or (nullif(new.metadata #>> '{serper_search,intent}','') is not null and canonical_intent is null) then 'partial'
      else 'normalized'
    end,
    'odm04-v2',
    jsonb_strip_nulls(jsonb_build_object(
      'city',case when canonical_city is not null then 'canonical_alias_v2' end,
      'property_type',case when canonical_type is not null then 'canonical_taxonomy_v2' end,
      'intent',case when canonical_intent is not null then 'canonical_intent_v2' end,
      'price',case when canonical_price is not null then 'bounded_mad_v2' end,
      'surface',case when canonical_surface is not null then 'bounded_m2_v2' end,
      'price_per_m2',case when canonical_price_m2 is not null then 'derived_from_normalized_price_surface_v2' end
    ))
  )
  on conflict (seed_id) do update set
    canonical_url=excluded.canonical_url,
    source_domain=excluded.source_domain,
    seed_provider=excluded.seed_provider,
    freshness_status=excluded.freshness_status,
    title=excluded.title,
    snippet=excluded.snippet,
    query_text=excluded.query_text,
    city=excluded.city,
    property_type=excluded.property_type,
    intent=excluded.intent,
    updated_at=excluded.updated_at,
    price_mad=excluded.price_mad,
    surface_m2=excluded.surface_m2,
    recovered_city=excluded.recovered_city,
    recovery_confidence=excluded.recovery_confidence,
    recovery_evidence=excluded.recovery_evidence,
    normalized_city=excluded.normalized_city,
    normalized_property_type=excluded.normalized_property_type,
    normalized_intent=excluded.normalized_intent,
    normalized_price_mad=excluded.normalized_price_mad,
    normalized_surface_m2=excluded.normalized_surface_m2,
    price_per_m2_mad=excluded.price_per_m2_mad,
    normalized_price_m2=excluded.normalized_price_m2,
    normalization_status=excluded.normalization_status,
    normalization_version=excluded.normalization_version,
    normalization_evidence=excluded.normalization_evidence;
  return new;
end;
$$;

comment on function public.sync_thin_index_search_document_row() is
  'Synchronizes seed rows to Thin Index; DATA-4.4C preserves enriched projection fields for freshness-only/evidence-only seed updates.';

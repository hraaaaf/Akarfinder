-- DATA MASS-INDEX M2 — native discovery providers in the external Thin Index.
-- Structural migration only. It does not backfill discovery_candidates, activate
-- public Search, or relabel legacy rows historically bridged as serper_search.

create or replace function public.odm06_display_eligibility(
  p_canonical_url text,
  p_seed_provider text,
  p_freshness_status text,
  p_quality_tier text
)
returns text
language sql
immutable
set search_path to ''
as $$
  select case
    when nullif(btrim(p_canonical_url), '') is null then 'ineligible'
    when p_seed_provider not in ('public_sitemap','commoncrawl_cdx','serper_search','serper_mass_harvest','openserp') then 'ineligible'
    when p_freshness_status not in ('seed_only','fresh_confirmed') then 'ineligible'
    when p_quality_tier in ('Q3_intelligence_ready','Q2_comparable','A','B') then 'eligible_primary'
    when p_quality_tier in ('Q1_contextual','Q0_link_only','C') then 'eligible_secondary'
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
set search_path to ''
as $$
  select case
    when nullif(btrim(p_canonical_url), '') is null then 'missing_canonical_url'
    when p_seed_provider not in ('public_sitemap','commoncrawl_cdx','serper_search','serper_mass_harvest','openserp') then 'unsupported_provider'
    when p_freshness_status not in ('seed_only','fresh_confirmed') then 'unsupported_freshness_state'
    when p_quality_tier in ('Q3_intelligence_ready','A') then 'intelligence_ready'
    when p_quality_tier in ('Q2_comparable','B') then 'comparable'
    when p_quality_tier in ('Q1_contextual','C') then 'contextual_only'
    when p_quality_tier = 'Q0_link_only' then 'link_only'
    when p_quality_tier in ('D','E','REJECTED','UNSCORED') then 'blocked_quality'
    else 'missing_quality_tier'
  end;
$$;

create or replace function public.mass_index_sync_native_discovery_seed_row()
returns trigger
language plpgsql
set search_path to ''
as $$
declare
  evidence_text text;
  explicit_city text;
  raw_property_type text;
  raw_intent text;
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
  if new.seed_provider not in ('openserp','serper_mass_harvest') then
    return new;
  end if;

  if new.freshness_status not in ('seed_only','fresh_confirmed') then
    delete from public.thin_index_search_documents where seed_id = new.id;
    return new;
  end if;

  if coalesce(new.metadata #>> '{external_index,promotion_version}', '') <> 'MASS_INDEX_M2_V1'
     or coalesce(new.metadata #>> '{external_index,page_kind}', '') <> 'LIKELY_LISTING_DETAIL'
     or coalesce(new.metadata #>> '{external_index,geography_scope}', '') <> 'MOROCCO_LIKELY' then
    delete from public.thin_index_search_documents where seed_id = new.id;
    return new;
  end if;

  evidence_text := concat_ws(' ',
    new.metadata #>> '{external_index,title}',
    new.metadata #>> '{external_index,snippet}',
    new.canonical_url
  );
  explicit_city := nullif(new.metadata #>> '{external_index,city}', '');
  raw_property_type := nullif(new.metadata #>> '{external_index,property_type}', '');
  raw_intent := nullif(new.metadata #>> '{external_index,intent}', '');
  recovered_surface := public.odm03_extract_surface_m2(evidence_text);
  recovered_price := public.odm03_extract_price_mad(evidence_text);
  recovered_geo := coalesce(explicit_city, public.odm03_recover_city(new.canonical_url));
  canonical_city := public.odm04_normalize_city(recovered_geo);
  canonical_type := public.odm04_normalize_property_type(raw_property_type);
  canonical_intent := public.odm04_normalize_intent(raw_intent);
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
    normalization_evidence,
    vertical_classification, vertical_classification_reason, vertical_classification_version,
    document_kind, document_kind_confidence, document_kind_reason, document_kind_version
  ) values (
    new.id,new.canonical_url,new.source_domain,new.seed_provider,new.freshness_status,
    nullif(new.metadata #>> '{external_index,title}',''),
    nullif(new.metadata #>> '{external_index,snippet}',''),
    nullif(new.metadata #>> '{external_index,query}',''),
    explicit_city,
    raw_property_type,
    raw_intent,
    new.updated_at,
    recovered_price,recovered_surface,recovered_geo,
    case
      when recovered_price is not null or recovered_surface is not null or explicit_city is not null then 'explicit'
      when recovered_geo is not null then 'url_token'
      else null
    end,
    jsonb_strip_nulls(jsonb_build_object(
      'price',case when recovered_price is not null then 'external_index_text' end,
      'surface',case when recovered_surface is not null then 'external_index_text' end,
      'city',case when explicit_city is not null then 'external_index_metadata' when recovered_geo is not null then 'canonical_url_token' end
    )),
    canonical_city,canonical_type,canonical_intent,canonical_price,canonical_surface,canonical_price_m2,canonical_price_m2,
    case
      when canonical_city is null and canonical_type is null and canonical_intent is null and canonical_price is null and canonical_surface is null then 'unavailable'
      when (recovered_geo is not null and canonical_city is null)
        or (raw_property_type is not null and canonical_type is null)
        or (raw_intent is not null and canonical_intent is null) then 'partial'
      else 'normalized'
    end,
    'mass-index-m2-v1',
    jsonb_strip_nulls(jsonb_build_object(
      'city',case when canonical_city is not null then 'canonical_alias_v2' end,
      'property_type',case when canonical_type is not null then 'canonical_taxonomy_v2' end,
      'intent',case when canonical_intent is not null then 'canonical_intent_v2' end,
      'price',case when canonical_price is not null then 'bounded_mad_v2' end,
      'surface',case when canonical_surface is not null then 'bounded_m2_v2' end,
      'price_per_m2',case when canonical_price_m2 is not null then 'derived_from_normalized_price_surface_v2' end
    )),
    'real_estate_likely','mass_index_m1_universal_candidate_promotion','mass-index-m2-v1',
    'LISTING',null,'mass_index_m1_likely_listing_detail','mass-index-m2-v1'
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
    normalization_evidence=excluded.normalization_evidence,
    vertical_classification=excluded.vertical_classification,
    vertical_classification_reason=excluded.vertical_classification_reason,
    vertical_classification_version=excluded.vertical_classification_version,
    document_kind=excluded.document_kind,
    document_kind_confidence=excluded.document_kind_confidence,
    document_kind_reason=excluded.document_kind_reason,
    document_kind_version=excluded.document_kind_version;

  return new;
end;
$$;

drop trigger if exists trg_zz_mass_index_sync_native_discovery_seed on public.source_offer_seeds;
create trigger trg_zz_mass_index_sync_native_discovery_seed
after insert or update on public.source_offer_seeds
for each row execute function public.mass_index_sync_native_discovery_seed_row();

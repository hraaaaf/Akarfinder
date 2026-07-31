-- ODM COVERAGE PARITY V1
-- Bridges already-persisted, public OpenSERP evidence into the ODM seed/thin-index chain.
-- No network access, no bypass, no public activation toggle and no fuzzy identity matching.

create or replace function public.refresh_odm_legacy_coverage_bridge_v1()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  inserted_rows integer := 0;
  updated_rows integer := 0;
begin
  with eligible as (
    select distinct on (ls.listing_url)
      ls.listing_url as canonical_url,
      lower(regexp_replace(split_part(regexp_replace(ls.listing_url, '^https?://(www\.)?', '', 'i'), '/', 1), '^www\.', '', 'i')) as source_domain,
      coalesce(ls.first_seen_at, pl.created_at, now()) as first_observed_at,
      coalesce(ls.last_seen_at, pl.updated_at, now()) as last_observed_at,
      jsonb_build_object(
        'serper_search', jsonb_strip_nulls(jsonb_build_object(
          'title', nullif(pl.title, ''),
          'snippet', nullif(pl.description_snippet, ''),
          'city', nullif(pl.city, ''),
          'property_type', nullif(pl.property_type, ''),
          'intent', nullif(pl.transaction_type, ''),
          'query', 'legacy_persisted_openserp_bridge_v1'
        )),
        'coverage_bridge', jsonb_build_object(
          'version', 'odm_coverage_parity_v1',
          'property_listing_id', pl.id,
          'listing_source_id', ls.id,
          'origin_type', ls.origin_type,
          'content_fingerprint', ls.content_fingerprint,
          'shadow_only', true,
          'public_activation', false
        )
      ) as metadata
    from public.property_listings pl
    join public.listing_sources ls on ls.property_listing_id = pl.id
    where ls.is_active is true
      and ls.origin_type = 'persisted_openserp'
      and nullif(btrim(ls.listing_url), '') is not null
      and coalesce(ls.last_seen_at, pl.updated_at, now()) >= now() - interval '60 days'
      and lower(regexp_replace(split_part(regexp_replace(ls.listing_url, '^https?://(www\.)?', '', 'i'), '/', 1), '^www\.', '', 'i'))
          in ('mubawab.ma', 'mouldar.com', 'marrakechrealty.com')
      and public.odm04_normalize_city(nullif(pl.city, '')) is not null
      and public.odm04_normalize_property_type(nullif(pl.property_type, '')) is not null
      and public.odm04_normalize_intent(nullif(pl.transaction_type, '')) is not null
    order by ls.listing_url, coalesce(ls.last_seen_at, pl.updated_at, now()) desc, ls.id desc
  ), upserted as (
    insert into public.source_offer_seeds (
      canonical_url, source_domain, seed_provider,
      first_observed_at, last_observed_at, observation_count,
      metadata, freshness_status, fresh_last_seen_at, fresh_channels,
      created_at, updated_at
    )
    select
      e.canonical_url, e.source_domain, 'serper_search',
      e.first_observed_at, e.last_observed_at, 1,
      e.metadata, 'fresh_confirmed', e.last_observed_at,
      array['legacy_persisted_openserp_bridge_v1']::text[], now(), now()
    from eligible e
    on conflict (canonical_url) do update set
      last_observed_at = greatest(public.source_offer_seeds.last_observed_at, excluded.last_observed_at),
      observation_count = public.source_offer_seeds.observation_count + 1,
      metadata = coalesce(public.source_offer_seeds.metadata, '{}'::jsonb) || excluded.metadata,
      freshness_status = case
        when public.source_offer_seeds.freshness_status in ('seed_only','fresh_confirmed') then 'fresh_confirmed'
        else public.source_offer_seeds.freshness_status
      end,
      fresh_last_seen_at = greatest(public.source_offer_seeds.fresh_last_seen_at, excluded.fresh_last_seen_at),
      fresh_channels = array(select distinct unnest(public.source_offer_seeds.fresh_channels || excluded.fresh_channels)),
      updated_at = now()
    returning (xmax = 0) as inserted
  )
  select count(*) filter (where inserted), count(*) filter (where not inserted)
  into inserted_rows, updated_rows
  from upserted;

  return jsonb_build_object(
    'version', 'odm_coverage_parity_v1',
    'inserted_rows', inserted_rows,
    'updated_rows', updated_rows,
    'shadow_only', true,
    'public_activation', false
  );
end;
$$;

revoke all on function public.refresh_odm_legacy_coverage_bridge_v1() from public, anon, authenticated;
grant execute on function public.refresh_odm_legacy_coverage_bridge_v1() to service_role;

create or replace view public.odm_coverage_parity_report_v1
with (security_invoker = true)
as
with bridged as (
  select
    s.id as seed_id,
    s.canonical_url,
    s.source_domain,
    d.display_eligibility,
    d.normalized_city,
    d.normalized_property_type,
    d.normalized_intent,
    d.vertical_classification
  from public.source_offer_seeds s
  left join public.thin_index_search_documents d on d.seed_id = s.id
  where s.metadata #>> '{coverage_bridge,version}' = 'odm_coverage_parity_v1'
)
select
  source_domain,
  count(*)::bigint as bridged_seeds,
  count(*) filter (where display_eligibility in ('eligible_primary','eligible_secondary'))::bigint as publicly_searchable_rows,
  count(*) filter (where display_eligibility = 'ineligible')::bigint as ineligible_rows,
  count(*) filter (where normalized_city is not null and normalized_property_type is not null and normalized_intent is not null)::bigint as fully_structured_rows,
  count(*) filter (where vertical_classification = 'non_real_estate')::bigint as blocked_non_real_estate_rows
from bridged
group by source_domain;

revoke all on public.odm_coverage_parity_report_v1 from public, anon, authenticated;
grant select on public.odm_coverage_parity_report_v1 to service_role;

comment on function public.refresh_odm_legacy_coverage_bridge_v1() is
  'Idempotent service-role-only bridge from persisted compliant OpenSERP listing evidence into ODM seeds. No external fetch and no activation toggle.';
comment on view public.odm_coverage_parity_report_v1 is
  'Private coverage parity report for ODM legacy evidence bridge V1.';

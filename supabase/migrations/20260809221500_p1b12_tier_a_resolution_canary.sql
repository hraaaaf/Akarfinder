-- P1B.12 — Tier A Resolution Canary
-- Resolve exactly the 8 authority-qualified Agadir listings from P1B.8/P1B.9
-- against the two protected Registry entities created by P1B.11.
-- No fuzzy/title/snippet/spatial/proximity inference. Append-only rollback.

create or replace view public.odm_p1b12_tier_a_resolution_candidates_v1
with (security_invoker = true)
as
with allowlist(seed_id, expected_district, neighborhood_id) as (
  values
    ('049cd577-fc81-4d23-bc1c-2d5cf84214ea'::uuid, 'hay mohammadi'::text, 'district_agadir_hay_mohammadi'::text),
    ('6aed05ed-5aee-415f-98cb-ff87db6d2cc5'::uuid, 'dakhla'::text, 'district_agadir_dakhla'::text),
    ('6d72d3f0-8697-4b88-9876-5ce0806aa681'::uuid, 'hay mohammadi'::text, 'district_agadir_hay_mohammadi'::text),
    ('b36688fd-fe7b-43e3-bad6-e968e2ecf4c8'::uuid, 'hay mohammadi'::text, 'district_agadir_hay_mohammadi'::text),
    ('d1ecf541-bb26-43b1-87e7-d4dedd03b413'::uuid, 'dakhla'::text, 'district_agadir_dakhla'::text),
    ('d69e04e4-92bd-4bd9-bbd2-2bfc07b5fa7e'::uuid, 'hay mohammadi'::text, 'district_agadir_hay_mohammadi'::text),
    ('e804e8ab-2575-412e-b0dd-0b01737513b1'::uuid, 'hay mohammadi'::text, 'district_agadir_hay_mohammadi'::text),
    ('fbbdd20c-8d8b-4b78-a186-652a7557cf7e'::uuid, 'dakhla'::text, 'district_agadir_dakhla'::text)
), eligible as (
  select d.seed_id
  from public.thin_index_search_documents d
  where d.vertical_classification = 'real_estate_likely'
    and d.document_kind = 'LISTING'
    and d.display_eligibility in ('eligible_primary', 'eligible_secondary')
), bridged as (
  select
    a.seed_id,
    a.expected_district,
    a.neighborhood_id,
    s.source_domain,
    nullif(s.metadata->'coverage_bridge'->>'property_listing_id', '')::bigint as property_listing_id
  from allowlist a
  join public.source_offer_seeds s on s.id = a.seed_id
  join eligible e on e.seed_id = a.seed_id
  where nullif(s.metadata->'coverage_bridge'->>'property_listing_id', '') is not null
), latest as (
  select distinct on (e.source_record_id)
    e.source_record_id,
    e.resolution_status,
    e.resolved_neighborhood_id,
    e.created_at,
    e.id
  from public.geo_resolution_events e
  where e.source_record_type = 'source_offer_seed'
    and e.source_record_id in (select seed_id::text from allowlist)
  order by e.source_record_id, e.created_at desc, e.id desc
)
select
  b.seed_id,
  b.property_listing_id,
  b.source_domain,
  p.city as raw_city,
  p.district as raw_district,
  'city_agadir'::text as city_id,
  b.neighborhood_id
from bridged b
join public.property_listings p on p.id = b.property_listing_id
join public.geo_entities n
  on n.id = b.neighborhood_id
 and n.entity_type = 'neighborhood'
 and n.parent_id = 'city_agadir'
 and n.validation_status = 'validated'
 and n.map_eligible = false
 and n.seo_eligible = false
left join latest l on l.source_record_id = b.seed_id::text
where lower(regexp_replace(trim(p.city), '\s+', ' ', 'g')) = 'agadir'
  and lower(regexp_replace(trim(p.district), '\s+', ' ', 'g')) = b.expected_district
  and not (coalesce(l.resolution_status, '') = 'resolved' and l.resolved_neighborhood_id is not null);

revoke all on public.odm_p1b12_tier_a_resolution_candidates_v1 from public, anon, authenticated;
grant select on public.odm_p1b12_tier_a_resolution_candidates_v1 to service_role;

create or replace function public.odm_p1b12_tier_a_resolution_preflight_v1()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
select jsonb_build_object(
  'contract_version', 'p1b12_tier_a_resolution_canary_v1',
  'candidate_count', count(*),
  'dakhla_rows', count(*) filter (where neighborhood_id = 'district_agadir_dakhla'),
  'hay_mohammadi_rows', count(*) filter (where neighborhood_id = 'district_agadir_hay_mohammadi'),
  'source_domains', count(distinct source_domain),
  'resolver_version', 'p1b12_tier_a_authority_canary_v1',
  'metric_layers_activated', false,
  'map_activation', false,
  'seo_activation', false
)
from public.odm_p1b12_tier_a_resolution_candidates_v1;
$$;

revoke all on function public.odm_p1b12_tier_a_resolution_preflight_v1() from public, anon, authenticated;
grant execute on function public.odm_p1b12_tier_a_resolution_preflight_v1() to service_role;

create or replace function public.odm_p1b12_tier_a_resolution_apply_v1(p_expected_count integer)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
  v_dakhla integer;
  v_hay integer;
  v_domains integer;
  v_inserted integer;
begin
  select count(*),
         count(*) filter (where neighborhood_id = 'district_agadir_dakhla'),
         count(*) filter (where neighborhood_id = 'district_agadir_hay_mohammadi'),
         count(distinct source_domain)
    into v_count, v_dakhla, v_hay, v_domains
  from public.odm_p1b12_tier_a_resolution_candidates_v1;

  if p_expected_count <> 8 or v_count <> 8 or v_dakhla <> 3 or v_hay <> 5 or v_domains <> 2 then
    raise exception 'P1B.12 cohort drift: expected 8 (3 Dakhla / 5 Hay Mohammadi / 2 sources), got % (% / % / %)', v_count, v_dakhla, v_hay, v_domains;
  end if;

  insert into public.geo_resolution_events (
    raw_city, raw_neighborhood, resolved_city_id, resolved_neighborhood_id,
    resolution_status, candidates, source_record_type, source_record_id, resolver_version
  )
  select
    c.raw_city,
    c.raw_district,
    c.city_id,
    c.neighborhood_id,
    'resolved',
    jsonb_build_array(jsonb_build_object(
      'evidence', 'p1b8_authority_confirmed_plus_p1b11_registry_exact_persisted_district',
      'property_listing_id', c.property_listing_id,
      'authority_review_lot', 'P1B.8',
      'candidate_review_lot', 'P1B.9',
      'registry_write_lot', 'P1B.11',
      'resolution_canary_lot', 'P1B.12'
    )),
    'source_offer_seed',
    c.seed_id::text,
    'p1b12_tier_a_authority_canary_v1'
  from public.odm_p1b12_tier_a_resolution_candidates_v1 c;

  get diagnostics v_inserted = row_count;
  if v_inserted <> 8 then
    raise exception 'P1B.12 atomic insert mismatch: expected 8, inserted %', v_inserted;
  end if;

  return jsonb_build_object('inserted', v_inserted, 'resolver_version', 'p1b12_tier_a_authority_canary_v1', 'metric_layers_activated', false);
end;
$$;

revoke all on function public.odm_p1b12_tier_a_resolution_apply_v1(integer) from public, anon, authenticated;
grant execute on function public.odm_p1b12_tier_a_resolution_apply_v1(integer) to service_role;

create or replace function public.odm_p1b12_tier_a_resolution_rollback_v1(p_expected_count integer)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current integer;
  v_inserted integer;
begin
  select count(*) into v_current
  from public.geo_resolution_events e
  where e.source_record_type = 'source_offer_seed'
    and e.resolver_version = 'p1b12_tier_a_authority_canary_v1'
    and e.resolution_status = 'resolved'
    and e.resolved_neighborhood_id in ('district_agadir_dakhla','district_agadir_hay_mohammadi')
    and not exists (
      select 1 from public.geo_resolution_events newer
      where newer.source_record_type = e.source_record_type
        and newer.source_record_id = e.source_record_id
        and (newer.created_at, newer.id) > (e.created_at, e.id)
    );

  if p_expected_count <> 8 or v_current <> 8 then
    raise exception 'P1B.12 rollback cohort drift: expected 8, got %', v_current;
  end if;

  insert into public.geo_resolution_events (
    raw_city, raw_neighborhood, resolved_city_id, resolved_neighborhood_id,
    resolution_status, candidates, source_record_type, source_record_id, resolver_version
  )
  select
    e.raw_city, e.raw_neighborhood, null, null, 'unresolved',
    jsonb_build_array(jsonb_build_object('rollback_of_resolver_version','p1b12_tier_a_authority_canary_v1','reason','p1b12_controlled_rollback')),
    e.source_record_type, e.source_record_id, 'p1b12_tier_a_authority_canary_v1_rollback'
  from public.geo_resolution_events e
  where e.source_record_type = 'source_offer_seed'
    and e.resolver_version = 'p1b12_tier_a_authority_canary_v1'
    and e.resolution_status = 'resolved'
    and e.resolved_neighborhood_id in ('district_agadir_dakhla','district_agadir_hay_mohammadi')
    and not exists (
      select 1 from public.geo_resolution_events newer
      where newer.source_record_type = e.source_record_type
        and newer.source_record_id = e.source_record_id
        and (newer.created_at, newer.id) > (e.created_at, e.id)
    );

  get diagnostics v_inserted = row_count;
  if v_inserted <> 8 then
    raise exception 'P1B.12 rollback insert mismatch: expected 8, inserted %', v_inserted;
  end if;

  return jsonb_build_object('unresolved_events_inserted', v_inserted, 'rollback_resolver_version', 'p1b12_tier_a_authority_canary_v1_rollback', 'metric_layers_activated', false);
end;
$$;

revoke all on function public.odm_p1b12_tier_a_resolution_rollback_v1(integer) from public, anon, authenticated;
grant execute on function public.odm_p1b12_tier_a_resolution_rollback_v1(integer) to service_role;

comment on view public.odm_p1b12_tier_a_resolution_candidates_v1 is 'P1B.12 exact allowlisted Tier A cohort: 8 authority-qualified Agadir listings only.';
comment on function public.odm_p1b12_tier_a_resolution_apply_v1(integer) is 'P1B.12 fail-closed 8-row Tier A geo resolution canary; no map/SEO/metric activation.';
comment on function public.odm_p1b12_tier_a_resolution_rollback_v1(integer) is 'P1B.12 append-only rollback by newer unresolved events; provenance is never deleted.';

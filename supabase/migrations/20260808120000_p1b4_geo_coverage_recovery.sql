-- P1B.4 — Geo Coverage Recovery V1
-- Recover only explicit district values already persisted on bridged property_listings.
-- No title/URL/coordinate/proximity/fuzzy inference is allowed.
-- Apply is fail-closed on an exact expected cohort size and prior-event absence.

create or replace view public.odm_p1b4_geo_recovery_candidates_v1
with (security_invoker = true)
as
with eligible as (
  select d.seed_id
  from public.thin_index_search_documents d
  where d.vertical_classification = 'real_estate_likely'
    and d.document_kind = 'LISTING'
    and d.display_eligibility in ('eligible_primary', 'eligible_secondary')
), bridged as (
  select
    s.id as seed_id,
    nullif(s.metadata->'coverage_bridge'->>'property_listing_id', '')::bigint as property_listing_id
  from public.source_offer_seeds s
  join eligible e on e.seed_id = s.id
  where s.metadata ? 'coverage_bridge'
    and nullif(s.metadata->'coverage_bridge'->>'property_listing_id', '') is not null
), raw_matches as (
  select distinct
    b.seed_id,
    p.id as property_listing_id,
    p.city as raw_city,
    p.district as raw_district,
    ga.geo_entity_id as neighborhood_id,
    n.parent_id as city_id
  from bridged b
  join public.property_listings p on p.id = b.property_listing_id
  join public.geo_aliases ga
    on ga.normalized_alias = lower(regexp_replace(trim(p.district), '\s+', ' ', 'g'))
  join public.geo_entities n
    on n.id = ga.geo_entity_id
   and n.entity_type = 'neighborhood'
   and n.validation_status = 'validated'
  where nullif(trim(p.district), '') is not null
), match_counts as (
  select seed_id, count(distinct neighborhood_id) as neighborhood_match_count
  from raw_matches
  group by seed_id
), exact_matches as (
  select rm.*
  from raw_matches rm
  join match_counts mc using (seed_id)
  where mc.neighborhood_match_count = 1
    and exists (
      select 1
      from public.geo_aliases ca
      join public.geo_entities ce on ce.id = ca.geo_entity_id
      where ce.id = rm.city_id
        and ce.entity_type = 'city'
        and ce.validation_status = 'validated'
        and ca.normalized_alias = lower(regexp_replace(trim(rm.raw_city), '\s+', ' ', 'g'))
    )
), event_free as (
  select em.*
  from exact_matches em
  where not exists (
    select 1
    from public.geo_resolution_events gre
    where gre.source_record_type = 'source_offer_seed'
      and gre.source_record_id = em.seed_id::text
  )
)
select
  seed_id,
  property_listing_id,
  raw_city,
  raw_district,
  city_id,
  neighborhood_id
from event_free;

revoke all on public.odm_p1b4_geo_recovery_candidates_v1 from public, anon, authenticated;
grant select on public.odm_p1b4_geo_recovery_candidates_v1 to service_role;

create or replace function public.odm_p1b4_geo_recovery_preflight_v1()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
select jsonb_build_object(
  'contract_version', 'p1b4_geo_coverage_recovery_v1',
  'candidate_count', count(*),
  'distinct_seeds', count(distinct seed_id),
  'distinct_property_listings', count(distinct property_listing_id),
  'neighborhoods', count(distinct neighborhood_id),
  'cities', count(distinct city_id),
  'resolver_version', 'p1b4_exact_bridge_v1',
  'metric_layers_activated', false,
  'gates', jsonb_build_object(
    'public_listing_only', true,
    'explicit_persisted_district_only', true,
    'unique_exact_neighborhood_alias', true,
    'validated_geo_entities_only', true,
    'parent_city_exact_alias_match', true,
    'no_prior_geo_event', true,
    'no_fuzzy_matching', true,
    'no_title_url_coordinate_or_proximity_inference', true
  )
)
from public.odm_p1b4_geo_recovery_candidates_v1;
$$;

revoke all on function public.odm_p1b4_geo_recovery_preflight_v1() from public, anon, authenticated;
grant execute on function public.odm_p1b4_geo_recovery_preflight_v1() to service_role;

create or replace function public.odm_p1b4_geo_recovery_apply_v1(p_expected_count integer)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_candidate_count integer;
  v_inserted integer;
begin
  if p_expected_count is null or p_expected_count <= 0 then
    raise exception 'P1B.4 expected count must be positive';
  end if;

  select count(*) into v_candidate_count
  from public.odm_p1b4_geo_recovery_candidates_v1;

  if v_candidate_count <> p_expected_count then
    raise exception 'P1B.4 cohort drift: expected %, got %', p_expected_count, v_candidate_count;
  end if;

  insert into public.geo_resolution_events (
    raw_city,
    raw_neighborhood,
    resolved_city_id,
    resolved_neighborhood_id,
    resolution_status,
    candidates,
    source_record_type,
    source_record_id,
    resolver_version
  )
  select
    c.raw_city,
    c.raw_district,
    c.city_id,
    c.neighborhood_id,
    'resolved',
    jsonb_build_array(jsonb_build_object(
      'evidence', 'explicit_property_listing_district_exact_geo_alias',
      'property_listing_id', c.property_listing_id,
      'city_id', c.city_id,
      'neighborhood_id', c.neighborhood_id
    )),
    'source_offer_seed',
    c.seed_id::text,
    'p1b4_exact_bridge_v1'
  from public.odm_p1b4_geo_recovery_candidates_v1 c;

  get diagnostics v_inserted = row_count;

  if v_inserted <> p_expected_count then
    raise exception 'P1B.4 atomic insert mismatch: expected %, inserted %', p_expected_count, v_inserted;
  end if;

  return jsonb_build_object(
    'contract_version', 'p1b4_geo_coverage_recovery_v1',
    'resolver_version', 'p1b4_exact_bridge_v1',
    'inserted', v_inserted,
    'metric_layers_activated', false
  );
end;
$$;

revoke all on function public.odm_p1b4_geo_recovery_apply_v1(integer) from public, anon, authenticated;
grant execute on function public.odm_p1b4_geo_recovery_apply_v1(integer) to service_role;

create or replace function public.odm_p1b4_geo_recovery_rollback_v1(p_expected_count integer)
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
    and e.resolver_version = 'p1b4_exact_bridge_v1'
    and e.resolution_status = 'resolved'
    and not exists (
      select 1
      from public.geo_resolution_events newer
      where newer.source_record_type = e.source_record_type
        and newer.source_record_id = e.source_record_id
        and (newer.created_at, newer.id) > (e.created_at, e.id)
    );

  if v_current <> p_expected_count then
    raise exception 'P1B.4 rollback cohort drift: expected %, got %', p_expected_count, v_current;
  end if;

  insert into public.geo_resolution_events (
    raw_city,
    raw_neighborhood,
    resolved_city_id,
    resolved_neighborhood_id,
    resolution_status,
    candidates,
    source_record_type,
    source_record_id,
    resolver_version
  )
  select
    e.raw_city,
    e.raw_neighborhood,
    null,
    null,
    'unresolved',
    jsonb_build_array(jsonb_build_object(
      'rollback_of_resolver_version', 'p1b4_exact_bridge_v1',
      'reason', 'p1b4_controlled_rollback'
    )),
    e.source_record_type,
    e.source_record_id,
    'p1b4_exact_bridge_v1_rollback'
  from public.geo_resolution_events e
  where e.source_record_type = 'source_offer_seed'
    and e.resolver_version = 'p1b4_exact_bridge_v1'
    and e.resolution_status = 'resolved'
    and not exists (
      select 1
      from public.geo_resolution_events newer
      where newer.source_record_type = e.source_record_type
        and newer.source_record_id = e.source_record_id
        and (newer.created_at, newer.id) > (e.created_at, e.id)
    );

  get diagnostics v_inserted = row_count;

  if v_inserted <> p_expected_count then
    raise exception 'P1B.4 rollback insert mismatch: expected %, inserted %', p_expected_count, v_inserted;
  end if;

  return jsonb_build_object(
    'contract_version', 'p1b4_geo_coverage_recovery_v1',
    'rollback_resolver_version', 'p1b4_exact_bridge_v1_rollback',
    'unresolved_events_inserted', v_inserted,
    'metric_layers_activated', false
  );
end;
$$;

revoke all on function public.odm_p1b4_geo_recovery_rollback_v1(integer) from public, anon, authenticated;
grant execute on function public.odm_p1b4_geo_recovery_rollback_v1(integer) to service_role;

comment on view public.odm_p1b4_geo_recovery_candidates_v1 is
  'P1B.4 exact recovery candidates: public listing + explicit persisted property_listings.district + unique exact validated Geo Registry neighborhood alias + exact validated parent-city alias + no prior geo event.';
comment on function public.odm_p1b4_geo_recovery_apply_v1(integer) is
  'P1B.4 fail-closed controlled geo recovery writer. Expected cohort count must match exactly; metric layers remain disabled.';
comment on function public.odm_p1b4_geo_recovery_rollback_v1(integer) is
  'P1B.4 append-only rollback: emits newer unresolved events instead of deleting provenance.';

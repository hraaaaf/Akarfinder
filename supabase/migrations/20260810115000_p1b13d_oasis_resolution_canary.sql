-- P1B.13D — Oasis Resolution Canary
-- Resolve exactly the 5 authority-qualified Casablanca — Oasis listings.
-- Exact allowlist only. No fuzzy/title/snippet/spatial inference. Append-only rollback.

create or replace view public.odm_p1b13d_oasis_resolution_candidates_v1
with (security_invoker = true)
as
with allowlist(seed_id) as (
  values
    ('1c3223d2-8eae-471d-ba14-ea90447aeb2f'::uuid),
    ('2301d915-3d1b-45db-b178-bd2abdc26472'::uuid),
    ('7eacf82f-c374-467a-a3af-53430f82211d'::uuid),
    ('9a7f0328-683c-4783-b46e-4bdc30cb3a86'::uuid),
    ('9f644e9e-f2c0-4b0a-8646-8d4e750a6767'::uuid)
), eligible as (
  select d.seed_id from public.thin_index_search_documents d
  where d.vertical_classification='real_estate_likely'
    and d.document_kind='LISTING'
    and d.display_eligibility in ('eligible_primary','eligible_secondary')
), bridged as (
  select a.seed_id,s.source_domain,
         nullif(s.metadata->'coverage_bridge'->>'property_listing_id','')::bigint as property_listing_id
  from allowlist a
  join public.source_offer_seeds s on s.id=a.seed_id
  join eligible e on e.seed_id=a.seed_id
  where nullif(s.metadata->'coverage_bridge'->>'property_listing_id','') is not null
), latest as (
  select distinct on (e.source_record_id)
    e.source_record_id,e.resolution_status,e.resolved_neighborhood_id,e.created_at,e.id
  from public.geo_resolution_events e
  where e.source_record_type='source_offer_seed'
    and e.source_record_id in (select seed_id::text from allowlist)
  order by e.source_record_id,e.created_at desc,e.id desc
)
select b.seed_id,b.property_listing_id,b.source_domain,p.city raw_city,p.district raw_district,
       'city_casablanca'::text city_id,'district_casablanca_oasis'::text neighborhood_id
from bridged b
join public.property_listings p on p.id=b.property_listing_id
join public.geo_entities n on n.id='district_casablanca_oasis'
  and n.entity_type='neighborhood' and n.parent_id='city_casablanca'
  and n.validation_status='validated' and n.map_eligible=false and n.seo_eligible=false
left join latest l on l.source_record_id=b.seed_id::text
where lower(regexp_replace(trim(p.city),'\s+',' ','g'))='casablanca'
  and lower(regexp_replace(trim(p.district),'\s+',' ','g'))='oasis'
  and not (coalesce(l.resolution_status,'')='resolved' and l.resolved_neighborhood_id is not null);

revoke all on public.odm_p1b13d_oasis_resolution_candidates_v1 from public,anon,authenticated;
grant select on public.odm_p1b13d_oasis_resolution_candidates_v1 to service_role;

create or replace function public.odm_p1b13d_oasis_resolution_preflight_v1()
returns jsonb language sql stable security invoker set search_path=''
as $$
select jsonb_build_object(
 'contract_version','p1b13d_oasis_resolution_canary_v1',
 'candidate_count',count(*),'oasis_rows',count(*),
 'source_domains',count(distinct source_domain),
 'resolver_version','p1b13d_oasis_authority_canary_v1',
 'metric_layers_activated',false,'map_activation',false,'seo_activation',false)
from public.odm_p1b13d_oasis_resolution_candidates_v1;
$$;
revoke all on function public.odm_p1b13d_oasis_resolution_preflight_v1() from public,anon,authenticated;
grant execute on function public.odm_p1b13d_oasis_resolution_preflight_v1() to service_role;

create or replace function public.odm_p1b13d_oasis_resolution_apply_v1(p_expected_count integer)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare v_count integer; v_domains integer; v_inserted integer;
begin
  select count(*),count(distinct source_domain) into v_count,v_domains
  from public.odm_p1b13d_oasis_resolution_candidates_v1;
  if p_expected_count<>5 or v_count<>5 or v_domains<>1 then
    raise exception 'P1B.13D cohort drift: expected 5 Oasis / 1 source, got % / %',v_count,v_domains;
  end if;
  insert into public.geo_resolution_events(
    raw_city,raw_neighborhood,resolved_city_id,resolved_neighborhood_id,
    resolution_status,candidates,source_record_type,source_record_id,resolver_version)
  select c.raw_city,c.raw_district,c.city_id,c.neighborhood_id,'resolved',
    jsonb_build_array(jsonb_build_object(
      'evidence','p1b13_authority_confirmed_plus_p1b13c_registry_exact_persisted_district',
      'property_listing_id',c.property_listing_id,
      'authority_review_lot','P1B.13','candidate_review_lot','P1B.13A',
      'registry_write_lot','P1B.13C','resolution_canary_lot','P1B.13D')),
    'source_offer_seed',c.seed_id::text,'p1b13d_oasis_authority_canary_v1'
  from public.odm_p1b13d_oasis_resolution_candidates_v1 c;
  get diagnostics v_inserted=row_count;
  if v_inserted<>5 then raise exception 'P1B.13D atomic insert mismatch: expected 5, inserted %',v_inserted; end if;
  return jsonb_build_object('inserted',v_inserted,'resolver_version','p1b13d_oasis_authority_canary_v1','metric_layers_activated',false);
end; $$;
revoke all on function public.odm_p1b13d_oasis_resolution_apply_v1(integer) from public,anon,authenticated;
grant execute on function public.odm_p1b13d_oasis_resolution_apply_v1(integer) to service_role;

create or replace function public.odm_p1b13d_oasis_resolution_rollback_v1(p_expected_count integer)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare v_current integer; v_inserted integer;
begin
  select count(*) into v_current from public.geo_resolution_events e
  where e.source_record_type='source_offer_seed'
    and e.resolver_version='p1b13d_oasis_authority_canary_v1'
    and e.resolution_status='resolved'
    and e.resolved_neighborhood_id='district_casablanca_oasis'
    and not exists(select 1 from public.geo_resolution_events newer
      where newer.source_record_type=e.source_record_type and newer.source_record_id=e.source_record_id
        and (newer.created_at,newer.id)>(e.created_at,e.id));
  if p_expected_count<>5 or v_current<>5 then
    raise exception 'P1B.13D rollback cohort drift: expected 5, got %',v_current;
  end if;
  insert into public.geo_resolution_events(
    raw_city,raw_neighborhood,resolved_city_id,resolved_neighborhood_id,
    resolution_status,candidates,source_record_type,source_record_id,resolver_version)
  select e.raw_city,e.raw_neighborhood,null,null,'unresolved',
    jsonb_build_array(jsonb_build_object('rollback_of_resolver_version','p1b13d_oasis_authority_canary_v1','reason','p1b13d_controlled_rollback')),
    e.source_record_type,e.source_record_id,'p1b13d_oasis_authority_canary_v1_rollback'
  from public.geo_resolution_events e
  where e.source_record_type='source_offer_seed'
    and e.resolver_version='p1b13d_oasis_authority_canary_v1'
    and e.resolution_status='resolved'
    and e.resolved_neighborhood_id='district_casablanca_oasis'
    and not exists(select 1 from public.geo_resolution_events newer
      where newer.source_record_type=e.source_record_type and newer.source_record_id=e.source_record_id
        and (newer.created_at,newer.id)>(e.created_at,e.id));
  get diagnostics v_inserted=row_count;
  if v_inserted<>5 then raise exception 'P1B.13D rollback insert mismatch: expected 5, inserted %',v_inserted; end if;
  return jsonb_build_object('unresolved_events_inserted',v_inserted,'rollback_resolver_version','p1b13d_oasis_authority_canary_v1_rollback','metric_layers_activated',false);
end; $$;
revoke all on function public.odm_p1b13d_oasis_resolution_rollback_v1(integer) from public,anon,authenticated;
grant execute on function public.odm_p1b13d_oasis_resolution_rollback_v1(integer) to service_role;

comment on view public.odm_p1b13d_oasis_resolution_candidates_v1 is 'P1B.13D exact allowlisted Oasis cohort: 5 authority-qualified Casablanca listings only.';
comment on function public.odm_p1b13d_oasis_resolution_apply_v1(integer) is 'P1B.13D fail-closed 5-row Oasis geo resolution canary; no map/SEO/metric activation.';
comment on function public.odm_p1b13d_oasis_resolution_rollback_v1(integer) is 'P1B.13D append-only rollback by newer unresolved events; provenance is never deleted.';

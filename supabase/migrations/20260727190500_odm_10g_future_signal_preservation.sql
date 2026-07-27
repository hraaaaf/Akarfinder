-- ODM-10G permanent guard: preserve public-index title/snippet/economics on future discoveries.

create or replace function public.odm_10g_preserve_discovery_signal()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_seed_id uuid;
  v_price numeric;
  v_surface numeric;
begin
  if new.canonical_url is null
    or (new.compliance_status is not null and new.compliance_status not in ('allowed','approved','public_index_only','compliant'))
    or (nullif(trim(new.title),'') is null and nullif(trim(new.snippet),'') is null) then
    return new;
  end if;

  select id into v_seed_id from public.source_offer_seeds where canonical_url=new.canonical_url limit 1;
  if v_seed_id is null then return new; end if;

  v_price := public.odm_10f_single_price(new.title,new.snippet);
  v_surface := public.odm_10f_single_surface(new.title,new.snippet);

  update public.source_offer_seeds
  set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('public_index_result',jsonb_strip_nulls(jsonb_build_object(
      'provider',new.provider,'title',new.title,'snippet',new.snippet,
      'observed_at',coalesce(new.last_seen_at,new.discovered_at,now()),'acquisition_lot','ODM-10G'))),
      updated_at=now()
  where id=v_seed_id;

  update public.thin_index_search_documents d
  set title=coalesce(nullif(trim(d.title),''),nullif(trim(new.title),'')),
      snippet=coalesce(nullif(trim(d.snippet),''),nullif(trim(new.snippet),'')),
      normalized_price_mad=coalesce(d.normalized_price_mad,v_price),
      price_mad=coalesce(d.price_mad,v_price),
      normalized_surface_m2=coalesce(d.normalized_surface_m2,v_surface),
      surface_m2=coalesce(d.surface_m2,v_surface),
      price_per_m2_mad=case when coalesce(d.normalized_price_mad,v_price) is not null and coalesce(d.normalized_surface_m2,v_surface) between 9 and 100000 then round(coalesce(d.normalized_price_mad,v_price)/coalesce(d.normalized_surface_m2,v_surface),2) else d.price_per_m2_mad end,
      normalized_price_m2=case when coalesce(d.normalized_price_mad,v_price) is not null and coalesce(d.normalized_surface_m2,v_surface) between 9 and 100000 then round(coalesce(d.normalized_price_mad,v_price)/coalesce(d.normalized_surface_m2,v_surface),2) else d.normalized_price_m2 end,
      normalization_status=case when v_price is not null or v_surface is not null then 'partial' else d.normalization_status end,
      normalization_version='odm_10g_v1',
      normalization_evidence=coalesce(d.normalization_evidence,'{}'::jsonb)||jsonb_strip_nulls(jsonb_build_object(
        'method','persisted_discovery_candidate','provider',new.provider,
        'observed_at',coalesce(new.last_seen_at,new.discovered_at,now()),
        'price_mad',case when d.normalized_price_mad is null then v_price end,
        'surface_m2',case when d.normalized_surface_m2 is null then v_surface end)),
      updated_at=now()
  where d.seed_id=v_seed_id and d.vertical_classification='real_estate_likely';

  return new;
end $$;

revoke all on function public.odm_10g_preserve_discovery_signal() from public,anon,authenticated;

drop trigger if exists trg_odm_10g_preserve_discovery_signal on public.discovery_candidates;
create trigger trg_odm_10g_preserve_discovery_signal
after insert or update of title,snippet,last_seen_at,compliance_status on public.discovery_candidates
for each row execute function public.odm_10g_preserve_discovery_signal();

create or replace view public.odm_10g_comparable_gap_by_source as
select source_domain,
  count(*) filter(where vertical_classification='real_estate_likely')::integer as real_estate_rows,
  count(*) filter(where vertical_classification='real_estate_likely' and normalized_price_mad is not null and normalized_surface_m2 is not null)::integer as comparable_rows,
  count(*) filter(where vertical_classification='real_estate_likely' and normalized_price_mad is null)::integer as missing_price,
  count(*) filter(where vertical_classification='real_estate_likely' and normalized_surface_m2 is null)::integer as missing_surface
from public.thin_index_search_documents
group by source_domain;

revoke all on public.odm_10g_comparable_gap_by_source from public,anon,authenticated;
grant select on public.odm_10g_comparable_gap_by_source to service_role;

-- ODM-10G — recover structured discovery evidence before it is lost.
-- Sources: persisted public-index discovery_candidates only. No direct page fetch.

create table if not exists public.odm_10g_acquisition_runs (
  run_key text primary key,
  evaluated_candidates integer not null,
  matched_real_estate_rows integer not null,
  titles_propagated integer not null,
  snippets_propagated integer not null,
  prices_recovered integer not null,
  surfaces_recovered integer not null,
  new_comparable_rows integer not null,
  comparable_rows_total integer not null,
  ambiguous_prices_rejected integer not null,
  ambiguous_surfaces_rejected integer not null,
  ranking_rows_changed integer not null default 0,
  created_at timestamptz not null default now()
);

revoke all on public.odm_10g_acquisition_runs from public, anon, authenticated;
grant select, insert, update on public.odm_10g_acquisition_runs to service_role;

create or replace function public.odm_10g_apply_discovery_coverage(p_run_key text)
returns jsonb
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_evaluated integer; v_matched integer; v_titles integer; v_snippets integer;
  v_prices integer; v_surfaces integer; v_before integer; v_after integer;
  v_ambiguous_prices integer; v_ambiguous_surfaces integer; v_ranking_changed integer;
begin
  select count(*)::integer into v_before
  from public.thin_index_search_documents
  where vertical_classification='real_estate_likely'
    and normalized_price_mad is not null and normalized_surface_m2 is not null;

  create temporary table odm_10g_candidates on commit drop as
  with latest as (
    select distinct on (canonical_url)
      canonical_url, provider, title, snippet, last_seen_at, compliance_status
    from public.discovery_candidates
    where nullif(trim(canonical_url),'') is not null
      and (compliance_status is null or compliance_status in ('allowed','approved','public_index_only','compliant'))
      and (nullif(trim(title),'') is not null or nullif(trim(snippet),'') is not null)
    order by canonical_url, last_seen_at desc nulls last, updated_at desc
  )
  select d.seed_id, d.canonical_url, l.provider, l.title as observed_title,
         l.snippet as observed_snippet, l.last_seen_at as observed_at,
         public.odm_10f_price_candidates(l.title) as title_prices,
         public.odm_10f_price_candidates(l.snippet) as snippet_prices,
         public.odm_10f_surface_candidates(l.title) as title_surfaces,
         public.odm_10f_surface_candidates(l.snippet) as snippet_surfaces,
         public.odm_10f_single_price(l.title,l.snippet) as recovered_price,
         public.odm_10f_single_surface(l.title,l.snippet) as recovered_surface,
         d.title as old_title, d.snippet as old_snippet,
         d.normalized_price_mad as old_price, d.normalized_surface_m2 as old_surface,
         d.ranking_quality_boost as old_ranking_boost,
         d.ranking_policy_version as old_ranking_version
  from latest l
  join public.thin_index_search_documents d on d.canonical_url=l.canonical_url
  where d.vertical_classification='real_estate_likely'
    and (nullif(trim(d.title),'') is null or nullif(trim(d.snippet),'') is null
      or d.normalized_price_mad is null or d.normalized_surface_m2 is null);

  select count(*)::integer into v_matched from odm_10g_candidates;
  select count(*)::integer into v_evaluated
  from public.discovery_candidates
  where nullif(trim(canonical_url),'') is not null
    and (compliance_status is null or compliance_status in ('allowed','approved','public_index_only','compliant'));

  select count(*) filter(where cardinality(title_prices)>1 or (cardinality(title_prices)=0 and cardinality(snippet_prices)>1))::integer,
         count(*) filter(where cardinality(title_surfaces)>1 or (cardinality(title_surfaces)=0 and cardinality(snippet_surfaces)>1))::integer
  into v_ambiguous_prices,v_ambiguous_surfaces from odm_10g_candidates;

  update public.source_offer_seeds s
  set metadata=coalesce(s.metadata,'{}'::jsonb)||jsonb_build_object('public_index_result',jsonb_strip_nulls(jsonb_build_object(
      'provider',c.provider,'title',c.observed_title,'snippet',c.observed_snippet,
      'observed_at',c.observed_at,'acquisition_lot','ODM-10G'))),
      updated_at=now()
  from odm_10g_candidates c where s.id=c.seed_id;

  with updated as (
    update public.thin_index_search_documents d
    set title=coalesce(nullif(trim(d.title),''),nullif(trim(c.observed_title),'')),
        snippet=coalesce(nullif(trim(d.snippet),''),nullif(trim(c.observed_snippet),'')),
        normalized_price_mad=coalesce(d.normalized_price_mad,c.recovered_price),
        price_mad=coalesce(d.price_mad,c.recovered_price),
        normalized_surface_m2=coalesce(d.normalized_surface_m2,c.recovered_surface),
        surface_m2=coalesce(d.surface_m2,c.recovered_surface),
        price_per_m2_mad=case when coalesce(d.normalized_price_mad,c.recovered_price) is not null
          and coalesce(d.normalized_surface_m2,c.recovered_surface) between 9 and 100000
          then round(coalesce(d.normalized_price_mad,c.recovered_price)/coalesce(d.normalized_surface_m2,c.recovered_surface),2)
          else d.price_per_m2_mad end,
        normalized_price_m2=case when coalesce(d.normalized_price_mad,c.recovered_price) is not null
          and coalesce(d.normalized_surface_m2,c.recovered_surface) between 9 and 100000
          then round(coalesce(d.normalized_price_mad,c.recovered_price)/coalesce(d.normalized_surface_m2,c.recovered_surface),2)
          else d.normalized_price_m2 end,
        normalization_status=case when c.recovered_price is not null or c.recovered_surface is not null then 'partial' else d.normalization_status end,
        normalization_version='odm_10g_v1',
        normalization_evidence=coalesce(d.normalization_evidence,'{}'::jsonb)||jsonb_strip_nulls(jsonb_build_object(
          'odm_10g_run_key',p_run_key,'method','persisted_discovery_candidate','provider',c.provider,
          'observed_at',c.observed_at,
          'price_mad',case when c.old_price is null then c.recovered_price end,
          'surface_m2',case when c.old_surface is null then c.recovered_surface end)),
        updated_at=now()
    from odm_10g_candidates c
    where d.seed_id=c.seed_id
    returning c.old_title,c.old_snippet,c.old_price,c.old_surface,c.observed_title,c.observed_snippet,c.recovered_price,c.recovered_surface
  )
  select count(*) filter(where nullif(trim(coalesce(old_title,'')),'') is null and nullif(trim(coalesce(observed_title,'')),'') is not null)::integer,
         count(*) filter(where nullif(trim(coalesce(old_snippet,'')),'') is null and nullif(trim(coalesce(observed_snippet,'')),'') is not null)::integer,
         count(*) filter(where old_price is null and recovered_price is not null)::integer,
         count(*) filter(where old_surface is null and recovered_surface is not null)::integer
  into v_titles,v_snippets,v_prices,v_surfaces from updated;

  select count(*)::integer into v_after
  from public.thin_index_search_documents
  where vertical_classification='real_estate_likely'
    and normalized_price_mad is not null and normalized_surface_m2 is not null;

  select count(*)::integer into v_ranking_changed
  from public.thin_index_search_documents d join odm_10g_candidates c on c.seed_id=d.seed_id
  where d.ranking_quality_boost is distinct from c.old_ranking_boost
     or d.ranking_policy_version is distinct from c.old_ranking_version;
  if v_ranking_changed<>0 then raise exception 'ODM-10G changed ranking state on % rows',v_ranking_changed; end if;

  insert into public.odm_10g_acquisition_runs(run_key,evaluated_candidates,matched_real_estate_rows,titles_propagated,snippets_propagated,prices_recovered,surfaces_recovered,new_comparable_rows,comparable_rows_total,ambiguous_prices_rejected,ambiguous_surfaces_rejected,ranking_rows_changed)
  values(p_run_key,v_evaluated,v_matched,v_titles,v_snippets,v_prices,v_surfaces,greatest(v_after-v_before,0),v_after,v_ambiguous_prices,v_ambiguous_surfaces,v_ranking_changed)
  on conflict(run_key) do update set evaluated_candidates=excluded.evaluated_candidates,matched_real_estate_rows=excluded.matched_real_estate_rows,titles_propagated=excluded.titles_propagated,snippets_propagated=excluded.snippets_propagated,prices_recovered=excluded.prices_recovered,surfaces_recovered=excluded.surfaces_recovered,new_comparable_rows=excluded.new_comparable_rows,comparable_rows_total=excluded.comparable_rows_total,ambiguous_prices_rejected=excluded.ambiguous_prices_rejected,ambiguous_surfaces_rejected=excluded.ambiguous_surfaces_rejected,ranking_rows_changed=excluded.ranking_rows_changed;

  return jsonb_build_object('run_key',p_run_key,'evaluated_candidates',v_evaluated,'matched_real_estate_rows',v_matched,'titles_propagated',v_titles,'snippets_propagated',v_snippets,'prices_recovered',v_prices,'surfaces_recovered',v_surfaces,'new_comparable_rows',greatest(v_after-v_before,0),'comparable_rows_total',v_after,'ambiguous_prices_rejected',v_ambiguous_prices,'ambiguous_surfaces_rejected',v_ambiguous_surfaces,'ranking_rows_changed',v_ranking_changed);
end $$;

revoke all on function public.odm_10g_apply_discovery_coverage(text) from public,anon,authenticated;
grant execute on function public.odm_10g_apply_discovery_coverage(text) to service_role;

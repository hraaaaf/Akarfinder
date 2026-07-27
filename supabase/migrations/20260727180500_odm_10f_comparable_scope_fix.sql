-- ODM-10F scope correction: stored Serper evidence currently belongs to A/B rows.
-- Recover missing economics across all real-estate rows that carry explicit public-index metadata.

create or replace function public.odm_10f_apply_structured_recovery(p_run_key text)
returns jsonb
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_evaluated integer; v_metadata integer; v_title integer; v_snippet integer;
  v_price integer; v_surface integer; v_price_m2 integer;
  v_before_comparable integer; v_after_comparable integer;
  v_ambiguous_price integer; v_ambiguous_surface integer; v_ranking_changed integer;
begin
  select count(*)::integer into v_evaluated
  from public.thin_index_search_documents
  where vertical_classification='real_estate_likely';

  select count(*)::integer into v_before_comparable
  from public.thin_index_search_documents
  where vertical_classification='real_estate_likely'
    and normalized_price_mad is not null and normalized_surface_m2 is not null;

  create temporary table odm_10f_candidates on commit drop as
  select d.seed_id,
         nullif(trim(s.metadata#>>'{serper_search,title}'),'') as observed_title,
         nullif(trim(s.metadata#>>'{serper_search,snippet}'),'') as observed_snippet,
         nullif(trim(s.metadata#>>'{serper_search,observed_at}'),'') as observed_at,
         public.odm_10f_price_candidates(s.metadata#>>'{serper_search,title}') as title_prices,
         public.odm_10f_price_candidates(s.metadata#>>'{serper_search,snippet}') as snippet_prices,
         public.odm_10f_surface_candidates(s.metadata#>>'{serper_search,title}') as title_surfaces,
         public.odm_10f_surface_candidates(s.metadata#>>'{serper_search,snippet}') as snippet_surfaces,
         public.odm_10f_single_price(s.metadata#>>'{serper_search,title}',s.metadata#>>'{serper_search,snippet}') as recovered_price,
         public.odm_10f_single_surface(s.metadata#>>'{serper_search,title}',s.metadata#>>'{serper_search,snippet}') as recovered_surface,
         d.ranking_quality_boost as old_ranking_boost,
         d.ranking_policy_version as old_ranking_version,
         d.title as old_title, d.snippet as old_snippet,
         d.normalized_price_mad as old_price, d.normalized_surface_m2 as old_surface
  from public.thin_index_search_documents d
  join public.source_offer_seeds s on s.id=d.seed_id
  where d.vertical_classification='real_estate_likely'
    and s.metadata ? 'serper_search'
    and (nullif(trim(d.title),'') is null or nullif(trim(d.snippet),'') is null
      or d.normalized_price_mad is null or d.normalized_surface_m2 is null);

  select count(*)::integer into v_metadata from odm_10f_candidates;
  select count(*) filter(where cardinality(title_prices)>1 or (cardinality(title_prices)=0 and cardinality(snippet_prices)>1))::integer into v_ambiguous_price from odm_10f_candidates;
  select count(*) filter(where cardinality(title_surfaces)>1 or (cardinality(title_surfaces)=0 and cardinality(snippet_surfaces)>1))::integer into v_ambiguous_surface from odm_10f_candidates;

  with updated as (
    update public.thin_index_search_documents d
    set title=coalesce(nullif(trim(d.title),''),c.observed_title),
        snippet=coalesce(nullif(trim(d.snippet),''),c.observed_snippet),
        normalized_price_mad=coalesce(d.normalized_price_mad,c.recovered_price),
        price_mad=coalesce(d.price_mad,c.recovered_price),
        normalized_surface_m2=coalesce(d.normalized_surface_m2,c.recovered_surface),
        surface_m2=coalesce(d.surface_m2,c.recovered_surface),
        price_per_m2_mad=case when coalesce(d.normalized_price_mad,c.recovered_price) is not null and coalesce(d.normalized_surface_m2,c.recovered_surface) between 9 and 100000 then round(coalesce(d.normalized_price_mad,c.recovered_price)/coalesce(d.normalized_surface_m2,c.recovered_surface),2) else d.price_per_m2_mad end,
        normalized_price_m2=case when coalesce(d.normalized_price_mad,c.recovered_price) is not null and coalesce(d.normalized_surface_m2,c.recovered_surface) between 9 and 100000 then round(coalesce(d.normalized_price_mad,c.recovered_price)/coalesce(d.normalized_surface_m2,c.recovered_surface),2) else d.normalized_price_m2 end,
        normalization_status=case when c.recovered_price is not null or c.recovered_surface is not null then 'partial' else d.normalization_status end,
        normalization_version='odm_10f_v1',
        normalization_evidence=coalesce(d.normalization_evidence,'{}'::jsonb)||jsonb_strip_nulls(jsonb_build_object(
          'odm_10f_run_key',p_run_key,'method','stored_public_index_result','observed_at',c.observed_at,
          'price_mad',case when c.old_price is null then c.recovered_price end,
          'surface_m2',case when c.old_surface is null then c.recovered_surface end,
          'price_source',case when c.old_price is null and cardinality(c.title_prices)=1 then 'title' when c.old_price is null and cardinality(c.title_prices)=0 and cardinality(c.snippet_prices)=1 then 'snippet' end,
          'surface_source',case when c.old_surface is null and cardinality(c.title_surfaces)=1 then 'title' when c.old_surface is null and cardinality(c.title_surfaces)=0 and cardinality(c.snippet_surfaces)=1 then 'snippet' end)),
        updated_at=now()
    from odm_10f_candidates c
    where d.seed_id=c.seed_id
    returning c.old_title,c.old_snippet,c.old_price,c.old_surface,c.observed_title,c.observed_snippet,c.recovered_price,c.recovered_surface
  )
  select count(*) filter(where old_title is null and observed_title is not null)::integer,
         count(*) filter(where old_snippet is null and observed_snippet is not null)::integer,
         count(*) filter(where old_price is null and recovered_price is not null)::integer,
         count(*) filter(where old_surface is null and recovered_surface is not null)::integer,
         count(*) filter(where coalesce(old_price,recovered_price) is not null and coalesce(old_surface,recovered_surface) is not null)::integer
  into v_title,v_snippet,v_price,v_surface,v_price_m2 from updated;

  select count(*)::integer into v_after_comparable
  from public.thin_index_search_documents
  where vertical_classification='real_estate_likely'
    and normalized_price_mad is not null and normalized_surface_m2 is not null;

  select count(*)::integer into v_ranking_changed
  from public.thin_index_search_documents d join odm_10f_candidates c on c.seed_id=d.seed_id
  where d.ranking_quality_boost is distinct from c.old_ranking_boost or d.ranking_policy_version is distinct from c.old_ranking_version;
  if v_ranking_changed<>0 then raise exception 'ODM-10F changed ranking state on % rows',v_ranking_changed; end if;

  insert into public.odm_10f_recovery_runs(run_key,evaluated_rows,metadata_rows,title_recovered,snippet_recovered,price_recovered,surface_recovered,price_m2_computed,promoted_to_b_or_a,ambiguous_price_rejected,ambiguous_surface_rejected,ranking_rows_changed)
  values(p_run_key,v_evaluated,v_metadata,v_title,v_snippet,v_price,v_surface,greatest(v_after_comparable-v_before_comparable,0),0,v_ambiguous_price,v_ambiguous_surface,v_ranking_changed)
  on conflict(run_key) do update set evaluated_rows=excluded.evaluated_rows,metadata_rows=excluded.metadata_rows,title_recovered=excluded.title_recovered,snippet_recovered=excluded.snippet_recovered,price_recovered=excluded.price_recovered,surface_recovered=excluded.surface_recovered,price_m2_computed=excluded.price_m2_computed,promoted_to_b_or_a=excluded.promoted_to_b_or_a,ambiguous_price_rejected=excluded.ambiguous_price_rejected,ambiguous_surface_rejected=excluded.ambiguous_surface_rejected,ranking_rows_changed=excluded.ranking_rows_changed;

  return jsonb_build_object('run_key',p_run_key,'evaluated_rows',v_evaluated,'metadata_rows',v_metadata,'title_recovered',v_title,'snippet_recovered',v_snippet,'price_recovered',v_price,'surface_recovered',v_surface,'new_comparable_rows',greatest(v_after_comparable-v_before_comparable,0),'comparable_rows_total',v_after_comparable,'ambiguous_price_rejected',v_ambiguous_price,'ambiguous_surface_rejected',v_ambiguous_surface,'ranking_rows_changed',v_ranking_changed);
end $$;

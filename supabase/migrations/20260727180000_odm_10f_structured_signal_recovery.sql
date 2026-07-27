-- ODM-10F — recover explicit public-index title/snippet, price and surface signals.
-- No source-page fetch. No guessing. Contradictory or implausible numeric signals are rejected.

create table if not exists public.odm_10f_recovery_runs (
  run_key text primary key,
  evaluated_rows integer not null,
  metadata_rows integer not null,
  title_recovered integer not null,
  snippet_recovered integer not null,
  price_recovered integer not null,
  surface_recovered integer not null,
  price_m2_computed integer not null,
  promoted_to_b_or_a integer not null,
  ambiguous_price_rejected integer not null,
  ambiguous_surface_rejected integer not null,
  ranking_rows_changed integer not null default 0,
  created_at timestamptz not null default now()
);

revoke all on public.odm_10f_recovery_runs from public, anon, authenticated;
grant select, insert, update on public.odm_10f_recovery_runs to service_role;

create or replace function public.odm_10f_price_candidates(p_text text)
returns numeric[]
language sql immutable
as $$
  select coalesce(array_agg(distinct value order by value), '{}'::numeric[])
  from (
    select nullif(regexp_replace(m[1], '[^0-9]', '', 'g'), '')::numeric as value
    from regexp_matches(coalesce(p_text,''), '([0-9]{1,3}(?:[ .][0-9]{3})+|[0-9]{4,9})[[:space:]]*(?:dh|dhs|mad)(?:[[:space:]]*/[[:space:]]*(?:mois|month))?', 'gi') m
  ) x
  where value between 500 and 1000000000
$$;

create or replace function public.odm_10f_surface_candidates(p_text text)
returns numeric[]
language sql immutable
as $$
  select coalesce(array_agg(distinct value order by value), '{}'::numeric[])
  from (
    select replace(m[1], ',', '.')::numeric as value
    from regexp_matches(coalesce(p_text,''), '([0-9]{1,5}(?:[.,][0-9]+)?)[[:space:]]*(?:m2|m²)', 'gi') m
  ) x
  where value between 9 and 100000
$$;

create or replace function public.odm_10f_single_price(p_title text, p_snippet text)
returns numeric
language sql immutable
as $$
  with t as (select public.odm_10f_price_candidates(p_title) a),
       s as (select public.odm_10f_price_candidates(p_snippet) a)
  select case
    when cardinality(t.a)=1 then t.a[1]
    when cardinality(t.a)=0 and cardinality(s.a)=1 then s.a[1]
    else null end
  from t,s
$$;

create or replace function public.odm_10f_single_surface(p_title text, p_snippet text)
returns numeric
language sql immutable
as $$
  with t as (select public.odm_10f_surface_candidates(p_title) a),
       s as (select public.odm_10f_surface_candidates(p_snippet) a)
  select case
    when cardinality(t.a)=1 then t.a[1]
    when cardinality(t.a)=0 and cardinality(s.a)=1 then s.a[1]
    else null end
  from t,s
$$;

create or replace function public.odm_10f_apply_structured_recovery(p_run_key text)
returns jsonb
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_evaluated integer;
  v_metadata integer;
  v_title integer;
  v_snippet integer;
  v_price integer;
  v_surface integer;
  v_price_m2 integer;
  v_before_bplus integer;
  v_after_bplus integer;
  v_ambiguous_price integer;
  v_ambiguous_surface integer;
  v_ranking_changed integer;
begin
  select count(*)::integer into v_evaluated
  from public.thin_index_search_documents
  where vertical_classification='real_estate_likely' and quality_tier in ('C','D');

  select count(*)::integer into v_before_bplus
  from public.thin_index_search_documents
  where vertical_classification='real_estate_likely' and quality_tier in ('A','B');

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
         d.ranking_policy_version as old_ranking_version
  from public.thin_index_search_documents d
  join public.source_offer_seeds s on s.canonical_url=d.canonical_url
  where d.vertical_classification='real_estate_likely'
    and d.quality_tier in ('C','D')
    and s.metadata ? 'serper_search';

  select count(*)::integer into v_metadata from odm_10f_candidates;
  select count(*) filter(where cardinality(title_prices)>1 or (cardinality(title_prices)=0 and cardinality(snippet_prices)>1))::integer into v_ambiguous_price from odm_10f_candidates;
  select count(*) filter(where cardinality(title_surfaces)>1 or (cardinality(title_surfaces)=0 and cardinality(snippet_surfaces)>1))::integer into v_ambiguous_surface from odm_10f_candidates;

  with updated as (
    update public.thin_index_search_documents d
    set title = coalesce(nullif(trim(d.title),''), c.observed_title),
        snippet = coalesce(nullif(trim(d.snippet),''), c.observed_snippet),
        normalized_price_mad = coalesce(d.normalized_price_mad, c.recovered_price),
        price_mad = coalesce(d.price_mad, c.recovered_price),
        normalized_surface_m2 = coalesce(d.normalized_surface_m2, c.recovered_surface),
        surface_m2 = coalesce(d.surface_m2, c.recovered_surface),
        price_per_m2_mad = case
          when coalesce(d.normalized_price_mad,c.recovered_price) is not null
           and coalesce(d.normalized_surface_m2,c.recovered_surface) between 9 and 100000
          then round(coalesce(d.normalized_price_mad,c.recovered_price)/coalesce(d.normalized_surface_m2,c.recovered_surface),2)
          else d.price_per_m2_mad end,
        normalized_price_m2 = case
          when coalesce(d.normalized_price_mad,c.recovered_price) is not null
           and coalesce(d.normalized_surface_m2,c.recovered_surface) between 9 and 100000
          then round(coalesce(d.normalized_price_mad,c.recovered_price)/coalesce(d.normalized_surface_m2,c.recovered_surface),2)
          else d.normalized_price_m2 end,
        normalization_status = case when c.recovered_price is not null or c.recovered_surface is not null then 'partial' else d.normalization_status end,
        normalization_version = case when c.observed_title is not null or c.observed_snippet is not null or c.recovered_price is not null or c.recovered_surface is not null then 'odm_10f_v1' else d.normalization_version end,
        normalization_evidence = coalesce(d.normalization_evidence,'{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
          'odm_10f_run_key',p_run_key,
          'method','stored_public_index_result',
          'observed_at',c.observed_at,
          'price_mad',c.recovered_price,
          'surface_m2',c.recovered_surface,
          'price_source',case when cardinality(c.title_prices)=1 then 'title' when cardinality(c.title_prices)=0 and cardinality(c.snippet_prices)=1 then 'snippet' end,
          'surface_source',case when cardinality(c.title_surfaces)=1 then 'title' when cardinality(c.title_surfaces)=0 and cardinality(c.snippet_surfaces)=1 then 'snippet' end
        )),
        updated_at=now()
    from odm_10f_candidates c
    where d.seed_id=c.seed_id
      and (c.observed_title is not null or c.observed_snippet is not null or c.recovered_price is not null or c.recovered_surface is not null)
    returning d.seed_id,
      (d.title is not null) as title_now,
      (d.snippet is not null) as snippet_now,
      c.recovered_price,
      c.recovered_surface,
      (coalesce(d.normalized_price_mad,c.recovered_price) is not null and coalesce(d.normalized_surface_m2,c.recovered_surface) is not null) as has_price_m2
  )
  select count(*) filter(where title_now)::integer,
         count(*) filter(where snippet_now)::integer,
         count(*) filter(where recovered_price is not null)::integer,
         count(*) filter(where recovered_surface is not null)::integer,
         count(*) filter(where has_price_m2)::integer
  into v_title,v_snippet,v_price,v_surface,v_price_m2
  from updated;

  select count(*)::integer into v_after_bplus
  from public.thin_index_search_documents
  where vertical_classification='real_estate_likely' and quality_tier in ('A','B');

  select count(*)::integer into v_ranking_changed
  from public.thin_index_search_documents d
  join odm_10f_candidates c on c.seed_id=d.seed_id
  where d.ranking_quality_boost is distinct from c.old_ranking_boost
     or d.ranking_policy_version is distinct from c.old_ranking_version;

  if v_ranking_changed <> 0 then
    raise exception 'ODM-10F changed ranking state on % rows',v_ranking_changed;
  end if;

  insert into public.odm_10f_recovery_runs(run_key,evaluated_rows,metadata_rows,title_recovered,snippet_recovered,price_recovered,surface_recovered,price_m2_computed,promoted_to_b_or_a,ambiguous_price_rejected,ambiguous_surface_rejected,ranking_rows_changed)
  values(p_run_key,v_evaluated,v_metadata,v_title,v_snippet,v_price,v_surface,v_price_m2,greatest(v_after_bplus-v_before_bplus,0),v_ambiguous_price,v_ambiguous_surface,v_ranking_changed)
  on conflict(run_key) do update set evaluated_rows=excluded.evaluated_rows,metadata_rows=excluded.metadata_rows,title_recovered=excluded.title_recovered,snippet_recovered=excluded.snippet_recovered,price_recovered=excluded.price_recovered,surface_recovered=excluded.surface_recovered,price_m2_computed=excluded.price_m2_computed,promoted_to_b_or_a=excluded.promoted_to_b_or_a,ambiguous_price_rejected=excluded.ambiguous_price_rejected,ambiguous_surface_rejected=excluded.ambiguous_surface_rejected,ranking_rows_changed=excluded.ranking_rows_changed;

  return jsonb_build_object('run_key',p_run_key,'evaluated_rows',v_evaluated,'metadata_rows',v_metadata,'title_recovered',v_title,'snippet_recovered',v_snippet,'price_recovered',v_price,'surface_recovered',v_surface,'price_m2_computed',v_price_m2,'promoted_to_b_or_a',greatest(v_after_bplus-v_before_bplus,0),'ambiguous_price_rejected',v_ambiguous_price,'ambiguous_surface_rejected',v_ambiguous_surface,'ranking_rows_changed',v_ranking_changed);
end $$;

revoke all on function public.odm_10f_apply_structured_recovery(text) from public,anon,authenticated;
grant execute on function public.odm_10f_apply_structured_recovery(text) to service_role;

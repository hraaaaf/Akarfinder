-- DATA V2 LOT 4 — ODM-10G Ranking V2 Compatibility
-- Allows quality/ranking row signals to recompute when evidence improves while
-- proving that the Ranking V2 formula, publication state and public activation stay unchanged.

create table if not exists public.odm_10g_v2_compatibility_runs (
  run_key text primary key,
  evaluated_candidates integer not null,
  matched_rows integer not null,
  updated_rows integer not null,
  titles_propagated integer not null,
  snippets_propagated integer not null,
  prices_recovered integer not null,
  surfaces_recovered integer not null,
  ranking_rows_recomputed integer not null,
  ranking_formula_hash_before text not null,
  ranking_formula_hash_after text not null,
  blocked_rows_after integer not null,
  public_activation boolean not null default false,
  publication_activated boolean not null default false,
  report jsonb not null,
  executed_at timestamptz not null default now()
);

alter table public.odm_10g_v2_compatibility_runs enable row level security;
revoke all on public.odm_10g_v2_compatibility_runs from public, anon, authenticated;
grant select on public.odm_10g_v2_compatibility_runs to service_role;

create or replace function public.odm_10g_ranking_formula_hash_v2()
returns text
language sql
stable
set search_path = ''
as $$
  select md5(coalesce(string_agg(pg_get_functiondef(p.oid), E'\n' order by p.oid), ''))
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('search_odm_ranking_shadow_v2','odm_ranking_v2_report');
$$;

create or replace function public.odm_10g_apply_discovery_coverage_v2(p_run_key text)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_formula_before text;
  v_formula_after text;
  v_evaluated integer;
  v_matched integer;
  v_updated integer;
  v_titles integer;
  v_snippets integer;
  v_prices integer;
  v_surfaces integer;
  v_ranking_recomputed integer;
  v_blocked integer;
  v_result jsonb;
begin
  if nullif(btrim(p_run_key),'') is null then
    raise exception 'run_key is required';
  end if;

  v_formula_before := public.odm_10g_ranking_formula_hash_v2();

  create temporary table odm_10g_v2_candidates on commit drop as
  with latest as (
    select distinct on (canonical_url)
      canonical_url, provider, title, snippet, last_seen_at, compliance_status
    from public.discovery_candidates
    where nullif(trim(canonical_url),'') is not null
      and (compliance_status is null or compliance_status in ('allowed','approved','public_index_only','compliant'))
      and (nullif(trim(title),'') is not null or nullif(trim(snippet),'') is not null)
    order by canonical_url, last_seen_at desc nulls last, updated_at desc
  )
  select
    d.seed_id, d.canonical_url, l.provider,
    l.title observed_title, l.snippet observed_snippet, l.last_seen_at observed_at,
    public.odm_10f_single_price(l.title,l.snippet) recovered_price,
    public.odm_10f_single_surface(l.title,l.snippet) recovered_surface,
    d.title old_title, d.snippet old_snippet,
    d.normalized_price_mad old_price, d.normalized_surface_m2 old_surface,
    d.ranking_quality_boost old_ranking_boost,
    d.ranking_policy_version old_ranking_version,
    d.quality_tier old_quality_tier,
    d.quality_score old_quality_score
  from latest l
  join public.thin_index_search_documents d on d.canonical_url = l.canonical_url
  where d.vertical_classification = 'real_estate_likely'
    and (nullif(trim(d.title),'') is null
      or nullif(trim(d.snippet),'') is null
      or d.normalized_price_mad is null
      or d.normalized_surface_m2 is null);

  select count(*)::integer into v_matched from odm_10g_v2_candidates;
  select count(*)::integer into v_evaluated
  from public.discovery_candidates
  where nullif(trim(canonical_url),'') is not null
    and (compliance_status is null or compliance_status in ('allowed','approved','public_index_only','compliant'));

  update public.source_offer_seeds s
  set metadata = coalesce(s.metadata,'{}'::jsonb) || jsonb_build_object(
        'public_index_result', jsonb_strip_nulls(jsonb_build_object(
          'provider',c.provider,'title',c.observed_title,'snippet',c.observed_snippet,
          'observed_at',c.observed_at,'acquisition_lot','ODM-10G-V2'))),
      updated_at = now()
  from odm_10g_v2_candidates c
  where s.id = c.seed_id;

  with updated as (
    update public.thin_index_search_documents d
    set title = coalesce(nullif(trim(d.title),''),nullif(trim(c.observed_title),'')),
        snippet = coalesce(nullif(trim(d.snippet),''),nullif(trim(c.observed_snippet),'')),
        normalized_price_mad = coalesce(d.normalized_price_mad,c.recovered_price),
        price_mad = coalesce(d.price_mad,c.recovered_price),
        normalized_surface_m2 = coalesce(d.normalized_surface_m2,c.recovered_surface),
        surface_m2 = coalesce(d.surface_m2,c.recovered_surface),
        price_per_m2_mad = case
          when coalesce(d.normalized_price_mad,c.recovered_price) is not null
           and coalesce(d.normalized_surface_m2,c.recovered_surface) between 9 and 100000
          then round(coalesce(d.normalized_price_mad,c.recovered_price) / coalesce(d.normalized_surface_m2,c.recovered_surface),2)
          else d.price_per_m2_mad end,
        normalized_price_m2 = case
          when coalesce(d.normalized_price_mad,c.recovered_price) is not null
           and coalesce(d.normalized_surface_m2,c.recovered_surface) between 9 and 100000
          then round(coalesce(d.normalized_price_mad,c.recovered_price) / coalesce(d.normalized_surface_m2,c.recovered_surface),2)
          else d.normalized_price_m2 end,
        normalization_status = case when c.recovered_price is not null or c.recovered_surface is not null then 'partial' else d.normalization_status end,
        normalization_version = 'odm_10g_v2',
        normalization_evidence = coalesce(d.normalization_evidence,'{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
          'odm_10g_v2_run_key',p_run_key,'method','persisted_discovery_candidate',
          'provider',c.provider,'observed_at',c.observed_at,
          'price_mad',case when c.old_price is null then c.recovered_price end,
          'surface_m2',case when c.old_surface is null then c.recovered_surface end)),
        updated_at = now()
    from odm_10g_v2_candidates c
    where d.seed_id = c.seed_id
    returning c.*, d.ranking_quality_boost new_ranking_boost,
      d.ranking_policy_version new_ranking_version,
      d.quality_tier new_quality_tier, d.quality_score new_quality_score
  )
  select count(*)::integer,
    count(*) filter(where nullif(trim(coalesce(old_title,'')),'') is null and nullif(trim(coalesce(observed_title,'')),'') is not null)::integer,
    count(*) filter(where nullif(trim(coalesce(old_snippet,'')),'') is null and nullif(trim(coalesce(observed_snippet,'')),'') is not null)::integer,
    count(*) filter(where old_price is null and recovered_price is not null)::integer,
    count(*) filter(where old_surface is null and recovered_surface is not null)::integer,
    count(*) filter(where old_ranking_boost is distinct from new_ranking_boost
      or old_ranking_version is distinct from new_ranking_version
      or old_quality_tier is distinct from new_quality_tier
      or old_quality_score is distinct from new_quality_score)::integer
  into v_updated,v_titles,v_snippets,v_prices,v_surfaces,v_ranking_recomputed
  from updated;

  v_formula_after := public.odm_10g_ranking_formula_hash_v2();
  if v_formula_before is distinct from v_formula_after then
    raise exception 'Ranking V2 formula changed during ODM-10G-V2 run';
  end if;

  select count(*)::integer into v_blocked
  from public.odm_display_policy_shadow_v2
  where display_decision = 'blocked'
    and seed_id in (select seed_id from odm_10g_v2_candidates);

  v_result := jsonb_build_object(
    'run_key',p_run_key,'evaluated_candidates',v_evaluated,'matched_rows',v_matched,
    'updated_rows',v_updated,'titles_propagated',v_titles,'snippets_propagated',v_snippets,
    'prices_recovered',v_prices,'surfaces_recovered',v_surfaces,
    'ranking_rows_recomputed',v_ranking_recomputed,
    'ranking_formula_unchanged',v_formula_before = v_formula_after,
    'blocked_rows_after',v_blocked,'public_activation',false,'publication_activated',false);

  insert into public.odm_10g_v2_compatibility_runs(
    run_key,evaluated_candidates,matched_rows,updated_rows,titles_propagated,snippets_propagated,
    prices_recovered,surfaces_recovered,ranking_rows_recomputed,ranking_formula_hash_before,
    ranking_formula_hash_after,blocked_rows_after,public_activation,publication_activated,report)
  values(p_run_key,v_evaluated,v_matched,v_updated,v_titles,v_snippets,v_prices,v_surfaces,
    v_ranking_recomputed,v_formula_before,v_formula_after,v_blocked,false,false,v_result)
  on conflict(run_key) do update set
    evaluated_candidates=excluded.evaluated_candidates,matched_rows=excluded.matched_rows,
    updated_rows=excluded.updated_rows,titles_propagated=excluded.titles_propagated,
    snippets_propagated=excluded.snippets_propagated,prices_recovered=excluded.prices_recovered,
    surfaces_recovered=excluded.surfaces_recovered,ranking_rows_recomputed=excluded.ranking_rows_recomputed,
    ranking_formula_hash_before=excluded.ranking_formula_hash_before,
    ranking_formula_hash_after=excluded.ranking_formula_hash_after,
    blocked_rows_after=excluded.blocked_rows_after,report=excluded.report,executed_at=now();

  return v_result;
end;
$$;

revoke all on function public.odm_10g_ranking_formula_hash_v2() from public,anon,authenticated;
revoke all on function public.odm_10g_apply_discovery_coverage_v2(text) from public,anon,authenticated;
grant execute on function public.odm_10g_ranking_formula_hash_v2() to service_role;
grant execute on function public.odm_10g_apply_discovery_coverage_v2(text) to service_role;

comment on function public.odm_10g_apply_discovery_coverage_v2(text) is
'Ranking V2-compatible ODM-10G enrichment. Row quality signals may recompute from better evidence; Ranking V2 formula and public activation remain unchanged.';
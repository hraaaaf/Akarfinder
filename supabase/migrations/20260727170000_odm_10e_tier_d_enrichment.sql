-- ODM-10E — deterministic enrichment from canonical URL evidence only.
-- No page fetch, no inferred price/surface, no ranking or eligibility mutation.

create table if not exists public.odm_10e_enrichment_runs (
  run_key text primary key,
  evaluated_rows integer not null,
  enriched_rows integer not null,
  promoted_to_c_or_b_or_a integer not null,
  city_enriched integer not null,
  type_enriched integer not null,
  intent_enriched integer not null,
  ranking_rows_changed integer not null default 0,
  created_at timestamptz not null default now()
);

revoke all on public.odm_10e_enrichment_runs from public, anon, authenticated;
grant select, insert, update on public.odm_10e_enrichment_runs to service_role;

create or replace function public.odm_10e_city_from_url(p_url text)
returns text language sql immutable strict as $$
  select case
    when lower(p_url) ~ '(^|[-_/])casablanca($|[-_/])' then 'Casablanca'
    when lower(p_url) ~ '(^|[-_/])rabat($|[-_/])' then 'Rabat'
    when lower(p_url) ~ '(^|[-_/])marrakech($|[-_/])' then 'Marrakech'
    when lower(p_url) ~ '(^|[-_/])agadir($|[-_/])' then 'Agadir'
    when lower(p_url) ~ '(^|[-_/])tanger($|[-_/])' then 'Tanger'
    when lower(p_url) ~ '(^|[-_/])(fes|fès)($|[-_/])' then 'Fès'
    when lower(p_url) ~ '(^|[-_/])meknes($|[-_/])' then 'Meknès'
    when lower(p_url) ~ '(^|[-_/])kenitra($|[-_/])' then 'Kénitra'
    when lower(p_url) ~ '(^|[-_/])temara($|[-_/])' then 'Témara'
    when lower(p_url) ~ '(^|[-_/])sale($|[-_/])' then 'Salé'
    when lower(p_url) ~ '(^|[-_/])essaouira($|[-_/])' then 'Essaouira'
    else null end
$$;

create or replace function public.odm_10e_type_from_url(p_url text)
returns text language sql immutable strict as $$
  select case
    when lower(p_url) ~ '(^|[-_/])(appartement|appartements|apartment|apartments)($|[-_/])' then 'appartement'
    when lower(p_url) ~ '(^|[-_/])(villa|villas)($|[-_/])' then 'villa'
    when lower(p_url) ~ '(^|[-_/])(terrain|terrains|land)($|[-_/])' then 'terrain'
    when lower(p_url) ~ '(^|[-_/])(riad|riads)($|[-_/])' then 'riad'
    when lower(p_url) ~ '(^|[-_/])(bureau|bureaux|office|offices)($|[-_/])' then 'bureau'
    when lower(p_url) ~ '(^|[-_/])(local|locaux|commerce|commercial)($|[-_/])' then 'local commercial'
    when lower(p_url) ~ '(^|[-_/])(maison|maisons|house|houses)($|[-_/])' then 'maison'
    when lower(p_url) ~ '(^|[-_/])(studio|studios)($|[-_/])' then 'studio'
    when lower(p_url) ~ '(^|[-_/])(ferme|fermes|farm)($|[-_/])' then 'ferme'
    when lower(p_url) ~ '(^|[-_/])(duplex)($|[-_/])' then 'duplex'
    else null end
$$;

create or replace function public.odm_10e_intent_from_url(p_url text)
returns text language sql immutable strict as $$
  select case
    when lower(p_url) ~ '(^|[-_/])(location|louer|rent|rental)($|[-_/])' then 'rent'
    when lower(p_url) ~ '(^|[-_/])(vente|vendre|achat|acheter|buy|sale)($|[-_/])' then 'buy'
    else null end
$$;

create or replace function public.odm_10e_apply_url_enrichment(p_run_key text)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_before_cplus integer;
  v_after_cplus integer;
  v_evaluated integer;
  v_enriched integer;
  v_city integer;
  v_type integer;
  v_intent integer;
begin
  select count(*)::integer into v_before_cplus
  from public.thin_index_search_documents
  where vertical_classification='real_estate_likely' and quality_tier in ('A','B','C');

  select count(*)::integer into v_evaluated
  from public.thin_index_search_documents
  where vertical_classification='real_estate_likely' and quality_tier='D';

  with candidates as (
    select seed_id,
      case when coalesce(normalized_city,recovered_city,city) is null then public.odm_10e_city_from_url(canonical_url) end as new_city,
      case when coalesce(normalized_property_type,property_type) is null then public.odm_10e_type_from_url(canonical_url) end as new_type,
      case when coalesce(normalized_intent,intent) is null then public.odm_10e_intent_from_url(canonical_url) end as new_intent
    from public.thin_index_search_documents
    where vertical_classification='real_estate_likely' and quality_tier='D'
  ), updated as (
    update public.thin_index_search_documents d
    set normalized_city = coalesce(d.normalized_city, c.new_city),
        normalized_property_type = coalesce(d.normalized_property_type, c.new_type),
        normalized_intent = coalesce(d.normalized_intent, c.new_intent),
        normalization_status = case when d.normalization_status is null and (c.new_city is not null or c.new_type is not null or c.new_intent is not null) then 'partial' else d.normalization_status end,
        normalization_version = case when c.new_city is not null or c.new_type is not null or c.new_intent is not null then 'odm_10e_v1' else d.normalization_version end,
        normalization_evidence = coalesce(d.normalization_evidence,'{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
          'odm_10e_run_key', p_run_key,
          'city_from_url', c.new_city,
          'property_type_from_url', c.new_type,
          'intent_from_url', c.new_intent,
          'method', 'canonical_url_token_match'
        )),
        updated_at = now()
    from candidates c
    where d.seed_id=c.seed_id and (c.new_city is not null or c.new_type is not null or c.new_intent is not null)
    returning c.new_city, c.new_type, c.new_intent
  )
  select count(*)::integer,
         count(*) filter(where new_city is not null)::integer,
         count(*) filter(where new_type is not null)::integer,
         count(*) filter(where new_intent is not null)::integer
  into v_enriched,v_city,v_type,v_intent from updated;

  perform public.odm_10d_recompute_quality('odm-10e-' || p_run_key);

  select count(*)::integer into v_after_cplus
  from public.thin_index_search_documents
  where vertical_classification='real_estate_likely' and quality_tier in ('A','B','C');

  insert into public.odm_10e_enrichment_runs(run_key,evaluated_rows,enriched_rows,promoted_to_c_or_b_or_a,city_enriched,type_enriched,intent_enriched,ranking_rows_changed)
  values(p_run_key,v_evaluated,v_enriched,greatest(v_after_cplus-v_before_cplus,0),v_city,v_type,v_intent,0)
  on conflict(run_key) do update set evaluated_rows=excluded.evaluated_rows,enriched_rows=excluded.enriched_rows,promoted_to_c_or_b_or_a=excluded.promoted_to_c_or_b_or_a,city_enriched=excluded.city_enriched,type_enriched=excluded.type_enriched,intent_enriched=excluded.intent_enriched;

  return jsonb_build_object('run_key',p_run_key,'evaluated_rows',v_evaluated,'enriched_rows',v_enriched,'promoted_to_c_or_b_or_a',greatest(v_after_cplus-v_before_cplus,0),'city_enriched',v_city,'type_enriched',v_type,'intent_enriched',v_intent,'ranking_rows_changed',0);
end $$;

revoke all on function public.odm_10e_apply_url_enrichment(text) from public,anon,authenticated;
grant execute on function public.odm_10e_apply_url_enrichment(text) to service_role;

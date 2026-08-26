-- AKARFINDER — preserve doubtful prices instead of suppressing them.
-- Product doctrine:
-- - trusted price: normal ranking and derived price/m2 allowed;
-- - doubtful price: keep the amount, mark it as price_to_verify, reduce ranking,
--   and never derive price/m2 from it;
-- - reliable market analytics continue to rely on trusted economic state.

create or replace function public.odm_trusted_price_reconciliation_report_v1()
returns jsonb
language sql
stable
set search_path to ''
as $function$
with authoritative as (
  select
    s.seed_id,
    max(s.principal_value_mad) as trusted_value_mad,
    max(s.principal_economic_type) as trusted_economic_type
  from public.odm_economic_observation_state_shadow_v1 s
  join public.thin_index_search_documents d on d.seed_id = s.seed_id
  where s.parser_version = 'odm_economic_parser_v2'
    and s.economic_status = 'trusted'
    and s.principal_value_mad is not null
    and (
      (d.normalized_intent = 'sale' and s.principal_economic_type in ('sale_total','discounted_price'))
      or (d.normalized_intent = 'rent' and s.principal_economic_type in ('rent_monthly','rent_daily','rent_weekly'))
    )
  group by s.seed_id
  having count(distinct s.principal_value_mad) = 1
     and count(distinct s.principal_economic_type) = 1
), state_rollup as (
  select
    s.seed_id,
    bool_or(s.economic_status = 'trusted') as has_trusted,
    bool_or(s.economic_status = 'ambiguous') as has_ambiguous,
    bool_or(s.economic_status not in ('trusted','ambiguous')) as has_other_untrusted
  from public.odm_economic_observation_state_shadow_v1 s
  where s.parser_version = 'odm_economic_parser_v2'
  group by s.seed_id
), metrics as (
  select
    count(*) filter (
      where a.seed_id is not null
        and d.normalized_price_mad is distinct from a.trusted_value_mad
    ) as trusted_mismatches,
    count(*) filter (
      where r.seed_id is not null
        and not r.has_trusted
        and d.normalized_price_mad is not null
    ) as doubtful_price_rows,
    count(*) filter (
      where r.seed_id is not null
        and not r.has_trusted
        and d.normalized_price_mad is not null
        and d.recovery_confidence is distinct from 'economic_v2_price_to_verify'
    ) as doubtful_unmarked_rows,
    count(*) filter (
      where r.seed_id is not null
        and not r.has_trusted
        and (d.normalized_price_m2 is not null or d.price_per_m2_mad is not null)
    ) as doubtful_with_derived_price_rows,
    count(*) filter (
      where d.recovery_confidence = 'trusted_economic_v2'
        and d.normalized_price_mad is not null
        and d.normalized_surface_m2 is not null
        and d.normalized_surface_m2 > 0
        and d.normalized_price_m2 is distinct from public.odm04_safe_price_per_m2(d.normalized_price_mad,d.normalized_surface_m2)
    ) as trusted_stale_price_per_m2,
    count(*) filter (where a.seed_id is not null) as trusted_rows,
    count(*) filter (where r.seed_id is not null and not r.has_trusted) as untrusted_rows,
    count(*) filter (where r.has_ambiguous and not r.has_trusted and d.normalized_price_mad is not null) as ambiguous_price_to_verify,
    count(*) filter (where r.has_other_untrusted and not r.has_trusted and d.normalized_price_mad is not null) as untrusted_price_to_verify
  from public.thin_index_search_documents d
  left join authoritative a on a.seed_id = d.seed_id
  left join state_rollup r on r.seed_id = d.seed_id
  where r.seed_id is not null
)
select jsonb_build_object(
  'audit_version','odm_trusted_economic_price_reconciliation_v1_2',
  'trusted_mismatches',trusted_mismatches,
  'doubtful_price_rows',doubtful_price_rows,
  'ambiguous_price_to_verify',ambiguous_price_to_verify,
  'untrusted_price_to_verify',untrusted_price_to_verify,
  'doubtful_unmarked_rows',doubtful_unmarked_rows,
  'doubtful_with_derived_price_rows',doubtful_with_derived_price_rows,
  'trusted_stale_price_per_m2',trusted_stale_price_per_m2,
  'trusted_rows',trusted_rows,
  'untrusted_rows',untrusted_rows,
  'gates',jsonb_build_object(
    'trusted_mismatches_zero',trusted_mismatches = 0,
    'doubtful_prices_marked',doubtful_unmarked_rows = 0,
    'doubtful_price_per_m2_absent',doubtful_with_derived_price_rows = 0,
    'trusted_price_per_m2_consistent',trusted_stale_price_per_m2 = 0
  )
) from metrics;
$function$;

create or replace function public.odm_apply_trusted_price_reconciliation_v1()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_batch uuid := gen_random_uuid();
  v_replaced integer := 0;
  v_marked integer := 0;
  v_recalculated integer := 0;
begin
  with authoritative as (
    select
      s.seed_id,
      max(s.principal_value_mad) as trusted_value_mad,
      max(s.principal_economic_type) as trusted_economic_type,
      min(s.observation_id) as evidence_observation_id
    from public.odm_economic_observation_state_shadow_v1 s
    join public.thin_index_search_documents d on d.seed_id = s.seed_id
    where s.parser_version = 'odm_economic_parser_v2'
      and s.economic_status = 'trusted'
      and s.principal_value_mad is not null
      and (
        (d.normalized_intent = 'sale' and s.principal_economic_type in ('sale_total','discounted_price'))
        or (d.normalized_intent = 'rent' and s.principal_economic_type in ('rent_monthly','rent_daily','rent_weekly'))
      )
    group by s.seed_id
    having count(distinct s.principal_value_mad) = 1
       and count(distinct s.principal_economic_type) = 1
  ), candidates as (
    select
      d.seed_id,
      d.normalized_price_mad as previous_price_mad,
      d.normalized_price_m2 as previous_price_per_m2_mad,
      d.normalized_surface_m2,
      a.trusted_value_mad,
      a.trusted_economic_type,
      a.evidence_observation_id
    from public.thin_index_search_documents d
    join authoritative a on a.seed_id = d.seed_id
    where d.normalized_price_mad is distinct from a.trusted_value_mad
       or d.recovery_confidence is distinct from 'trusted_economic_v2'
  ), audited as (
    insert into public.odm_trusted_price_reconciliation_audit_v1(
      batch_id,seed_id,economic_status,principal_economic_type,
      previous_price_mad,reconciled_price_mad,
      previous_price_per_m2_mad,reconciled_price_per_m2_mad,
      action,evidence_observation_id
    )
    select
      v_batch,c.seed_id,'trusted',c.trusted_economic_type,
      c.previous_price_mad,c.trusted_value_mad,
      c.previous_price_per_m2_mad,
      public.odm04_safe_price_per_m2(c.trusted_value_mad,c.normalized_surface_m2),
      'replace_with_trusted',c.evidence_observation_id
    from candidates c
    returning seed_id,reconciled_price_mad,reconciled_price_per_m2_mad,evidence_observation_id
  )
  update public.thin_index_search_documents d
  set price_mad = a.reconciled_price_mad,
      normalized_price_mad = a.reconciled_price_mad,
      price_per_m2_mad = a.reconciled_price_per_m2_mad,
      normalized_price_m2 = a.reconciled_price_per_m2_mad,
      recovery_confidence = 'trusted_economic_v2',
      recovery_evidence = coalesce(d.recovery_evidence,'{}'::jsonb)
        || jsonb_build_object('price','trusted_economic_v2','observation_id',a.evidence_observation_id,'batch_id',v_batch),
      normalization_evidence = coalesce(d.normalization_evidence,'{}'::jsonb)
        || jsonb_build_object('price_reconciliation','odm_trusted_economic_price_reconciliation_v1_2','price_to_verify',false,'batch_id',v_batch),
      updated_at = now()
  from audited a
  where d.seed_id = a.seed_id;
  get diagnostics v_replaced = row_count;

  with state_rollup as (
    select
      s.seed_id,
      bool_or(s.economic_status = 'trusted') as has_trusted,
      bool_or(s.economic_status = 'ambiguous') as has_ambiguous,
      min(s.observation_id) as evidence_observation_id
    from public.odm_economic_observation_state_shadow_v1 s
    where s.parser_version = 'odm_economic_parser_v2'
    group by s.seed_id
  ), candidates as (
    select
      d.seed_id,
      d.normalized_price_mad,
      d.normalized_price_m2,
      case when r.has_ambiguous then 'ambiguous' else 'untrusted' end as economic_status,
      r.evidence_observation_id
    from public.thin_index_search_documents d
    join state_rollup r on r.seed_id = d.seed_id
    where not r.has_trusted
      and d.normalized_price_mad is not null
      and (
        d.recovery_confidence is distinct from 'economic_v2_price_to_verify'
        or d.normalized_price_m2 is not null
        or d.price_per_m2_mad is not null
      )
  ), audited as (
    insert into public.odm_trusted_price_reconciliation_audit_v1(
      batch_id,seed_id,economic_status,principal_economic_type,
      previous_price_mad,reconciled_price_mad,
      previous_price_per_m2_mad,reconciled_price_per_m2_mad,
      action,evidence_observation_id
    )
    select
      v_batch,c.seed_id,c.economic_status,null,
      c.normalized_price_mad,c.normalized_price_mad,
      c.normalized_price_m2,null,
      'mark_price_to_verify',c.evidence_observation_id
    from candidates c
    returning seed_id,reconciled_price_mad,evidence_observation_id
  )
  update public.thin_index_search_documents d
  set price_mad = a.reconciled_price_mad,
      normalized_price_mad = a.reconciled_price_mad,
      price_per_m2_mad = null,
      normalized_price_m2 = null,
      recovery_confidence = 'economic_v2_price_to_verify',
      recovery_evidence = coalesce(d.recovery_evidence,'{}'::jsonb)
        || jsonb_build_object('price','price_to_verify_economic_v2','observation_id',a.evidence_observation_id,'batch_id',v_batch),
      normalization_evidence = coalesce(d.normalization_evidence,'{}'::jsonb)
        || jsonb_build_object('price_reconciliation','odm_trusted_economic_price_reconciliation_v1_2','price_to_verify',true,'batch_id',v_batch),
      updated_at = now()
  from audited a
  where d.seed_id = a.seed_id;
  get diagnostics v_marked = row_count;

  with candidates as (
    select
      d.seed_id,
      d.normalized_price_mad,
      d.normalized_price_m2 as previous_price_per_m2_mad,
      public.odm04_safe_price_per_m2(d.normalized_price_mad,d.normalized_surface_m2) as reconciled_price_per_m2_mad
    from public.thin_index_search_documents d
    where d.recovery_confidence = 'trusted_economic_v2'
      and d.normalized_price_mad is not null
      and d.normalized_surface_m2 is not null
      and d.normalized_surface_m2 > 0
      and d.normalized_price_m2 is distinct from public.odm04_safe_price_per_m2(d.normalized_price_mad,d.normalized_surface_m2)
  ), audited as (
    insert into public.odm_trusted_price_reconciliation_audit_v1(
      batch_id,seed_id,economic_status,principal_economic_type,
      previous_price_mad,reconciled_price_mad,
      previous_price_per_m2_mad,reconciled_price_per_m2_mad,
      action,evidence_observation_id
    )
    select
      v_batch,c.seed_id,'price_per_m2_recalculation',null,
      c.normalized_price_mad,c.normalized_price_mad,
      c.previous_price_per_m2_mad,c.reconciled_price_per_m2_mad,
      'recalculate_price_per_m2',null
    from candidates c
    returning seed_id,reconciled_price_per_m2_mad
  )
  update public.thin_index_search_documents d
  set price_per_m2_mad = a.reconciled_price_per_m2_mad,
      normalized_price_m2 = a.reconciled_price_per_m2_mad,
      normalization_evidence = coalesce(d.normalization_evidence,'{}'::jsonb)
        || jsonb_build_object('price_per_m2_reconciliation','odm_trusted_economic_price_reconciliation_v1_2','batch_id',v_batch),
      updated_at = now()
  from audited a
  where d.seed_id = a.seed_id;
  get diagnostics v_recalculated = row_count;

  return jsonb_build_object(
    'batch_id',v_batch,
    'replaced_with_trusted',v_replaced,
    'marked_price_to_verify',v_marked,
    'recalculated_price_per_m2',v_recalculated,
    'report',public.odm_trusted_price_reconciliation_report_v1()
  );
end;
$function$;

create or replace function public.search_thin_index_v3(
  p_query text default null::text,
  p_city text default null::text,
  p_property_type text default null::text,
  p_intent text default null::text,
  p_limit integer default 300,
  p_after_rank real default null::real,
  p_after_updated_at timestamp with time zone default null::timestamp with time zone,
  p_after_seed_id uuid default null::uuid
)
returns table(
  seed_id uuid,
  canonical_url text,
  source_domain text,
  seed_provider text,
  freshness_status text,
  title text,
  snippet text,
  query_text text,
  city text,
  property_type text,
  intent text,
  normalized_city text,
  normalized_property_type text,
  normalized_intent text,
  normalized_price_mad numeric,
  normalized_surface_m2 numeric,
  price_per_m2_mad numeric,
  quality_tier text,
  quality_score smallint,
  display_eligibility text,
  display_eligibility_reason text,
  ranking_quality_boost real,
  updated_at timestamp with time zone,
  relevance_rank real
)
language sql
stable
set search_path to ''
as $function$
with params as (
  select
    nullif(btrim(p_query), '') as q,
    public.odm04_normalize_city(nullif(btrim(p_city), '')) as canonical_city,
    public.odm04_normalize_property_type(nullif(btrim(p_property_type), '')) as canonical_property_type,
    public.odm04_normalize_intent(nullif(btrim(p_intent), '')) as canonical_intent,
    least(greatest(coalesce(p_limit, 300), 1), 500) as result_limit
), queries as (
  select
    p.*,
    case when p.q is null then null else websearch_to_tsquery('simple', p.q) end as q_ts
  from params p
), ranked as (
  select
    d.seed_id,
    d.canonical_url,
    d.source_domain,
    d.seed_provider,
    d.freshness_status,
    d.title,
    d.snippet,
    d.query_text,
    d.city,
    d.property_type,
    d.intent,
    d.normalized_city,
    d.normalized_property_type,
    d.normalized_intent,
    d.normalized_price_mad,
    d.normalized_surface_m2,
    case
      when d.normalized_price_mad is not null
       and d.recovery_confidence is distinct from 'trusted_economic_v2'
      then null
      else d.price_per_m2_mad
    end as price_per_m2_mad,
    d.quality_tier,
    case
      when d.normalized_price_mad is not null
       and d.recovery_confidence is distinct from 'trusted_economic_v2'
      then greatest(0, coalesce(d.quality_score,0) - 10)::smallint
      else d.quality_score
    end as quality_score,
    d.display_eligibility,
    case
      when d.normalized_price_mad is not null
       and d.recovery_confidence is distinct from 'trusted_economic_v2'
      then concat_ws('|',nullif(d.display_eligibility_reason,''),'price_to_verify')
      else d.display_eligibility_reason
    end as display_eligibility_reason,
    d.ranking_quality_boost,
    d.updated_at,
    (
      case when q.q_ts is null then 0::real else ts_rank_cd(d.search_vector, q.q_ts, 32) end
      + coalesce(d.ranking_quality_boost, 0::real)
      + case when d.display_eligibility = 'eligible_primary' then 0.08::real else 0::real end
      - case
          when d.normalized_price_mad is not null
           and d.recovery_confidence is distinct from 'trusted_economic_v2'
          then 0.08::real
          else 0::real
        end
    )::real as relevance_rank
  from public.thin_index_search_documents d
  cross join queries q
  where d.display_eligibility in ('eligible_primary','eligible_secondary')
    and d.seed_provider in ('public_sitemap','commoncrawl_cdx','serper_search')
    and d.freshness_status = 'fresh_confirmed'
    and (q.q_ts is null or d.search_vector @@ q.q_ts)
    and (q.canonical_city is null or d.normalized_city = q.canonical_city)
    and (q.canonical_property_type is null or d.normalized_property_type = q.canonical_property_type)
    and (q.canonical_intent is null or d.normalized_intent = q.canonical_intent)
), page as (
  select r.*
  from ranked r
  where p_after_rank is null
     or r.relevance_rank < p_after_rank
     or (
       r.relevance_rank = p_after_rank
       and p_after_updated_at is not null
       and r.updated_at < p_after_updated_at
     )
     or (
       r.relevance_rank = p_after_rank
       and p_after_updated_at is not null
       and r.updated_at = p_after_updated_at
       and p_after_seed_id is not null
       and r.seed_id < p_after_seed_id
     )
  order by
    case r.display_eligibility when 'eligible_primary' then 0 else 1 end,
    r.relevance_rank desc,
    r.updated_at desc,
    r.seed_id desc
  limit (select result_limit from queries)
)
select * from page;
$function$;

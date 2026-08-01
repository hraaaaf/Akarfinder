-- Fix JSON aggregation: eligible groups contain exactly one candidate.
create or replace function public.odm_materialize_price_coverage_recovery_v1()
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare v_batch uuid:=gen_random_uuid(); v_audit integer:=0; v_updated integer:=0;
begin
  with parsed as (
    select d.seed_id,d.normalized_intent,
      public.odm_audit_economic_candidates_v2(coalesce(nullif(d.title,''),d.snippet),'thin_index',d.seed_id::text,d.updated_at,'thin_index.title_or_snippet') as candidates
    from public.thin_index_search_documents d
    where d.normalized_price_mad is null and d.normalized_intent in ('sale','rent') and d.freshness_status in ('seed_only','fresh_confirmed')
  ), expanded as (
    select p.seed_id,p.normalized_intent,e
    from parsed p cross join lateral jsonb_array_elements(p.candidates) e
    where e->>'rejection_reason' is null and e->>'economic_type' in ('sale_total','discounted_price','rent_monthly','rent_daily','rent_weekly')
  ), eligible as (
    select seed_id,normalized_intent,
      min((e->>'value_mad')::numeric) recovered_price_mad,
      min(e->>'economic_type') economic_type,
      (jsonb_agg(e order by e->>'candidate_id')->0) evidence
    from expanded group by seed_id,normalized_intent
    having count(*)=1 and bool_and((normalized_intent='sale' and e->>'economic_type' in ('sale_total','discounted_price')) or (normalized_intent='rent' and e->>'economic_type' in ('rent_monthly','rent_daily','rent_weekly')))
  ), audited as (
    insert into public.odm_price_coverage_recovery_audit_v1(batch_id,seed_id,previous_price_mad,recovered_price_mad,economic_type,normalized_intent,evidence)
    select v_batch,d.seed_id,d.normalized_price_mad,e.recovered_price_mad,e.economic_type,e.normalized_intent,e.evidence
    from eligible e join public.thin_index_search_documents d using(seed_id)
    where d.normalized_price_mad is null on conflict do nothing returning seed_id,recovered_price_mad
  )
  update public.thin_index_search_documents d set normalized_price_mad=a.recovered_price_mad,
    normalization_evidence=coalesce(d.normalization_evidence,'{}'::jsonb)||jsonb_build_object('price_recovery','odm_price_coverage_recovery_v1')
  from audited a where d.seed_id=a.seed_id and d.normalized_price_mad is null;
  get diagnostics v_updated=row_count;
  select count(*) into v_audit from public.odm_price_coverage_recovery_audit_v1 where batch_id=v_batch;
  return jsonb_build_object('batch_id',v_batch,'audit_rows',v_audit,'updated_rows',v_updated,'publication_activated',false,'ranking_policy_changed',false);
end;$$;

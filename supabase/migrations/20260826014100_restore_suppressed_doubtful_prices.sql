-- Restore prices that were suppressed by the previous reconciliation policy.
-- This migration is intentionally data-driven and idempotent: it restores only
-- rows that are still price-less, have a prior suppress_untrusted audit value,
-- and have not become trusted in the economic parser state.

alter table public.odm_trusted_price_reconciliation_audit_v1
  drop constraint odm_trusted_price_reconciliation_audit_v1_action_check;

alter table public.odm_trusted_price_reconciliation_audit_v1
  add constraint odm_trusted_price_reconciliation_audit_v1_action_check
  check (action = any (array[
    'replace_with_trusted'::text,
    'suppress_untrusted'::text,
    'recalculate_price_per_m2'::text,
    'mark_price_to_verify'::text,
    'restore_suppressed_as_price_to_verify'::text
  ]));

do $do$
declare
  v_batch uuid := gen_random_uuid();
  v_restored integer := 0;
begin
  with state_rollup as (
    select
      s.seed_id,
      bool_or(s.economic_status = 'trusted') as has_trusted,
      bool_or(s.economic_status = 'ambiguous') as has_ambiguous
    from public.odm_economic_observation_state_shadow_v1 s
    where s.parser_version = 'odm_economic_parser_v2'
    group by s.seed_id
  ), latest_suppression as (
    select distinct on (a.seed_id)
      a.seed_id,
      a.previous_price_mad,
      a.audit_id
    from public.odm_trusted_price_reconciliation_audit_v1 a
    where a.action = 'suppress_untrusted'
      and a.previous_price_mad is not null
    order by a.seed_id, a.audit_id desc
  ), candidates as (
    select
      d.seed_id,
      l.previous_price_mad,
      case when r.has_ambiguous then 'ambiguous' else 'untrusted' end as economic_status
    from latest_suppression l
    join public.thin_index_search_documents d on d.seed_id = l.seed_id
    join state_rollup r on r.seed_id = l.seed_id
    where not r.has_trusted
      and d.normalized_price_mad is null
  ), audited as (
    insert into public.odm_trusted_price_reconciliation_audit_v1(
      batch_id,
      seed_id,
      economic_status,
      principal_economic_type,
      previous_price_mad,
      reconciled_price_mad,
      previous_price_per_m2_mad,
      reconciled_price_per_m2_mad,
      action,
      evidence_observation_id
    )
    select
      v_batch,
      c.seed_id,
      c.economic_status,
      null,
      null,
      c.previous_price_mad,
      null,
      null,
      'restore_suppressed_as_price_to_verify',
      null
    from candidates c
    returning seed_id, reconciled_price_mad
  )
  update public.thin_index_search_documents d
  set price_mad = a.reconciled_price_mad,
      normalized_price_mad = a.reconciled_price_mad,
      price_per_m2_mad = null,
      normalized_price_m2 = null,
      recovery_confidence = 'economic_v2_price_to_verify',
      recovery_evidence = coalesce(d.recovery_evidence, '{}'::jsonb)
        || jsonb_build_object(
          'price','restored_price_to_verify_economic_v2',
          'batch_id',v_batch
        ),
      normalization_evidence = coalesce(d.normalization_evidence, '{}'::jsonb)
        || jsonb_build_object(
          'price_reconciliation','odm_trusted_economic_price_reconciliation_v1_2',
          'price_to_verify',true,
          'restored_from_suppression_audit',true,
          'batch_id',v_batch
        ),
      updated_at = now()
  from audited a
  where d.seed_id = a.seed_id;

  get diagnostics v_restored = row_count;
  raise notice 'Restored % suppressed doubtful prices as price_to_verify', v_restored;
end;
$do$;

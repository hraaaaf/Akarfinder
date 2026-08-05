-- LOT A1 — truthful listing baseline and audit-table RLS hardening.
-- Only real, publicly eligible detail pages classified as LISTING count toward 40K.
-- CATEGORY, AMBIGUOUS and unknown document kinds remain observable but never certifiable inventory.

alter table public.odm_trusted_price_reconciliation_audit_v1
  enable row level security;

revoke all on table public.odm_trusted_price_reconciliation_audit_v1
  from public, anon, authenticated;

grant select, insert, update, delete
  on table public.odm_trusted_price_reconciliation_audit_v1
  to service_role;

revoke all on sequence public.odm_trusted_price_reconciliation_audit_v1_audit_id_seq
  from public, anon, authenticated;

grant usage, select
  on sequence public.odm_trusted_price_reconciliation_audit_v1_audit_id_seq
  to service_role;

comment on table public.odm_trusted_price_reconciliation_audit_v1 is
  'Internal ODM price reconciliation audit. RLS enabled; operational access is service-role-only.';

create or replace function public.odm_10c2_honest_40k_report()
returns jsonb
language sql
security invoker
set search_path = public
as $$
  with metrics as (
    select
      count(*) filter (
        where vertical_classification = 'real_estate_likely'
          and display_eligibility in ('eligible_primary','eligible_secondary')
          and document_kind = 'LISTING'
      )::integer as public_listings,
      count(*) filter (
        where vertical_classification = 'real_estate_likely'
          and display_eligibility in ('eligible_primary','eligible_secondary')
          and document_kind = 'CATEGORY'
      )::integer as public_categories,
      count(*) filter (
        where vertical_classification = 'real_estate_likely'
          and display_eligibility in ('eligible_primary','eligible_secondary')
          and document_kind = 'AMBIGUOUS'
      )::integer as public_ambiguous,
      count(*) filter (
        where vertical_classification = 'real_estate_likely'
          and display_eligibility in ('eligible_primary','eligible_secondary')
          and (
            document_kind is null
            or document_kind not in ('LISTING','CATEGORY','AMBIGUOUS')
          )
      )::integer as public_other,
      count(*) filter (
        where vertical_classification = 'non_real_estate'
          and display_eligibility in ('eligible_primary','eligible_secondary')
      )::integer as leaked_noise,
      count(*) filter (
        where display_eligibility = 'ineligible'
      )::integer as quarantined
    from public.thin_index_search_documents
  ), backlog as (
    select
      coalesce(sum(target_net_new),0)::integer as planned_target,
      coalesce(sum(discovered_net_new),0)::integer as discovered_net_new,
      coalesce(sum(admitted_net_new),0)::integer as admitted_net_new
    from public.odm_10c2_acquisition_backlog
  )
  select jsonb_build_object(
    'audit_version','odm_10c2_v2_truthful_listing',
    'target',40000,
    'public_listings',m.public_listings,
    'public_real_estate',m.public_listings,
    'public_categories',m.public_categories,
    'public_ambiguous',m.public_ambiguous,
    'public_other',m.public_other,
    'public_non_listing',(
      m.public_categories + m.public_ambiguous + m.public_other
    ),
    'public_documents_total',(
      m.public_listings + m.public_categories + m.public_ambiguous + m.public_other
    ),
    'gap_to_40k',greatest(0,40000-m.public_listings),
    'leaked_noise',m.leaked_noise,
    'quarantined',m.quarantined,
    'planned_target',b.planned_target,
    'discovered_net_new',b.discovered_net_new,
    'admitted_net_new',b.admitted_net_new,
    'certified',(m.public_listings >= 40000 and m.leaked_noise = 0)
  )
  from metrics m cross join backlog b;
$$;

revoke all on function public.odm_10c2_honest_40k_report()
  from public, anon, authenticated;

grant execute on function public.odm_10c2_honest_40k_report()
  to service_role;

comment on function public.odm_10c2_honest_40k_report() is
  'Fail-closed 40K certification: only eligible real-estate LISTING documents count; non-listing kinds are reported separately.';

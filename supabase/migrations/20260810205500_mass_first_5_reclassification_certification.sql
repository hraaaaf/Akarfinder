-- MASS-FIRST-5 — Mass Reclassification & Certification
-- Snapshot the pre-change public policy, run one idempotent deterministic
-- recomputation, then fail the migration on any policy leak, RPC mismatch,
-- canonical-link payload leak, score drift or catastrophic zero-result collapse.

create table if not exists public.mass_first_reclassification_audit_v1 (
  seed_id uuid primary key,
  source_domain text,
  seed_provider text,
  document_kind text,
  quality_tier text,
  quality_score smallint,
  old_display_eligibility text,
  old_display_reason text,
  source_public_mode text not null default 'blocked',
  source_public_allowed boolean not null,
  structurally_listing_eligible boolean not null,
  captured_at timestamptz not null default now()
);

alter table public.mass_first_reclassification_audit_v1
  add column if not exists seed_provider text,
  add column if not exists source_public_mode text not null default 'blocked';

truncate table public.mass_first_reclassification_audit_v1;

insert into public.mass_first_reclassification_audit_v1 (
  seed_id,source_domain,seed_provider,document_kind,quality_tier,quality_score,
  old_display_eligibility,old_display_reason,source_public_mode,source_public_allowed,
  structurally_listing_eligible
)
select
  d.seed_id,d.source_domain,d.seed_provider,d.document_kind,d.quality_tier,d.quality_score,
  d.display_eligibility,d.display_eligibility_reason,
  public.mass_first_source_public_mode_v1(d.source_domain,d.seed_provider),
  public.mass_first_source_public_allowed_v1(d.source_domain,d.seed_provider),
  (
    d.document_kind='LISTING'
    and d.vertical_classification='real_estate_likely'
    and nullif(btrim(d.canonical_url),'') is not null
    and d.seed_provider in ('public_sitemap','commoncrawl_cdx','serper_search')
    and d.freshness_status in ('seed_only','fresh_confirmed')
  )
from public.thin_index_search_documents d;

-- Naming watched columns fires both MASS-FIRST triggers without mutating source
-- facts. The transaction rolls back if any certification invariant below fails.
update public.thin_index_search_documents
set source_domain=source_domain,
    title=title;

alter table public.mass_first_reclassification_audit_v1 enable row level security;
revoke all on table public.mass_first_reclassification_audit_v1 from public,anon,authenticated;
grant select on table public.mass_first_reclassification_audit_v1 to service_role;

create or replace function public.mass_first_5_certification_report_v1()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
with transitions as (
  select
    count(*)::int as audited_rows,
    count(*) filter(where a.old_display_eligibility in ('eligible_primary','eligible_secondary'))::int as old_public_rows,
    count(*) filter(
      where a.structurally_listing_eligible
        and a.source_public_allowed
        and a.old_display_eligibility='ineligible'
        and d.display_eligibility in ('eligible_primary','eligible_secondary')
    )::int as recovered_structural_listings,
    count(*) filter(
      where a.structurally_listing_eligible
        and a.source_public_allowed
        and d.display_eligibility='ineligible'
    )::int as structural_eligibility_mismatch_rows,
    count(*) filter(
      where d.display_eligibility in ('eligible_primary','eligible_secondary')
        and not public.mass_first_source_public_allowed_v1(d.source_domain,d.seed_provider)
    )::int as source_policy_leak_rows,
    count(*) filter(
      where d.display_eligibility in ('eligible_primary','eligible_secondary')
        and d.document_kind is distinct from 'LISTING'
    )::int as non_listing_public_rows,
    count(*) filter(
      where d.display_eligibility in ('eligible_primary','eligible_secondary')
        and d.document_kind='CATEGORY'
    )::int as category_public_rows,
    count(*) filter(
      where d.display_eligibility in ('eligible_primary','eligible_secondary')
        and d.document_kind='AMBIGUOUS'
    )::int as ambiguous_public_rows,
    count(*) filter(
      where d.display_eligibility in ('eligible_primary','eligible_secondary')
        and public.mass_first_seed_provider_channel_v1(d.seed_provider) is distinct from
          public.mass_first_seed_provider_channel_v1(a.seed_provider)
    )::int as seed_channel_identity_drift_rows,
    count(*) filter(where d.listing_power_score is null)::int as unscored_rows,
    count(*) filter(where d.listing_power_score<0 or d.listing_power_score>100)::int as out_of_bounds_scores,
    count(*) filter(where d.ranking_policy_version='mass-first-v2')::int as mass_first_policy_rows,
    count(*) filter(
      where d.display_eligibility in ('eligible_primary','eligible_secondary')
        and d.quality_tier in ('C','D','E','REJECTED','UNSCORED','Q0_link_only','Q1_contextual')
    )::int as low_information_public_rows
  from public.mass_first_reclassification_audit_v1 a
  join public.thin_index_search_documents d using(seed_id)
), search_surface as (
  select
    count(*) filter(
      where d.document_kind='LISTING'
        and d.vertical_classification='real_estate_likely'
        and d.display_eligibility in ('eligible_primary','eligible_secondary')
        and public.mass_first_source_public_allowed_v1(d.source_domain,d.seed_provider)
        and d.seed_provider in ('public_sitemap','commoncrawl_cdx','serper_search')
        and d.freshness_status in ('seed_only','fresh_confirmed')
        and nullif(btrim(d.canonical_url),'') is not null
    )::int as eligible_search_rows,
    count(*) filter(
      where d.display_eligibility='eligible_secondary'
        and public.mass_first_source_public_mode_v1(d.source_domain,d.seed_provider)='canonical_link_only'
    )::int as canonical_link_search_rows,
    count(*) filter(
      where d.display_eligibility='eligible_primary'
        and public.mass_first_source_public_mode_v1(d.source_domain,d.seed_provider)='partner_content'
    )::int as partner_content_search_rows
  from public.thin_index_search_documents d
), rpc_surface as (
  select
    coalesce(max(s.total_count),0)::bigint as rpc_total_count,
    count(*)::int as rpc_page_rows,
    count(*) filter(
      where s.display_eligibility='eligible_secondary'
        and (
          s.title is not null
          or s.snippet is not null
          or s.normalized_price_mad is not null
          or s.normalized_surface_m2 is not null
          or s.price_per_m2_mad is not null
        )
    )::int as canonical_link_payload_leak_rows
  from public.search_public_representations_v1(p_limit=>101) s
), acl as (
  select
    not coalesce((select p.prosecdef from pg_proc p where p.oid='public.mass_first_source_public_allowed_v1(text,text)'::regprocedure),true) as source_gate_security_invoker,
    not has_function_privilege('anon','public.mass_first_source_public_allowed_v1(text,text)','EXECUTE') as source_gate_anon_denied,
    not has_function_privilege('authenticated','public.mass_first_source_public_allowed_v1(text,text)','EXECUTE') as source_gate_authenticated_denied,
    has_function_privilege('service_role','public.mass_first_source_public_allowed_v1(text,text)','EXECUTE') as source_gate_service_role_allowed,
    not has_function_privilege('anon','public.search_public_representations_v1(text,text,text,text,numeric,numeric,numeric,numeric,integer,smallint,real,timestamptz,uuid)','EXECUTE') as search_rpc_anon_denied,
    not has_function_privilege('authenticated','public.search_public_representations_v1(text,text,text,text,numeric,numeric,numeric,numeric,integer,smallint,real,timestamptz,uuid)','EXECUTE') as search_rpc_authenticated_denied,
    has_function_privilege('service_role','public.search_public_representations_v1(text,text,text,text,numeric,numeric,numeric,numeric,integer,smallint,real,timestamptz,uuid)','EXECUTE') as search_rpc_service_role_allowed
), indexes as (
  select
    to_regclass('public.thin_index_listing_power_rank_idx') is not null as listing_power_index_present,
    to_regclass('public.thin_index_search_documents_fts_idx') is not null as fts_index_present
), quality_contract as (
  select
    public.odm06_display_eligibility('https://example.invalid/listing','public_sitemap','seed_only','Q0_link_only')='eligible_primary' as q0_not_hard_gated,
    public.odm06_display_eligibility('https://example.invalid/listing','public_sitemap','seed_only','Q1_contextual')='eligible_primary' as q1_not_hard_gated,
    public.odm06_display_eligibility('https://example.invalid/listing','public_sitemap','seed_only','D')='eligible_primary' as legacy_d_not_hard_gated,
    public.odm06_display_eligibility('https://example.invalid/listing','public_sitemap','seed_only','REJECTED')='eligible_primary' as rejected_not_hard_gated
)
select jsonb_build_object(
  'version','mass-first-v2',
  'audited_rows',t.audited_rows,
  'old_public_rows',t.old_public_rows,
  'recovered_structural_listings',t.recovered_structural_listings,
  'eligible_search_rows',s.eligible_search_rows,
  'canonical_link_search_rows',s.canonical_link_search_rows,
  'partner_content_search_rows',s.partner_content_search_rows,
  'rpc_total_count',r.rpc_total_count,
  'rpc_page_rows',r.rpc_page_rows,
  'structural_eligibility_mismatch_rows',t.structural_eligibility_mismatch_rows,
  'source_policy_leak_rows',t.source_policy_leak_rows,
  'non_listing_public_rows',t.non_listing_public_rows,
  'category_public_rows',t.category_public_rows,
  'ambiguous_public_rows',t.ambiguous_public_rows,
  'seed_channel_identity_drift_rows',t.seed_channel_identity_drift_rows,
  'canonical_link_payload_leak_rows',r.canonical_link_payload_leak_rows,
  'low_information_public_rows',t.low_information_public_rows,
  'unscored_rows',t.unscored_rows,
  'out_of_bounds_scores',t.out_of_bounds_scores,
  'mass_first_policy_rows',t.mass_first_policy_rows,
  'public_surface_nonzero_when_previously_public',t.old_public_rows=0 or s.eligible_search_rows>0,
  'rpc_matches_certified_surface',r.rpc_total_count=s.eligible_search_rows,
  'quality_contract',jsonb_build_object(
    'q0_not_hard_gated',q.q0_not_hard_gated,
    'q1_not_hard_gated',q.q1_not_hard_gated,
    'legacy_d_not_hard_gated',q.legacy_d_not_hard_gated,
    'rejected_not_hard_gated',q.rejected_not_hard_gated
  ),
  'acl',jsonb_build_object(
    'source_gate_security_invoker',a.source_gate_security_invoker,
    'source_gate_anon_denied',a.source_gate_anon_denied,
    'source_gate_authenticated_denied',a.source_gate_authenticated_denied,
    'source_gate_service_role_allowed',a.source_gate_service_role_allowed,
    'search_rpc_anon_denied',a.search_rpc_anon_denied,
    'search_rpc_authenticated_denied',a.search_rpc_authenticated_denied,
    'search_rpc_service_role_allowed',a.search_rpc_service_role_allowed
  ),
  'indexes',jsonb_build_object(
    'listing_power_index_present',i.listing_power_index_present,
    'fts_index_present',i.fts_index_present
  ),
  'certified',
    t.structural_eligibility_mismatch_rows=0
    and t.source_policy_leak_rows=0
    and t.non_listing_public_rows=0
    and t.category_public_rows=0
    and t.ambiguous_public_rows=0
    and t.seed_channel_identity_drift_rows=0
    and r.canonical_link_payload_leak_rows=0
    and t.unscored_rows=0
    and t.out_of_bounds_scores=0
    and t.mass_first_policy_rows=t.audited_rows
    and (t.old_public_rows=0 or s.eligible_search_rows>0)
    and r.rpc_total_count=s.eligible_search_rows
    and q.q0_not_hard_gated
    and q.q1_not_hard_gated
    and q.legacy_d_not_hard_gated
    and q.rejected_not_hard_gated
    and a.source_gate_security_invoker
    and a.source_gate_anon_denied
    and a.source_gate_authenticated_denied
    and a.source_gate_service_role_allowed
    and a.search_rpc_anon_denied
    and a.search_rpc_authenticated_denied
    and a.search_rpc_service_role_allowed
    and i.listing_power_index_present
    and i.fts_index_present
)
from transitions t
cross join search_surface s
cross join rpc_surface r
cross join acl a
cross join indexes i
cross join quality_contract q;
$$;

revoke all on function public.mass_first_5_certification_report_v1() from public,anon,authenticated;
grant execute on function public.mass_first_5_certification_report_v1() to service_role;

do $$
declare
  v_report jsonb;
begin
  select public.mass_first_5_certification_report_v1() into v_report;
  if coalesce((v_report->>'certified')::boolean,false) is distinct from true then
    raise exception 'MASS-FIRST certification failed: %',v_report;
  end if;
end
$$;

select public.mass_first_5_certification_report_v1();
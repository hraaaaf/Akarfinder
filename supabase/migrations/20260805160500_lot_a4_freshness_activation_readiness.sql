-- LOT A4 — Freshness Activation Readiness.
-- Readiness audit only: no listing mutation, reclassification, ranking or publication.

create table if not exists public.odm_a4_activation_readiness_audit_v1 (
  seed_id uuid primary key,
  source_domain text not null check (source_domain in ('daragadir.com','promoimmomarrakech.com')),
  canonical_url text not null unique,
  normalized_city text not null,
  normalized_property_type text not null,
  normalized_intent text not null,
  freshness_qualified boolean not null,
  exact_listing_url_collision boolean not null default false,
  listing_seed_collision boolean not null default false,
  canonical_url_stable boolean not null default false,
  dimensions_complete boolean not null default false,
  source_policy_present boolean not null default false,
  source_display_policy text,
  source_discovery_policy text,
  source_detail_fetch_policy text,
  source_content_reuse_policy text,
  source_policy_confidence_score smallint,
  policy_allows_canonical_link boolean not null default false,
  provenance_contract_valid boolean not null default false,
  duplicate_gate_passed boolean not null default false,
  readiness_status text not null check (readiness_status in (
    'ready_for_separate_activation_review',
    'blocked_exact_listing_url_collision',
    'blocked_listing_seed_collision',
    'blocked_canonical_drift',
    'blocked_missing_dimensions',
    'blocked_source_policy',
    'blocked_provenance_contract',
    'blocked_freshness'
  )),
  activation_review_eligible boolean not null default false,
  publication_eligible boolean not null default false,
  reclassification_eligible boolean not null default false,
  audit_version text not null default 'odm_a4_activation_readiness_v1',
  audited_at timestamptz not null default now()
);

alter table public.odm_a4_activation_readiness_audit_v1 enable row level security;

revoke all on table public.odm_a4_activation_readiness_audit_v1
  from public, anon, authenticated;

grant select, insert, update, delete
  on table public.odm_a4_activation_readiness_audit_v1
  to service_role;

comment on table public.odm_a4_activation_readiness_audit_v1 is
  'Internal A4 readiness audit. Passing rows are candidates for a separate reviewed activation LOT; never public or reclassified by A4.';

create or replace function public.odm_refresh_a4_activation_readiness_v1()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_inserted integer;
begin
  delete from public.odm_a4_activation_readiness_audit_v1;

  insert into public.odm_a4_activation_readiness_audit_v1 (
    seed_id,
    source_domain,
    canonical_url,
    normalized_city,
    normalized_property_type,
    normalized_intent,
    freshness_qualified,
    exact_listing_url_collision,
    listing_seed_collision,
    canonical_url_stable,
    dimensions_complete,
    source_policy_present,
    source_display_policy,
    source_discovery_policy,
    source_detail_fetch_policy,
    source_content_reuse_policy,
    source_policy_confidence_score,
    policy_allows_canonical_link,
    provenance_contract_valid,
    duplicate_gate_passed,
    readiness_status,
    activation_review_eligible,
    publication_eligible,
    reclassification_eligible,
    audited_at
  )
  with candidates as (
    select
      a.seed_id,
      a.source_domain,
      a.canonical_url,
      a.normalized_city,
      a.normalized_property_type,
      a.normalized_intent,
      a.freshness_qualified,
      a.evidence_provider,
      a.evidence_policy,
      a.evidence_detail_fetch,
      a.evidence_content_reuse,
      a.evidence_shadow_only,
      a.evidence_public_activation,
      d.canonical_url as current_document_url,
      spr.source_domain as policy_source_domain,
      spr.display_policy,
      spr.discovery_policy,
      spr.detail_fetch_policy,
      spr.content_reuse_policy,
      spr.policy_confidence_score,
      exists (
        select 1
        from public.thin_index_search_documents l
        where l.document_kind = 'LISTING'
          and l.vertical_classification = 'real_estate_likely'
          and l.display_eligibility in ('eligible_primary','eligible_secondary')
          and l.canonical_url = a.canonical_url
      ) as exact_listing_url_collision,
      exists (
        select 1
        from public.thin_index_search_documents l
        where l.document_kind = 'LISTING'
          and l.vertical_classification = 'real_estate_likely'
          and l.display_eligibility in ('eligible_primary','eligible_secondary')
          and l.seed_id = a.seed_id
      ) as listing_seed_collision
    from public.odm_a3_freshness_recovery_audit_v1 a
    join public.thin_index_search_documents d
      on d.seed_id = a.seed_id
     and d.document_kind = 'AMBIGUOUS'
     and d.vertical_classification = 'real_estate_likely'
     and d.display_eligibility in ('eligible_primary','eligible_secondary')
    left join public.source_policy_registry spr
      on spr.source_domain = a.source_domain
    where a.source_domain in ('daragadir.com','promoimmomarrakech.com')
  ), evaluated as (
    select
      c.*,
      (c.current_document_url = c.canonical_url) as canonical_url_stable,
      (
        c.normalized_city is not null
        and btrim(c.normalized_city) <> ''
        and c.normalized_property_type is not null
        and btrim(c.normalized_property_type) <> ''
        and c.normalized_intent is not null
        and btrim(c.normalized_intent) <> ''
      ) as dimensions_complete,
      (c.policy_source_domain is not null) as source_policy_present,
      (
        c.display_policy = 'canonical_link_only'
        and c.discovery_policy = 'public_sitemap_only'
      ) as policy_allows_canonical_link,
      (
        c.evidence_provider = 'public_sitemap'
        and c.evidence_policy = 'canonical_link_only'
        and c.evidence_detail_fetch = false
        and c.evidence_content_reuse = false
        and c.evidence_shadow_only = true
        and c.evidence_public_activation = false
      ) as provenance_contract_valid,
      (not c.exact_listing_url_collision and not c.listing_seed_collision) as duplicate_gate_passed
    from candidates c
  ), classified as (
    select
      e.*,
      case
        when not e.freshness_qualified then 'blocked_freshness'
        when e.exact_listing_url_collision then 'blocked_exact_listing_url_collision'
        when e.listing_seed_collision then 'blocked_listing_seed_collision'
        when not e.canonical_url_stable then 'blocked_canonical_drift'
        when not e.dimensions_complete then 'blocked_missing_dimensions'
        when not e.source_policy_present or not e.policy_allows_canonical_link then 'blocked_source_policy'
        when not e.provenance_contract_valid then 'blocked_provenance_contract'
        else 'ready_for_separate_activation_review'
      end as readiness_status
    from evaluated e
  )
  select
    seed_id,
    source_domain,
    canonical_url,
    normalized_city,
    normalized_property_type,
    normalized_intent,
    freshness_qualified,
    exact_listing_url_collision,
    listing_seed_collision,
    canonical_url_stable,
    dimensions_complete,
    source_policy_present,
    display_policy,
    discovery_policy,
    detail_fetch_policy,
    content_reuse_policy,
    policy_confidence_score,
    policy_allows_canonical_link,
    provenance_contract_valid,
    duplicate_gate_passed,
    readiness_status,
    (readiness_status = 'ready_for_separate_activation_review'),
    false,
    false,
    now()
  from classified;

  get diagnostics v_inserted = row_count;

  return jsonb_build_object(
    'audit_version','odm_a4_activation_readiness_v1',
    'rows_materialized',v_inserted,
    'publication_activated',false,
    'reclassification_activated',false,
    'ranking_unchanged',true,
    'detail_fetch_performed',false,
    'content_reuse_performed',false
  );
end;
$$;

revoke all on function public.odm_refresh_a4_activation_readiness_v1()
  from public, anon, authenticated;
grant execute on function public.odm_refresh_a4_activation_readiness_v1()
  to service_role;

create or replace function public.odm_a4_activation_readiness_report_v1()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
with per_source as (
  select
    source_domain,
    count(*)::integer as audited_candidates,
    count(*) filter (where activation_review_eligible)::integer as ready_for_activation_review,
    count(*) filter (where exact_listing_url_collision)::integer as exact_listing_url_collisions,
    count(*) filter (where listing_seed_collision)::integer as listing_seed_collisions,
    count(*) filter (where not canonical_url_stable)::integer as canonical_drift,
    count(*) filter (where not dimensions_complete)::integer as missing_dimensions,
    count(*) filter (where not policy_allows_canonical_link)::integer as policy_blocked,
    count(*) filter (where not provenance_contract_valid)::integer as provenance_blocked,
    min(source_policy_confidence_score)::integer as policy_confidence_score
  from public.odm_a4_activation_readiness_audit_v1
  group by source_domain
), totals as (
  select
    count(*)::integer as audited_candidates,
    count(*) filter (where activation_review_eligible)::integer as ready_for_activation_review,
    count(*) filter (where exact_listing_url_collision)::integer as exact_listing_url_collisions,
    count(*) filter (where listing_seed_collision)::integer as listing_seed_collisions,
    count(*) filter (where not canonical_url_stable)::integer as canonical_drift,
    count(*) filter (where not dimensions_complete)::integer as missing_dimensions,
    count(*) filter (where not policy_allows_canonical_link)::integer as policy_blocked,
    count(*) filter (where not provenance_contract_valid)::integer as provenance_blocked,
    count(*) filter (where publication_eligible or reclassification_eligible)::integer as premature_activation_flags
  from public.odm_a4_activation_readiness_audit_v1
), baseline as (
  select count(*)::integer as public_listings
  from public.thin_index_search_documents
  where document_kind = 'LISTING'
    and vertical_classification = 'real_estate_likely'
    and display_eligibility in ('eligible_primary','eligible_secondary')
)
select jsonb_build_object(
  'audit_version','odm_a4_activation_readiness_v1',
  'baseline_public_listings',baseline.public_listings,
  'audited_candidates',totals.audited_candidates,
  'ready_for_separate_activation_review',totals.ready_for_activation_review,
  'projected_depth_if_separately_activated',baseline.public_listings + totals.ready_for_activation_review,
  'projected_gap_to_40k_if_separately_activated',greatest(40000 - baseline.public_listings - totals.ready_for_activation_review,0),
  'blockers',jsonb_build_object(
    'exact_listing_url_collisions',totals.exact_listing_url_collisions,
    'listing_seed_collisions',totals.listing_seed_collisions,
    'canonical_drift',totals.canonical_drift,
    'missing_dimensions',totals.missing_dimensions,
    'source_policy',totals.policy_blocked,
    'provenance_contract',totals.provenance_blocked,
    'premature_activation_flags',totals.premature_activation_flags
  ),
  'sources',(select coalesce(jsonb_agg(to_jsonb(per_source) order by source_domain),'[]'::jsonb) from per_source),
  'gates',jsonb_build_object(
    'publication_activated',false,
    'reclassification_activated',false,
    'ranking_unchanged',true,
    'detail_fetch_performed',false,
    'content_reuse_performed',false,
    'activation_requires_separate_reviewed_lot',true,
    'candidate_depth_is_not_certified_inventory',true
  )
)
from totals cross join baseline;
$$;

revoke all on function public.odm_a4_activation_readiness_report_v1()
  from public, anon, authenticated;
grant execute on function public.odm_a4_activation_readiness_report_v1()
  to service_role;

select public.odm_refresh_a4_activation_readiness_v1();
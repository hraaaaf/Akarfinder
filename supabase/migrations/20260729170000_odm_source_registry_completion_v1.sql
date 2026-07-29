-- ODM-SOURCE-REGISTRY-COMPLETION-V1
-- Completes current Shadow corpus domain coverage with fail-closed policies.
-- No direct crawling, content reuse, public display, ranking or SERP activation is introduced.

insert into public.source_policy_registry (
  source_domain, source_name, current_representation_count,
  discovery_policy, detail_fetch_policy, content_reuse_policy, display_policy,
  robots_status, terms_status, partnership_required, legal_review_required,
  no_bypass_required, evidence_urls, evidence_summary, primary_geography,
  volume_score, diversification_score, structure_score, policy_confidence_score, freshness_score,
  recommended_action, reviewed_at, next_review_at
) values
  ('soukimmobilier.com', 'Souk Immobilier', 881,
   'public_index_only', 'legal_review_required', 'unknown', 'internal_signal_only',
   'unverified', 'unverified', true, true, true,
   array['https://soukimmobilier.com/'],
   'Current Shadow representations exist, but no verified written authorization for automated detail retrieval, reuse or republication is recorded.',
   'Morocco', 10, 12, 8, 1, 2,
   'Keep public-index observations as internal signals only. Complete robots, terms and partnership review before any direct acquisition.',
   '2026-07-29T14:00:00Z', '2026-08-12T14:00:00Z'),

  ('sarouty.ma', 'Sarouty Maroc', 558,
   'public_sitemap_only', 'legal_review_required', 'permission_required', 'internal_signal_only',
   'sitemap_declared', 'permission_required', true, true, true,
   array['https://sarouty.ma/robots.txt','https://www.sarouty.ma/en/terms-and-conditions/'],
   'robots.txt publishes a sitemap. Public terms do not provide AkarFinder with extraction or republication rights; written authorization remains required.',
   'National', 8, 10, 16, 7, 3,
   'Allow sitemap/public-index discovery only. Seek a formal feed or content licence before detail retrieval or display.',
   '2026-07-29T14:00:00Z', '2026-08-12T14:00:00Z'),

  ('barnes-marrakech.com', 'BARNES Marrakech', 282,
   'public_index_only', 'permission_required', 'prohibited', 'internal_signal_only',
   'unverified', 'reuse_restricted', true, true, true,
   array['https://www.barnes-marrakech.com/fr/mentions-legales/'],
   'Published legal notices restrict reproduction, reuse, representation, modification and hyperlinking without express authorization.',
   'Marrakech', 5, 16, 12, 9, 3,
   'Do not reuse content or activate direct retrieval. Request express written authorization and a bounded partner feed.',
   '2026-07-29T14:00:00Z', '2026-08-12T14:00:00Z'),

  ('1immo.ma', '1Immo Maroc', 191,
   'public_index_only', 'legal_review_required', 'unknown', 'internal_signal_only',
   'unverified', 'unverified', true, true, true,
   array['https://1immo.ma/'],
   'Shadow representations are present, while current robots, contractual reuse terms and written authorization remain unverified.',
   'Morocco', 4, 11, 8, 1, 2,
   'Keep discovery-only internal signals. Complete policy review and seek a structured feed agreement before activation.',
   '2026-07-29T14:00:00Z', '2026-08-12T14:00:00Z'),

  ('kawtarimmobilier.com', 'Kawtar Immobilier', 77,
   'public_index_only', 'legal_review_required', 'unknown', 'internal_signal_only',
   'unverified', 'unverified', true, true, true,
   array['https://kawtarimmobilier.com/'],
   'Shadow representations are present, while current robots, contractual reuse terms and written authorization remain unverified.',
   'Morocco', 2, 10, 7, 1, 2,
   'Keep discovery-only internal signals. Complete policy review and seek written permission before any direct acquisition or display.',
   '2026-07-29T14:00:00Z', '2026-08-12T14:00:00Z')
on conflict (source_domain) do update set
  source_name=excluded.source_name,
  current_representation_count=excluded.current_representation_count,
  discovery_policy=excluded.discovery_policy,
  detail_fetch_policy=excluded.detail_fetch_policy,
  content_reuse_policy=excluded.content_reuse_policy,
  display_policy=excluded.display_policy,
  robots_status=excluded.robots_status,
  terms_status=excluded.terms_status,
  partnership_required=excluded.partnership_required,
  legal_review_required=excluded.legal_review_required,
  no_bypass_required=true,
  evidence_urls=excluded.evidence_urls,
  evidence_summary=excluded.evidence_summary,
  primary_geography=excluded.primary_geography,
  volume_score=excluded.volume_score,
  diversification_score=excluded.diversification_score,
  structure_score=excluded.structure_score,
  policy_confidence_score=excluded.policy_confidence_score,
  freshness_score=excluded.freshness_score,
  recommended_action=excluded.recommended_action,
  reviewed_at=excluded.reviewed_at,
  next_review_at=excluded.next_review_at,
  updated_at=now();

create or replace view public.odm_source_registry_coverage_shadow_v1 as
with corpus as (
  select
    public.odm_audit_canonical_domain_v1(source_domain) as canonical_domain,
    count(*)::bigint as representation_count
  from public.thin_index_search_documents
  where source_domain is not null and btrim(source_domain)<>''
  group by 1
), registry as (
  select
    public.odm_audit_canonical_domain_v1(source_domain) as canonical_domain,
    count(*)::bigint as policy_count,
    min(source_domain) as registry_source_domain,
    bool_and(no_bypass_required) as no_bypass_required,
    bool_and(display_policy in ('internal_signal_only','blocked','canonical_link_only','partner_content')) as valid_display_policy
  from public.source_policy_registry
  group by 1
)
select
  c.canonical_domain,
  c.representation_count,
  r.registry_source_domain,
  coalesce(r.policy_count,0) as policy_count,
  coalesce(r.no_bypass_required,false) as no_bypass_required,
  coalesce(r.valid_display_policy,false) as valid_display_policy,
  case
    when r.canonical_domain is null then 'missing_policy'
    when r.policy_count>1 then 'ambiguous_policy_alias'
    when r.no_bypass_required is not true then 'invalid_no_bypass_policy'
    when r.valid_display_policy is not true then 'invalid_display_policy'
    else 'covered'
  end as coverage_status
from corpus c
left join registry r using (canonical_domain);

create or replace function public.odm_source_registry_coverage_report_v1()
returns jsonb
language sql
stable
set search_path=''
as $$
select jsonb_build_object(
  'audit_version','odm_source_registry_completion_v1',
  'corpus_domains',count(*),
  'covered_domains',count(*) filter(where coverage_status='covered'),
  'missing_domains',count(*) filter(where coverage_status='missing_policy'),
  'ambiguous_domains',count(*) filter(where coverage_status='ambiguous_policy_alias'),
  'invalid_no_bypass_domains',count(*) filter(where coverage_status='invalid_no_bypass_policy'),
  'invalid_display_policy_domains',count(*) filter(where coverage_status='invalid_display_policy'),
  'covered_representations',coalesce(sum(representation_count) filter(where coverage_status='covered'),0),
  'total_representations',coalesce(sum(representation_count),0),
  'gates',jsonb_build_object(
    'zero_missing_domains',count(*) filter(where coverage_status='missing_policy')=0,
    'zero_ambiguous_domains',count(*) filter(where coverage_status='ambiguous_policy_alias')=0,
    'no_bypass_everywhere',count(*) filter(where coverage_status='invalid_no_bypass_policy')=0,
    'valid_display_policy_everywhere',count(*) filter(where coverage_status='invalid_display_policy')=0,
    'full_representation_coverage',coalesce(sum(representation_count) filter(where coverage_status='covered'),0)=coalesce(sum(representation_count),0)
  )
)
from public.odm_source_registry_coverage_shadow_v1;
$$;

revoke all on public.odm_source_registry_coverage_shadow_v1 from public,anon,authenticated;
revoke all on function public.odm_source_registry_coverage_report_v1() from public,anon,authenticated;
grant select on public.odm_source_registry_coverage_shadow_v1 to service_role;
grant execute on function public.odm_source_registry_coverage_report_v1() to service_role;

comment on view public.odm_source_registry_coverage_shadow_v1 is 'Shadow-only canonical domain coverage. Missing and ambiguous policies fail closed.';
comment on function public.odm_source_registry_coverage_report_v1() is 'Service-role-only completeness report for all domains represented in the Thin Index corpus.';
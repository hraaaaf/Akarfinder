-- LOT A2 — recoverable listing depth, read-only and fail-closed.
-- This migration creates an internal aggregate report only.
-- It does not reclassify, publish, rank, fetch or mutate any listing document.

create or replace function public.odm_a2_recoverable_listing_depth_report_v1()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
with baseline as (
  select count(*)::integer as public_listings
  from public.thin_index_search_documents
  where document_kind = 'LISTING'
    and vertical_classification = 'real_estate_likely'
    and display_eligibility in ('eligible_primary','eligible_secondary')
), ambiguous as (
  select
    d.*,
    case
      when d.source_domain = 'agenz.ma'
        and d.canonical_url ~ '^https://agenz\.ma/(fr|en)/annonces/.+/[0-9]+/?$'
        then 'existing_certified_rule'
      when d.source_domain = 'avito.ma'
        and d.canonical_url ~ '^https://avito\.ma/fr/[^/]+/(appartements|terrains_et_fermes|villas_et_riads|local|bureaux|maisons|maisons_et_villas|locations_de_vacances|autre_immobilier)/.+_[0-9]{7,10}\.htm/?$'
        then 'existing_certified_rule'
      when d.source_domain = 'masaken.ma'
        and d.canonical_url ~ '^https://masaken\.ma/fr/immobilier-maroc/(vente|location)-[a-z0-9-]+/[0-9]+/?$'
        then 'existing_certified_rule'
      when d.source_domain = 'mouldar.com'
        and d.canonical_url ~ '^https://mouldar\.com/(fr|en)/.+/[0-9a-f]{8}/?$'
        then 'existing_certified_rule'
      when d.source_domain = 'mubawab.ma'
        and d.canonical_url ~ '^https://mubawab\.ma/(fr|en)/a/[0-9]+/'
        then 'existing_certified_rule'
      when d.source_domain = 'daragadir.com'
        and d.canonical_url ~ '^https://daragadir\.com/annonces/annonces-immobilieres/.+\.html/?$'
        then 'audited_source_pattern'
      when d.source_domain = 'promoimmomarrakech.com'
        and d.canonical_url ~ '^https://promoimmomarrakech\.com/produit/[^/]+/.+\.html/?$'
        then 'audited_source_pattern'
      when d.source_domain = 'limmobiliersansfrontieres.com'
        and d.canonical_url ~ '^https://limmobiliersansfrontieres\.com/property/[^/]+/?$'
        then 'audited_source_pattern'
      when d.source_domain = 'aykana.ma'
        and d.canonical_url ~ '^https://aykana\.ma/property/[^/]+/?$'
        then 'audited_source_pattern'
      when d.source_domain = 'atlasimmobilier.com'
        and d.canonical_url ~ '^https://atlasimmobilier\.com/(en/)?p/[^/]+/?$'
        then 'audited_source_pattern'
      when d.source_domain = 'sarouty.ma'
        and d.canonical_url ~ '^https://sarouty\.ma/(ar/)?plp/.+-[0-9]+\.html/?$'
        then 'audited_source_pattern'
      when d.source_domain = 'barnes-marrakech.com'
        and d.canonical_url ~ '^https://barnes-marrakech\.com/(fr|en)/(vente|location)/[^/]+/[0-9]+/?$'
        then 'audited_source_pattern'
      when d.source_domain = 'soukimmobilier.com'
        and d.canonical_url ~ '^https://soukimmobilier\.com/fr/[^/]+/[^/]+/[0-9]+/?$'
        then 'audited_source_pattern'
      when d.source_domain = '1immo.ma'
        and d.canonical_url ~ '^https://1immo\.ma/[^/]+-[0-9]+/?$'
        then 'audited_source_pattern'
      when d.source_domain = 'kawtarimmobilier.com'
        and d.canonical_url ~ '^https://kawtarimmobilier\.com/[^/]+/(vente|location)/[^/]+/.+-ref-[0-9]+\.html/?$'
        then 'audited_source_pattern'
      when d.source_domain = 'masaken.ma'
        and d.canonical_url ~ '^https://masaken\.ma/en/immobilier-maroc/(sale|rental)-[a-z0-9-]+/[0-9]+/?$'
        then 'audited_source_pattern'
      when d.source_domain = 'marrakechrealty.com'
        and length(trim(coalesce(d.title,'') || ' ' || coalesce(d.snippet,''))) >= 80
        and d.normalized_city is not null
        and d.normalized_property_type is not null
        and d.normalized_intent is not null
        then 'content_structured_candidate'
      else null
    end as detail_evidence
  from public.thin_index_search_documents d
  where d.document_kind = 'AMBIGUOUS'
    and d.vertical_classification = 'real_estate_likely'
    and d.display_eligibility in ('eligible_primary','eligible_secondary')
), joined as (
  select
    a.*,
    spr.discovery_policy,
    spr.detail_fetch_policy,
    spr.content_reuse_policy,
    spr.display_policy,
    spr.policy_confidence_score
  from ambiguous a
  left join public.source_policy_registry spr using (source_domain)
), per_source as (
  select
    source_domain,
    count(*)::integer as ambiguous_rows,
    count(*) filter (where detail_evidence is not null)::integer as technical_detail_candidates,
    count(*) filter (
      where detail_evidence is not null
        and normalized_city is not null
        and normalized_property_type is not null
        and normalized_intent is not null
    )::integer as structured_detail_candidates,
    count(*) filter (
      where detail_evidence is not null
        and (
          normalized_city is null
          or normalized_property_type is null
          or normalized_intent is null
        )
    )::integer as needs_dimension_recovery,
    count(*) filter (where detail_evidence is null)::integer as unproven_rows,
    count(*) filter (where detail_evidence = 'existing_certified_rule')::integer as existing_rule_matches,
    count(*) filter (where detail_evidence = 'audited_source_pattern')::integer as audited_pattern_matches,
    count(*) filter (where detail_evidence = 'content_structured_candidate')::integer as content_candidates,
    count(*) filter (
      where detail_evidence is not null
        and normalized_city is not null
        and normalized_property_type is not null
        and normalized_intent is not null
        and display_policy = 'canonical_link_only'
    )::integer as canonical_link_after_freshness,
    count(*) filter (
      where detail_evidence is not null
        and normalized_city is not null
        and normalized_property_type is not null
        and normalized_intent is not null
        and display_policy = 'canonical_link_only'
        and freshness_status not in ('fresh','aging')
    )::integer as freshness_blocked_canonical_link,
    count(*) filter (
      where detail_evidence is not null
        and normalized_city is not null
        and normalized_property_type is not null
        and normalized_intent is not null
        and display_policy = 'internal_signal_only'
    )::integer as partnership_or_legal_blocked,
    count(*) filter (
      where detail_evidence is not null
        and normalized_city is not null
        and normalized_property_type is not null
        and normalized_intent is not null
        and display_policy is null
    )::integer as missing_policy_structured,
    count(*) filter (
      where detail_evidence is not null
        and normalized_city is not null
        and normalized_property_type is not null
        and normalized_intent is not null
        and freshness_status in ('fresh','aging')
        and display_policy = 'canonical_link_only'
    )::integer as public_recoverable_now,
    count(distinct canonical_url)::integer as distinct_candidate_urls,
    max(discovery_policy) as discovery_policy,
    max(detail_fetch_policy) as detail_fetch_policy,
    max(content_reuse_policy) as content_reuse_policy,
    max(display_policy) as display_policy,
    max(policy_confidence_score)::integer as policy_confidence_score
  from joined
  group by source_domain
), summary as (
  select
    count(*)::integer as ambiguous_rows,
    count(*) filter (where detail_evidence is not null)::integer as technical_detail_candidates,
    count(*) filter (
      where detail_evidence is not null
        and normalized_city is not null
        and normalized_property_type is not null
        and normalized_intent is not null
    )::integer as structured_detail_candidates,
    count(*) filter (
      where detail_evidence is not null
        and (
          normalized_city is null
          or normalized_property_type is null
          or normalized_intent is null
        )
    )::integer as needs_dimension_recovery,
    count(*) filter (where detail_evidence is null)::integer as unproven_rows,
    count(*) filter (where detail_evidence = 'existing_certified_rule')::integer as existing_rule_matches,
    count(*) filter (where detail_evidence = 'audited_source_pattern')::integer as audited_pattern_matches,
    count(*) filter (where detail_evidence = 'content_structured_candidate')::integer as content_candidates,
    count(*) filter (
      where detail_evidence is not null
        and normalized_city is not null
        and normalized_property_type is not null
        and normalized_intent is not null
        and display_policy = 'canonical_link_only'
    )::integer as canonical_link_after_freshness,
    count(*) filter (
      where detail_evidence is not null
        and normalized_city is not null
        and normalized_property_type is not null
        and normalized_intent is not null
        and display_policy = 'internal_signal_only'
    )::integer as policy_blocked_structured,
    count(*) filter (
      where detail_evidence is not null
        and normalized_city is not null
        and normalized_property_type is not null
        and normalized_intent is not null
        and display_policy is null
    )::integer as missing_policy_structured,
    count(*) filter (
      where detail_evidence is not null
        and normalized_city is not null
        and normalized_property_type is not null
        and normalized_intent is not null
        and freshness_status in ('fresh','aging')
        and display_policy = 'canonical_link_only'
    )::integer as public_recoverable_now,
    count(distinct canonical_url)::integer as distinct_ambiguous_urls,
    count(distinct source_domain)::integer as source_count
  from joined
)
select jsonb_build_object(
  'audit_version','odm_a2_recoverable_listing_depth_v1',
  'baseline_public_listings',b.public_listings,
  'ambiguous_rows',s.ambiguous_rows,
  'technical_detail_candidates',s.technical_detail_candidates,
  'structured_detail_candidates',s.structured_detail_candidates,
  'needs_dimension_recovery',s.needs_dimension_recovery,
  'unproven_rows',s.unproven_rows,
  'existing_rule_matches',s.existing_rule_matches,
  'audited_pattern_matches',s.audited_pattern_matches,
  'content_candidates',s.content_candidates,
  'canonical_link_after_freshness',s.canonical_link_after_freshness,
  'policy_blocked_structured',s.policy_blocked_structured,
  'missing_policy_structured',s.missing_policy_structured,
  'public_recoverable_now',s.public_recoverable_now,
  'projected_depth_after_validated_canonical_links',b.public_listings + s.canonical_link_after_freshness,
  'projected_gap_to_40k_after_validated_canonical_links',greatest(0,40000 - (b.public_listings + s.canonical_link_after_freshness)),
  'distinct_ambiguous_urls',s.distinct_ambiguous_urls,
  'source_count',s.source_count,
  'sources',coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'source_domain',p.source_domain,
        'ambiguous_rows',p.ambiguous_rows,
        'technical_detail_candidates',p.technical_detail_candidates,
        'structured_detail_candidates',p.structured_detail_candidates,
        'needs_dimension_recovery',p.needs_dimension_recovery,
        'unproven_rows',p.unproven_rows,
        'existing_rule_matches',p.existing_rule_matches,
        'audited_pattern_matches',p.audited_pattern_matches,
        'content_candidates',p.content_candidates,
        'canonical_link_after_freshness',p.canonical_link_after_freshness,
        'freshness_blocked_canonical_link',p.freshness_blocked_canonical_link,
        'partnership_or_legal_blocked',p.partnership_or_legal_blocked,
        'missing_policy_structured',p.missing_policy_structured,
        'public_recoverable_now',p.public_recoverable_now,
        'distinct_candidate_urls',p.distinct_candidate_urls,
        'discovery_policy',p.discovery_policy,
        'detail_fetch_policy',p.detail_fetch_policy,
        'content_reuse_policy',p.content_reuse_policy,
        'display_policy',p.display_policy,
        'policy_confidence_score',p.policy_confidence_score,
        'next_action',case
          when p.missing_policy_structured > 0 then 'complete_source_policy'
          when p.canonical_link_after_freshness > 0 and p.needs_dimension_recovery > 0 then 'recrawl_freshness_and_recover_dimensions'
          when p.canonical_link_after_freshness > 0 then 'recrawl_freshness_then_validate_canonical_links'
          when p.partnership_or_legal_blocked > 0 then 'seek_permission_or_partner_feed'
          when p.needs_dimension_recovery > 0 then 'recover_dimensions_without_publication'
          else 'manual_pattern_review'
        end
      )
      order by p.technical_detail_candidates desc, p.source_domain
    )
    from per_source p
  ),'[]'::jsonb),
  'gates',jsonb_build_object(
    'no_automatic_reclassification',true,
    'publication_unchanged',true,
    'ranking_unchanged',true,
    'network_access',false,
    'all_ambiguous_urls_distinct',s.ambiguous_rows = s.distinct_ambiguous_urls,
    'zero_public_recoverable_without_freshness',s.public_recoverable_now = 0,
    'source_policy_complete',s.missing_policy_structured = 0,
    'candidate_depth_is_not_certified_inventory',true
  )
)
from baseline b cross join summary s;
$$;

revoke all on function public.odm_a2_recoverable_listing_depth_report_v1()
  from public, anon, authenticated;

grant execute on function public.odm_a2_recoverable_listing_depth_report_v1()
  to service_role;

comment on function public.odm_a2_recoverable_listing_depth_report_v1() is
  'Read-only A2 report. Separates technical detail evidence, structure, freshness and source policy. Never reclassifies or publishes candidates.';

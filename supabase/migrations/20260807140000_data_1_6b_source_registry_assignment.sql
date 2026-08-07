-- DATA-1.6B — Source Registry Assignment
-- Evidence: DATA-1.6A workflow run 31182352538.
-- Conservative governance only. No direct ingestion or public content display is activated.
-- Existing Registry rows are never overwritten.

do $$
declare
  v_existing text[];
begin
  select array_agg(source_domain order by source_domain)
    into v_existing
  from public.source_policy_registry
  where source_domain = any (array['valfoncier.ma','capital-properties.ma','leaderimmo.ma','immotaroudant.com','mhproperties.ma','immo-maroc.com','proimmobilier.ma','immobest.ma','christiesrealestatemorocco.com','immohammedia.com','rabatimmo.ma','immobilier-pro-maroc.com','agadirimmobilier.ma','nouraimmobilier.ma','marrakech-luxury-properties.com','agadirimmobilier.org','prestigeimmo.ma','alamal-immobilier.ma','immobilier-a-marrakech.com']::text[]);

  if coalesce(array_length(v_existing, 1), 0) > 0 then
    raise exception 'DATA-1.6B refuses to overwrite existing Source Registry rows: %', v_existing;
  end if;
end
$$;

with decisions (
  source_domain,
  evidence_status,
  decision_class,
  evidence_urls,
  robots_status,
  structure_score,
  policy_confidence_score,
  policy_hash
) as (
  values
    ('valfoncier.ma', 'INSUFFICIENT_LEGAL_EVIDENCE', 'INTERNAL_DISCOVERY_UNVERIFIED', array['https://valfoncier.ma/robots.txt','https://valfoncier.ma/']::text[], 'sitemap_declared', 20, 6, 'd640e22afcc64e59e6a5dc128fe8540326cec7fde4e3428d5787a00fc3bf568c'),
    ('capital-properties.ma', 'INSUFFICIENT_LEGAL_EVIDENCE', 'INTERNAL_DISCOVERY_UNVERIFIED', array['https://www.capital-properties.ma/robots.txt','https://www.capital-properties.ma/']::text[], 'sitemap_declared', 19, 6, '33f263763544f15878a5455f4f280276af1b224354f9868ad45164c0de0e80e3'),
    ('leaderimmo.ma', 'INSUFFICIENT_LEGAL_EVIDENCE', 'INTERNAL_DISCOVERY_UNVERIFIED', array['https://leaderimmo.ma/robots.txt','https://leaderimmo.ma/']::text[], 'allow_with_restrictions', 12, 6, 'b9a4a52bcf274cf69ad78c3686751e21daf9ff42336bc9f8e8f0adf3e694515c'),
    ('immotaroudant.com', 'INSUFFICIENT_LEGAL_EVIDENCE', 'INTERNAL_DISCOVERY_UNVERIFIED', array['https://immotaroudant.com/robots.txt','https://www.immotaroudant.com/']::text[], 'sitemap_declared', 18, 6, 'b9c7b85d08486b0c850cf545d5859533dd1c52427eb39044e47502483b104d5e'),
    ('mhproperties.ma', 'TERMS_FOUND_NO_EXPLICIT_PERMISSION', 'INTERNAL_DISCOVERY_PERMISSION_REQUIRED', array['https://mhproperties.ma/robots.txt','https://mhproperties.ma/conditions-generales-utilisation']::text[], 'sitemap_declared', 15, 12, '776d4c5e51c1ff94539e6ac1ed109a0bc5246118a1b106012f70d539988e6c0d'),
    ('immo-maroc.com', 'INSUFFICIENT_LEGAL_EVIDENCE', 'INTERNAL_DISCOVERY_UNVERIFIED', array['https://immo-maroc.com/robots.txt','https://immo-maroc.com/']::text[], 'sitemap_declared', 15, 6, 'd8ee0169a34f007c90f008d4f94ab950228d6182f4dec61e2ba594e59585e727'),
    ('proimmobilier.ma', 'INSUFFICIENT_LEGAL_EVIDENCE', 'INTERNAL_DISCOVERY_UNVERIFIED', array['https://proimmobilier.ma/robots.txt','https://proimmobilier.ma/']::text[], 'sitemap_declared', 19, 6, '2a11bbab5496bb763c18583565a9c4229d128250631760402c4555fd218321af'),
    ('immobest.ma', 'INSUFFICIENT_LEGAL_EVIDENCE', 'INTERNAL_DISCOVERY_UNVERIFIED', array['https://immobest.ma/robots.txt','https://immobest.ma/']::text[], 'sitemap_declared', 15, 6, '3c4a636464cb063ec6eb51691a6b96bc6a10c3496164875facb690a80f5c67e1'),
    ('christiesrealestatemorocco.com', 'INSUFFICIENT_LEGAL_EVIDENCE', 'INTERNAL_DISCOVERY_UNVERIFIED', array['https://www.christiesrealestatemorocco.com/robots.txt','https://www.christiesrealestatemorocco.com/fr/']::text[], 'sitemap_declared', 15, 6, '5d71de4f3ebf49f9814dadb2b946b2685ae17ca15bb91b2a5c5ed2f043059d07'),
    ('immohammedia.com', 'INSUFFICIENT_LEGAL_EVIDENCE', 'INTERNAL_DISCOVERY_UNVERIFIED', array['https://www.immohammedia.com/robots.txt','https://www.immohammedia.com/']::text[], 'allow_with_restrictions', 15, 6, '3ea42386273629e8a2a9c5cfee55cfa19a94a0901035b9de8e47ca95de514947'),
    ('rabatimmo.ma', 'ACCESS_OR_FETCH_LIMITED', 'INTERNAL_DISCOVERY_ACCESS_LIMITED', array['https://rabatimmo.ma/robots.txt']::text[], 'unverified', 19, 0, 'e5ac7eef825ae48d7548a6c0c8f4dc1ebfd33b0d49dced464a9ecf76907b971f'),
    ('immobilier-pro-maroc.com', 'INSUFFICIENT_LEGAL_EVIDENCE', 'INTERNAL_DISCOVERY_UNVERIFIED', array['https://www.immobilier-pro-maroc.com/robots.txt','https://www.immobilier-pro-maroc.com/','https://www.immobilier-pro-maroc.com/politique-de-confidentialite/']::text[], 'allow_with_restrictions', 19, 7, '311228e3dbe0481c3a6d3b893c4e4857d3eb9d7e93b6eaaac9357ce7c957f33c'),
    ('agadirimmobilier.ma', 'INSUFFICIENT_LEGAL_EVIDENCE', 'INTERNAL_DISCOVERY_UNVERIFIED', array['https://agadirimmobilier.ma/robots.txt','https://agadirimmobilier.ma/']::text[], 'sitemap_declared', 19, 6, '04f2c7f15bf97624f1074855b739f27186a49375c26b63ed87f778521c1f5ec3'),
    ('nouraimmobilier.ma', 'TERMS_FOUND_NO_EXPLICIT_PERMISSION', 'INTERNAL_DISCOVERY_PERMISSION_REQUIRED', array['https://nouraimmobilier.ma/robots.txt','https://nouraimmobilier.ma/terms-and-conditions/']::text[], 'sitemap_declared', 18, 12, '8193d4cd157cff8a3f6ef23d07801e62701d5353fe9872686f1b5fa60cfb6d2a'),
    ('marrakech-luxury-properties.com', 'ACCESS_OR_FETCH_LIMITED', 'INTERNAL_DISCOVERY_ACCESS_LIMITED', array['https://marrakech-luxury-properties.com/robots.txt','https://marrakech-luxury-properties.com/','https://marrakech-luxury-properties.com/mentions-legales/']::text[], 'allow_with_restrictions', 20, 6, 'e212a548ee84b5dc40fff0ee6d2b6b34d7071f26fff61d60b4ecb6f16fb23934'),
    ('agadirimmobilier.org', 'TERMS_FOUND_NO_EXPLICIT_PERMISSION', 'INTERNAL_DISCOVERY_PERMISSION_REQUIRED', array['https://agadirimmobilier.org/robots.txt','https://agadirimmobilier.org/terms-and-conditions/']::text[], 'sitemap_declared', 20, 10, '87d8b2ebb6c648fd4e5c9b6bd38b70f49525b927a1e216175e9dd0a91f2ff2c7'),
    ('prestigeimmo.ma', 'RESTRICTIVE_TERMS_FOUND', 'BLOCK_RESTRICTED', array['https://prestigeimmo.ma/robots.txt','https://www.prestigeimmo.ma/fr/cgu.html']::text[], 'allow_with_restrictions', 5, 14, '952c41527a4161f87fdf02621d0d5f99b84c8deb4ea572fbf09b30db96f97ed6'),
    ('alamal-immobilier.ma', 'ACCESS_OR_FETCH_LIMITED', 'INTERNAL_DISCOVERY_ACCESS_LIMITED', array['https://www.alamal-immobilier.ma/robots.txt','https://www.alamal-immobilier.ma/']::text[], 'unverified', 5, 1, '7808bc92dc3a369428e02f0afe538b03def00c862f1571d965fbb481c6a1bd9f'),
    ('immobilier-a-marrakech.com', 'ACCESS_OR_FETCH_LIMITED', 'INTERNAL_DISCOVERY_ACCESS_LIMITED', array['https://immobilier-a-marrakech.com/robots.txt']::text[], 'unverified', 12, 0, '086b5d0f70a576a71fb98d3c75f08146d0bdc4d7db93bbcac811a45609d8464c')
)
insert into public.source_policy_registry (
  source_domain, source_name, current_representation_count, discovery_policy, detail_fetch_policy,
  content_reuse_policy, display_policy, robots_status, terms_status, partnership_required,
  legal_review_required, no_bypass_required, evidence_urls, evidence_summary, primary_geography,
  volume_score, diversification_score, structure_score, policy_confidence_score, freshness_score,
  execution_score, recommended_action, reviewed_at, next_review_at, policy_version,
  authorization_status, acquisition_mode, allowed_discovery_channels, max_revalidation_interval_days,
  review_status, policy_effective_at, policy_expires_at, evidence_observed_at, robots_observed_at,
  terms_observed_at, contact_status, machine_gate, policy_hash, ingestion_gate, display_gate
)
select
  d.source_domain,
  d.source_domain,
  0,
  case when d.decision_class = 'BLOCK_RESTRICTED' then 'paused' else 'public_index_only' end,
  case d.decision_class
    when 'BLOCK_RESTRICTED' then 'prohibited'
    when 'INTERNAL_DISCOVERY_PERMISSION_REQUIRED' then 'permission_required'
    when 'INTERNAL_DISCOVERY_ACCESS_LIMITED' then 'paused'
    else 'legal_review_required'
  end,
  case d.decision_class
    when 'BLOCK_RESTRICTED' then 'prohibited'
    when 'INTERNAL_DISCOVERY_PERMISSION_REQUIRED' then 'permission_required'
    else 'unknown'
  end,
  case when d.decision_class = 'BLOCK_RESTRICTED' then 'blocked' else 'internal_signal_only' end,
  d.robots_status,
  case d.decision_class
    when 'BLOCK_RESTRICTED' then 'reuse_restricted'
    when 'INTERNAL_DISCOVERY_PERMISSION_REQUIRED' then 'permission_required'
    else 'unverified'
  end,
  true,
  true,
  true,
  d.evidence_urls,
  case d.decision_class
    when 'BLOCK_RESTRICTED' then 'DATA-1.6A observed a substantive public terms restriction covering automated access, copying or reproduction; no AkarFinder reuse authorization is recorded.'
    when 'INTERNAL_DISCOVERY_PERMISSION_REQUIRED' then 'DATA-1.6A found a public terms/legal page, but no explicit authorization for AkarFinder ingestion, reuse or republication was established.'
    when 'INTERNAL_DISCOVERY_ACCESS_LIMITED' then 'DATA-1.6A could not complete bounded legal-evidence collection because of a fetch or robots-path limitation. No bypass was attempted and no reuse authorization is established.'
    else 'DATA-1.6A bounded public review did not establish terms granting AkarFinder ingestion, reuse or republication rights.'
  end,
  null,
  0,
  0,
  d.structure_score,
  d.policy_confidence_score,
  0,
  null,
  case d.decision_class
    when 'BLOCK_RESTRICTED' then 'Do not fetch or reuse source content. Seek written permission or a partnership before any future activation.'
    when 'INTERNAL_DISCOVERY_PERMISSION_REQUIRED' then 'Keep public-index observations internal only. Obtain written permission or a partner agreement before detail fetch, reuse or display.'
    when 'INTERNAL_DISCOVERY_ACCESS_LIMITED' then 'Keep public-index observations internal only. Do not bypass access limits; obtain additional policy evidence or contact the source.'
    else 'Keep public-index observations internal only. Complete legal review or obtain written permission before detail fetch, reuse or display.'
  end,
  '2026-08-07T13:25:45.185Z'::timestamptz,
  '2026-08-21T13:25:45.185Z'::timestamptz,
  'source_registry_v2:data_1_6b_20260807',
  case d.decision_class
    when 'BLOCK_RESTRICTED' then 'prohibited'
    when 'INTERNAL_DISCOVERY_PERMISSION_REQUIRED' then 'permission_required'
    else 'unverified'
  end,
  case when d.decision_class = 'BLOCK_RESTRICTED' then 'blocked' else 'public_index_internal_only' end,
  case when d.decision_class = 'BLOCK_RESTRICTED' then array[]::text[] else array['public_index','commoncrawl']::text[] end,
  14,
  'current',
  '2026-08-07T13:25:45.185Z'::timestamptz,
  '2026-08-21T13:25:45.185Z'::timestamptz,
  '2026-08-07T13:25:45.185Z'::timestamptz,
  '2026-08-07T13:25:45.185Z'::timestamptz,
  case
    when d.decision_class in ('BLOCK_RESTRICTED','INTERNAL_DISCOVERY_PERMISSION_REQUIRED')
      then '2026-08-07T13:25:45.185Z'::timestamptz
    else null
  end,
  'required',
  case when d.decision_class = 'BLOCK_RESTRICTED' then 'blocked_invalid_no_bypass' else 'internal_signal_only' end,
  d.policy_hash,
  case when d.decision_class = 'BLOCK_RESTRICTED' then 'blocked' else 'internal_signal_only' end,
  'hidden'
from decisions d;

do $$
declare
  v_count integer;
  v_unsafe integer;
begin
  select count(*) into v_count
  from public.source_policy_registry
  where policy_version = 'source_registry_v2:data_1_6b_20260807';

  if v_count <> 19 then
    raise exception 'DATA-1.6B expected 19 assigned Registry rows, got %', v_count;
  end if;

  select count(*) into v_unsafe
  from public.source_policy_registry
  where policy_version = 'source_registry_v2:data_1_6b_20260807'
    and (
      authorization_status = 'authorized_partner'
      or acquisition_mode in ('authorized_detail_feed', 'partner_feed')
      or display_policy = 'partner_content'
      or detail_fetch_policy = 'allowed_bounded'
      or machine_gate in ('authorized_detail_feed', 'partner_feed')
      or display_gate <> 'hidden'
    );

  if v_unsafe <> 0 then
    raise exception 'DATA-1.6B safety invariant violated: % activating rows detected', v_unsafe;
  end if;

  if not exists (
    select 1
    from public.source_policy_registry
    where source_domain = 'prestigeimmo.ma'
      and authorization_status = 'prohibited'
      and acquisition_mode = 'blocked'
      and detail_fetch_policy = 'prohibited'
      and content_reuse_policy = 'prohibited'
      and display_policy = 'blocked'
      and machine_gate = 'blocked_invalid_no_bypass'
      and ingestion_gate = 'blocked'
      and display_gate = 'hidden'
  ) then
    raise exception 'DATA-1.6B restrictive-source invariant missing for prestigeimmo.ma';
  end if;
end
$$;

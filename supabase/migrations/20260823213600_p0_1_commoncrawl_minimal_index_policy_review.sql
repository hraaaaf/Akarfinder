-- AKARFINDER-INCIDENT-INGESTION-P0.1 — human-reviewed minimal external indexing policy.
-- Decision recorded 2026-08-23: Common Crawl may be used only as a third-party URL index.
-- This migration authorizes canonical URL/domain/provenance discovery only. It does NOT grant
-- source-site network requests, WARC/page retrieval, source-content reuse, rich-content ingestion,
-- or republication rights. Existing detail-fetch/content-reuse/authorization restrictions remain.
-- Fixed timestamps are deliberate: replaying this migration later must not mint a fresh review.

do $$
declare
  v_reviewed_at constant timestamptz := '2026-08-23T21:36:00Z';
  v_next_review_at constant timestamptz := '2026-09-06T21:36:00Z';
  v_updated integer;
  v_targets constant text[] := array[
    '1immo.ma',
    'agenz.ma',
    'avito.ma',
    'barnes-marrakech.com',
    'kawtarimmobilier.com',
    'marrakechrealty.com',
    'masaken.ma',
    'mouldar.com',
    'mubawab.ma',
    'soukimmobilier.com'
  ]::text[];
begin
  update public.source_policy_registry
  set
    review_status = 'current',
    reviewed_at = v_reviewed_at,
    next_review_at = v_next_review_at,
    policy_effective_at = v_reviewed_at,
    policy_expires_at = v_next_review_at,
    evidence_observed_at = v_reviewed_at,
    policy_version = 'source_registry_v2:p0_1_minimal_external_index_20260823',
    discovery_policy = 'public_index_only',
    acquisition_mode = 'public_index_internal_only',
    no_bypass_required = true,
    display_policy = case
      when source_domain = 'barnes-marrakech.com' then 'internal_signal_only'
      else 'canonical_link_only'
    end,
    machine_gate = case
      when source_domain = 'barnes-marrakech.com' then 'internal_signal_only'
      else 'canonical_link_only'
    end,
    ingestion_gate = case
      when source_domain = 'barnes-marrakech.com' then 'internal_signal_only'
      else 'canonical_link_only'
    end,
    display_gate = case
      when source_domain = 'barnes-marrakech.com' then 'hidden'
      else 'external_tail_link_only'
    end,
    evidence_summary = case
      when position('P0.1 minimal external-index review 2026-08-23' in evidence_summary) > 0 then evidence_summary
      else evidence_summary || ' P0.1 minimal external-index review 2026-08-23: Common Crawl is authorized only as a third-party URL index for canonical URL, source domain and provenance. No source-network request, source-content reuse or rich-content ingestion is authorized.'
    end,
    recommended_action = case
      when source_domain = 'barnes-marrakech.com' then
        'Minimal third-party URL indexing may remain internal. Public canonical-link display stays hidden because the recorded legal evidence restricts hyperlinking; source fetch and content reuse remain prohibited.'
      else
        'Canonical-link indexing only from third-party/public indexes. Keep source-network fetching, content reuse, rich-content ingestion and republication disabled unless separately authorized.'
    end,
    updated_at = v_reviewed_at
  where source_domain = any(v_targets);

  get diagnostics v_updated = row_count;
  if v_updated <> 10 then
    raise exception 'P0.1 policy review expected 10 target rows, updated %', v_updated;
  end if;

  if exists (
    select 1
    from unnest(v_targets) d(source_domain)
    left join public.source_policy_registry r using(source_domain)
    where r.source_domain is null
       or r.review_status <> 'current'
       or r.next_review_at <> v_next_review_at
       or r.no_bypass_required is distinct from true
       or not ('commoncrawl' = any(r.allowed_discovery_channels))
       or r.acquisition_mode <> 'public_index_internal_only'
       or r.policy_hash is null
       or btrim(r.policy_hash) = ''
  ) then
    raise exception 'P0.1 minimal external-index policy integrity failed';
  end if;

  if exists (
    select 1
    from public.source_policy_registry
    where source_domain = any(v_targets)
      and (
        content_reuse_policy = 'authorized'
        or detail_fetch_policy = 'allowed_bounded'
        or authorization_status = 'authorized_partner'
        or acquisition_mode in ('authorized_detail_feed', 'partner_feed')
      )
  ) then
    raise exception 'P0.1 review must not grant content/detail acquisition rights';
  end if;

  if (
    select count(*)
    from public.source_policy_registry
    where source_domain = any(v_targets)
      and source_domain <> 'barnes-marrakech.com'
      and display_policy = 'canonical_link_only'
      and machine_gate = 'canonical_link_only'
      and ingestion_gate = 'canonical_link_only'
      and display_gate = 'external_tail_link_only'
  ) <> 9 then
    raise exception 'P0.1 expected exactly 9 public canonical-link-only sources';
  end if;

  if not exists (
    select 1
    from public.source_policy_registry
    where source_domain = 'barnes-marrakech.com'
      and display_policy = 'internal_signal_only'
      and machine_gate = 'internal_signal_only'
      and ingestion_gate = 'internal_signal_only'
      and display_gate = 'hidden'
      and authorization_status = 'prohibited'
      and content_reuse_policy = 'prohibited'
      and detail_fetch_policy = 'permission_required'
  ) then
    raise exception 'P0.1 BARNES restrictive-link/content invariant was weakened';
  end if;

  if not exists (
    select 1
    from public.source_policy_registry
    where source_domain = 'mubawab.ma'
      and authorization_status = 'prohibited'
      and content_reuse_policy = 'prohibited'
      and detail_fetch_policy = 'permission_required'
  ) then
    raise exception 'P0.1 Mubawab content restriction invariant was weakened';
  end if;
end
$$;

select public.p0_1_mass_index_source_registry_report();

-- AKARFINDER P0.1 — bounded minimal external-index policy revalidation.
-- Owner/operator revalidation recorded 2026-09-07 after the mandatory 14-day review point.
-- This preserves the exact P0.1 boundary from 2026-08-23: third-party URL-index metadata only.
-- It does NOT grant source-site requests, WARC/page retrieval, source-content reuse,
-- rich-content ingestion, detail fetching, partnership rights, or republication rights.
-- Fixed timestamps are deliberate so replay cannot mint a fresh review.

do $$
declare
  v_reviewed_at constant timestamptz := '2026-09-07T09:36:00Z';
  v_next_review_at constant timestamptz := '2026-09-21T09:36:00Z';
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
  -- Refuse to revalidate if any of the original P0.1 integrity facts drifted.
  if exists (
    select 1
    from unnest(v_targets) d(source_domain)
    left join public.source_policy_registry r using(source_domain)
    where r.source_domain is null
       or r.no_bypass_required is distinct from true
       or not ('public_index' = any(r.allowed_discovery_channels))
       or not ('commoncrawl' = any(r.allowed_discovery_channels))
       or r.acquisition_mode <> 'public_index_internal_only'
       or r.policy_hash is null
       or btrim(r.policy_hash) = ''
  ) then
    raise exception 'P0.1 revalidation refused: source-registry integrity drift';
  end if;

  -- Never let this review manufacture source-content/detail rights.
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
    raise exception 'P0.1 revalidation refused: content/detail rights drift';
  end if;

  -- Preserve explicit restrictive exceptions before touching timestamps.
  if not exists (
    select 1 from public.source_policy_registry
    where source_domain='barnes-marrakech.com'
      and authorization_status='prohibited'
      and content_reuse_policy='prohibited'
      and detail_fetch_policy='permission_required'
      and display_policy='internal_signal_only'
      and display_gate='hidden'
  ) then
    raise exception 'P0.1 revalidation refused: BARNES restrictive invariant drift';
  end if;

  if not exists (
    select 1 from public.source_policy_registry
    where source_domain='mubawab.ma'
      and authorization_status='prohibited'
      and content_reuse_policy='prohibited'
      and detail_fetch_policy='permission_required'
  ) then
    raise exception 'P0.1 revalidation refused: Mubawab restrictive invariant drift';
  end if;

  update public.source_policy_registry
  set
    review_status = 'current',
    reviewed_at = v_reviewed_at,
    next_review_at = v_next_review_at,
    policy_effective_at = v_reviewed_at,
    policy_expires_at = v_next_review_at,
    policy_version = 'source_registry_v2:p0_1_minimal_external_index_20260907',
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
      when position('P0.1 minimal external-index revalidation 2026-09-07' in evidence_summary) > 0 then evidence_summary
      else evidence_summary || ' P0.1 minimal external-index revalidation 2026-09-07: owner/operator reaffirmed the existing third-party URL-index-only boundary. No source-network, content reuse, rich-content ingestion, detail-fetch or republication right was added.'
    end,
    updated_at = v_reviewed_at
  where source_domain = any(v_targets);

  get diagnostics v_updated = row_count;
  if v_updated <> 10 then
    raise exception 'P0.1 revalidation expected 10 rows, updated %', v_updated;
  end if;

  if (
    select count(*)
    from public.source_policy_registry
    where source_domain = any(v_targets)
      and source_domain <> 'barnes-marrakech.com'
      and display_policy='canonical_link_only'
      and machine_gate='canonical_link_only'
      and ingestion_gate='canonical_link_only'
      and display_gate='external_tail_link_only'
  ) <> 9 then
    raise exception 'P0.1 revalidation expected exactly 9 canonical-link gates';
  end if;
end
$$;

select public.p0_1_mass_index_source_registry_report();

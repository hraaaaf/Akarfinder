-- ODM-SHADOW-SIGNAL-VALIDATION-01
-- Shadow-only compatibility fix for the active A-D quality taxonomy.
--
-- Safety:
--   * public canary routing remains controlled by existing feature flags;
--   * D / rejected / unscored representations remain ineligible;
--   * non-real-estate rows remain ineligible;
--   * no source, freshness or canonical URL gate is relaxed;
--   * the update is deterministic and reversible by re-running the previous
--     Q0-Q3-only functions and recomputing the three persisted policy fields.

create or replace function public.odm06_display_eligibility(
  p_canonical_url text,
  p_seed_provider text,
  p_freshness_status text,
  p_quality_tier text
) returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when nullif(btrim(p_canonical_url), '') is null then 'ineligible'
    when p_seed_provider not in ('public_sitemap','commoncrawl_cdx','serper_search') then 'ineligible'
    when p_freshness_status not in ('seed_only','fresh_confirmed') then 'ineligible'
    when p_quality_tier in ('Q3_intelligence_ready','Q2_comparable','A','B') then 'eligible_primary'
    when p_quality_tier in ('Q1_contextual','Q0_link_only','C') then 'eligible_secondary'
    else 'ineligible'
  end;
$$;

create or replace function public.odm06_display_eligibility_reason(
  p_canonical_url text,
  p_seed_provider text,
  p_freshness_status text,
  p_quality_tier text
) returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when nullif(btrim(p_canonical_url), '') is null then 'missing_canonical_url'
    when p_seed_provider not in ('public_sitemap','commoncrawl_cdx','serper_search') then 'unsupported_provider'
    when p_freshness_status not in ('seed_only','fresh_confirmed') then 'unsupported_freshness_state'
    when p_quality_tier in ('Q3_intelligence_ready','A') then 'intelligence_ready'
    when p_quality_tier in ('Q2_comparable','B') then 'comparable'
    when p_quality_tier in ('Q1_contextual','C') then 'contextual_only'
    when p_quality_tier = 'Q0_link_only' then 'link_only'
    when p_quality_tier in ('D','E','REJECTED','UNSCORED') then 'blocked_quality'
    else 'missing_quality_tier'
  end;
$$;

create or replace function public.odm06_ranking_quality_boost(
  p_quality_tier text,
  p_quality_score integer,
  p_freshness_status text
) returns real
language sql
immutable
set search_path = ''
as $$
  select least(0.35::real, greatest(0::real,
    case
      when p_quality_tier in ('Q3_intelligence_ready','A') then 0.25::real
      when p_quality_tier in ('Q2_comparable','B') then 0.16::real
      when p_quality_tier in ('Q1_contextual','C') then 0.06::real
      else 0::real
    end
    + case when p_freshness_status = 'fresh_confirmed' then 0.05::real else 0::real end
    + least(0.05::real, greatest(0::real, coalesce(p_quality_score, 0)::real / 200::real))
  ));
$$;

update public.thin_index_search_documents
set
  display_eligibility = case
    when vertical_classification <> 'real_estate_likely' then 'ineligible'
    else public.odm06_display_eligibility(
      canonical_url,
      seed_provider,
      freshness_status,
      quality_tier
    )
  end,
  display_eligibility_reason = case
    when vertical_classification <> 'real_estate_likely' then 'vertical_not_real_estate'
    else public.odm06_display_eligibility_reason(
      canonical_url,
      seed_provider,
      freshness_status,
      quality_tier
    )
  end,
  ranking_quality_boost = case
    when vertical_classification <> 'real_estate_likely' then 0::real
    else public.odm06_ranking_quality_boost(
      quality_tier,
      quality_score,
      freshness_status
    )
  end,
  ranking_policy_version = 'odm_shadow_quality_tier_compat_v1'
where
  display_eligibility is distinct from case
    when vertical_classification <> 'real_estate_likely' then 'ineligible'
    else public.odm06_display_eligibility(canonical_url, seed_provider, freshness_status, quality_tier)
  end
  or display_eligibility_reason is distinct from case
    when vertical_classification <> 'real_estate_likely' then 'vertical_not_real_estate'
    else public.odm06_display_eligibility_reason(canonical_url, seed_provider, freshness_status, quality_tier)
  end
  or ranking_quality_boost is distinct from case
    when vertical_classification <> 'real_estate_likely' then 0::real
    else public.odm06_ranking_quality_boost(quality_tier, quality_score, freshness_status)
  end;

create or replace function public.odm_shadow_signal_validation_report_v1()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'version', 'odm_shadow_signal_validation_v1',
    'generated_at', now(),
    'thin_index_rows', count(*),
    'real_estate_rows', count(*) filter (where vertical_classification = 'real_estate_likely'),
    'eligible_primary', count(*) filter (where display_eligibility = 'eligible_primary'),
    'eligible_secondary', count(*) filter (where display_eligibility = 'eligible_secondary'),
    'blocked_quality', count(*) filter (where display_eligibility_reason = 'blocked_quality'),
    'vertical_not_real_estate', count(*) filter (where display_eligibility_reason = 'vertical_not_real_estate'),
    'missing_quality_tier', count(*) filter (where display_eligibility_reason = 'missing_quality_tier'),
    'gates', jsonb_build_object(
      'shadow_has_eligible_rows', count(*) filter (where display_eligibility in ('eligible_primary','eligible_secondary')) > 0,
      'no_quality_d_admission', count(*) filter (
        where quality_tier in ('D','E','REJECTED','UNSCORED')
          and display_eligibility in ('eligible_primary','eligible_secondary')
      ) = 0,
      'no_non_real_estate_admission', count(*) filter (
        where vertical_classification <> 'real_estate_likely'
          and display_eligibility in ('eligible_primary','eligible_secondary')
      ) = 0,
      'no_missing_quality_tier_for_a_to_d', count(*) filter (
        where quality_tier in ('A','B','C','D')
          and display_eligibility_reason = 'missing_quality_tier'
      ) = 0
    )
  )
  from public.thin_index_search_documents;
$$;

revoke all on function public.odm_shadow_signal_validation_report_v1() from public, anon, authenticated;
grant execute on function public.odm_shadow_signal_validation_report_v1() to service_role;

comment on function public.odm_shadow_signal_validation_report_v1() is
  'Service-role-only ODM Shadow quality-tier compatibility and admission-gate report.';

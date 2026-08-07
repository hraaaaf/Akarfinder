-- ODM document-kind URL evidence Shadow V2
-- Read-only audit. Run after the corresponding migration is present on a
-- development database. Never use raw Thin Index volume as the success metric.

-- 1. Funnel by source.
select *
from public.odm_document_kind_url_evidence_shadow_report_v2();

-- 2. Evidence codes and publication/freshness split.
select
  source_domain,
  url_evidence_code,
  freshness_status,
  display_eligibility,
  count(*) filter (where is_canonical_candidate) as distinct_candidates,
  count(*) filter (where shadow_public_candidate) as public_candidates
from public.odm_document_kind_url_evidence_shadow_v2
group by
  source_domain,
  url_evidence_code,
  freshness_status,
  display_eligibility
order by source_domain, url_evidence_code, freshness_status, display_eligibility;

-- 3. Deterministic review corpus: 25 canonical candidates per source.
-- Reviewers must label each row LISTING / CATEGORY / AMBIGUOUS and record the
-- evidence. This query itself never changes classifications.
with sampled as (
  select
    s.*,
    row_number() over (
      partition by s.source_domain
      order by
        case s.freshness_status when 'fresh_confirmed' then 0 else 1 end,
        md5(s.seed_id::text)
    ) as review_rank
  from public.odm_document_kind_url_evidence_shadow_v2 s
  where s.is_canonical_candidate
)
select
  source_domain,
  seed_provider,
  freshness_status,
  canonical_url,
  title,
  snippet,
  url_evidence_code,
  display_eligibility,
  display_eligibility_reason,
  shadow_document_kind,
  shadow_document_kind_confidence
from sampled
where review_rank <= 25
order by source_domain, review_rank;

-- 4. Duplicate URL variants retained in Thin Index.
select
  source_domain,
  normalized_url,
  count(*) as representations,
  array_agg(seed_provider order by seed_provider) as providers,
  array_agg(canonical_url order by canonical_url) as urls
from public.odm_document_kind_url_evidence_shadow_v2
where not is_canonical_candidate
   or normalized_url in (
     select normalized_url
     from public.odm_document_kind_url_evidence_shadow_v2
     group by source_domain, normalized_url
     having count(*) > 1
   )
group by source_domain, normalized_url
having count(*) > 1
order by representations desc, source_domain, normalized_url
limit 200;

-- 5. Guard: internal-signal sources must never appear.
select count(*) as forbidden_internal_signal_rows
from public.odm_document_kind_url_evidence_shadow_v2 s
join public.source_policy_registry r
  on r.source_domain = s.source_domain
where r.display_policy = 'internal_signal_only';

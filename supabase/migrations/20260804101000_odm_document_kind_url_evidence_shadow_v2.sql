-- DATA P0 — URL-evidence document-kind shadow V2
--
-- Purpose:
--   Identify strong listing-detail URL patterns for canonical-link-only sources
--   without changing the active document_kind, display eligibility or public read model.
--
-- Safety:
--   - read-only shadow view and report function;
--   - no row updates;
--   - source_policy_registry remains authoritative;
--   - internal-signal-only sources are never candidates;
--   - deterministic assertions prevent broad/category patterns.

create or replace function public.odm_document_kind_url_evidence_v2(
  p_source_domain text,
  p_canonical_url text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when lower(coalesce(p_source_domain, '')) = 'daragadir.com'
      and lower(coalesce(p_canonical_url, '')) ~
        '^https?://(www\.)?daragadir\.com/annonces/annonces-immobilieres/(location|vente|location-de-vacances)/.+/[^/?#]+\.html([?#].*)?$'
      then 'daragadir_detail_html_v2'

    when lower(coalesce(p_source_domain, '')) = 'promoimmomarrakech.com'
      and lower(coalesce(p_canonical_url, '')) ~
        '^https?://(www\.)?promoimmomarrakech\.com/produit/[a-z]{2,4}-[0-9]+/[^/?#]+\.html([?#].*)?$'
      then 'promo_product_reference_v2'

    when lower(coalesce(p_source_domain, '')) = 'aykana.ma'
      and lower(coalesce(p_canonical_url, '')) ~
        '^https?://(www\.)?aykana\.ma/property/[^/?#]*ref-[0-9]+/?([?#].*)?$'
      then 'aykana_property_reference_v2'

    when lower(coalesce(p_source_domain, '')) = 'limmobiliersansfrontieres.com'
      and lower(coalesce(p_canonical_url, '')) ~
        '^https?://(www\.)?limmobiliersansfrontieres\.com/property/[^/?#]+/?([?#].*)?$'
      and lower(coalesce(p_canonical_url, '')) ~
        '(appartement|studio|villa|terrain|duplex|bureau|local|riad|maison)'
      and lower(coalesce(p_canonical_url, '')) ~
        '(a-louer|a-vendre|location|vente|louer|vendre|rent|sale)'
      and lower(coalesce(p_canonical_url, '')) !~
        '/property/(projet|programme|studios|appartements|villas|terrains)-'
      then 'lisf_property_transaction_v2'

    else null
  end;
$$;

create or replace view public.odm_document_kind_url_evidence_shadow_v2
with (security_invoker = true)
as
with evidence_rows as (
  select
    d.seed_id,
    d.source_domain,
    d.seed_provider,
    d.canonical_url,
    lower(regexp_replace(d.canonical_url, '[?#].*$', '')) as normalized_url,
    d.freshness_status,
    d.updated_at,
    d.title,
    d.snippet,
    d.vertical_classification,
    d.document_kind as current_document_kind,
    d.document_kind_confidence as current_document_kind_confidence,
    d.document_kind_reason as current_document_kind_reason,
    d.display_eligibility,
    d.display_eligibility_reason,
    r.discovery_policy,
    r.detail_fetch_policy,
    r.content_reuse_policy,
    r.display_policy,
    r.legal_review_required,
    public.odm_document_kind_url_evidence_v2(
      d.source_domain,
      d.canonical_url
    ) as url_evidence_code
  from public.thin_index_search_documents d
  join public.source_policy_registry r
    on r.source_domain = d.source_domain
  where d.vertical_classification = 'real_estate_likely'
    and coalesce(d.document_kind, '') not in ('CATEGORY', 'LISTING')
    and r.display_policy = 'canonical_link_only'
), ranked as (
  select
    e.*,
    row_number() over (
      partition by e.source_domain, e.normalized_url
      order by
        case e.freshness_status when 'fresh_confirmed' then 0 else 1 end,
        case e.seed_provider
          when 'serper_search' then 0
          when 'public_sitemap' then 1
          when 'commoncrawl_cdx' then 2
          else 3
        end,
        e.updated_at desc nulls last,
        e.seed_id desc
    ) as canonical_rank
  from evidence_rows e
  where e.url_evidence_code is not null
)
select
  r.*,
  (r.canonical_rank = 1) as is_canonical_candidate,
  (
    r.canonical_rank = 1
    and r.display_eligibility in ('eligible_primary', 'eligible_secondary')
  ) as shadow_public_candidate,
  'LISTING'::text as shadow_document_kind,
  case
    when r.freshness_status = 'fresh_confirmed' then 'HIGH'
    else 'MEDIUM'
  end::text as shadow_document_kind_confidence,
  'policy_gated_url_evidence_shadow_v2'::text as shadow_document_kind_reason
from ranked r;

create or replace function public.odm_document_kind_url_evidence_shadow_report_v2()
returns table (
  source_domain text,
  evidence_rows bigint,
  distinct_url_candidates bigint,
  duplicate_rows bigint,
  shadow_public_candidates bigint,
  fresh_confirmed_candidates bigint,
  seed_only_candidates bigint,
  quality_blocked_candidates bigint
)
language sql
stable
set search_path = ''
as $$
  select
    s.source_domain,
    count(*)::bigint as evidence_rows,
    count(*) filter (where s.is_canonical_candidate)::bigint as distinct_url_candidates,
    count(*) filter (where not s.is_canonical_candidate)::bigint as duplicate_rows,
    count(*) filter (where s.shadow_public_candidate)::bigint as shadow_public_candidates,
    count(*) filter (
      where s.is_canonical_candidate
        and s.freshness_status = 'fresh_confirmed'
    )::bigint as fresh_confirmed_candidates,
    count(*) filter (
      where s.is_canonical_candidate
        and s.freshness_status = 'seed_only'
    )::bigint as seed_only_candidates,
    count(*) filter (
      where s.is_canonical_candidate
        and s.display_eligibility = 'ineligible'
    )::bigint as quality_blocked_candidates
  from public.odm_document_kind_url_evidence_shadow_v2 s
  group by s.source_domain
  order by shadow_public_candidates desc, s.source_domain;
$$;

revoke all on public.odm_document_kind_url_evidence_shadow_v2
  from public, anon, authenticated;
grant select on public.odm_document_kind_url_evidence_shadow_v2
  to service_role;

revoke all on function public.odm_document_kind_url_evidence_v2(text, text)
  from public, anon, authenticated;
grant execute on function public.odm_document_kind_url_evidence_v2(text, text)
  to service_role;

revoke all on function public.odm_document_kind_url_evidence_shadow_report_v2()
  from public, anon, authenticated;
grant execute on function public.odm_document_kind_url_evidence_shadow_report_v2()
  to service_role;

-- Deterministic migration assertions. These validate structure only and do not
-- access the network or mutate application rows.
do $$
begin
  if public.odm_document_kind_url_evidence_v2(
    'daragadir.com',
    'https://daragadir.com/annonces/annonces-immobilieres/location/appartements-a-louer-a-agadir/studio-a-louer-a-agadir-5000-dh.html'
  ) is distinct from 'daragadir_detail_html_v2' then
    raise exception 'DarAgadir detail URL evidence assertion failed';
  end if;

  if public.odm_document_kind_url_evidence_v2(
    'daragadir.com',
    'https://daragadir.com/annonces/annonces-immobilieres/location/appartements-a-louer-a-agadir/'
  ) is not null then
    raise exception 'DarAgadir category URL must not be listing evidence';
  end if;

  if public.odm_document_kind_url_evidence_v2(
    'promoimmomarrakech.com',
    'https://promoimmomarrakech.com/produit/trv-200/vente-terrain-marrakech.html'
  ) is distinct from 'promo_product_reference_v2' then
    raise exception 'Promo Immo detail URL evidence assertion failed';
  end if;

  if public.odm_document_kind_url_evidence_v2(
    'aykana.ma',
    'https://aykana.ma/property/location-appartement-rabat-souissi-ref-4357'
  ) is distinct from 'aykana_property_reference_v2' then
    raise exception 'Aykana detail URL evidence assertion failed';
  end if;

  if public.odm_document_kind_url_evidence_v2(
    'limmobiliersansfrontieres.com',
    'https://limmobiliersansfrontieres.com/property/appartement-meuble-a-louer-route-de-casablanca'
  ) is distinct from 'lisf_property_transaction_v2' then
    raise exception 'LISF detail URL evidence assertion failed';
  end if;

  if public.odm_document_kind_url_evidence_v2(
    'limmobiliersansfrontieres.com',
    'https://limmobiliersansfrontieres.com/property/projet-neuf-studios-a-vendre-targa-marrakech'
  ) is not null then
    raise exception 'LISF project collection URL must not be listing evidence';
  end if;

  if public.odm_document_kind_url_evidence_v2(
    'sarouty.ma',
    'https://sarouty.ma/plp/acheter/appartement-a-vendre-casablanca-866387.html'
  ) is not null then
    raise exception 'Internal-signal source must not be URL evidence candidate';
  end if;
end;
$$;

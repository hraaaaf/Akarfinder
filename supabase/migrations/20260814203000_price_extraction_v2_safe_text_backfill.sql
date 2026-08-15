-- PRICE-EXTRACTION-V2 — strict source-aware recovery from already observed title/snippet text.
-- No network fetch, no anti-bot bypass, no inference from neighboring/category pages.
-- Only fills normalized_price_mad when currently NULL.
-- Guardrails:
--   * listing-shaped URLs only
--   * source-specific price labels/title formats
--   * exclude per-m² price contexts
--   * exclude category/search URLs
--   * exclude ambiguous low sale prices and sub-1000 rent prices (often daily cadence)
--   * normalize trailing .00/,00 decimals before digit parsing

with base as (
  select
    seed_id,
    source_domain,
    canonical_url,
    normalized_intent,
    lower(coalesce(title, '')) as t,
    lower(coalesce(snippet, '')) as s
  from public.thin_index_search_documents
  where document_kind = 'LISTING'
    and display_eligibility in ('eligible_primary', 'eligible_secondary')
    and seed_provider in ('public_sitemap', 'commoncrawl_cdx', 'serper_search')
    and freshness_status in ('seed_only', 'fresh_confirmed')
    and normalized_price_mad is null
), raw as (
  select
    b.*,
    case
      when source_domain = 'agenz.ma'
        and canonical_url ~ '/[0-9]+$'
      then (regexp_match(
        t,
        '(?:à vendre|a vendre|à louer|a louer)\s+([0-9][0-9 .]{2,18})\s*(?:dh|dhs|mad|dirhams?)'
      ))[1]

      when source_domain = '1immo.ma'
        and canonical_url ~ '-[0-9]+$'
        and normalized_intent in ('rent', 'location', 'buy', 'sale', 'new')
        and s !~ '(?:dh|dhs|mad|dirhams?)\s*(?:/|par|le)\s*m[²2]'
      then (regexp_match(
        s,
        '(?:prix affiche|prix affiché|prix de location|prix)\s*:?\s*([0-9][0-9 .]{2,18})\s*(?:dh|dhs|mad|dirhams?)'
      ))[1]

      when source_domain = 'masaken.ma'
        and canonical_url ~ '/[0-9]+$'
        and normalized_intent in ('rent', 'location', 'buy', 'sale', 'new')
        and s !~ '(?:dh|dhs|mad|dirhams?)\s*/\s*m[²2]'
      then (regexp_match(
        t,
        'm[²2]\s+([0-9][0-9 .]{2,18})\s*(?:dh|dhs|mad|dirhams?)(?:\s+masaken\.ma)?$'
      ))[1]

      when source_domain = 'mouldar.com'
        and canonical_url ~ '/[0-9a-f]{8}$'
        and normalized_intent in ('rent', 'location', 'buy', 'sale', 'new')
        and s !~ '(?:dh|dhs|mad|dirhams?)\s*(?:/|par|le)\s*m[²2]'
      then (regexp_match(
        s,
        '(?:prix de vente|prix de location|prix|loyer mensuel|loyer est fixé à|loyer est fixe a|loyer|rent)\s*(?:est|:|-)?\s*([0-9][0-9 .]{2,18})\s*(?:dh|dhs|mad|dirhams?)'
      ))[1]

      when source_domain = 'mubawab.ma'
        and canonical_url ~ '/a/[0-9]+/'
        and s !~ '(?:dh|dhs|mad|dirhams?)\s*(?:/|par|le)\s*m[²2]'
        and normalized_intent in ('buy', 'sale', 'new')
      then (regexp_match(
        s,
        '(?:prix de vente|prix|price)\s*:?\s*([0-9][0-9 .]{2,18})\s*(?:dh|dhs|mad|dirhams?)'
      ))[1]

      when source_domain = 'mubawab.ma'
        and canonical_url ~ '/a/[0-9]+/'
        and s !~ '(?:dh|dhs|mad|dirhams?)\s*(?:/|par|le)\s*m[²2]'
        and normalized_intent in ('rent', 'location')
      then (regexp_match(
        s,
        '(?:loyer|rent|prix|price)\s*:?\s*([0-9][0-9 .]{2,18})\s*(?:dh|dhs|mad|dirhams?)'
      ))[1]

      else null
    end as raw_amount
  from base b
), parsed as (
  select
    seed_id,
    normalized_intent,
    nullif(
      regexp_replace(
        regexp_replace(btrim(raw_amount), '([.,])00$', ''),
        '[^0-9]',
        '',
        'g'
      ),
      ''
    )::numeric as amount
  from raw
  where raw_amount is not null
), safe as (
  select seed_id, amount
  from parsed
  where amount > 0
    and amount <= 500000000
    and not (normalized_intent in ('buy', 'sale', 'new') and amount < 10000)
    and not (normalized_intent in ('rent', 'location') and amount < 1000)
)
update public.thin_index_search_documents d
set normalized_price_mad = safe.amount
from safe
where d.seed_id = safe.seed_id
  and d.normalized_price_mad is null;

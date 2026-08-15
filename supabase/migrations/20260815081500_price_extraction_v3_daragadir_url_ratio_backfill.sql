-- SEARCH Price Extraction v3 — DarAgadir URL-ratio backfill.
-- Canonical replay of the production migration already applied on 2026-08-15.
-- Fills normalized_price_mad only when NULL and only when the same public listing URL contains:
--   * an explicit DH/MAD amount,
--   * an explicit surface,
--   * a known sale/rent intent,
--   * no short-stay cadence signal,
--   * a plausible amount/surface ratio.

with candidates as (
  select
    seed_id,
    canonical_url,
    normalized_intent,
    case
      when normalized_intent in ('buy','sale','new') then 'sale'
      when normalized_intent in ('rent','location') then 'rent'
      when lower(canonical_url) like '%/vente/%' or lower(canonical_url) like '%-a-vendre-%' then 'sale'
      when lower(canonical_url) like '%/location/%' or lower(canonical_url) like '%-a-louer-%' then 'rent'
      else null
    end as inferred_intent,
    regexp_match(lower(canonical_url), '(?:-|^)([0-9]{1,3}(?:-[0-9]{3})+|[0-9]{4,9})-(?:dh|dhs|mad)(?:\.|-|$)') as price_match,
    regexp_match(lower(canonical_url), '([0-9]{2,5})-m(?:2|%c2%b2|²)') as surface_match
  from public.thin_index_search_documents
  where document_kind = 'LISTING'
    and display_eligibility in ('eligible_primary','eligible_secondary')
    and source_domain = 'daragadir.com'
    and normalized_price_mad is null
    and lower(canonical_url) not like '%location-de-vacances%'
    and lower(canonical_url) not like '%par-jour%'
    and lower(canonical_url) not like '%journalier%'
    and lower(canonical_url) not like '%quotidien%'
    and lower(canonical_url) not like '%nuit%'
), parsed as (
  select
    seed_id,
    inferred_intent,
    regexp_replace(price_match[1], '-', '', 'g')::numeric as amount,
    surface_match[1]::numeric as surface
  from candidates
  where price_match is not null
    and surface_match is not null
    and inferred_intent is not null
), safe as (
  select seed_id, amount
  from parsed
  where surface between 15 and 20000
    and amount > 0
    and amount <= 500000000
    and (
      (inferred_intent = 'sale' and amount / surface between 2000 and 50000)
      or
      (inferred_intent = 'rent' and amount / surface between 5 and 500)
    )
)
update public.thin_index_search_documents d
set normalized_price_mad = safe.amount
from safe
where d.seed_id = safe.seed_id
  and d.normalized_price_mad is null;

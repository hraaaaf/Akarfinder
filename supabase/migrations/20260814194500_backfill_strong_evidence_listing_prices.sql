-- SEARCH-PRICE-RECOVERY-1
-- Restore only missing Thin Index prices when an exact active listing-source URL
-- maps to one and only one canonical positive price, and that exact amount is
-- explicitly present in the listing title together with a MAD/DH/dirham marker.
-- Existing Thin Index prices are never overwritten.

with evidence as (
  select tid.seed_id, pl.price_mad
  from public.property_listings pl
  join public.listing_sources ls
    on ls.property_listing_id = pl.id
   and ls.is_active
  join public.thin_index_search_documents tid
    on tid.document_kind = 'LISTING'
   and lower(tid.canonical_url) = lower(coalesce(nullif(ls.listing_url, ''), nullif(ls.source_url, '')))
  where pl.price_mad > 0
    and tid.normalized_price_mad is null
    and position(
      regexp_replace(pl.price_mad::text, '[^0-9]', '', 'g')
      in regexp_replace(lower(pl.title), '[^0-9]', '', 'g')
    ) > 0
    and lower(pl.title) ~ '(^|[^a-z])(dh|mad|dirham|dirhams)([^a-z]|$)'
), safe as (
  select seed_id, min(price_mad) as price_mad
  from evidence
  group by seed_id
  having count(distinct price_mad) = 1
)
update public.thin_index_search_documents tid
set normalized_price_mad = safe.price_mad
from safe
where tid.seed_id = safe.seed_id
  and tid.normalized_price_mad is null;

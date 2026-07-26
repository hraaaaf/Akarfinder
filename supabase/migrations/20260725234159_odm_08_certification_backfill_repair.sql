-- ODM-08 CERTIFICATION BACKFILL REPAIR
-- Forces deterministic recomputation for rows created before ODM-05/ODM-06 triggers existed.

update public.thin_index_search_documents
set
  normalized_city = normalized_city,
  normalized_property_type = normalized_property_type,
  normalized_intent = normalized_intent,
  normalized_price_mad = normalized_price_mad,
  normalized_surface_m2 = normalized_surface_m2,
  normalized_price_m2 = normalized_price_m2,
  title = title,
  snippet = snippet;

update public.thin_index_search_documents
set
  quality_tier = quality_tier,
  quality_score = quality_score,
  normalized_city = normalized_city;

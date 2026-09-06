-- Mubawab canonical hygiene v1
-- Metadata-only quarantine. Do not change is_active, compliance_status, prices or property links.
WITH classified AS (
  SELECT
    id,
    CASE
      WHEN lower(coalesce(listing_url, source_url, '')) ~ 'mubawab\.ma/[a-z]{2}/(a|pa)/[0-9]+' THEN 'detail'
      WHEN lower(coalesce(listing_url, source_url, '')) ~ 'mubawab\.ma/[a-z]{2}/p/[0-9]+' THEN 'project_page'
      WHEN lower(coalesce(listing_url, source_url, '')) ~ 'mubawab\.ma/[a-z]{2}/is/' THEN 'is_search'
      WHEN lower(coalesce(listing_url, source_url, '')) ~ 'mubawab\.ma/[a-z]{2}/(cc|ct|cd|sd)/' THEN 'safe_shard'
      WHEN lower(coalesce(listing_url, source_url, '')) ~ 'mubawab\.ma/(?:[a-z]{2}/)?(t|st|di|tw|scrp)/' THEN 'legacy_search_surface'
      ELSE 'other_nonindividual'
    END AS kind
  FROM public.listing_sources
  WHERE lower(source_name) = 'mubawab'
     OR lower(coalesce(listing_url, source_url, '')) LIKE '%mubawab.ma%'
)
UPDATE public.listing_sources AS ls
SET metadata_json = coalesce(ls.metadata_json, '{}'::jsonb) || jsonb_build_object(
  'canonical_hygiene_v1', jsonb_build_object(
    'version', 1,
    'kind', c.kind,
    'canonical_eligible', c.kind = 'detail',
    'reason', CASE c.kind
      WHEN 'detail' THEN 'individual_listing_detail_url'
      WHEN 'project_page' THEN 'project_page_not_individual_listing'
      WHEN 'is_search' THEN 'search_surface_not_individual_listing'
      WHEN 'safe_shard' THEN 'aggregate_safe_shard_not_individual_listing'
      WHEN 'legacy_search_surface' THEN 'legacy_search_surface_not_individual_listing'
      ELSE 'nonindividual_or_unclassified_surface'
    END,
    'classified_at', now()
  )
)
FROM classified AS c
WHERE ls.id = c.id;

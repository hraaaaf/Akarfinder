-- Restores ONLY the four nullable source-hygiene metadata fields
-- verified against 13 October 2026 local backup (no rows or secrets copied).
-- Applied to Supabase AkarfFnder on 8 November 2026 as recorded migration
-- akarfinder_unified_legacy_source_columns_v1.
-- canonical_eligible is a URL hygiene signal, NOT permission to publish.
BEGIN;
ALTER TABLE public.listing_sources
  ADD COLUMN IF NOT EXISTS canonical_kind text,
  ADD COLUMN IF NOT EXISTS canonical_eligible boolean,
  ADD COLUMN IF NOT EXISTS canonical_hygiene_version smallint,
  ADD COLUMN IF NOT EXISTS canonical_classified_at timestamp with time zone;
COMMENT ON COLUMN public.listing_sources.canonical_eligible
  IS 'Legacy URL hygiene indicator only; not a permission to republish an offer.';
COMMIT;

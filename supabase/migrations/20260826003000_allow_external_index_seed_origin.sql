-- Allow the dedicated link-only external index materialization provenance.
-- Existing rows remain valid; this is additive only.

alter table public.listing_sources
  drop constraint if exists listing_sources_origin_type_check;

alter table public.listing_sources
  add constraint listing_sources_origin_type_check
  check (
    origin_type is null
    or origin_type = any (array[
      'partner_api'::text,
      'partner_feed'::text,
      'first_party_user'::text,
      'persisted_openserp'::text,
      'authorized_static_page'::text,
      'legacy_import'::text,
      'external_index_seed'::text
    ])
  );

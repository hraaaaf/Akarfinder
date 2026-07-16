-- AKARFINDER-MARKET-INDEX-FOUNDATION-1
-- Objective: extend the existing listing_sources table additively so it can
--   serve as the SourceOffer concept going forward, per the compatibility-first
--   rule (docs/AKARFINDER_MARKET_INDEX_FOUNDATION.md) — no new physical
--   "source offer" table, since listing_sources already has the right grain
--   and FK shape.
-- Preconditions: listing_sources must exist (it does, 321 rows in Production).
-- Impact: adds 9 nullable columns. Every existing row gets NULL in all of
--   them — no existing value is read, changed, or reinterpreted. Existing
--   `select("*")`-based code (lib/db/supabase-listings.ts) already ignores
--   unknown keys gracefully (it destructures named fields), so this is
--   backward-compatible with zero code changes required to keep working.
-- Lock estimate: ADD COLUMN ... (nullable, no default) is a metadata-only
--   change in Postgres 11+ — no table rewrite, negligible lock duration even
--   at 321 rows (and would remain negligible at far higher row counts).
-- Re-run behavior: idempotent via IF NOT EXISTS on each column and index.
-- Rollback: see bottom of file — safe, only drops the new nullable columns,
--   never touches id/property_listing_id/source_name/listing_url/source_url/
--   is_active/first_seen_at/last_seen_at or any existing row's values in them.

alter table listing_sources
  add column if not exists source_offer_key text,
  add column if not exists origin_type text,
  add column if not exists compliance_status text,
  add column if not exists content_fingerprint text,
  add column if not exists ingestion_run_id text,
  add column if not exists displayed_price numeric,
  add column if not exists price_currency text,
  add column if not exists price_period text,
  add column if not exists price_status text;

-- Constraints added as NOT VALID-equivalent via a plain CHECK on nullable
-- columns: NULL always satisfies a CHECK, so this never fails against
-- existing rows (all NULL today), and only constrains future non-null writes.
alter table listing_sources
  drop constraint if exists listing_sources_origin_type_check;
alter table listing_sources
  add constraint listing_sources_origin_type_check check (
    origin_type is null or origin_type in (
      'partner_api', 'partner_feed', 'first_party_user',
      'persisted_openserp', 'authorized_static_page', 'legacy_import'
    )
  );

alter table listing_sources
  drop constraint if exists listing_sources_price_status_check;
alter table listing_sources
  add constraint listing_sources_price_status_check check (
    price_status is null or price_status in (
      'valid', 'not_disclosed', 'invalid', 'ambiguous', 'unavailable'
    )
  );

-- Idempotency for the new source_offer_key identity path. Partial index
-- (WHERE source_offer_key is not null) means it only ever constrains rows
-- that opt into the new field — it cannot conflict with any of the 321
-- existing rows, all of which have source_offer_key = NULL today.
create unique index if not exists listing_sources_source_offer_key_idx
on listing_sources (source_name, source_offer_key)
where source_offer_key is not null;

create index if not exists listing_sources_origin_type_idx
on listing_sources (origin_type);

-- ROLLBACK (manual, not auto-applied):
-- drop index if exists listing_sources_source_offer_key_idx;
-- drop index if exists listing_sources_origin_type_idx;
-- alter table listing_sources drop constraint if exists listing_sources_origin_type_check;
-- alter table listing_sources drop constraint if exists listing_sources_price_status_check;
-- alter table listing_sources
--   drop column if exists source_offer_key,
--   drop column if exists origin_type,
--   drop column if exists compliance_status,
--   drop column if exists content_fingerprint,
--   drop column if exists ingestion_run_id,
--   drop column if exists displayed_price,
--   drop column if exists price_currency,
--   drop column if exists price_period,
--   drop column if exists price_status;

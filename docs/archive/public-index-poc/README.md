# Public Property Index POC — archived, never applied to Production

```
status = LAB_ONLY
production_applied = false
active_migration = false
reintroduction_requires_dedicated_ODM = true
```

## What this is

`20260709193000_create_public_property_index_poc.sql` creates a standalone
`public_property_index` table (full-text search + trigram indexes) that was
built as part of the OpenSERP async public-index proof of concept documented
in `docs/PUBLIC_INDEX_ASYNC_OPENSERP_POC.md`. That POC was explicitly scoped
to the LAB only (section 14 of that doc lists "pas de modification Supabase
production" as one of its hard limits) and its own GO/NO-GO criteria
(section 15) were never triggered to promote it past the LAB.

## Why it is archived here

The file was left inside `supabase/migrations/` after the POC concluded,
which made it look like a pending Production migration to any later mission
auditing that directory (it was in fact discovered exactly this way during
`AKARFINDER-MARKET-INDEX-FOUNDATION-PROD-ACTIVATION-2`'s pending-migrations
gate). `supabase/migrations/` is reserved for migrations destined for the
Production migration chain; a LAB-only POC migration does not belong there.
It has been moved here, byte-for-byte unchanged (SHA-256 verified identical
before and after the move), to make its non-active status unambiguous.

## Facts as of the quarantine (2026-07-17)

- `public_property_index` does **not** exist in Supabase Production (verified
  read-only via PostgREST, HTTP 404 "Could not find the table").
- The only code that references the table name is the POC's own
  `lib/public-property-index/supabase-index-store.ts`, which is only
  instantiated when `PUBLIC_INDEX_POC_ENABLED=true` (see
  `lib/public-property-index/index-store.ts`); that flag is not set in
  Production, so `createPublicPropertyIndexStore()` always returns the inert
  `NoopPublicPropertyIndexStore` in Production today.
- No Search Gateway code, no public-facing route, and none of the 5 Market
  Index Foundation migrations depend on this table or this POC in any way.

## Conditions for reintroduction

Re-promoting this migration into `supabase/migrations/` (or creating a new
migration for the same table) requires a dedicated ODM that re-validates the
POC against current Production data and current Search Gateway behavior —
this archive is not a pending task and does not authorize any future
automatic reintroduction.

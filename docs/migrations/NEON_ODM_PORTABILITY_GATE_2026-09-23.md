# Neon ODM portability gate — 2026-09-23

## Goal

Prove the minimum current public ODM search dataset can be exported from the
Supabase source and restored on vanilla PostgreSQL 17 **without** silently
pulling Supabase Auth/Storage/role dependencies into the Neon DB-first cutover.

This gate is validation-only. It performs no Neon write.

## Current runtime truth

`lib/search-gateway/public-search-cursor.ts` currently calls
`search_public_representations_v2`.

The current M7 serving definition is reconstructed from repository migration
history, including:

- M7 public search policy guard;
- canonical-link-only recovery;
- MASS-INDEX M5 fresh-only serving;
- M7 policy expiry guard.

The resulting serving contract requires:

### Core public ODM data

- `public.thin_index_search_documents`
- `public.source_policy_registry`

### Commercial/business lane resolution

- `public.listing_sources`
- `public.professional_listing_ownership`
- `public.search_business_entitlements`

### Portable functions

- `public.odm04_fold_text(text)`
- `public.odm04_normalize_city(text)`
- `public.odm04_normalize_property_type(text)`
- `public.odm04_normalize_intent(text)`

The authoritative portable alias migration implements those normalizers with
built-in PostgreSQL `translate()`, so the active search normalizers do not
need the `unaccent` extension.

## Serving invariants that must survive Neon

The current v2 contract is not just a Thin Index text search. It also enforces:

- `document_kind = 'LISTING'`;
- `display_eligibility IN ('eligible_primary','eligible_secondary')`;
- approved seed providers only;
- `freshness_status = 'fresh_confirmed'`;
- non-empty canonical URL;
- source-policy authorization/display/machine/ingestion gates;
- explicit policy effective and expiry windows;
- rich-content vs canonical-link-only separation;
- price/surface filters only on the rich-content lane;
- exact canonical-URL dedupe;
- business-lane ordering from verified professional ownership/entitlements;
- source-diversity penalty;
- deterministic keyset cursor ordering.

A Neon implementation must preserve those invariants or fail closed.

## Why this is a separate gate

`professional_listing_ownership` is known to be part of the broader
professional/Auth coupling surface. The ODM serving SQL reads it, but that does
not prove its table DDL is dependency-closed on vanilla PostgreSQL.

Therefore it is unsafe to append these tables to the existing 4-table core
apply allowlist before a scratch restore proves their dependency closure.

## Probe

Workflow: `.github/workflows/neon-odm-portability-probe.yml`

The probe:

1. is manual-only;
2. requires only `SUPABASE_DATABASE_URL_DIRECT`;
3. dumps the five current ODM-serving tables with PostgreSQL 17;
4. restores them into clean vanilla PostgreSQL 17;
5. fails on any missing dependency;
6. compares source/scratch row counts and deterministic content digests;
7. never connects to Neon and never writes the source.

A failure is useful evidence. It identifies the next dependency that must be
classified as portable, adapted, or excluded.

## Cursor-secret cutover rule

When `DATABASE_PROVIDER=neon`, public cursor signing must use an explicit
`SEARCH_CURSOR_SECRET`. The historical fallback to
`SUPABASE_SERVICE_ROLE_KEY` is rejected so the Neon cutover cannot retain a
hidden Supabase credential dependency.

## Next

Run the validation-only ODM portability probe once source DB connectivity and
`SUPABASE_DATABASE_URL_DIRECT` are available. Use its first restore failure,
if any, to narrow the portable schema instead of bypassing it.

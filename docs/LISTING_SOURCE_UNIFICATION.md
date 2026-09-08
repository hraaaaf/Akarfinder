# AKARFINDER — LISTING SOURCE UNIFICATION — CANONICAL HANDOVER

## Goal

Converge public search onto one canonical listing-representation source without losing corpus coverage, while preserving current API/search behavior until parity is proven.

## Success

- one canonical read source for public search;
- no silent fallback to a second listing corpus;
- no loss of distinct listing URLs;
- compatibility for city, district, property type, intent, price, surface and pagination;
- legacy `property_listings` no longer used by public search once parity is certified;
- old physical sources are retired only after reader/writer inventory and migration proof.

## Verified state — 2026-09-08

Production Supabase project: `kusfiyimwvxblvsrhaes`.

Physical listing/search corpora verified:

- `property_listings`: 19,616 rows; rich legacy canonical listing model.
- `minimal_live_search_documents_v1`: 74,846 rows; current ODM live-search RPC source.
- `thin_index_search_documents`: 77,123 rows; thin search/normalization/quality corpus.
- `public_search_representations_v1`: VIEW, not a physical table.

Distinct URL union across the three physical corpora: **143,121**.

Observed URL overlap:

- property ↔ minimal: 9,869
- property ↔ thin: 17,819
- minimal ↔ thin: 10,590

Therefore none of the existing physical tables can be deleted or selected as the sole source without data loss.

## Current public search routing

`app/search/page.tsx` and `app/api/search/route.ts` call `routePublicSearch`.

ODM path:

`searchPublicRepresentationsWithOwner` → `search_public_representations_v2` → `minimal_live_search_documents_v1`.

Legacy path:

`searchListings` → `searchDatabase` → `queryListings` → legacy DB listing model (`property_listings` path).

The routing currently allows ODM/legacy dual paths and fallbacks. This is the architecture to retire after canonical parity.

## Production outage discovered during this lot

Vercel runtime logs on 2026-09-08 show Supabase Data API restriction:

`exceed_egress_quota`

The code currently converts some provider failures into `0/0` rows, which makes the UI appear to have zero listings. This outage is separate from the schema-unification work.

## Lot U1 — additive union surface — DONE

Migration: `20260908144500_create_listing_representations_union_v1.sql`.

Database object:

`public.listing_representations_union_v1`

Properties:

- additive only;
- `security_invoker = true`;
- one canonical row per `canonical_url`;
- source provenance retained through `source_system`, `source_record_id`, `source_copy_count`;
- no live reader switched yet;
- no source table deleted.

Verified result after migration:

- canonical rows: **143,121**
- rows backed by multiple source copies: **18,660**
- canonical source winners:
  - `minimal_live_search_documents_v1`: 64,977
  - `thin_index_search_documents`: 58,523
  - `property_listings`: 19,621
- non-null title: 24,772
- non-null city: 107,415
- non-null price: 79,146
- non-null surface: 81,608

The low title coverage proves this union surface is an inventory/consolidation layer, not yet a production-ready public-search read model.

## Migration sequence

### U2 — field contract and enrichment

Create a canonical representation contract that keeps source provenance and merges the best fields across duplicate URLs instead of simply selecting one winning source row.

Required core fields:

- canonical URL/source/provenance
- title/snippet
- city/district
- property type/transaction
- price/surface/price per m²
- quality/reliability/freshness
- publication eligibility
- timestamps

### U3 — canonical search RPC

Build a new search RPC over the canonical representation model with:

- city and district
- property type
- transaction intent
- price and surface ranges
- free text
- stable ranking
- cursor pagination
- exact total where required

### U4 — dual-read parity

Compare canonical vs current ODM/legacy paths on a fixed query matrix. Do not switch readers until coverage and behavior are proven.

### U5 — reader cutover

Switch `/api/search` and `/search` to the canonical RPC. Remove the legacy fallback only after parity.

### U6 — writer convergence

Inventory all writers to `property_listings`, `minimal_live_search_documents_v1` and `thin_index_search_documents`. Redirect or consolidate ingestion into the canonical representation model.

### U7 — retirement

Only after no live readers/writers remain:

- archive/drop obsolete tables or convert them to compatibility views;
- remove ODM/legacy dual-routing code;
- update canonical docs and CI.

## Safety rules

- no Vercel deployment without explicit user authorization;
- no destructive table drop before U7 proof;
- no public-search cutover before parity tests;
- every migration must be represented in repo and verified in Supabase.

## Resume point

Branch: `refactor/unify-public-listing-source`

Next exact: implement U2 field-level merge contract and verify canonical coverage improves without reducing the 143,121 URL union.

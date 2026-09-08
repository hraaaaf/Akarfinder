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

Database object: `public.listing_representations_union_v1`.

Verified:

- canonical rows: **143,121**
- multisource URLs: **18,660**
- canonical source winners:
  - `minimal_live_search_documents_v1`: 64,977
  - `thin_index_search_documents`: 58,523
  - `property_listings`: 19,621

No live reader was switched and no source table was deleted.

## Lot U2 — canonical field merge — DONE

Migration: `20260908150500_create_listing_representations_canonical_v1.sql`.

Database object: `public.listing_representations_canonical_v1`.

The view keeps one row per canonical URL and merges the best available field values across duplicate source records while retaining source lineage.

Verified coverage:

- rows: **143,121**
- multisource URLs: **18,660**
- title: **27,424**
- city: **107,415**
- district: **68,374**
- property type: **48,384**
- transaction type: **44,600**
- price: **79,884**
- surface: **83,997**

Compared with U1, title coverage increased from 24,772 to 27,424, price from 79,146 to 79,884 and surface from 81,608 to 83,997 without reducing the 143,121-URL corpus.

This proves field-level consolidation is preferable to selecting one source row wholesale.

## Migration sequence

### U3 — canonical search RPC — NEXT

Build a new search RPC over `listing_representations_canonical_v1` with:

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

Next exact: implement U3 canonical search RPC and verify it against a fixed query matrix before any reader cutover.

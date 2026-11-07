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

- `property_listings`: 19,616 rows
- `minimal_live_search_documents_v1`: 74,846 rows
- `thin_index_search_documents`: 77,123 rows
- `public_search_representations_v1`: VIEW

Distinct URL union: **143,121**.

Observed URL overlap:

- property ↔ minimal: 9,869
- property ↔ thin: 17,819
- minimal ↔ thin: 10,590

## Current LIVE routing

`/search` and `/api/search` still use `routePublicSearch`.

ODM: `search_public_representations_v2` → `minimal_live_search_documents_v1`.

Legacy: `searchDatabase` → legacy listing DB path.

No reader cutover has been performed in this chantier.

## Production outage discovered

Vercel runtime logs on 2026-09-08 show Supabase restriction `exceed_egress_quota`. Some current failure paths become `0/0` results. This outage is separate from source unification.

## U1 — additive union surface — DONE

Migration: `20260908144500_create_listing_representations_union_v1.sql`.

Object: `public.listing_representations_union_v1`.

Verified:

- canonical URLs: **143,121**
- multisource URLs: **18,660**

## U2 — canonical field merge — DONE

Migration: `20260908150500_create_listing_representations_canonical_v1.sql`.

Object: `public.listing_representations_canonical_v1`.

Verified coverage:

- rows: **143,121**
- title: **27,424**
- city: **107,415**
- district: **68,374**
- property type: **48,384**
- transaction: **44,600**
- price: **79,884**
- surface: **83,997**

## U3 — canonical search RPC — DONE, NOT CUT OVER

Migrations:

- `20260908152500_create_search_canonical_representations_v1.sql`
- `20260908153500_fix_search_canonical_text_fallback_v1.sql`

Object: `public.search_canonical_representations_v1`.

Capabilities verified:

- city
- district
- property type
- intent
- price/surface filters
- free-text fallback for missing structured type/intent
- deterministic stable ID from canonical URL
- ranking lanes
- keyset cursor pagination
- full filtered total retained across cursor pages

Cursor proof:

- page 1: 5 rows
- page 2: 5 rows
- overlap: **0**
- page 2 total preserved: **143,121**

Initial parity exposed a too-strict structured filter. It was corrected to preserve the legacy text-inference behavior for NULL property type / transaction fields.

Post-fix comparison examples:

| Query | current ODM | canonical |
|---|---:|---:|
| all | 74,846 | 143,121 |
| Casablanca | 25,377 | 30,710 |
| Casablanca + Appartement + sale | 7,174 | 8,542 |
| Rabat + rent | 1,739 | 2,768 |

The canonical totals are intentionally broader because they cover the union corpus. This is not yet sufficient proof for reader cutover; ranking/content quality parity must be certified next.

## U4 — dual-read parity — NEXT

Build a fixed query matrix and compare:

- top-result URL overlap
- structured-filter correctness
- empty/NULL field behavior
- result quality
- pagination stability
- latency/cost characteristics

Do not switch readers until U4 passes.

## U5 — reader cutover

Switch `/api/search` and `/search` only after U4. Remove legacy fallback only after certified parity.

## U6 — writer convergence

Inventory writers to all three physical corpora and converge ingestion.

## U7 — retirement

Only after no live readers/writers remain: archive/drop obsolete physical tables or replace them with compatibility views; remove dual-routing code.

## Safety

- no Vercel deployment without explicit user authorization
- no destructive source-table drop before U7 proof
- no public-search cutover before U4 proof
- every DB migration mirrored in repo

## Resume point

Branch: `refactor/unify-public-listing-source`

Next exact: U4 query-matrix parity and top-result overlap audit.

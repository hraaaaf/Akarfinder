# Market Index — Read Path Audit

**Mission:** AKARFINDER-MARKET-INDEX-READ-ACTIVATION-1, section 7
**Method:** static code inspection (`grep`/`Read`), no code modified.

## 1. The single choke point

Every server-side consumer of listing data goes through `lib/db/index.ts`, which exports
exactly 3 functions: `queryListings()`, `queryListingById()`, `queryStats()`. These route to
either `lib/db/supabase-listings.ts` (Production) or `lib/listings/db-listings.ts` (SQLite,
local dev only) based on `DATABASE_PROVIDER`, with an automatic SQLite fallback on any
Supabase error (already existing behavior, unrelated to Market Index).

**Confirmed consumers of `lib/db` (exhaustive grep, 6 files):**

| File | Function used | Role |
|---|---|---|
| `app/acheter/page.tsx` | `queryListings` | SSR listing page |
| `app/listings/[id]/page.tsx` | `queryListingById` | SSR listing detail page |
| `app/api/listings/route.ts` | `queryListings` | Public listings API |
| `app/api/stats/route.ts` | `queryStats` | Public stats API |
| `app/api/visit-requests/route.ts` | `queryListingById` | Visit request lookup (not a public search surface) |
| `lib/search/database-search.ts` | `queryListings` | The actual search engine behind `/api/search` and the Search Gateway |

**No other file reads `property_listings` or `listing_sources` directly.** `/louer`, `/neuf`,
`/immobilier`, `/demo/*` either call `/api/search` client-side or render from
`lib/listings/mock-listings.ts` (static fixtures, not live DB — confirmed by file existence and
naming; out of scope for this mission since it never touches Supabase).

## 2. Where the actual source pick happens today

`lib/db/supabase-listings.ts`'s `querySupabaseListings()`/`querySupabaseListingById()` issue
**one** Supabase query per call, with `listing_sources` as an embedded/joined resource
(`select("*, listing_sources(source_name, listing_url, source_url, is_active, first_seen_at)")`
— note: **the query does not currently select `listing_sources.id`**, only display fields).
`mapToDbRow()` then picks exactly one source per listing:

```ts
const activeSource = sources.find((s) => s.is_active) ?? sources[0] ?? null;
```

This heuristic already runs today, for every listing, regardless of Market Index. For a
single-source listing (312 of 316), `sources` has exactly one element — `activeSource` is
unambiguous and always resolves to that one row, with or without Market Index.

## 3. Where display policy / badges are computed

`lib/listings/map-db-listing.ts`'s `mapDbRowToListing()` (called from
`lib/search/database-search.ts`) computes `source_display_type`/`source_badge`/CTAs from
**`row.field_confidence`** (`derivePersistedExternalDisplayPolicy()`, checking
`provider === "openserp"`) — **the exact same signal this backfill used** to decide
`origin_type = 'persisted_openserp'`. This is not a coincidence to exploit or a shortcut to take:
it means the legacy display-policy computation is **already correct** for all 177
Market-Index-enriched rows today, with zero Market Index code involved. Market Index read
activation does not need to, and must not, change what this function outputs.

## 4. Ranking, duplicates, Search Gateway

- `lib/search/database-search.ts` calls `assignDuplicateGroups()` (from `lib/listings/duplicate.ts`,
  the P5A heuristic using `duplicate_group_id`) and `computeRankingScore()` — both operate on the
  `Listing[]` array **after** `mapDbRowToListing()`, entirely downstream of and blind to Market
  Index. Neither is touched by this mission, and neither must be: the ODM explicitly forbids any
  ranking modification.
- The Search Gateway (`app/api/search/gateway/route.ts`) is a separate, OpenSERP-backed candidate
  stream (ephemeral, ranked independently) — it does not read `property_listings`/`listing_sources`
  at all and is entirely out of this mission's scope.

## 5. RLS / role used

All 6 consumer files run server-side only (Next.js route handlers / server components), and
`lib/db/supabase-client.ts`'s `getSupabaseServerClient()` uses `SUPABASE_SERVICE_ROLE_KEY`
(bypasses RLS by Supabase design — same role already used for `property_listings`/
`listing_sources` today). No client-side Supabase call exists anywhere in the codebase for these
tables (confirmed by the FOUNDATION-1 mission's audit, re-confirmed here by grep: zero
`createClient`/`supabase` reference in any `"use client"` file).

## 6. Integration point for this mission

**Single integration point:** `lib/db/supabase-listings.ts`'s `mapToDbRow()` source-selection
step. For the 177 eligible, single-source, cluster-verified listings, there is mathematically
only one possible `activeSource` value (the listing has exactly one `listing_sources` row) — so
a Market-Index-aware source lookup and the existing heuristic are **guaranteed to select the same
row**. The Market Index read layer's job here is not to change the selection, but to (a) read that
selection through the verified `property_clusters`/`property_cluster_members` structure instead of
the ad hoc "is_active or first" heuristic, (b) validate that the Market Index data is internally
consistent (exactly 1 membership) before trusting it, (c) fall back to the unchanged legacy
heuristic for every one of the other 144 rows (unenriched or ambiguous) and for any Market Index
read failure, and (d) never expose an internal Market Index ID anywhere in the public response
shape.

## 7. Risk of regression, by consumer

| Consumer | Risk if read layer misbehaves | Mitigation |
|---|---|---|
| `/api/search`, `/api/listings` | Wrong/missing listing in results | Fallback is unconditional and silent-safe: any Market Index error/inconsistency reverts to the exact pre-existing legacy path for that row |
| `/listings/[id]` (SSR) | Detail page 404s or shows wrong source | Same per-row fallback applies to `queryListingById` |
| `/api/stats` | Wrong total count | `queryStats()` counts `property_listings` rows directly, untouched by source selection — zero Market Index involvement, confirmed by code (counts don't depend on `listing_sources` at all except for `duplicate_group_id`, itself unrelated) |
| Search Gateway | None | Does not read these tables |
| Ranking/duplicates | None if display-policy output is unchanged | Enforced by the parity contract (`docs/MARKET_INDEX_READ_PARITY_CONTRACT.md`) — both operate downstream, blind to the source of the data |

No code was modified to produce this audit.

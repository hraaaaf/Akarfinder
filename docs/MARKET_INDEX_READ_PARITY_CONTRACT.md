# Market Index — Read Parity Contract

**Mission:** AKARFINDER-MARKET-INDEX-READ-ACTIVATION-1, section 9

This contract is the pass/fail bar for every gate in this mission (shadow read, parity query
suite, Preview READ=true, Production READ=true). Any violation is an automatic STOP.

## Fields that MUST stay byte-identical, per listing, before vs. after activation

| Field | `Listing` type property |
|---|---|
| Public listing ID | `id` |
| Source name | `source_name` |
| Listing URL | `listing_url` |
| Title | `title` |
| Description / snippet | `description`, `description_snippet` |
| City | `city` |
| District / neighborhood | `district`, `neighborhood` |
| Transaction type | `transaction_type` |
| Property type | `property_type` |
| Displayed price | `price`, `price_mad`, `price_per_m2` |
| Currency | `currency` |
| Surface | `surface_m2` |
| Bedrooms / bathrooms / rooms | `bedrooms`, `bathrooms`, `rooms_count`, `bedrooms_count`, `bathrooms_count` |
| External-result classification | `source_display_type`, `search_result_display_mode`, `result_origin` |
| Partner status | (absent today — must remain absent; `is_partner` stays `false` per `map-db-listing.ts`'s hardcoded value) |
| Badges | `source_badge` |
| CTAs | `allowed_ctas`, `primary_cta` |
| Availability claim | never asserted (unchanged — this mission creates 0 Observations, so there is nothing new to assert) |
| Total result count | `SearchResult.total` |
| Pagination | `limit`, `offset` |
| Final order after ranking | array order of `SearchResult.listings` |

**Equality method:** deep-equal on the full `Listing` object for every listing present in both
the legacy-only response and the Market-Index-read response, for the same query, same `limit`/
`offset`. A single field difference on a single listing is a parity failure.

## Fields that MUST NEVER be exposed publicly, at any point

- `property_cluster_id` / `property_cluster_members.id`
- `origin_type` (the raw column value — the *derived* public `source_display_type`/`source_badge`
  are fine, since they already exist today and are computed from `field_confidence`, not from
  `origin_type`)
- `ingestion_run_id`
- `content_fingerprint`
- Any raw Market Index table row or ID, in any API response, HTML attribute, or client-side
  JavaScript bundle
- Any internal fallback/validation metric (`market_index_rows_used`, `legacy_fallback_rows`,
  `invalid_cluster_rows`, `missing_membership_rows`, `multi_membership_clusters`,
  `parity_mismatch_count`) — server logs only, never in an HTTP response body

## Why parity must be exact, not "close enough"

312 of 316 listings are structurally single-source. For those, the legacy heuristic
(`sources.find(s => s.is_active) ?? sources[0]`) and a Market-Index-verified cluster lookup are
**mathematically forced to select the same row** — there is only one row to select. Any observed
difference therefore does not indicate "Market Index found something better"; it indicates a bug
in the new read path, the Market Index data, or a race condition (e.g. legacy data changed after
the backfill's snapshot). The correct response to any parity difference is always to fall back to
the legacy value, never to "trust" the Market Index value as more authoritative — this mission
does not have a mandate to correct or override legacy data, only to read it through a verified
lens for the 177 rows where the two are provably the same value.

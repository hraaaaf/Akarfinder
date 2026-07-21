# Direct Feeds Ingestion — Technical Onboarding

**Mission:** AKARFINDER-100K-ROADMAP-AUTONOMOUS-GOAL-1 (#8/10). This is a **capability**, not a live integration — no real agency or promoter is connected as part of this mission, and none is publicly announced.

## What exists

- `lib/feeds/schema.ts` — canonical feed row shape + strict validation (pure, no IO).
- `lib/feeds/parsers.ts` — CSV / JSON / XML parsers, each producing the same `RawFeedRow[]` shape.
- `lib/feeds/staging.ts` — `stageFeed()`: validate → canonicalize → dedupe → create/update/delete/unpublish decision. Pure function, no DB writes.
- `data/imports/fixtures/` — 3 realistic sample feeds (agency CSV, promoter JSON, agency-update XML) covering every required scenario.
- `scripts/scrapers/__tests__/direct-feeds-ingestion.test.ts` — 19 end-to-end tests against the real fixture files.

## What does NOT exist yet (intentionally, out of this mission's scope)

- No DB-writing IO wrapper. `stageFeed()` takes an `existingIdentityKeys` set as a parameter — the real wrapper (a future mission) would populate it from a lookup, then write `staged` rows through the **existing** admission/canonicalization pipeline, never a shortcut around it.
- No live schedule, no partner onboarding flow, no public partner page.

## Canonical feed shape

One row = one property offer. Required: `source_name`, and **either** `external_id` **or** `source_url` (never title alone — see below). Everything else is optional/nullable, including `price_mad` (doctrine: absent price is `null`, never `0`).

| Field | Type | Notes |
|---|---|---|
| `external_id` | string \| null | Partner's own ID for this listing. Preferred identity key. |
| `source_name` | string | Required. The partner/feed identifier. |
| `source_domain`, `source_url` | string \| null | `source_url` is the identity fallback when `external_id` is absent. |
| `transaction_type` | `sale` \| `rent` (or `vente`/`location`) | |
| `property_type` | `apartment` \| `villa` \| `land` \| `office` \| `commercial` \| `other` | |
| `title` | string | Min 5 chars, no PII. |
| `city`, `district` | string | `city` required. |
| `price_mad` | number \| null | **Never coerced to 0.** |
| `surface_m2` | number \| null | Required (≥9) for `apartment`/`villa`. |
| `bedrooms_count` | number \| null | |
| `coordinates` | `{lat, lng}` \| null | Range-validated if present. |
| `image_urls` | string[] | Kept **only** if `images_rights_confirmed = true`; otherwise silently dropped (row still valid). |
| `update_signal` | `delete` \| `unpublish` \| absent | See below. |

## Identity & idempotence

`computeFeedIdentityKey()` = `source_name::external:<external_id>` if `external_id` is present, else `source_name::url:<canonicalizeSourceUrl(source_url)>` (reuses the project's existing canonicalizer, never a second implementation). **Never falls back to title** — regression-tested after the #6/10 shadow audit found generic, formulaic titles are not a reliable identity signal in this domain.

## Delete / unpublish signals

A row with `update_signal: "delete"` or `"unpublish"` only needs identity fields (`source_name` + `external_id`/`source_url`) — full descriptive validation (title length, required surface, etc.) is skipped. A partner taking a listing down often won't resend the complete payload. This was a real bug caught by the fixture tests: a villa unpublish signal with no `surface_m2` was initially rejected by the same strict rules used for a normal create/update row — fixed and regression-tested.

## Format examples

See `data/imports/fixtures/`:
- `agency-feed.csv` — 3 rows, one with `price_mad` absent (nullable price).
- `promoter-feed.json` — includes a within-feed duplicate `external_id` and a `delete` signal.
- `agency-feed-update.xml` — a genuine update (price change on a known `external_id`), a new listing, an `unpublish` signal, and a malformed row (invalid `property_type`).

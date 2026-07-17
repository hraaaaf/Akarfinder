# Market Index — Controlled Backfill Column Mapping

**Mission:** AKARFINDER-MARKET-INDEX-CONTROLLED-BACKFILL-1, section 7

Inventory of the 9 Market Index columns added to `listing_sources` by migration
`20260716140400_add_source_offer_columns_to_listing_sources.sql`, and the exact rule (or
explicit refusal) this backfill applies to each. **Whitelist: only these 9 columns may ever
be written by this backfill. No other column on `listing_sources`, and no column on
`property_listings`, is ever touched.**

## Eligible row scope (established once, used for every column below)

A `listing_sources` row is **eligible** for any enrichment in this backfill if and only if:

1. Its parent `property_listings.id` has **exactly one** attached `listing_sources` row
   (single-source, not part of an ambiguous multi-source group).
2. Its parent's `field_confidence` JSON contains `provider === "openserp"` OR
   `acquisition_provider === "openserp"` — an **explicit, individually-verifiable fact**
   already recorded by the ingestion pipeline, not a guess.
3. It has a non-empty `listing_url` or `source_url`.

Measured against current Production data (2026-07-17, read-only): **177 of 321**
`listing_sources` rows are eligible. The other **144** (135 single-source without the
explicit provenance signal + 9 rows across 4 ambiguous multi-source groups) are **not
touched by this backfill in any column** — not just `origin_type`, all 9 columns stay
exactly as they are today. This is a deliberately simpler and more conservative scope than
"different columns could have different eligibility" — one clean, auditable boundary, used
everywhere, minimizes the number of judgment calls this backfill makes. See
`data/audits/market-index-controlled-backfill-plan.json` for the full count breakdown and
justification (why 52 became 144 — see "Provenance policy" below).

## Column-by-column

| # | Column | Type | Nullable | Current value | Derivation rule | Legacy source | Writable without assumption? | Rollback rule |
|---|---|---|---|---|---|---|---|---|
| 1 | `source_offer_key` | text | yes | `NULL` (all rows) | None — legacy data has no partner-issued or source-issued stable per-offer key. | none | **NO — never written by this backfill.** | N/A, stays untouched |
| 2 | `origin_type` | text | yes | `NULL` (all rows) | `'persisted_openserp'` **only** when parent `field_confidence.provider`/`acquisition_provider === "openserp"` | `property_listings.field_confidence` (explicit signal) | **YES, for eligible rows only (177)** | Set back to `NULL` for exactly the rows in the manifest whose current value still equals what this run wrote |
| 3 | `compliance_status` | text | yes | `NULL` (all rows) | None — would mirror a `discovery_candidates.compliance_status`, but this backfill creates 0 `discovery_candidates`, so there is nothing to inherit from. | none | **NO — never written by this backfill.** | N/A, stays untouched |
| 4 | `content_fingerprint` | text | yes | `NULL` (all rows) | SHA-256 of `title + "\|" + description_snippet` from the parent `property_listings` row — a pure, deterministic hash of data that already exists; asserts nothing new. | `property_listings.title`, `property_listings.description_snippet` | **YES, for eligible rows only (177)** | Set back to `NULL` for exactly the rows in the manifest whose current value still equals what this run wrote |
| 5 | `ingestion_run_id` | text | yes | `NULL` (all rows) | This backfill's own `--run-id` value — literally records "this run touched this row," not an assumption. | the backfill invocation itself | **YES, for eligible rows only (177)** | Set back to `NULL` for exactly the rows in the manifest whose current value still equals what this run wrote |
| 6 | `displayed_price` | numeric | yes | `NULL` (all rows) | Copied verbatim from parent `property_listings.price_mad`, **only** when it is a finite positive number (same rule `classifyPrice()` already applies) | `property_listings.price_mad` | **YES, for eligible rows only (177), and only when price_mad is valid** | Set back to `NULL` for exactly the rows in the manifest whose current value still equals what this run wrote |
| 7 | `price_currency` | text | yes | `NULL` (all rows) | `'MAD'` — the platform's single, universal currency (100% of live listings are Moroccan Dirham; not a per-row guess, a platform-wide constant already implied by `docs/MARKET_INDEX_DATA_MODEL.md`: "MAD today") — written **only** alongside a non-null `displayed_price` | platform-wide constant | **YES, for eligible rows only (177), only when displayed_price is set** | Set back to `NULL` for exactly the rows in the manifest whose current value still equals what this run wrote |
| 8 | `price_period` | text | yes | `NULL` (all rows) | `'vente'` **only** when parent `property_listings.transaction_type === 'sale'` (unambiguous: sale = one-time transaction). For `transaction_type === 'rent'`, **left `NULL`** — legacy data has no column distinguishing monthly vs. daily rental, and guessing would violate the no-invented-value rule. | `property_listings.transaction_type` | **YES, for eligible rows only (177), sale only** | Set back to `NULL` for exactly the rows in the manifest whose current value still equals what this run wrote |
| 9 | `price_status` | text | yes | `NULL` (all rows) | Output of the already-shipped, already-reviewed `classifyPrice()` (`lib/market-index/market-index-price.ts`) applied to parent `property_listings.price_mad` — reuses existing, approved business logic, does not introduce a new rule. | `property_listings.price_mad`, via `classifyPrice()` | **YES, for eligible rows only (177)** | Set back to `NULL` for exactly the rows in the manifest whose current value still equals what this run wrote |

## Explicitly forbidden (per section 7 of the ODM)

- `UPDATE` of any legacy column (`id`, `property_listing_id`, `source_name`, `listing_url`,
  `source_url`, `is_active`, `first_seen_at`, `last_seen_at`) — never touched.
- `UPDATE` of any column not in the 9-column whitelist above.
- Writing an estimated/guessed value into any column (`source_offer_key`, `compliance_status`
  stay `NULL` for exactly this reason).
- Writing a value based only on the row's domain/`source_name` (e.g. inferring `legacy_import`
  from `source_name = "mubawab"` — explicitly rejected, see "Provenance policy" below).

## Provenance policy — why the "52" reference figure becomes 144 not-provenanced rows

The ODM's context section states "52 offres sans provenance exploitable" as a reference
figure. Measured precisely: **52 `property_listings` rows have `field_confidence IS NULL`
entirely** (51 single-source + 1 of the 4 multi-source groups) — this exact number, 52,
matches. Separately, **87 more `property_listings` rows** (84 single-source + 3 of the 4
multi-source groups) have a **non-null but different-schema** `field_confidence` — one
carrying per-field data-completeness ratings (`{"city":"high","price":"missing",...}`), a
format that **predates and is unrelated to the provenance-tracking convention** (`provider`/
`acquisition_provider`) the `persisted_openserp` signal relies on. It contains no `provider`
key, no `acquisition_provider` key, and no other field that states or implies "this row was
imported via a specific pipeline."

**Empirical proof `source_name` cannot substitute as a provenance signal:** the value
`"mubawab"` appears identically across all three buckets — 22 times where the parent has an
explicit `provider: "openserp"` signal, 53 times where the parent's `field_confidence` is
entirely `NULL`, and 86 times where the parent has the old completeness-rating schema. The
same site name maps to three different underlying realities, which is direct, row-level
evidence that `source_name` (or any domain-derived signal) is not a reliable indicator of
provenance — exactly the deduction the ODM's provenance policy prohibits ("Interdit :
déduire partner_api du nom du domaine").

**Conclusion:** both the 52 null-`field_confidence` rows and the 87 old-schema rows are
treated identically — as **not provenanced**, `origin_type` stays `NULL` for both, no
`legacy_import` is written for either. This is a **more conservative** reading than the
ODM's own reference figure (144 not-provenanced vs. the referenced 52), not a "reduction of
52" (the rule against reducing 52 without per-row justification does not apply — this is an
increase, in the safe direction, and is justified in full above).

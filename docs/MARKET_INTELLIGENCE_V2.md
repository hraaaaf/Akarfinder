# Market Intelligence V2

Status: `MARKET_INTELLIGENCE_V2_CONTRACT_IMPLEMENTED`

## Purpose

Market Intelligence V2 is the canonical market-comparison engine for structured AkarFinder listings.
It replaces the assumption that a single price/m² reference is sufficient to support a strong market conclusion.

The engine must answer two separate questions:

1. Can the asking price be compared to a compatible market reference at all?
2. If yes, how strong is that comparison given geography, benchmark age and statistical transparency?

## Non-negotiable doctrine

- Asking price is not a transaction price.
- A market reference is indicative, not official, certified, verified, guaranteed, exact or real.
- Missing sample size stays `null`.
- Missing dispersion stays `null`.
- A registry row count must never be presented as the upstream statistical sample size.
- Neighborhood reference is preferred; city fallback is allowed only when explicitly exposed as fallback.
- Rental offers are not compared against the current sale-price benchmark.
- Explicit `new_build` / `off_plan` stock is not compared against the current unsegmented benchmark.
- Unsupported property types return `insufficient_data`.
- Stale or temporally unqualified benchmarks return `insufficient_data`.
- The engine may always answer that evidence is insufficient.

## Current benchmark evidence

Current registry source: Yakeey public aggregated price reference audited by AkarFinder.

Known:
- published price/m² reference;
- city / neighborhood scope;
- apartment / villa property type;
- AkarFinder audit observation timestamp;
- source URL.

Unknown in the integrated audit:
- upstream statistical sample size;
- dispersion / variance;
- upstream source update timestamp;
- surface-band segmentation;
- new-build / resale segmentation.

Therefore an exact neighborhood match can currently reach at most `medium` confidence, while city-level or city-fallback matches are `low` confidence. `high` remains structurally possible only for future benchmarks with stronger statistical transparency.

## Benchmark recency policy

Based on the AkarFinder observation timestamp of the published reference:

- `current`: <= 180 days
- `aging`: 181–365 days
- `stale`: > 365 days
- `unknown`: no defensible observation timestamp

A stale or unknown benchmark cannot support a current public market-position claim.

This is deliberately distinct from listing freshness (#13) and seed freshness (100K acquisition track).

## Geography matching

Match levels:

- `exact_neighborhood`
- `city_direct`
- `city_fallback`
- `none`

When a neighborhood was requested but no compatible neighborhood reference exists, fallback to city is allowed but must set:

- `fallback_used = true`
- lower confidence
- an explicit limitation explaining the fallback

## Compatibility gates

The current benchmark is treated as a sale-price reference.

Market Intelligence V2 rejects comparison when:

- transaction is rent;
- property type is unsupported;
- city is missing;
- asking price is missing/invalid;
- surface is missing/invalid;
- market segment is explicitly `new_build` or `off_plan`;
- no compatible benchmark exists;
- benchmark observation timestamp is unknown;
- benchmark is stale.

Unknown market segment may still be evaluated indicatively, but with an explicit limitation because the current benchmark is unsegmented.

## Output

Canonical output includes:

- asking price amount;
- asking price/m²;
- benchmark source/scope/location/type;
- benchmark price/m²;
- match level and fallback flag;
- benchmark observation time and age;
- upstream update time when known;
- sample size / dispersion when known;
- benchmark quality;
- compatibility by transaction/property/geography/segment/surface segmentation;
- relative position and gap only when eligible;
- confidence;
- limitations;
- safe legacy `gap` projection.

## Pipeline integration

The unified #12 pipeline now executes:

`canonical adaptation -> validation -> enrichment -> completeness -> Market Intelligence V2 -> Freshness V2 -> future engines`

`property.intelligence.market_position` and `market_reference_id` are populated only when V2 status is `evaluated`.

`price_per_m2` is populated as a calculation from the selected offer asking price and canonical preferred surface when both are defensible.

When V2 is unavailable, the public Analysis Contract claim is `unavailable` and the property market position remains `null`.

## Legacy compatibility

`price-gap-calculator.ts` remains available as a low-level compatibility calculator for existing consumers and tests.
It is not sufficient on its own to authorize a canonical public market conclusion.

The canonical public decision boundary is Market Intelligence V2 + Analysis Contract V1.

## No destructive migration

This mission adds no destructive database migration, does not rewrite Production listings and does not force an immediate UI cutover.

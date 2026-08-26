# Seed → listing materialization

## Goal
Materialize indexed real-estate offers when AkarFinder has the three minimum facts: explicit city, explicit district and a MAD price, while preserving the confidence level of that price.

## Contract
- current source-domain registry must admit the domain and individual-detail URL;
- `document_kind = LISTING` and `vertical_classification = real_estate_likely`;
- price must be positive and remain <= 30,000,000 MAD;
- `recovery_confidence = trusted_economic_v2` is persisted as trusted (`field_confidence.price = trusted_economic_ledger`, `listing_sources.price_status = valid`);
- `recovery_confidence = economic_v2_price_to_verify` is preserved rather than deleted (`field_confidence.price = price_to_verify`, `listing_sources.price_status = ambiguous`) and receives the lower-confidence scoring policy;
- city and district must both be explicit in indexed URL/title/snippet evidence and agree with normalized geography;
- no source network request is made during materialization;
- source title/snippet are used only transiently for classification and are never copied to `property_listings`;
- persisted listing content is link-only: canonical URL, city, district, price and optional normalized type/intent;
- `listing_sources.origin_type = external_index_seed` preserves provenance;
- exact URL and deterministic fingerprint make the path idempotent.

## Execution
`scripts/data-mass/materialize-trusted-seed-listings.ts` is dry-run by default. Production writes require both `--apply` and `SEED_LISTING_MATERIALIZE_WRITE=1`. `--limit=N` supports a bounded canary.

## Production closeout — 2026-08-26
Verified production baseline before this pass:
- 63,721 `source_offer_seeds`;
- 62,747 thin-index rows;
- 3,265 thin rows with city + price;
- 2,373 rows marked `price_to_verify`;
- 596 rows with trusted economic price;
- 6,240 `property_listings`.

The writer was extended and certified in PR #919 so both trusted and `price_to_verify` prices can be materialized without conflating their confidence states. Dedicated `Trusted Seed Listing Materialization` run `32955337167` passed on exact head `e201adabc5489c1feb08a9c13f7e88c35c97842f`; PR #919 was merged to main as `1b0a2c896440864b5ba7a71040c7c5e9247e6e3e`.

Production materialization was then performed conservatively with domain-specific explicit-geography gates and canaries. One failed Agenz bulk statement rolled back atomically after detecting duplicate fingerprints inside the batch; the cohort was deduplicated before retry.

Final verified result for this pass:
- 1,239 new listings / 1,239 distinct source URLs;
- 1,239/1,239 link-only (`title` and `description_snippet` remain null);
- 1,239/1,239 have city + district + price;
- 1,239/1,239 preserve `external_index_seed` provenance;
- 1,239/1,239 have `displayed_price = property_listings.price_mad`;
- 1,219 `price_to_verify` listings persisted with `price_status = ambiguous`;
- 20 trusted-price listings persisted with `price_status = valid`;
- final `property_listings` count: 7,479.

Rejected residual rows remain unmaterialized when geography is generic (`Autre`, `Toute La Ville`), city evidence conflicts with the URL, the apparent amount is a price-per-m² rather than a total price, or the district match is not sufficiently explicit. No Vercel deployment was performed.

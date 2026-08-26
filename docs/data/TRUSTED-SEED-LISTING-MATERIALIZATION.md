# Seed → listing materialization

## Goal
Materialize indexed real-estate offers when AkarFinder has the three minimum facts: explicit city, explicit district and a MAD price, while preserving the confidence level of that price.

## Contract
- current source-domain registry must admit the domain and individual-detail URL;
- `document_kind = LISTING` is accepted directly; `document_kind = AMBIGUOUS` is accepted only when the current registry independently proves a strong individual-detail URL;
- `vertical_classification = real_estate_likely` remains mandatory;
- price must be positive and remain <= 30,000,000 MAD;
- `recovery_confidence = trusted_economic_v2` is persisted as trusted (`field_confidence.price = trusted_economic_ledger`, `listing_sources.price_status = valid`);
- `recovery_confidence = economic_v2_price_to_verify` is preserved rather than deleted (`field_confidence.price = price_to_verify`, `listing_sources.price_status = ambiguous`) and receives the lower-confidence scoring policy;
- city and district must both be explicit in indexed evidence and agree with normalized geography;
- geography evidence priority is URL + page title first, then snippets; this prevents related-result or agency-office text in snippets from overriding the property location;
- the latest matching `discovery_candidates` title/snippet may be used as classification-only fallback when the thin-index text is insufficient;
- no source network request is made during materialization;
- source/discovery title and snippet are transient evidence only and are never copied to `property_listings`;
- persisted listing content is link-only: canonical URL, city, district, price and optional normalized type/intent;
- `listing_sources.origin_type = external_index_seed` preserves provenance;
- exact URL and deterministic fingerprint make the path idempotent.

## Execution
`scripts/data-mass/materialize-trusted-seed-listings.ts` is dry-run by default. Production writes require both `--apply` and `SEED_LISTING_MATERIALIZE_WRITE=1`. `--limit=N` supports a bounded canary.

## Production evidence — 2026-08-26
Verified baseline before the price-confidence pass:
- 63,721 `source_offer_seeds`;
- 62,747 thin-index rows;
- 3,265 thin rows with city + price;
- 2,373 rows marked `price_to_verify`;
- 596 rows with trusted economic price;
- 6,240 `property_listings`.

PR #919 extended the writer so both trusted and `price_to_verify` prices can be materialized without conflating their confidence states. Dedicated `Trusted Seed Listing Materialization` run `32955337167` passed on exact head `e201adabc5489c1feb08a9c13f7e88c35c97842f`; PR #919 merged as `1b0a2c896440864b5ba7a71040c7c5e9247e6e3e`.

Production materialization then used domain-specific explicit-geography gates and canaries. Duplicate fingerprints inside one Agenz SQL batch were detected by the unique constraint; that statement rolled back atomically and was retried after deduplication. A later manual SQL adaptation created 10 Agenz properties before their sources because PostgreSQL data-modifying CTEs share a statement snapshot; those 10 rows were immediately repaired with sequential source/cluster/membership writes. Final verification reports zero external-index orphan properties and zero external sources without memberships.

Current verified production state after the extended pass:
- 7,556 `property_listings` total;
- 1,775 `external_index_seed` source rows;
- 1,229 external-index rows with `price_status = ambiguous`;
- 546 external-index rows with `price_status = valid`;
- zero external-index property orphans;
- zero external-index sources without cluster membership.

Residual rows remain unmaterialized when geography is generic or contradictory, the apparent amount is explicitly a price-per-m² rather than a listing total/rent, the source registry does not prove an individual page, or district evidence is not sufficiently attributable to the property. No Vercel deployment was performed.

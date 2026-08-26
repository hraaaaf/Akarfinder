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
- geography evidence priority is URL + page title first, then snippets;
- the latest matching `discovery_candidates` title/snippet may be used as classification-only fallback when thin-index text is insufficient;
- source/discovery text is never copied to `property_listings`;
- persisted listing content is link-only: canonical URL, city, district, price and optional normalized type/intent;
- `listing_sources.origin_type = external_index_seed` preserves provenance;
- exact URL and deterministic fingerprint make the path idempotent;
- no source network request is made during materialization.

## Execution
`scripts/data-mass/materialize-trusted-seed-listings.ts` is dry-run by default. Production writes require both `--apply` and `SEED_LISTING_MATERIALIZE_WRITE=1`. `--limit=N` supports a bounded canary.

## Production closeout — 2026-08-26
Baseline before the price-confidence conversion pass:
- 63,721 `source_offer_seeds`;
- 62,747 thin-index rows;
- 3,265 thin rows with city + price;
- 2,373 rows marked `price_to_verify`;
- 596 rows with trusted economic price;
- 6,240 `property_listings`.

PR #919 extended the writer to materialize trusted and `price_to_verify` prices without conflating confidence. Dedicated run `32955337167` passed and PR #919 merged as `1b0a2c896440864b5ba7a71040c7c5e9247e6e3e`.

PR #921 added classification-only fallback evidence from `discovery_candidates`, prioritised URL/title over snippets, and allowed `document_kind = AMBIGUOUS` only when the current approved registry independently proves a strong individual-detail URL. Dedicated run `32958057366` and canonical compile passed on exact head `07664c0fe7a678260fc27ce7fa8ee52f906d07fb`; PR #921 merged as `2837c765962adcaa6b9f12fedc24a9e3d4db1c74`.

Production materialization used bounded canaries and domain-specific explicit-geography gates. One Agenz SQL batch with duplicate fingerprints rolled back atomically and was retried after deduplication. A later manual SQL adaptation created 10 Agenz property rows before sources because PostgreSQL data-modifying CTEs share a statement snapshot; those rows were repaired immediately with sequential source, cluster and membership writes. Final verification reports no orphaned external-index rows.

Final verified production state:
- **7,561 `property_listings` total**, up **1,321** from the 6,240 baseline;
- **1,847 `external_index_seed` source rows**;
- **1,284** external-index rows with `price_status = ambiguous` / `price_to_verify`;
- **563** external-index rows with `price_status = valid`;
- **0** external-index properties without source;
- **0** external-index sources without cluster membership.

The final discovery-evidence canary and residual batch added five `price_to_verify` listings (Aykana Souissi, Aykana Agdal, Agenz Haut Anza, Agenz Sidi Belyout and Agenz Gauthier), all 5/5 link-only, minimum-fact complete, provenance-consistent, price-consistent and membership-complete.

## Residual audit
1,061 priced thin-index URLs remain unmaterialized. Only seven still match a known district in current indexed evidence, and none is safe to admit under the contract:
- two 1immo rows expose an explicit **DH/m²** amount rather than a total listing price;
- two Agenz rows have city evidence contradicting their URL geography;
- one Mouldar row uses `toute-la-ville` and a snippet containing neighbouring-result locations;
- one Mubawab row is falsely normalized to Fès because the title contains `Route de Fès`, while `Riad` is descriptive text rather than a reliable district;
- one 1immo listing contains both `Sonaba` and `Founty`, so the district is not unambiguous.

No remaining candidate is force-materialized by guessing geography or promoting a price-per-m² to total price. No Vercel deployment was performed.

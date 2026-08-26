# Trusted seed → listing materialization

## Goal
Materialize indexed real-estate offers when AkarFinder has all three minimum facts: explicit city, explicit district and a trusted MAD price.

## Contract
- current source-domain registry must admit the domain and individual-detail URL;
- `document_kind = LISTING` and `vertical_classification = real_estate_likely`;
- price must come from `odm_economic_observation_state_shadow_v1` with `economic_status = trusted` and remain <= 30,000,000 MAD;
- city and district must both be explicit in indexed URL/title/snippet evidence and agree with normalized city;
- no source network request is made during materialization;
- source title/snippet are used only transiently for classification and are never copied to `property_listings`;
- persisted listing content is link-only: canonical URL, city, district, trusted price and optional normalized type/intent;
- `listing_sources.origin_type = external_index_seed` preserves provenance;
- exact URL and deterministic fingerprint make the path idempotent.

## Execution
`scripts/data-mass/materialize-trusted-seed-listings.ts` is dry-run by default. Production writes require both `--apply` and `SEED_LISTING_MATERIALIZE_WRITE=1`. `--limit=N` supports a bounded canary.

## Production evidence before materialization
On 2026-08-26 the economic reconciliation suppressed 2,301 ambiguous/untrusted prices and corrected 255 trusted mismatches. The post-reconciliation cohort contained 888 rows with city + trusted price. A read-only geography/source analysis identified hundreds of net-new candidates, dominated by Agenz and Mouldar structured listing URLs. Final write count must come from the current dry-run, never from this historical note.

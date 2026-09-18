# Lot 1 — Proof

Status: TESTS WRITTEN / EXECUTION PENDING

## Artifacts

- `canonical.md`
- `schema/listing.schema.json`
- `schema/run-manifest.schema.json`
- `collection-adapter.ts`
- `samples/listing.minimal.json`
- `samples/listing.complete.json`
- `samples/listing.villa.json`
- `samples/listing.land.json`
- `scripts/scrapers/__tests__/data-ingestion-contract.test.ts`

## Contract decision

`data-ingestion/schema/listing.schema.json` is the collection/input contract.

It is NOT a second application canonical model.

Destination model remains the existing:

- `CanonicalPropertyV1`
- `CanonicalOfferV1`
- `MediaAssetV1`

under `lib/property-schema/`.

## Required evidence before CLOSED

Run:

```bash
npx tsx --test scripts/scrapers/__tests__/data-ingestion-contract.test.ts
```

Expected coverage:

1. minimal sparse listing;
2. complete apartment rental;
3. villa sale;
4. land sale;
5. missing price remains `null` / `not_disclosed`, never zero;
6. land does not inherit apartment-only fields;
7. collection provenance is preserved into the canonical offer/media model.

Lot 1 must remain open until this command has a verified successful execution.
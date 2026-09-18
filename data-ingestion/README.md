# AkarFinder Data Ingestion

Canonical guidance lives in `canonical.md`.

## Lot 1 validation

Run:

```bash
npx tsx --test scripts/scrapers/__tests__/data-ingestion-contract.test.ts
```

This validates the collection fixtures and their mapping into the existing AkarFinder Property Schema V1.

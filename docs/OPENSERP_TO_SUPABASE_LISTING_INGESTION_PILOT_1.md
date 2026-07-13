# OPENSERP-TO-SUPABASE-LISTING-INGESTION-PILOT-1

## Scope

This mission implemented a first controlled OpenSERP batch ingestion pipeline
in an isolated worktree on top of commit
`739dcc9330ccfa15df720ee1650b63bf8fb3e9d3`.

The pipeline stays within the approved acquisition boundary:

- OpenSERP only
- no direct source-page scraping
- no phone / WhatsApp / personal email collection
- no image download or rehosting
- no production app deploy

## Implemented pieces

- Versioned query matrix:
  [data/openserp/ingestion-pilot-query-matrix.json](/C:/Users/lenovo/Documents/AkarFinder-openserp-supabase-ingestion/data/openserp/ingestion-pilot-query-matrix.json)
- OpenSERP live runner using the local installed `openserp.exe` v2.1
- URL canonicalization and tracking-param stripping
- Conservative classification lanes:
  `individual_listing`, `discovery_page`, `reject_out_of_scope`, `quarantine`
- Title/snippet-only extraction of city, district, transaction, property type,
  price, surface, bedrooms
- Dry-run journaling under `data/ingestion-runs/<run_id>/`
- Controlled write and rollback commands prepared, but not executed

## Live proof

The local OpenSERP provider is available on this machine:

- binary: `C:\Users\lenovo\go\bin\openserp.exe`
- mode used by the pilot: `local_cli`
- version observed: `2.1`

The complete dry-run executed with:

```bash
npm run ingest:openserp:listings -- --dry-run --run-id pilot-openserp-full-1
```

Observed metrics:

- queries_planned: `96`
- queries_executed: `64`
- queries_failed: `32`
- raw_results: `639`
- individual_candidates: `138`
- unique_source_urls: `130`
- discovery_pages: `422`
- quarantined: `73`
- exact_duplicates_removed: `8`
- cities_covered: `4`
- sensitive_data_hits: `0`

## Why production write was refused

The mission required a dry-run strong enough to authorize a first bounded write
into production.

The pilot did not reach the minimum thresholds:

- `individual_candidates >= 200`: failed (`138`)
- `unique_source_urls >= 200`: failed (`130`)

The run therefore stayed in dry-run mode and produced:

- `production_write_authorized = false`
- `production_write_executed = false`

## Additional product blocker

Even with a successful production write, the current structured public search
path would not immediately satisfy the visibility goal for external results.

At this baseline:

- `lib/sources/source-access-registry.ts` classifies external sources as
  `public_external_live` or `third_party_legacy`
- `lib/listings/public-listing-access.ts` only publishes
  `first_party` and `partner_authorized` structured listings

So an external DB write would still require a separate display activation path
before `/search` could surface those rows safely and truthfully.

## Safety outcome

- direct_source_page_fetches: `0`
- downloaded_images: `0`
- phone_hits: `0`
- whatsapp_hits: `0`
- personal_email_hits: `0`
- secret_hits: `0`
- production_database_modified: `false`
- production_app_deployed: `false`

## Validation

- [package.json](/C:/Users/lenovo/Documents/AkarFinder-openserp-supabase-ingestion/package.json)
  `npm run test:openserp-ingestion`: PASS
- [package.json](/C:/Users/lenovo/Documents/AkarFinder-openserp-supabase-ingestion/package.json)
  `npm test`: PASS
- [package.json](/C:/Users/lenovo/Documents/AkarFinder-openserp-supabase-ingestion/package.json)
  `npm run build`: PASS
- build pages: `63/63`

## Decision

- status: `completed`
- verdict: `NO_GO`

The pipeline groundwork is valid, but the pilot is not yet strong enough to
justify the first production ingestion batch.

## Next mission

- `OPENSERP-LISTING-QUALITY-REMEDIATION-1`

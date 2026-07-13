# OPENSERP-TO-SUPABASE-LISTING-INGESTION-PILOT-1

## Verdict

- status: `completed`
- verdict: `NO_GO`
- reason: `dry_run_below_thresholds`

## Provider

- provider: `openserp`
- provider_mode: `local_cli`
- provider_endpoint: local `openserp.exe`
- provider_version: `2.1`
- provider_live_or_fixture: `live`

## Dry-run full

- run_id: `pilot-openserp-full-1`
- queries_planned: `96`
- queries_executed: `64`
- queries_failed: `32`
- raw_results: `639`
- individual_candidates: `138`
- unique_source_urls: `130`
- discovery_pages: `422`
- rejected_out_of_scope: `6`
- quarantined: `73`
- exact_duplicates_removed: `8`
- cities_covered: `4`

## Threshold check

- `queries_executed >= 60`: PASS
- `raw_results >= 500`: PASS
- `individual_candidates >= 200`: FAIL
- `unique_source_urls >= 200`: FAIL
- `cities_covered = 3`: PASS
- `sensitive_data_hits = 0`: PASS

## Safety

- direct_source_page_fetches: `0`
- downloaded_images: `0`
- phone_hits: `0`
- whatsapp_hits: `0`
- personal_email_hits: `0`
- secret_hits: `0`

## Production

- property_listings_before: `139`
- listing_sources_before: `144`
- production_write_executed: `false`
- property_listings_after: `139`
- listing_sources_after: `144`
- production_database_modified: `false`
- production_app_deployed: `false`
- production_alias_modified: `false`
- production_environment_modified: `false`

## Display risk

- The current public structured `/search` path still filters out
  `public_external_live` and `third_party_legacy` sources.
- A production DB write would therefore not satisfy the mission objective of
  immediate visible search results without a separate display activation.

## Tests

- `npm run test:openserp-ingestion`: PASS
- `npm test`: PASS
- `npm run build`: PASS
- build pages: `63/63`
- `git diff --check`: PASS with CRLF warnings only

## Next mission

- `OPENSERP-LISTING-QUALITY-REMEDIATION-1`

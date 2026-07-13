# OPENSERP_LISTING_QUALITY_REMEDIATION_1

## Summary

- provider: openserp 2.1 (local_cli)
- queries_planned: 180
- queries_executed: 178
- technical_failures: 2
- zero_result_queries: 9
- raw_results: 1684
- individual_results_before_dedup: 234
- unique_individual_source_urls: 228
- individual_precision: 95%
- category_page_false_acceptance: 0%

## City coverage

- Casablanca: 112
- Rabat: 79
- Marrakech: 37

## Read-model

- persisted_openserp_visible_with_current_code: false
- blocking_file: lib/listings/public-listing-access.ts
- blocking_function: canPublishDbRowToPublicSurface
- blocking_condition: canPublishStructuredListing(row.source_name ?? '')
- display_patch_required: true

## Before / after

- initial pilot queries_executed: 64 -> 178
- initial pilot raw_results: 639 -> 1684
- initial pilot individual_candidates: 138 -> 234
- initial pilot unique URLs: 130 -> 228

## Verdict candidate

- PARTIAL

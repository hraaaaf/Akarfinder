# AkarFinder DB Recovery — Offline Listing Hunt — 2026-09-24

## Goal

Rebuild listing inventory by collecting and validating real-estate listing candidates entirely outside Neon until they are filtered, normalized, deduplicated, and explicitly approved for import.

## Success

A candidate may only reach a future `approved_for_import` artifact after:
1. individual-listing evidence;
2. admissible source/domain;
3. transaction + property type;
4. city/location consistency;
5. price/surface sanity when present;
6. canonical URL dedupe;
7. contradiction/anomaly review;
8. provenance retained.

No candidate collection step writes to Neon.

## Storage model confirmed

### Final business model

`property_listings` stores the normalized property:
- title
- price_mad
- city / district
- property_type / transaction_type
- surface / rooms / bedrooms / bathrooms
- description
- completeness / confidence
- duplicate / reliability signals
- advanced characteristics
- thumbnail reference

`listing_sources` stores the source evidence:
- property_listing_id
- source_name
- listing_url
- source_url
- first_seen_at / last_seen_at
- is_active

### Offline candidate model

The existing OpenSERP candidate JSONL model is retained as the recovery pattern:
- original_url
- canonical_source_url
- source_domain
- classification_lane
- classification_reasons
- extracted normalized fields
- provenance / evidence
- filter_status
- filter_reasons

## Offline funnel

`discovered`
→ `individual_listing` / `discovery_page` / `quarantine` / `reject`
→ canonical URL dedupe
→ field consistency checks
→ freshness/evidence check
→ `candidate_pass`
→ deeper batch review
→ future `approved_for_import` artifact

There is intentionally no DB step before the final approval artifact.

## Current evidence

Branch: `recovery/offline-listing-hunt-20260924`

Batch 01:
- 8 candidates
- 7 candidate_pass
- 1 quarantine
- cities: Casablanca 3 / Rabat 3 / Marrakech 2
- source: Mubawab

Batch 02:
- 3 candidates
- 2 candidate_pass
- 1 quarantine
- city: Casablanca
- source: Mouldar

Current offline total:
- 11 candidates
- 9 candidate_pass
- 2 quarantine
- 0 DB writes

Observed anomaly proving the need for the filter:
- Mouldar Racine listing `918f28e4`: search-index evidence showed 13,000 MAD while the current collection page displayed 1,300 MAD. Candidate quarantined; no DB write.

## Superseded path

PR #1091 (Neon Common Crawl seed staging) was closed unmerged after the strategy change. No DB write occurred.

## Next exact

Expand offline discovery across multiple admissible sources, keep only direct individual-listing candidates, then run cross-source canonical/fingerprint dedupe before any consideration of Neon import.

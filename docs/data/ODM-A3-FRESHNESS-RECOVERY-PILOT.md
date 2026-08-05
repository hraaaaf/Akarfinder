# ODM A3 — Freshness Recovery Pilot

## Scope

A3 measures whether the structured `AMBIGUOUS` candidates identified by A2 for `daragadir.com` and `promoimmomarrakech.com` have recent, exact, already-persisted public-sitemap observations.

The pilot does not fetch any detail page, copy content, change ranking, publish a representation, or reclassify a document as `LISTING`.

## Evidence boundary

Accepted evidence must satisfy every condition below:

1. provider is `public_sitemap`;
2. compliance policy is `canonical_link_only`;
3. canonical URL matches exactly;
4. title and snippet are absent;
5. `detail_fetch=false`;
6. `content_reuse=false`;
7. `shadow_only=true`;
8. `public_activation=false`.

A sitemap or robots declaration is evidence of discoverability only. It is never interpreted as a content-reuse licence.

## Pilot freshness windows

- `fresh`: exact sitemap observation no older than 14 days;
- `aging`: older than 14 days but no older than 30 days;
- `stale`: older than 30 days;
- `unmatched`: no exact persisted sitemap observation;
- `invalid_future`: observation timestamp beyond the accepted clock-skew tolerance.

Only `fresh` rows are freshness-qualified by this pilot. Even a freshness-qualified row remains non-public and non-reclassified until a separate reviewed LOT activates it.

## Pre-migration production audit — 5 August 2026

| Source | Structured A2 candidates | Exact sitemap matches | Unmatched |
|---|---:|---:|---:|
| daragadir.com | 6,319 | 5,566 | 753 |
| promoimmomarrakech.com | 2,547 | 2,491 | 56 |
| **Total** | **8,866** | **8,057** | **809** |

The oldest matching observations were recorded on 22 July 2026 and the newest on 28 July 2026. At the execution time of the pilot, all 8,057 exact matches are within the strict 14-day window.

## Projected depth

This LOT does not change the truthful A1 baseline of 7,483 public `LISTING` rows.

If every freshness-qualified row later passes a separate reclassification, deduplication and activation review, the projected representation depth would be:

```text
7,483 + 8,057 = 15,540
```

The remaining gap to 40,000 would be 24,460.

This projection is not current certified inventory.

## Network limitation

The execution environment could not resolve the two external domains during this LOT. No live sitemap refresh is claimed. A3 therefore uses only public-sitemap observations already persisted by previous connected acquisition runs.

The 809 unmatched rows remain blocked until a future connected sitemap refresh or another policy-compliant freshness proof is available.

## Database objects

- `odm_a3_freshness_recovery_audit_v1`: service-role-only audit table;
- `odm_refresh_a3_freshness_recovery_pilot_v1(...)`: idempotent audit materialization;
- `odm_a3_freshness_recovery_report_v1()`: aggregate report and gates;
- `odm_a2_recoverable_listing_depth_report_v2()`: corrected A2 report using the A3 freshness contract.

## A2 vocabulary correction

A2 V1 compared `thin_index_search_documents.freshness_status` with `fresh/aging`, while that seed-status column uses values such as `fresh_confirmed/seed_only`.

A2 V1 remains available for compatibility but its freshness-dependent `public_recoverable_now` field is deprecated. A2 V2 is canonical and derives validated freshness from the A3 audit.

## Fail-closed guarantees

- no automatic `LISTING` reclassification;
- no public activation;
- no ranking change;
- no detail-page request;
- no content reuse;
- only the two pilot sources;
- only exact canonical URL matches;
- audit and reports accessible only to `service_role`;
- candidate depth is never represented as certified inventory.

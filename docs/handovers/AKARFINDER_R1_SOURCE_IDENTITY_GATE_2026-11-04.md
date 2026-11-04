# R1 — Identity contract and cross-inventory gate (2026-11-04)

## Goal
Demonstrate stable source-scoped IDs across **two independent authorized inventories** before adding any source to the historical union. Local key/URL agreement alone is not sufficient.

## Verified SQL on archived Neon recovery (read-only)
- **Domio**: 10,300 rows; 10,300 IDs parsed from `/{lang}/{type}/{transaction}/{city}/{id}/{slug}`; 10,300 distinct; 3,462/3,462 explicit numeric keys match; 6,838 absent keys; no route-ID collision.
- **Sarout**: 28,709 rows; 14,404 distinct IDs parsed from `/{fr|ar}/annonce/{id}/{slug}`; 432/432 explicit numeric keys match; 14,305 FR/AR pairs; 99 singletons; no normalized route or explicit-key conflicts.
- **Agenz**: 6,810 rows; 3,787/3,787 explicit numeric keys match terminal numeric segment, including 2- and 3-digit IDs; 15 opaque UUID-format keys. Of 853 repeated numeric suffix groups, 723 are explained solely by FR/EN normalized routes and 130 have distinct routes. One normalized URL has both a numeric and UUID explicit key. **Never merge by suffix alone.**
- **MarocImmo**: 37,268 rows with zero explicit source keys; descriptive slugs are not proven stable source IDs.

## Backup constraint
The published R0 backup aggregate shows `seed:domio.ma=4`, `seed:agenz.ma=5372`, `listing_source:agenz=1107`, `seed:sarouty.ma=834`, `listing_source:sarouty=353`. These are **counts, not individual IDs**. `sarouty.ma` must not be equated with `sarout.ma`. The isolated GitHub inventory ZIP contains only Avito and Mubawab; it cannot support these joins.

## Safe next execution
1. Locate the **authorized PostgreSQL dump** or export its three fields `source_name,listing_url,source_offer_key` locally. Do not upload the raw export or any URLs/IDs.
2. Obtain a matching read-only export from the archived Neon recovery branch (not production).
3. Normalize each source's URL-specific ID independently; reject numeric-key mismatches and quarantine opaque keys. Do not join by title, price, or bare numeric ID across sources.
4. Compute intersection, left-only, right-only, collision groups, and parser failures **in memory**, publishing aggregate counts only. Add automated synthetic tests.
5. Require legal/reuse authorization, current activity, freshness, and physical deduplication independently. **No source can be added to fresh_unique_eligible based on identity alone.**

## Decision
R1 identity stability **NOT VERIFIED**. R0 historical union remains **136,716 Avito+Mubawab**. No DB writes, restores, crawls, merges or deployments.

# AkarFinder — V4.11 pre-DB verification campaign — 2026-09-27

## Decision

No remaining V4.11 row may be transferred to Neon before verification.

The former 213,992-row raw_listings staging plan is superseded. The database is not a verification queue.

## Baseline

- Clean Corpus V4.11: 226,286 rows
- Scope eligible: 222,359
- Already imported and certified on isolated Neon: 8,367
- Remaining to verify before DB: 213,992
- Database writes authorized for these remaining rows: 0

## Verification states

### 1. existence_verified

Recent evidence that the listing representation still exists:
- direct HTTP200 on the listing page; or
- membership in a recent official source sitemap with certified provenance.

This state alone is NOT DB-ready.

Current offline evidence:
- sitemap_only: 76,081
- http200+sitemap: 76
- http200_only: 2
- unique existence_verified: 76,159
- unresolved existence: 137,833

### 2. product_fields_verified

Minimum product fields are directly extracted or deterministically mapped without guessing:
- title
- city
- property_type
- transaction_type
- published_at / freshness evidence
- canonical URL + source identity

Optional fields may remain null:
- price
- surface
- district
- bedrooms
- description

Contradictions must be flagged, never silently overwritten.

### 3. db_ready

A row is DB-ready only when all are true:
- classification = KEEP
- scope_eligible = true
- existence_verified = true
- product_fields_verified = true
- no unresolved contradiction affecting core identity/product fields
- cross-source identity policy passed
- approved_for_import explicitly granted for the selected cohort

## Existing 213,992-row evidence

Source distribution:
- mubawab.ma: 81,975
- sarout.ma: 43,362
- marocimmo.com: 32,795
- avito.ma: 23,804
- agenz.ma: 9,347
- domio.ma: 6,845
- daragadir.com: 4,787
- promoimmomarrakech.com: 3,716
- masaken.ma: 2,047
- mouldar.com: 1,641
- sarouty.ma: 941
- soukimmobilier.com: 926
- limmobiliersansfrontieres.com: 513
- aykana.ma: 474
- atlasimmobilier.com: 362
- 1immo.ma: 243
- kawtarimmobilier.com: 140
- marrakechrealty.com: 56
- marocannonces.com: 14
- barnes-marrakech.com: 4

Existing recent existence evidence:
- all 43,362 remaining Sarout URLs are present in the certified recent Sarout sitemap.
- all 32,795 remaining MarocImmo URLs are present in the certified recent MarocImmo sitemap.
- 78 remaining rows have direct HTTP200 evidence, of which 76 overlap those sitemaps.
- unique existence_verified = 76,159.
- unresolved existence = 137,833.

## Execution strategy

1. Build a durable verification queue with exact source-specific unresolved URL files.
2. Reuse certified offline evidence before making any network request.
3. For unresolved sources, run robots-aware, paced, read-only verification in bounded batches.
4. Persist every verification result as an artifact, never directly to DB.
5. Enrich/validate required product fields from certified artifacts.
6. Build DB-ready cohorts only after the verification gate passes.
7. Obtain explicit human approval for each import cohort.
8. Import only DB-ready cohorts to isolated Neon, then read back and smoke-test.

## Safety

- No remaining-row DB writes before verification.
- No raw_listings staging as a substitute for verification.
- No production Neon writes.
- No Vercel deployment.
- Transient HTTP503/status0 never means expired.
- robots deny/unknown => skip and route to alternative evidence, never force-fetch.

## Next exact

Finish the durable 213,992-row verification queue, then run a bounded read-only pilot on the largest unresolved source before scaling.

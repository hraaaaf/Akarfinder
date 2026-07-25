# ODM-03 — Price / Surface / Geo Recovery

Status: COMPLETE — implementation staged, no Production deployment.

## Baseline — 2026-07-25

- Search/Thin Index representations: 55,933
- explicit city: 2,009
- explicit property type: 2,009
- explicit intent: 2,009
- conservatively recoverable surface from public title/snippet/URL evidence: 1,788
- conservatively recoverable explicit MAD price: 979
- duplicate canonical URLs: 0
- unexpected providers: 0

## Doctrine

Recovery is deterministic and evidence-preserving. Missing values stay NULL. No value is inferred from ingestion time, generic query wording, market averages or another listing. Price requires an explicit MAD/DH marker. Surface requires an explicit m²/m2 marker. City recovery is limited to an audited alias list and exact token boundaries.

## Implementation

The companion migration extends the Thin Index projection with nullable `price_mad`, `surface_m2`, `recovered_city`, `recovery_confidence` and `recovery_evidence` fields. It adds immutable conservative extractors, updates the canonical sync trigger, backfills through the existing source-of-truth rows and extends the bounded RPC response.

Priority of evidence:

1. structured approved Serper metadata for city/type/intent;
2. explicit title/snippet facts for price and surface;
3. canonical URL token evidence for city only;
4. otherwise NULL.

## Safety gates

- no fabricated zero values;
- no price without explicit MAD/DH evidence;
- price range: 10,000–1,000,000,000 MAD;
- surface range: 10–5,000 m²;
- no neighborhood claim until the canonical geography registry is validated;
- no rejected/unclassified publication;
- provider gates unchanged;
- source URL and raw evidence preserved;
- idempotent backfill;
- no Vercel configuration change;
- no automatic Production deployment.

## Certification queries

`scripts/data/odm_03_recovery_audit.sql` verifies coverage, ranges, duplicate URLs, provider purity and evidence consistency after migration application.

## Handoff to ODM-04

ODM-04 may normalize recovered values into canonical display/ranking contracts only after this migration passes ephemeral database validation and the audit returns zero unsafe rows.
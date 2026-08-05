# ODM A4 — Freshness Activation Readiness

## Scope

A4 evaluates whether the 8,057 freshness-qualified A3 candidates from `daragadir.com` and `promoimmomarrakech.com` are technically ready to enter a later, separately reviewed activation LOT.

A4 does not publish, reclassify, rank, fetch a detail page, or reuse source content.

## Production audit — 5 August 2026

| Gate | Result |
|---|---:|
| A3 freshness-qualified candidates | 8,057 |
| Exact canonical URL collisions with certified LISTING inventory | 0 |
| Seed ID collisions with certified LISTING inventory | 0 |
| Invalid or empty canonical URLs | 0 |
| Missing city/type/intent dimensions | 0 |
| A3 provenance-contract violations | 0 |
| Premature publication or reclassification flags | 0 |

The audit is deliberately limited to exact deterministic blockers. It does not claim semantic property-level deduplication from title, address, imagery, price, coordinates, or description because canonical-link-only evidence does not lawfully provide those fields.

## Readiness gates

A candidate is marked `ready_for_separate_activation_review` only when every condition below is true:

1. A3 freshness is qualified;
2. the A3 row still maps to the same `AMBIGUOUS` search document by `seed_id`;
3. the canonical URL is unchanged;
4. city, property type and intent remain complete;
5. no current certified `LISTING` has the same canonical URL;
6. no current certified `LISTING` has the same seed ID;
7. Source Registry exists;
8. display policy remains `canonical_link_only`;
9. discovery policy remains `public_sitemap_only`;
10. provenance remains `public_sitemap`, with exact canonical-link evidence only;
11. detail fetch, content reuse and public activation remain false.

## Evidence boundary

A4 is a readiness audit, not a deduplication claim at property level.

The current lane contains canonical URLs and normalized dimensions, but no policy-compliant detail content. A4 therefore certifies only:

- exact URL non-collision;
- seed non-collision;
- canonical stability;
- source-policy compatibility;
- persisted provenance compatibility.

A later activation LOT must still preserve canonical clustering and rollback capability. It must not infer that two different URLs necessarily represent different physical properties.

## Database objects

- `odm_a4_activation_readiness_audit_v1`: service-role-only row-level audit;
- `odm_refresh_a4_activation_readiness_v1()`: idempotent materializer;
- `odm_a4_activation_readiness_report_v1()`: aggregate readiness report.

## Fail-closed guarantees

- `publication_eligible=false` for every A4 row;
- `reclassification_eligible=false` for every A4 row;
- no update to `thin_index_search_documents`;
- no update to seeds or discovery observations;
- no ranking change;
- no detail-page request;
- no content or imagery reuse;
- audit objects inaccessible to `PUBLIC`, `anon` and `authenticated`;
- execution restricted to `service_role`;
- projected depth is not certified inventory.

## Next LOT

A5 may perform a small reversible activation canary only after A4 production verification and review. A5 must define an explicit batch size, rollback procedure, before/after counts, search-quality checks and canonical-cluster safeguards.
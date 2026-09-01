# AKARFINDER — Morocco Web Real-Estate Acquisition

Status: ACTIVE — L1 CLOSED / L2 ACTIVE

## North-star Goal

Build and maintain the most exhaustive practical index of **public Moroccan real-estate inventory available on the web**, regardless of source.

The system must discover, retrieve, classify, normalize, deduplicate, refresh and serve public property inventory from large portals, specialist portals, agencies, developers and the long tail of Moroccan real-estate websites.

## Success criteria

1. Multiple independent acquisition channels are productive.
2. Large Moroccan portals and long-tail domains are represented.
3. Hundreds of thousands of unique candidate URLs can be discovered and classified at scale.
4. Active property pages can be retrieved and normalized into the canonical listing model.
5. Cross-source duplicates are measured and collapsed without losing provenance.
6. Freshness is maintained by revisits and change detection.
7. Production ingestion is bounded, auditable and reversible.
8. Serving exposes only validated canonical listings.
9. Coverage is measured by source, geography, type, transaction and freshness.

## Guardrails

- Public content only.
- No CAPTCHA bypass, credential abuse, fingerprint spoofing or block-evasion proxy rotation.
- No private/internal API dependency unless explicitly authorized and legitimately public for use.
- Back off on hard blocks / 429.
- No production DB write before bounded dry-run + rollback evidence.
- No Vercel deployment without explicit human authorization.

## Architecture target

Discovery Mesh → candidate URL classifier → source adapters → public-page extraction → canonical normalization → provenance + dedupe → freshness engine → bounded writer → serving → coverage observability.

Discovery channels: direct portal pages, public sitemaps, public listing pagination, Common Crawl/public indexes, agency/promoter/specialist domains, OpenSERP/query-universe as a secondary channel.

## L1 — Multi-source Discovery Proof — CLOSED

Goal: prove reproducible substantial Moroccan public real-estate discovery without depending on Avito.

Certified evidence:
- Run `33546156641` — SUCCESS.
- Evidence HEAD `45faf198a7a12348a742aea7f63423fa429788d8`.
- **5,849 unique candidate URLs**.
- **3 productive independent sources**: Sarouty 5,025; Mubawab 504; MarocAnnonces 320.
- `zeroDbWrites: true`.
- `forbiddenInternalApiUsed: false`.
- Artifact `9815567495`.
- Artifact SHA256 `8220952021247a0f4901242bb91ddb893cf8ff453f82b8fc066fa0dbaa9e0bac`.

Closeout proof:
- PR #966 merged.
- Merge/main HEAD `9722a1368fd35d08c35dad86d2973b899b3b232b` verified on `main`.
- Final pre-merge HEAD `1ba10c6b5cb5dc1ca2efd98186c598fb42bcc615`: 7/7 observed PR workflows SUCCESS.
- No push workflow exists for the L1 discovery canary on `main`; its committed trigger is branch-scoped to `spike/morocco-web-full-acquisition` plus `workflow_dispatch`. Therefore no post-merge push run is expected. Post-merge proof is the verified signed merge commit on `main` containing the certified L1 code/evidence.

Boundary: these are candidate URLs, not validated canonical production listings.

## L2 — Portal Acquisition Adapters — ACTIVE

Goal: turn productive discovery surfaces into deterministic source adapters.

Success:
- source-specific deterministic discovery logic;
- stable listing URL extraction;
- bounded rate/backoff behavior;
- fixtures and tests;
- exact failure classification for 403/429/timeout/schema drift;
- live dry-run evidence with zero DB writes.

Priority: **Sarouty first**, because L1 yielded 5,025 public candidate URLs from its sitemap surfaces.

Current L2 branch: `feat/morocco-web-l2-sarouty-adapter`, based on `main@9722a1368fd35d08c35dad86d2973b899b3b232b`.

## L3 — Open-Web Discovery Mesh

Common Crawl/public-index discovery, automatic Moroccan real-estate domain identification/ranking, sitemap harvesting and material long-tail net-new candidates.

## L4 — Canonical Classification + Extraction

Exact real-estate classification, canonical fields with field-level provenance, city/district/type/transaction normalization, representative fixtures, reject ambiguity instead of guessing.

## L5 — Cross-Source Deduplication

Deterministic exact URL/ID handling plus audited fuzzy cross-source property clustering while preserving all source URLs.

## L6 — Freshness + Revisit Engine

Source-aware revisit cadence, active/removed/changed detection, price/content history and measurable freshness.

## L7 — Bounded Production Ingestion

Dry-run manifest, official bounded idempotent writer, rollback manifest, before/after DB deltas. Human gate before production write.

## L8 — Scale + Coverage Certification

Scale gates: 10k → 50k → 100k → 250k → 500k candidate/active inventory where the public market supports it, with coverage measured by source/city/type/transaction/freshness.

## L9 — Serving + Continuous Operations

Validated canonical records only, scheduled acquisition/revisit jobs, source-collapse/schema-drift monitoring, runtime/cost budgets and serving validation.

## Execution order

L1 ✅ → **L2 ACTIVE** → L3 → L4 → L5 → L6 → L7 → L8 → L9.

Overall program percentage remains intentionally unassigned until the roadmap defines a stable denominator across the remaining lots.

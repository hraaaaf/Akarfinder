# DATA-4.0 — Large Reservoir Depth Audit

Status: audit-only implementation for **Mubawab + Avito immobilier**.

This document is a technical specification/evidence note subordinate to `docs/ROADMAP.md`.

## Objective

Measure, without activating or scraping a source, the gap between:

`PUBLIC VISIBLE → DISCOVERED/SEEDED → NORMALIZED → TECHNICALLY DISPLAYABLE → POLICY-ACTIVABLE`

The final stage is mandatory. A technically displayable row is **not** public inventory when Source Registry/freshness gates keep it hidden or internal-only.

## Sources in DATA-4.0

### Mubawab

Bounded public evidence observed 2026-08-07:

- homepage: `https://www.mubawab.ma/fr/`;
- public homepage counter observed: **106,947 properties**;
- robots: `https://www.mubawab.ma/robots.txt`;
- CGU/legal surface: `https://www.mubawab.ma/fr/privacy`;
- current terms evidence restricts extraction/reuse/commercial exploitation;
- this count is a market-depth signal only and does not authorize collection of the missing inventory.

Current audit recommendation:

`PARTNERSHIP_OR_PUBLIC_INDEX_MEASUREMENT`

No direct-fetch expansion is part of DATA-4.0.

### Avito

Bounded public evidence observed 2026-08-07:

- homepage: `https://www.avito.ma/`;
- robots: `https://www.avito.ma/robots.txt`;
- robots declares `https://www.avito.ma/sitemap.xml`;
- no reliable national real-estate inventory counter was observed in the bounded check.

DATA-4.0 therefore records Avito public inventory as **unknown**, not estimated.

Current audit recommendation:

`REGISTRY_REVIEW_BEFORE_SITEMAP_MEASUREMENT`

The current Registry allows public-index/Common Crawl internal signals, not a sitemap harvest. The sitemap declaration is technical evidence only.

## Production baseline observed before implementation

Read-only production queries showed:

| Source | Registry representations | Normalized | Technical display-eligible |
|---|---:|---:|---:|
| avito.ma | 23,925 | 23,925 | 231 |
| mubawab.ma | 10,693 | 11,209 | 3,354 |

Normalization breakdown:

### Avito

- normalized rows: **23,925**;
- `unavailable`: **22,227**;
- `normalized`: **1,691**;
- `partial`: **7**;
- `fresh_confirmed`: **9**.

This means roughly **92.9%** of the normalized-document reservoir is currently `normalization_status=unavailable`.

### Mubawab

- normalized rows: **11,209**;
- `unavailable`: **7,506**;
- `normalized`: **3,277**;
- `partial`: **426**;
- `fresh_confirmed`: **902**.

The quality view also shows Mubawab currently has materially more structured/high-quality rows than Avito, but both sources remain governed by Source Registry.

## Policy baseline

### Mubawab

Current Registry:

- `authorization_status=prohibited`;
- `detail_fetch_policy=permission_required`;
- `content_reuse_policy=prohibited`;
- `display_policy=internal_signal_only`;
- `display_gate=hidden`.

### Avito

Current Registry:

- `authorization_status=unverified`;
- `detail_fetch_policy=legal_review_required`;
- `content_reuse_policy=unknown`;
- `display_policy=internal_signal_only`;
- `display_gate=hidden`.

For both sources the current freshness policy evaluation reports `publication_eligible=false`.

Therefore the current **policy-activable public row count is 0**, regardless of historical/technical display-eligibility views.

## Implementation

Files:

- `scripts/data4/reservoir-depth-audit.ts` — deterministic audit model;
- `scripts/data4/public-evidence.json` — bounded public evidence snapshot;
- `scripts/data4/__tests__/reservoir-depth-audit.test.ts` — truth/fail-closed tests;
- `scripts/audits/data-4-large-reservoir-depth-audit.ts` — live read-only Supabase runner;
- `.github/workflows/data-4-large-reservoir-depth-audit.yml` — contract + live evidence gate.

The live job reads only:

- `source_policy_registry`;
- `source_freshness_evaluation_v1`;
- `odm_10d_source_quality_report`;
- `discovery_candidates`;
- `source_offer_seeds`;
- `thin_index_normalized_documents_v2`;
- `public_search_representations_v1`;
- `thin_index_display_eligible_v1`.

It performs **no DB write**.

## Required outputs

- `report.json`;
- `report.md`;
- `report.csv`;
- `proof.json`.

CI must fail unless:

- source count = 2;
- read-only = true;
- writes = 0;
- policy changes = 0;
- scraper runs = 0;
- sitemap harvests = 0;
- direct fetches = 0;
- current policy-activable rows = 0;
- Mubawab public counter evidence is present;
- Avito public count remains explicitly unknown.

## Decision gate after DATA-4.0

DATA-4.0 does **not** choose a new policy or connector.

It decides which next investigation has the best marginal value:

1. **Avito internal recovery** — explain/recover `normalization_status=unavailable` without direct source fetching; this may improve internal market intelligence but not public SERP volume while the Registry stays hidden.
2. **Avito policy re-review** — only after explicit evidence; if a future policy allows sitemap discovery, measure sitemap depth in a separate bounded lot.
3. **Mubawab partnership/licence path** — the public market-depth gap is large, but current terms make direct expansion inappropriate without permission.
4. **Authorized/first-party sources** — if the launch KPI is public SERP depth, prioritize sources/feeds whose Registry can actually become displayable rather than counting hidden reservoir rows as launch inventory.

## Non-goals

- no scraper;
- no WARC;
- no sitemap download/harvest;
- no direct listing-page fetch;
- no terms bypass;
- no policy update;
- no ingestion;
- no public activation.

# DATA-4.0 — Large Reservoir Depth Audit

Status: audit-only implementation for **Mubawab + Avito immobilier**.

This document is a technical specification/evidence note subordinate to `docs/ROADMAP.md`.

## Objective

Measure, without activating or scraping a source, the gap between:

`PUBLIC VISIBLE → DISCOVERED/SEEDED → NORMALIZED → TECHNICALLY DISPLAYABLE → POLICY-ACTIVABLE`

The final stage is mandatory. A technically displayable row is **not** public inventory when Source Registry gates keep it hidden or internal-only.

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

## Certified production evidence

Workflow run **31191560681**, head **`3c457a0a24d2abbc592248010f49b2fce317f14e`**.

Artifact: `data-4-0-large-reservoir-depth-audit`  
Digest: `sha256:5bb3dd79fa6a6c64b00a5b0baca9fb0a7af30a7149846d766e7c4fd6f721afb2`

Proof:

- read-only: **true** ;
- writes performed: **0** ;
- source count: **2** ;
- normalized rows: **35,134** ;
- technical display-eligible rows: **3,588** ;
- policy-activable rows: **0** ;
- normalization unavailable rows: **29,733** ;
- fresh-confirmed rows: **912** ;
- policy changes: **0** ;
- scraper runs: **0** ;
- sitemap harvests: **0** ;
- direct fetches: **0** ;
- Mubawab public count observed: **true** ;
- Avito public count observed: **false**.

### Avito — certified live snapshot

- discovery candidate rows: **7,128** ;
- offer seeds: **23,925** ;
- normalized rows: **23,925** ;
- `normalization_status=unavailable`: **22,227** ;
- `normalized`: **1,691** ;
- `partial`: **7** ;
- `fresh_confirmed`: **10** ;
- technical Search representations: **231** ;
- technical display-eligible rows: **231** ;
- normalized → technical display ratio: **~1.0%** ;
- unavailable normalization ratio: **~92.9%** ;
- policy-blocked technical display rows: **231** ;
- public inventory: **unknown**.

Quality view at certification time:

- real-estate rows: **1,339** ;
- average score: **29.23** ;
- median: **26** ;
- Tier A/B/C/D/E: **0 / 4 / 220 / 1,115 / 0** ;
- with city: **208** ;
- with price: **0** ;
- with surface: **36**.

Primary finding: Avito is not currently bottlenecked only by discovery. The dominant internal gap is **seed/normalization depth**: about 92.9% of its normalized-document reservoir is unavailable and only 10 rows are fresh-confirmed.

### Mubawab — certified live snapshot

- discovery candidate rows: **10,070** ;
- offer seeds: **11,209** ;
- normalized rows: **11,209** ;
- `normalization_status=unavailable`: **7,506** ;
- `normalized`: **3,277** ;
- `partial`: **426** ;
- `fresh_confirmed`: **902** ;
- technical Search representations: **3,357** ;
- technical display-eligible rows: **3,357** ;
- public announced inventory: **106,947** ;
- public → normalized gap: **95,738** ;
- normalized/public ratio: **~10.5%** ;
- normalized → technical display ratio: **~29.9%** ;
- unavailable normalization ratio: **~67.0%** ;
- policy-blocked technical display rows: **3,357**.

Quality view at certification time:

- real-estate rows: **11,209** ;
- average score: **35.75** ;
- median: **32** ;
- Tier A/B/C/D/E: **576 / 370 / 2,445 / 7,818 / 0** ;
- with city: **2,463** ;
- with price: **100** ;
- with surface: **767**.

Primary finding: Mubawab has a very large public-depth gap, but current terms/Registry make that gap a **partnership/licence or bounded public-index question**, not a direct crawling target.

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

A separate read-only SQL check also observed `publication_eligible=false` for both current source freshness evaluations. The CI runner does **not** depend on that REST-inaccessible view; the current Source Registry `hidden/internal_signal_only` gates are already sufficient to make policy-activable rows zero.

Therefore the current **policy-activable public row count is 0**, regardless of historical/technical display-eligibility views.

## Implementation

Files:

- `scripts/data4/reservoir-depth-audit.ts` — deterministic audit model;
- `scripts/data4/public-evidence.json` — bounded public evidence snapshot;
- `scripts/data4/__tests__/reservoir-depth-audit.test.ts` — truth/fail-closed tests;
- `scripts/audits/data-4-large-reservoir-depth-audit.ts` — live read-only Supabase runner;
- `.github/workflows/data-4-large-reservoir-depth-audit.yml` — contract + live evidence gate.

The live CI job reads only REST-exposed data from:

- `source_policy_registry`;
- `odm_10d_source_quality_report`;
- `discovery_candidates`;
- `source_offer_seeds`;
- `thin_index_normalized_documents_v2`;
- `public_search_representations_v1`;
- `thin_index_display_eligible_v1`.

It performs **no DB write**.

The first live attempt was rejected read-only because `source_freshness_evaluation_v1` was not available through the configured PostgREST surface. That dependency was removed; no data or policy was changed. The certified second run passed completely.

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

The evidence now separates three bottlenecks:

1. `PUBLIC MARKET → DISCOVERED/NORMALIZED` ;
2. `NORMALIZED → TECHNICAL DISPLAY` ;
3. `TECHNICAL DISPLAY → POLICY-ACTIVABLE`.

Recommended next investigations:

1. **DATA-4.1 — Avito Internal Reservoir Recovery Audit**: explain the **22,227 unavailable rows** and test what can be recovered from already-held seed/index evidence, with **no direct source fetch**. This can improve internal intelligence but cannot create public inventory while Registry remains hidden.
2. **Avito policy re-review**: separate future lot. Only if explicit evidence changes the Registry may sitemap depth be measured; the sitemap declaration alone is never permission.
3. **Mubawab partnership/licence path**: the public gap is **95,738** against the certified snapshot, but current terms make direct expansion inappropriate without permission.
4. **Authorized/first-party sources**: for the public 20K launch goal, favor feeds/sources whose Registry can actually become displayable instead of counting hidden reservoir rows as public inventory.

## Non-goals

- no scraper;
- no WARC;
- no sitemap download/harvest;
- no direct listing-page fetch;
- no terms bypass;
- no policy update;
- no ingestion;
- no public activation.

# AKARFINDER — Morocco Web Real-Estate Acquisition

Status: ACTIVE — L1 CLOSED / L2 CLOSED / L3 CLOSED / L4 CLOSED / L5 CERTIFIED — MERGE PENDING

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

## L2 — Portal Acquisition Adapters — CLOSED

Goal: turn productive discovery surfaces into deterministic source adapters.

Success criteria:
- source-specific deterministic discovery logic;
- stable listing URL extraction;
- bounded rate/backoff behavior;
- fixtures and tests;
- exact failure classification for 403/429/timeout/schema drift;
- live dry-run evidence with zero DB writes.

### Sarouty adapter — CLOSED

- PR #968 merged into `main`.
- Merge/main HEAD `f75d236d383f4ebfc44581b8540a762ce5869e0c` verified and signed.
- Dedicated run `33555795314` — SUCCESS.
- Unit tests: **6/6 PASS**.
- Live public dry-run: **5,025 candidate URLs** from **6** property sitemaps.
- Root + child sitemap requests: **7/7 HTTP 200 / classification ok**.
- `stoppedEarly: null`.
- `zeroDbWrites: true`.
- Artifact `9819252085`.
- Artifact SHA256 `c1d9ca1f216ee1043c0d21fbf1368f003ec0c92cf8346af415b87a31fdb658ae`.

### Mubawab + MarocAnnonces adapters — CLOSED

- PR #971 merged into `main`.
- Final closeout HEAD `85570b4edf2be462dcd2f33ffe017751c6d1e933`: **7/7 observed general PR workflows SUCCESS**.
- Merge/main HEAD `b79073ceec087250914c2ca1c6dbd7cd7425c000` verified and signed.
- Dedicated run `33560329163` — SUCCESS.
- Unit tests: **6/6 PASS**.
- Live public dry-run: **1,236 candidate URLs** total.
  - Mubawab: **756** candidate URLs.
  - MarocAnnonces: **480** candidate URLs.
- Productive sources: **2/2**.
- Both sources completed without 429 early stop.
- `zeroDbWrites: true`.
- Artifact `9820996698`.
- Artifact SHA256 `ed2d33dfa347a2b2216091e7b095021ef019e76e7e73a0255ffcdd2be97b1d91`.

L2 closeout: all three productive L1 sources now have deterministic public discovery adapters merged on `main`. No post-merge run is required from the dedicated L2 workflows because both are branch-scoped plus `workflow_dispatch`; the signed merge commits on `main` contain the certified code and evidence.

Boundary: L2 certifies deterministic public discovery adapters and candidate URL extraction. It does **not** yet certify canonical field extraction, active-listing validation, deduplication or production ingestion.

## L3 — Open-Web Discovery Mesh — CLOSED

Goal: discover **net-new Moroccan real-estate domains and candidate URLs beyond the three L2 portals** using public web indexes and public site surfaces.

Success criteria:
- resolve the current Common Crawl collection dynamically from its public collection index;
- query the official Common Crawl columnar URL Index with bounded analytical filtering;
- identify and rank net-new `.ma` domains from real-estate hostname/path signals while excluding known portals;
- validate top-ranked domains against public robots/sitemaps and bounded public page probes;
- retain domain-level validation evidence and candidate provenance;
- fixture tests plus live dry-run evidence;
- hard stop on 429 from live site validation;
- zero production DB writes.

Final certified evidence:
- Dedicated run `33574912787` — **SUCCESS**.
- Evidence HEAD `42d85a6f7470b5f1920c52de83e9fa3cd982b20a`.
- Current crawl resolved dynamically: `CC-MAIN-2026-34`.
- Official URL Index manifest: **300 Parquet files**.
- Resilient bounded scan: **30/30 batches SUCCESS**, **300/300 Parquet files scanned**, **0 failed batches**.
- Broad filtered result: **200 raw `.ma` domains**, ranked to **12** top domains.
- **12/12 top domains live-validated** from public site surfaces.
- **263 candidate URLs** retained across validated domains.
- **63** bounded live validation requests.
- `stoppedEarly: null`.
- `zeroDbWrites: true`.
- Artifact `9826293287`.
- Artifact SHA256 `fde8e376f2552fbd5c21f545e7847730a5046f91bfa1d38a55a6d55702cd74e2`.
- Unit evidence on the final certified run: **5/5 Python tests PASS**.
- Exact evidence HEAD general PR workflows: **7/7 SUCCESS** (`33574917425`, `33574917428`, `33574917433`, `33574917546`, `33574917430`, `33574917460`, `33574917575`).

Closeout proof:
- Original draft PR #972 closed only because the connector Ready-for-review mutation failed on an upstream GitHub GraphQL schema mismatch; it was not closed for a code or CI defect.
- Replacement non-draft PR #973 merged by squash.
- Merge/main HEAD `f13ccd5e5ec490f395d6515ac693d09d246ae58a` verified and signed (`verification.reason=valid`).
- Merge parent is exact previous main `b79073ceec087250914c2ca1c6dbd7cd7425c000`.
- Final pre-merge docs HEAD `3e1420ac802c89b9a4b94ef15187dff65fa79d55`: **7/7 general PR workflows SUCCESS**.

Validated net-new domains include `immo.mitula.ma`, `immobilier.trovit.ma`, `leaderimmo.ma`, `immoservice.ma`, `www.alamal-immobilier.ma`, `proimmobilier.ma`, `www.immo.avision.ma`, `www.immoworld.ma`, `nouraimmobilier.ma`, `immobest.ma`, `logicimmo.ma`, and `www.damaneimmo.ma`.

Boundary: the **263 URLs are open-web discovery candidates**, not 263 certified active listing-detail pages. The set can contain property pages, category/search/discovery pages and sitemap-derived real-estate surfaces. Exact listing-detail classification, active-page validation and canonical field extraction belong to L4.

## L4 — Canonical Classification + Extraction — CLOSED

Goal: turn public candidate property pages from L2/L3 into **validated canonical listing records with field-level provenance**, while rejecting unsupported or ambiguous values instead of guessing.

Success criteria:
- deterministic listing-detail vs discovery-page classification;
- canonical extraction for transaction type, property type, city, neighborhood, price, surface, description, bedrooms, bathrooms, floor, orientation, parking and garage where supported by source evidence;
- source URL and field-level provenance retained for every extracted value;
- explicit null/reject behavior for unsupported or ambiguous fields;
- representative fixtures across L2 portals and L3 long-tail domains;
- live bounded public dry-run with active-page validation;
- zero production DB writes.

Certified evidence:
- Dedicated run `33575936001` — **SUCCESS**.
- Evidence HEAD `3a95dc896500a6681c35c85ad9c5f1724ae60fbd`.
- Unit tests: **6/6 PASS**.
- Bounded public live dry-run: **5 targets**.
- Portal discovery produced **2** public candidate pages during the run.
- **3 listing-detail pages** classified and extracted.
- `property_type` present on **3/3** extracted listing details.
- `transaction_type` present on **3/3** extracted listing details.
- `price` or `surface` present on **3/3** extracted listing details.
- `stoppedEarly: null`.
- `zeroDbWrites: true`.
- Artifact `9826611834`.
- Artifact SHA256 `65ec2f57401166130995f1df17febc98f65ebdc6287303fed17570e1605781ae`.
- Final closeout HEAD `8162ad0f6d1fa6a6cc24ab7fceb56d2f1fab514a`: **7/7 general PR workflows SUCCESS**.

Closeout proof:
- Replacement non-draft PR #976 merged by squash after the connector Ready-for-review mutation failed on draft PR #975.
- Merge/main HEAD `1af4847b268471c0d93aa0d34e04fece804a57d9` verified and signed (`verification.reason=valid`).
- Merge parent is `99e7ea78c305e45ffd07f9faa39315c0599bf378`.
- No post-merge PR-triggered workflows are expected on the merge SHA; the dedicated L4 workflow is branch-scoped plus `workflow_dispatch`.

Implementation boundary:
- values are emitted only when source text directly supports them;
- unsupported booleans are not inferred false;
- ambiguous fields remain null/rejected rather than guessed;
- each extracted field carries source URL + extraction evidence;
- this certifies bounded canonical extraction behavior, **not yet cross-source deduplication, freshness, production ingestion or serving**.

## L5 — Cross-Source Deduplication — CERTIFIED — MERGE PENDING

Goal: collapse duplicate representations of the same property across sources **without losing any source URL or provenance** and without over-merging distinct properties.

Success criteria:
- deterministic exact canonical URL and source-offer ID handling;
- cross-source candidate blocking on compatible geography, property type and transaction;
- conservative fuzzy matching using supported canonical facts only;
- strong contradiction guards for incompatible city/type/transaction and materially different price/surface evidence;
- every cluster preserves all member source URLs and per-source provenance;
- audited fixtures covering true duplicates, near-duplicates and false-positive traps;
- bounded dry-run report with cluster counts, singleton counts, merge reasons and rejected-pair reasons;
- zero production DB writes.

Certified evidence:
- Dedicated run `33577372699` — **SUCCESS**.
- Evidence implementation HEAD `f97d7cdb3cfa1e8089e92cebb5b59e3eef2d66f2`.
- Unit tests: **6/6 PASS**.
- Bounded dedupe dry-run: **6 records → 4 clusters**.
- **2 merged clusters** and **2 singletons**.
- `zeroDbWrites: true`.
- Artifact `9827116907`.
- Artifact SHA256 `dd3f2b9d165692174c57e4aed5a17cfd54639ef84b0163be4765ef00c2ad7d29`.
- Exact implementation HEAD general PR workflows: **7/7 SUCCESS** (`33577389491`, `33577389310`, `33577389337`, `33577389486`, `33577389315`, `33577389407`, `33577389311`).
- Final canonical closeout HEAD `c9d21b96ec8951c1636f826385bf6f93371eb289` records the certified evidence without changing the dedupe implementation.

Implementation boundary:
- same-source fuzzy matches do not merge without an exact source offer ID;
- incompatible city, property type or transaction blocks a merge;
- surface differences above 25% and price differences above 35% block fuzzy merging;
- every merged cluster retains member source IDs and source URLs;
- this certifies deterministic/conservative clustering behavior on bounded audited fixtures, **not yet production-scale duplicate prevalence or DB mutation**.

Current L5 branch: `feat/morocco-web-l5-cross-source-dedupe`, based on `main@1af4847b268471c0d93aa0d34e04fece804a57d9`.

## L6 — Freshness + Revisit Engine

Source-aware revisit cadence, active/removed/changed detection, price/content history and measurable freshness.

## L7 — Bounded Production Ingestion

Dry-run manifest, official bounded idempotent writer, rollback manifest, before/after DB deltas. Human gate before production write.

## L8 — Scale + Coverage Certification

Scale gates: 10k → 50k → 100k → 250k → 500k candidate/active inventory where the public market supports it, with coverage measured by source/city/type/transaction/freshness.

## L9 — Serving + Continuous Operations

Validated canonical records only, scheduled acquisition/revisit jobs, source-collapse/schema-drift monitoring, runtime/cost budgets and serving validation.

## Execution order

L1 ✅ → L2 ✅ → L3 ✅ → L4 ✅ → **L5 CERTIFIED — MERGE PENDING** → L6 → L7 → L8 → L9.

Overall program percentage remains intentionally unassigned until the roadmap defines a stable denominator across the remaining lots.

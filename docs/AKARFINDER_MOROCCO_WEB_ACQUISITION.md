# AKARFINDER — Morocco Web Real-Estate Acquisition

Status: ACTIVE — L1 CLOSED / L2 CLOSED / L3 CLOSED / L4 CLOSED / L5 CLOSED / L6 CLOSED / L7 CLOSED

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

## L5 — Cross-Source Deduplication — CLOSED

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
- Canonical evidence is pinned in docs-only closeout commits after the certified implementation HEAD; these commits do not change dedupe behavior.

Closeout proof:
- PR #978 squash-merged.
- Final PR HEAD `58806569e763a399ec3def5a4ceca731ee448b83`.
- Merge/main HEAD `80d01647a481dfbae11c40826efe0fa1d8fd9986` verified and signed (`verification.reason=valid`).
- Merge parent is exact previous main `1af4847b268471c0d93aa0d34e04fece804a57d9`.

Implementation boundary:
- same-source fuzzy matches do not merge without an exact source offer ID;
- incompatible city, property type or transaction blocks a merge;
- surface differences above 25% and price differences above 35% block fuzzy merging;
- every merged cluster retains member source IDs and source URLs;
- this certifies deterministic/conservative clustering behavior on bounded audited fixtures, **not yet production-scale duplicate prevalence or DB mutation**.

## L6 — Freshness + Revisit Engine — CLOSED

Goal: maintain measurable listing freshness with source-aware revisit cadence, active/removed/changed detection, price/content history signals and conservative failure handling without false removals.

Success criteria:
- deterministic source-aware revisit intervals;
- stable fingerprint over serving-relevant canonical facts;
- explicit active/removed/changed outcomes;
- 404/410 can mark removed, while 403/429/5xx never imply removal by themselves;
- transient failures back off rather than create false removal;
- price and canonical-content changes are recorded;
- freshness buckets remain measurable;
- bounded fixture certification with zero production DB writes.

Certified evidence:
- Dedicated run `33606982260` — **SUCCESS**.
- Exact implementation HEAD `13dc4d5c3f229e4fbf62eeaec89c3eba39113805`.
- Unit tests: **7/7 PASS**.
- Bounded dry-run: **5 cases**.
- **4 active**, **1 removed**, **2 changed**.
- Transient 503 case preserved active with backoff.
- Blocked 403 case preserved active without false removal.
- `zeroDbWrites: true`.
- Artifact `9837396773`.
- Artifact SHA256 independently verified: `f5422a9bb7f3862e8b74e260e7c934e7e0690e8a17e8c5223c3a5d06fb14b028`.
- Exact implementation HEAD general PR workflows: **7/7 SUCCESS** (`33607012497`, `33607012435`, `33607012432`, `33607012388`, `33607012463`, `33607012429`, `33607012454`).

Implementation guarantees:
- source-aware base cadence: portal **24h**, agency **72h**, developer/promoter **96h**, long-tail **168h**;
- transient backoff is capped at **168h**;
- only explicit 404/410 responses mark a listing removed;
- 403 is classified blocked/invalid without removal;
- 429 and configured 5xx/timeout-like statuses are transient failures without removal;
- stable fingerprinting detects canonical content changes;
- explicit price delta is emitted when the canonical price changes;
- freshness buckets: `fresh_24h`, `fresh_72h`, `fresh_7d`, `stale_gt7d`.

Closeout proof:
- PR #980 squash-merged.
- Final pre-merge HEAD `2180b4b6a338932aeffb669920d498fad6c84ddd`.
- Merge/main HEAD `8bd9dc17d74bc17c895d142f711126c62ec1b58d` verified and signed (`verification.reason=valid`).
- Merge parent is exact previous main `80d01647a481dfbae11c40826efe0fa1d8fd9986`.

Boundary:
- L6 certifies the deterministic freshness/revisit decision engine on bounded audited fixtures.
- The core engine performs no network requests and no DB writes.
- Production persistence, bounded DB mutation and rollback belong to L7; continuous scheduling/operations belong to L9.

## L7 — Bounded Production Ingestion — CLOSED

Goal: provide a bounded, idempotent, fail-closed path into the existing `discovery_candidates` staging table, with explicit rollback identities and no production activation by default.

Success criteria:
- existing schema only; no migration required;
- dry-run performs zero DB writes;
- default batch limit **25**, hard cap **100**;
- optional domain allowlist enforced before any live write;
- live write requires `THIRD_PARTY_DB_INGESTION_ENABLED=true`;
- live write requires `DATABASE_PROVIDER=supabase` and service-role credentials;
- duplicate identities are idempotent no-ops rather than duplicate rows;
- rollback manifest records exact `(provider, query_hash, canonical_url)` identities;
- unit tests + dedicated dry-run certification + general PR CI;
- production DB write remains a human gate.

Certified evidence:
- Exact implementation HEAD `1d23804acc85f915569b916bdfca33f4e17e2a86`.
- Dedicated run `33614467721` — **SUCCESS**.
- Unit tests: **7/7 PASS**.
- Bounded dry-run: **3 input → 3 accepted / 0 rejected**.
- `zeroDbWrites: true`.
- Rollback manifest: **3 exact identities**.
- Artifact `9840326546`.
- Artifact SHA256 `24f9ab289626f325382f5f8dbc65f01d32e44a578c8c07d352314d0a59b1e2bb`.
- Exact implementation HEAD general PR workflows: **7/7 SUCCESS** (`33614471720`, `33614471773`, `33614471726`, `33614471751`, `33614471856`, `33614471741`, `33614471740`).

Implementation guarantees:
- target table is `discovery_candidates` only;
- L7 is **insert-only**: no update and no delete path in the writer;
- planner deduplicates repeated identities within the bounded batch;
- DB duplicate conflicts (HTTP 409 on the existing partial unique index) are treated as idempotent no-ops;
- non-409 HTTP failures remain fatal;
- live credentials are never needed for the certified dry-run;
- no schema mutation, no production DB write and no Vercel deployment occurred during certification.

Closeout proof:
- PR #982 squash-merged.
- Final PR HEAD `96b86df7c2498d5cb2ceb4043940612ab94528a7`.
- Merge/main commit `75b9e85818f02d77e3443aec701f3d88020cb380` verified and signed (`verification.reason=valid`).
- Merge parent is exact previous main `4caee59bfcae130bf7479207421086a140b06883`.
- `main` later advanced through unrelated property-type and Listing Factory work; L7 remains in its ancestry.

Boundary:
- L7 certifies the bounded writer and rollback scope, **not** production activation.
- First production ingestion is a human gate because it mutates production state.
- L8 owns volume/coverage scale-up after the bounded production canary is explicitly authorized and validated.

## L8 — Scale + Coverage Certification

Scale gates: 10k → 50k → 100k → 250k → 500k candidate/active inventory where the public market supports it, with coverage measured by source/city/type/transaction/freshness.

## L9 — Serving + Continuous Operations

Validated canonical records only, scheduled acquisition/revisit jobs, source-collapse/schema-drift monitoring, runtime/cost budgets and serving validation.

## Execution order

L1 ✅ → L2 ✅ → L3 ✅ → L4 ✅ → L5 ✅ → L6 ✅ → L7 ✅ → L8 → L9.

Overall program percentage remains intentionally unassigned until the roadmap defines a stable denominator across the remaining lots.
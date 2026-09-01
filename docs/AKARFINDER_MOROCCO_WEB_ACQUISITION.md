# AKARFINDER — Morocco Web Real-Estate Acquisition

Status: ACTIVE
Canonical file for the Morocco-wide public real-estate acquisition program.

## North-star Goal

Build and maintain the most exhaustive practical index of **public Moroccan real-estate inventory available on the web**, regardless of source.

The system must discover, retrieve, classify, normalize, deduplicate, refresh and serve public property inventory from large portals, specialist portals, agencies, developers and the long tail of Moroccan real-estate websites.

This is an acquisition/indexing program, not an attempt to depend on one portal.

## Success criteria

The program is not complete because a crawler ran or a workflow is green. It is complete only when observable inventory coverage exists.

Final success requires all of the following:

1. Multiple independent acquisition channels are productive.
2. Large Moroccan portals and long-tail real-estate domains are represented.
3. Hundreds of thousands of unique candidate URLs can be discovered and classified at scale.
4. Active property pages can be retrieved and normalized into the canonical listing model.
5. Cross-source duplicates are measured and collapsed without losing source provenance.
6. Freshness is maintained by revisits, status checks and price/content change detection.
7. Production ingestion is bounded, auditable and reversible.
8. Serving/search exposes only validated canonical listings.
9. Coverage is measured by source, geography, property type, transaction type and freshness.

## Guardrails

- Public content only.
- No CAPTCHA bypass.
- No credential/account abuse.
- No fingerprint spoofing.
- No proxy or identity rotation intended to evade explicit access controls.
- No private/internal API dependency unless explicitly authorized and legitimately public for use.
- Respect hard blocks and rate limits; back off or switch to another legitimate acquisition surface.
- No production DB write until the corresponding lot has a bounded writer, dry-run evidence and rollback path.
- No Vercel deployment without explicit human authorization.

## Architecture target

Discovery Mesh
→ candidate URL classifier
→ source-specific fetch adapters
→ public-page extraction
→ canonical normalization
→ provenance + cross-source dedupe
→ freshness/revisit engine
→ bounded ingestion writer
→ serving/search
→ coverage observability

Discovery Mesh channels:

- Direct portal search/category pages
- Public sitemaps / sitemap indexes
- Public listing pages and pagination
- Common Crawl / public web indexes
- Agency / promoter / specialist real-estate domains
- Existing OpenSERP/query-universe assets as secondary discovery, not the sole acquisition path

## Roadmap

### L1 — Multi-source Discovery Proof — GATE PROVEN / CLOSEOUT IN PROGRESS

Goal: prove that AkarFinder can reproducibly discover substantial Moroccan real-estate inventory without depending on Avito.

Success:
- >= 1,000 unique real-estate candidate URLs discovered in one reproducible evidence run;
- >= 3 productive independent sources/channels;
- at least 2 direct real-estate sites plus 1 broader discovery channel or additional independent site;
- source attribution retained;
- 0 production DB writes;
- no forbidden internal/private API use.

Proof:
- committed discovery code;
- GitHub Actions evidence artifact/report;
- per-source HTTP results;
- unique URL count and samples;
- no-write / no-private-API assertions.

Implementation:
- `scripts/audits/morocco-web-real-estate-discovery-canary.mjs`
- `.github/workflows/morocco-web-real-estate-discovery-canary.yml`

Certified evidence:
- Run: `33546156641` — SUCCESS
- Evidence HEAD: `45faf198a7a12348a742aea7f63423fa429788d8`
- Unique candidate URLs: **5,849**
- Productive independent sources: **3/3**
  - Sarouty: **5,025**
  - Mubawab: **504**
  - MarocAnnonces: **320**
- `zeroDbWrites: true`
- `forbiddenInternalApiUsed: false`
- Artifact: `9815567495`
- Artifact SHA256: `8220952021247a0f4901242bb91ddb893cf8ff453f82b8fc066fa0dbaa9e0bac`

Interpretation boundary: these are discovered public real-estate candidate URLs. They are not yet equivalent to validated canonical production listings.

State: NUMERIC GATE PROVEN. L1 remains open only for PR transition from draft, merge and post-merge closeout.

### L2 — Portal Acquisition Adapters

Goal: turn productive discovery surfaces into deterministic source adapters.

Success:
- source-specific pagination/discovery logic for every productive major portal;
- stable listing URL extraction;
- bounded rate/backoff behavior;
- per-source fixtures and tests;
- exact failure classification for 403/429/timeout/schema drift.

Priority order is determined by measured reachable inventory, not brand importance. Sarouty is first because the certified L1 run yielded 5,025 candidate URLs from its public sitemap surfaces.

### L3 — Open-Web Discovery Mesh

Goal: discover Moroccan real-estate inventory beyond known portals.

Success:
- Common Crawl/public-index discovery integrated;
- Moroccan real-estate domains automatically identified and ranked;
- sitemaps and public site structures harvested;
- source/domain registry produced with evidence;
- long-tail discovery contributes material net-new candidates.

### L4 — Canonical Classification + Extraction

Goal: convert retrieved public pages into trustworthy canonical property records.

Success:
- exact real-estate/not-real-estate classification;
- canonical fields extracted with field-level provenance;
- city/district/property type/transaction normalization;
- fixtures cover representative source families;
- unsupported/ambiguous content is rejected rather than guessed.

### L5 — Cross-Source Deduplication

Goal: collapse duplicate properties while preserving every source URL and provenance trail.

Success:
- deterministic exact-ID/URL duplicate handling;
- fuzzy property-level duplicate scoring for cross-source reposts;
- measurable false-positive/false-negative audit set;
- canonical record keeps all source references.

### L6 — Freshness + Revisit Engine

Goal: maintain a live index rather than accumulate a graveyard of dead listings.

Success:
- source-aware revisit cadence;
- active/removed/changed detection;
- price/content change history;
- stale listing policy;
- measurable freshness by source and city.

### L7 — Bounded Production Ingestion

Goal: safely materialize validated canonical listings into production storage.

Success:
- dry-run manifest;
- bounded writer using official repository paths;
- idempotency;
- rollback manifest;
- before/after DB deltas verified;
- no manual classification SQL.

Human gate: production write only when risk/rollback evidence is complete.

### L8 — Scale + Coverage Certification

Goal: expand from working acquisition to market-scale Moroccan coverage.

Scale gates:
- 10k active canonical listings
- 50k
- 100k
- 250k
- 500k candidate/active inventory where the public market supports it

Success:
- coverage dashboard by source/city/type/transaction/freshness;
- source concentration measured;
- daily net-new / changed / expired volumes measured;
- bottlenecks attributable to exact source/channel rather than vague crawler failure.

### L9 — Serving + Continuous Operations

Goal: make the acquisition system continuously useful to AkarFinder search.

Success:
- only validated canonical records reach serving;
- scheduled acquisition/revisit jobs;
- monitoring and alerting for source collapse/schema drift;
- cost and runtime budgets;
- post-merge and production-serving validation.

## Execution order

Critical path:

L1 discovery proof → L2 productive adapters → L3 open-web expansion → L4 canonical extraction → L5 dedupe → L6 freshness → L7 bounded production write → L8 scale certification → L9 continuous serving.

Some L2/L3 work may proceed in parallel once L1 reveals productive sources, but no downstream lot receives success credit before its own proof gate is met.

## Verified baseline at start of L1

Repository: `hraaaaf/Akarfinder`
Branch: `spike/morocco-web-full-acquisition`
Base used to start the branch: `main@ce748da62449f3ed23401d368a0fb38b9f841930`

Existing Avito-specific evidence before this program:
- GitHub-hosted Avito census reached 2 HTTP 2xx and 2 HTTP 403 across four public seeds;
- 0 real-estate pages returned 2xx;
- 0 public real-estate URLs discovered;
- 0 listing IDs discovered;
- no production DB writes.

Conclusion supported by that evidence: Avito cannot be the single critical path for market-wide acquisition from the current GitHub-hosted environment.

L1 therefore measures **net discoverable public real-estate inventory across multiple sources**, not success against a single portal.

## L1 closeout sequence

1. Numeric discovery gate certified — DONE.
2. Evidence artifact retained — DONE.
3. Canonical evidence recorded — DONE.
4. PR runtime scope annotation aligned with repository audit policy — DONE.
5. CI on closeout HEAD `31b24ac0f3cfcfa2eb70228a94fa2261d85194a5` — DONE: 7/7 observed PR workflows SUCCESS, including Canonical Baseline Validation `33550930002` and Canonical Baseline Compile Validation `33550929999`.
6. Transition PR #966 from draft to ready — BLOCKED by GitHub connector GraphQL schema error (`Repository.fullDatabaseId` undefined). Direct merge correctly refuses while the PR remains draft.
7. Merge PR #966 once the draft-state transition succeeds.
8. Verify post-merge main.
9. Mark L1 CLOSED and activate L2 on the post-merge baseline.

## Current progress

L1: GATE PROVEN — CLOSEOUT BLOCKED ONLY ON PR DRAFT-STATE TRANSITION.
L2-L9: NOT STARTED for credit purposes.

Overall program percentage: intentionally not assigned until the first lot is fully merged and post-merge certified.

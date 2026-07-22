# AkarFinder — Active Roadmap

Updated: 2026-07-23

This roadmap is strategic and evidence-based. Historical mission completion belongs in Git/PR history, not in the active roadmap.

---

## North Star

Build the most useful real-estate search and intelligence index for Morocco.

Success = **coverage × freshness × quality × deduplication × relevance**.

The long-term architecture target is a Moroccan Property Graph connecting properties, source offers, observations, professionals, projects, neighborhoods, market context and user intent.

---

# ACTIVE EXECUTION PHASE — DATA FIRST

The product architecture is now largely constructed.

The critical path has changed to:

**DATA → SEARCH DEPTH → QUALITY → FINAL PRODUCTION GATE**

The detailed execution contract is:

**`docs/DATA_LAUNCH_EXECUTION_PLAN.md`**

Project-owner steering estimate as of 2026-07-23:

- technical/product roadmap constructed: **~85–90%**;
- real ambitious-launch readiness: **~65–70%**.

These are steering estimates, not production certification metrics.

The main gap is data mass and data quality, not missing product features.

## Freeze on new product surface area

Until the strategic launch threshold below is reached:

- do not prioritize new non-critical product features;
- do not expand UI scope for its own sake;
- prioritize conversion of discovered inventory into fresh, structured, searchable property intelligence;
- avoid intermediate Vercel Production deployments except for an explicitly authorized critical incident.

## Strategic launch threshold

Before resuming major product-feature expansion, AkarFinder must reach at least:

> **5,000 useful structured listings + a deep national thin index + genuinely satisfactory search depth across the principal Moroccan cities.**

Then continue through #23–#28 until launch GO.

---

# CURRENT P0 — DATA / MASS ACQUISITION

## Mass Acquisition Engine — ~70% steering estimate

Operational foundations include:

- national OpenSERP discovery;
- public sitemaps;
- Common Crawl;
- 53 cities/poles baseline;
- FR + AR acquisition;
- deep pagination/campaign execution;
- automatic rotation;
- false-reject/gap recovery.

### Steering snapshot — 2026-07-23

Figures supplied by the project owner; refresh from current DB/artifacts before operational execution.

**21,946 candidate URLs**

- 11,420 Sitemap;
- 10,526 Common Crawl.

Strategic acquisition target:

**100k+ useful raw observations / seeds**

Never treat this target as a public completeness claim without evidence.

---

# NEXT IMMEDIATE MISSION — BULK SEED CONFIRMATION

Suggested identifier:

`AKARFINDER-BULK-SEED-CONFIRMATION-1`

Current steering funnel:

```text
21,946 candidate URLs
        ↓
44 fresh_confirmed
        ↓
840 structured property_listings
```

The conversion yield is the current bottleneck.

Build a **Bulk Confirmation Engine** organized around:

**source × city × property type × transaction**

One controlled evidence/search operation should be able to confirm multiple candidate URLs without weakening evidence requirements.

Required chain remains:

**DISCOVERY → FRESHNESS/CONFIRMATION → ADMISSION → INTELLIGENCE → DISPLAY ELIGIBILITY → PUBLICATION**

Targets:

1. **840 → 5,000 useful structured listings**;
2. **5,000 → 10,000+**;
3. preserve provenance and freshness;
4. never invent missing data;
5. never let seeds bypass publication gates.

---

# #23 — PROPERTY GRAPH V3 / DEDUP

Status: next major quality phase after structured scale improves.

Current steering snapshot: approximately **701 clusters**, still largely behaving as 1 SourceOffer = 1 cluster.

Target:

**one potential physical property → one canonical cluster → N source offers/observations**

Cross-source auto-merge requires conservative evidence:

- city/type/transaction coherence;
- corroborated surface/price/bedroom signals where available;
- blocking contradictions;
- evidence trail;
- no text-only automatic merge;
- `possible_match` kept separate from auto/validated merges.

Planning hypothesis to validate empirically:

**~100k observations → ~30–45k unique properties/offers**

---

# #24 — FRESHNESS MACHINE

Every source offer should progressively resolve to a controlled state such as:

- fresh;
- probably fresh;
- stale;
- disappeared;
- reappeared.

Evidence may combine:

- OpenSERP;
- sitemap signals;
- Common Crawl historical observations;
- partner/first-party evidence.

Goal:

**never let index size be dominated by dead listings.**

Freshness is evidence, not a guarantee of availability.

---

# #25 — STRUCTURATION / INTELLIGENCE AT SCALE

Progressively convert admissible listings into useful AkarFinder property representations with:

- normalized location;
- neighborhood/district;
- price/m² where calculable;
- typology/transaction;
- characteristics;
- provenance;
- weighted completeness;
- AkarScore/information-quality signals;
- market context where supported;
- anomaly/conflict signals;
- safe multi-source intelligence.

Absolute rule:

**missing data stays missing.**

---

# #26 — MOROCCO NEIGHBORHOOD INTELLIGENCE

Expand the neighborhood foundation toward:

**city → neighborhood → micro-zone → mobility → schools → commerce/services → lifestyle → price context**

Goal:

Become a Moroccan property-intelligence reference, not only an aggregator of links.

All claims remain sourced, dated/versioned, confidence-aware and public-safe.

---

# #27 — SEARCH DEPTH CERTIFICATION

Search foundations already include:

- deeper structured database scanning beyond the old first-200 ceiling;
- up to ~100 local structured results per tranche where inventory permits;
- load-more/deeper pagination behavior;
- thin-index results;
- external Gateway depth under provider/policy constraints.

### Candidate URL steering snapshot

- Casablanca: ~967;
- Rabat: 646;
- Tanger: 244;
- Marrakech: 4,309;
- Agadir: 6,653.

These are candidate/discovery counts, not automatically live structured listings.

### Certification

Validate **20–50 representative real searches**, including examples such as:

- appartement Casablanca 2 chambres;
- villa Ain Diab;
- appartement Agdal Rabat location;
- terrain Marrakech;
- appartement Tanger centre.

Success criterion:

> **80%+ of common representative searches have satisfactory depth and relevance.**

Define “satisfactory” before certification using measurable criteria for:

- useful non-duplicate depth;
- relevance;
- freshness quality;
- filter correctness;
- source diversity where available;
- latency.

---

# NATIONAL COVERAGE GAPS — AFTER INITIAL #27

Identify weak zones by:

- city;
- district;
- property type;
- transaction.

Classify every weakness as primarily:

- acquisition gap;
- confirmation gap;
- structuring gap;
- freshness gap;
- search/ranking gap.

Then run targeted remediation waves and repeat the same search-certification matrix.

Do not chase raw URL volume blindly.

---

# #28 — FINAL PRODUCTION GATE

Start only when DATA and Search Depth are sufficiently mature.

Required final gates:

1. Arabic/RTL core journey;
2. account entry/auth fix if still necessary;
3. responsive desktop/mobile/tablet audit;
4. smoke tests;
5. SEO/indexability;
6. performance;
7. security/configuration sanity;
8. final data/search certification;
9. explicit GO/NO-GO.

Deployment policy for this phase:

> **One consolidated Vercel Production deployment after final certification.**

No routine intermediate Production deployments during the data-first execution program.

---

# Exact execution order

```text
✅ MASS DISCOVERY
21,946 candidate URLs baseline
        ↓
🔴 1. BULK SEED CONFIRMATION ENGINE
        ↓
2. 5k → 10k+ STRUCTURED LISTINGS
        ↓
3. PROPERTY GRAPH V3 / DEDUP (#23)
        ↓
4. FRESHNESS MACHINE (#24)
        ↓
5. STRUCTURATION / INTELLIGENCE AT SCALE (#25)
        ↓
6. MOROCCO NEIGHBORHOOD INTELLIGENCE (#26)
        ↓
7. SEARCH DEPTH CERTIFICATION (#27)
        ↓
8. NATIONAL COVERAGE GAPS
        ↓
9. ARABIC / RESPONSIVE / FINAL GATES (#28)
        ↓
🚀 ONE CONSOLIDATED VERCEL PRODUCTION DEPLOY
```

---

# Supporting tracks already largely built

The following product/technical foundations remain important, but they are not the immediate bottleneck.

## Canonical property and intelligence foundation

Implemented foundations include:

- Property Schema V1 / Project Schema V1;
- weighted completeness and dynamic partner onboarding;
- Analysis Contract V1;
- unified structured listing intelligence pipeline;
- Freshness & Provenance V2 foundations;
- Market Intelligence V2;
- Anomaly Engine V1;
- Multi-source Property Intelligence V1;
- explainable AkarScore V2;
- safe Public SERP Intelligence V1;
- Property Detail V2.

## Consumer personalization and continuity

Strong V1 foundations include:

- Dynamic Search Profile V2;
- personalized Property Fit/ranking;
- deterministic Companion state machine;
- direct-search vs guided-search orchestration;
- consumer auth/session;
- `Mon Projet` continuity models/workspace.

Do not expand these substantially before the data/search launch threshold unless a critical blocker is discovered.

## Professional supply and monetization

Foundations include:

- professional auth;
- organizations/memberships/roles;
- ownership claims;
- professional profiles/projects;
- seven-step partner property onboarding;
- submissions/media rights;
- staff activation/review;
- organization-scoped lead/dashboard foundations.

Real pilot agencies/promoters and authorized structured inventory remain strategically useful because they improve supply quality, but commercial feature expansion is not the immediate P0.

## SEO/public discovery

SEO foundations exist.

Current rule:

- quality-first pages;
- connect SEO surfaces to real useful inventory;
- no thin-page explosion;
- no unsupported market/neighborhood claims.

---

# Definition of done for any roadmap item

An item is not complete because code exists.

Completion requires the appropriate combination of:

- implementation;
- tests/build;
- migration application when needed;
- real data when needed;
- feature flag state;
- UI integration;
- Production deployment when required;
- live validation;
- documentation update.

Use `CURRENT_STATE.md` for the latest consolidated implementation snapshot, `DATA_LAUNCH_EXECUTION_PLAN.md` for the active data-first execution program, and Git/Production evidence for exact current status.

---

## Current governing principle

> **Stop adding surface area. Convert discovery into trustworthy, searchable, fresh property intelligence.**
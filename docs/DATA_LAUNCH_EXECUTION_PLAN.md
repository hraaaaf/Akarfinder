# AkarFinder — DATA → SEARCH DEPTH → QUALITY → FINAL LAUNCH

Updated: 2026-07-23
Status: **ACTIVE EXECUTION PROGRAM — P0 DATA**

This document defines the current execution phase of AkarFinder.

The product architecture is largely built. The critical path is now:

**DATA → SEARCH DEPTH → QUALITY → FINAL PRODUCTION GATE**

No new non-critical product feature should take priority over this program until the launch threshold defined below is reached.

---

## 1. Steering status

Project-owner steering estimate as of 2026-07-23:

- technical/product roadmap constructed: **~85–90%**;
- real readiness for an ambitious launch: **~65–70%**.

These percentages are planning estimates, not production certification metrics.

The gap is primarily caused by:

- data mass;
- data conversion yield;
- freshness;
- deduplication/property identity;
- structured intelligence coverage;
- real search depth.

The gap is **not primarily a missing-feature problem**.

---

# PHASE DATA — P0 CURRENT

## 2. Mass Acquisition Engine — ~70%

Already operational foundations include:

- national OpenSERP discovery;
- public sitemap acquisition;
- Common Crawl URL-index acquisition;
- 53 cities/poles in the active national geography baseline;
- French + Arabic acquisition paths;
- deep pagination/campaign execution;
- automatic rotation;
- recovery/reconciliation of false rejects and accepted-listing gaps.

### Current steering snapshot

Baseline supplied by the project owner on 2026-07-23; operational missions must refresh these figures against the current DB/artifacts before acting.

**21,946 candidate URLs**

Breakdown:

- **11,420 Sitemap**;
- **10,526 Common Crawl**.

### Target

**100k+ raw observations / useful seeds**

This is an internal scale target, never a public completeness claim without evidence.

---

## 3. NEXT IMMEDIATE MISSION — BULK SEED CONFIRMATION ENGINE

Mission priority: **P0 — execute next**

Suggested mission identifier:

`AKARFINDER-BULK-SEED-CONFIRMATION-1`

### Current funnel snapshot

**21,946 candidate URLs**

↓

**44 fresh_confirmed**

↓

**840 structured property_listings**

The conversion ratio is currently far too low for the intended search depth.

### Required architecture

Build a **Bulk Confirmation Engine** capable of confirming many candidate URLs from one controlled search/evidence operation.

Target grouping dimension:

**source × city × property type × transaction**

Conceptual flow:

```text
candidate seed reservoir
        ↓
group by source × city × type × transaction
        ↓
one evidence/search operation confirms multiple candidate URLs
        ↓
fresh_confirmed / rejected / unresolved
        ↓
admission + normalization
        ↓
structured listing
```

### Hard rules

- no direct seed → public shortcut;
- preserve the canonical chain:
  **DISCOVERY → FRESHNESS/CONFIRMATION → ADMISSION → INTELLIGENCE → DISPLAY ELIGIBILITY → PUBLICATION**;
- no invented price, location, availability, media or attributes;
- batch efficiency must not weaken evidence requirements;
- every confirmation result must remain traceable to its evidence/source;
- stale/unconfirmed candidates must not inflate searchable structured inventory.

### Intermediate target

**840 → 5,000 structured listings**

Then:

**5,000 → 10,000+ structured listings**

The first strategic gate is 5,000 useful structured listings, not merely 5,000 database rows.

---

# PHASE PROPERTY GRAPH — #23

## 4. Dedup & Property Graph V3

Mission identifier:

`AKARFINDER-PROPERTY-GRAPH-V3`

### Current steering snapshot

Approximately **701 clusters**, still largely equivalent to:

**1 SourceOffer = 1 cluster**

This is not yet the full Property Graph objective.

### Target model

```text
Avito listing X
Mubawab listing X
Agenz listing X
        ↓
1 canonical potential property
        ↓
N source offers / observations
```

### Auto-merge evidence requirements

At minimum, cross-source matching must respect:

- city coherence;
- property type coherence;
- transaction coherence;
- corroborated surface/price/bedroom evidence where available;
- blocking contradictions;
- explicit evidence trail.

### Forbidden shortcut

**No text-only automatic merge.**

Similarity without enough evidence must remain:

`possible_match`

and stay separate from validated/automatic merges.

### Scale objective

Working target:

**~100k observations → ~30–45k unique properties/offers**

This is a planning hypothesis to validate empirically, not a guaranteed ratio.

---

# PHASE FRESHNESS — #24

## 5. Freshness Machine

Mission identifier:

`AKARFINDER-FRESHNESS-MACHINE-V1`

Every source offer should progressively resolve into a controlled freshness state such as:

- fresh;
- probably fresh;
- stale;
- disappeared;
- reappeared.

### Evidence sources

- OpenSERP;
- sitemap signals;
- Common Crawl historical URL-index observations;
- partner/first-party signals;
- other explicitly authorized evidence lanes.

### Core objective

Never create a large index whose apparent coverage is mostly dead listings.

Freshness must influence:

- display eligibility;
- ranking where appropriate;
- public wording;
- stale suppression/deprioritization;
- re-observation scheduling.

Freshness is evidence about observation state, not a guarantee of current availability.

---

# PHASE STRUCTURATION — #25

## 6. Intelligence at Scale

Mission identifier:

`AKARFINDER-INTELLIGENCE-AT-SCALE-V1`

Progressively transform admissible structured listings into useful AkarFinder property representations.

Priority dimensions:

- normalized location;
- district/neighborhood;
- price per m² where calculable;
- property type;
- transaction;
- characteristics;
- provenance;
- AkarScore / information-quality signals;
- market context where evidence supports it;
- weighted completeness;
- anomaly/conflict signals;
- safe multi-source intelligence.

### Absolute rule

**Missing data remains missing.**

Do not invent fields merely to improve completeness or visual richness.

---

# PHASE NEIGHBORHOODS — #26

## 7. Morocco Neighborhood Intelligence

Mission identifier:

`AKARFINDER-MOROCCO-NEIGHBORHOOD-INTELLIGENCE-V3`

Expand the current neighborhood foundation toward:

```text
city
→ neighborhood
→ micro-zone
→ mobility
→ schools
→ shops/services
→ lifestyle
→ price/market context
```

### Objective

AkarFinder should become a real Moroccan property intelligence reference, not only an aggregator of links.

All neighborhood/market claims must remain:

- sourced;
- dated/versioned;
- confidence-aware;
- public-safe.

Unsupported dimensions stay unknown.

---

# PHASE SEARCH DEPTH — #27

## 8. Real Search Depth Certification

Mission identifier:

`AKARFINDER-SEARCH-DEPTH-CERTIFICATION-1`

The search architecture is already largely prepared:

- backend no longer conceptually limited to the first 200 rows;
- up to ~100 local structured results per tranche where available;
- load-more/deeper pagination behavior;
- thin-index result lane;
- external Gateway depth that can combine a large external result set under its own provider/policy limits.

### Current steering material

Candidate URL depth supplied on 2026-07-23:

- Casablanca: **~967 URLs**;
- Rabat: **646**;
- Tanger: **244**;
- Marrakech: **4,309**;
- Agadir: **6,653**.

These are discovery/candidate figures and must not be equated automatically with live structured listings.

### Required certification set

Validate **20–50 representative real searches**, including examples such as:

- `appartement Casablanca 2 chambres`;
- `villa Ain Diab`;
- `appartement Agdal Rabat location`;
- `terrain Marrakech`;
- `appartement Tanger centre`.

Test across:

- buy/rent;
- apartments/villas/land/commercial where relevant;
- major cities;
- district-level intent;
- price/surface/bedroom filters;
- FR and representative AR queries where applicable.

### Success criterion

**80%+ of common representative searches must have satisfactory result depth and relevance.**

“Satisfactory” must be defined with measurable criteria before certification, including at minimum:

- enough non-duplicate useful results;
- acceptable relevance;
- no major dead/stale-result domination;
- correct filter behavior;
- source diversity where naturally available;
- acceptable latency.

---

## 9. National Coverage Gaps — after initial Search Depth certification

Mission identifier:

`AKARFINDER-NATIONAL-COVERAGE-GAPS-1`

Once the first representative search certification identifies weak zones:

- rank gaps by city/district/type/transaction;
- distinguish acquisition gap vs confirmation gap vs structuring gap vs search/ranking gap;
- launch targeted acquisition/confirmation waves;
- re-run the same certification matrix.

Do not chase raw national URL counts blindly when the real gap is conversion, freshness or searchability.

---

# PHASE PRODUCTION — #28

## 10. Final Production Gate

Mission identifier:

`AKARFINDER-FINAL-PRODUCTION-GATE-V2`

This phase starts only when DATA and Search Depth are sufficiently mature.

Required final gates:

1. Arabic/RTL core journey;
2. account entry/auth fix if still necessary;
3. responsive desktop/mobile/tablet audit;
4. smoke tests;
5. SEO/indexability;
6. performance;
7. security/configuration sanity;
8. final data/search certification;
9. explicit production GO/NO-GO.

### Deployment rule

**No intermediate Vercel production deployment during this execution program unless a critical production incident requires an explicit exception.**

Target:

**one consolidated Vercel production deployment** after final certification.

Code/PR work may continue, but production deployment is held until the final release gate.

---

# 11. Exact execution order

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

# 12. Strategic launch threshold

The next major strategic milestone is:

> **AkarFinder reaches at least 5,000 useful structured listings + a deep national thin index + genuinely satisfactory search depth across the principal Moroccan cities.**

Until this threshold is met:

- do not prioritize new product features;
- do not broaden UI scope for its own sake;
- do not confuse candidate URL volume with usable inventory;
- do not deploy repeatedly to Production without a critical reason.

After this threshold:

execute #23–#28 seriously until an evidence-backed launch GO.

---

# 13. Definition of success for this program

The program is complete only when evidence demonstrates all of the following:

- large national discovery reservoir;
- efficient seed confirmation;
- materially larger structured inventory;
- conservative multi-source Property Graph;
- freshness states operating at scale;
- intelligence/completeness coverage improving without fabrication;
- representative search-depth matrix passing target thresholds;
- national coverage gaps explicitly measured and remediated;
- Arabic/RTL + responsive + SEO + performance gates passed;
- one final consolidated production deployment validated live.

**Current governing principle:**

> Stop adding surface area. Convert discovery into trustworthy, searchable, fresh property intelligence.
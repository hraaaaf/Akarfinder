# AkarFinder — Data Ingestion Canonical

**Status:** ACTIVE — authoritative roadmap

**Branch:** `feat/data-ingestion-canonical`

**PR:** `#996` — must remain OPEN / DRAFT / non merged until explicit authorization.

**Purpose:** canonical compass for all external real-estate ingestion into AkarFinder.

---

# 1. Product goal

Build a source-agnostic ingestion layer able to discover, extract, normalize, deduplicate, update, deactivate and selectively purge external real-estate listings without coupling AkarFinder to any particular portal.

Long-term AkarFinder target:

- **≥100,000 canonical exploitable listings** across all sources;
- complete provenance;
- controlled deduplication;
- lifecycle;
- search / filters / ranking;
- independent purge by source;
- direct agency / partner / owner data never destructively coupled to portal data.

Mubawab is the pilot source.

## Current strategic decision

Before adding another portal, AkarFinder must first obtain **100% coverage of the publicly accessible, authorized and relevant Mubawab listing universe**, or quantify and explain every residual item that cannot represent an accessible unique listing.

`100% Mubawab` does **not** mean blindly matching the marketing counter. It means proving the denominator and exhausting the discoverable listing universe.

---

# 2. Locked architecture

```text
Discovery
  ↓
Extraction
  ↓
Collection Listing Contract
  ↓
Validation
  ↓
Source Adapter
  ↓
CanonicalPropertyV1 / CanonicalOfferV1 / MediaAssetV1
  ↓
Deduplication / Lifecycle / Provenance
  ↓
Controlled AkarFinder Ingestion
  ↓
Search / Ranking / UI
```

Application canonical model:

```text
lib/property-schema/
```

Collection/input contract only:

```text
data-ingestion/schema/listing.schema.json
```

It must never become a second canonical model.

---

# 3. Source independence

Supported provenance types include:

- `portal`
- `agency_direct`
- `partner_feed`
- `owner_direct`
- `developer_direct`
- `open_data`
- `manual`

Absolute rule:

```text
purge source=mubawab
```

must never remove an independent direct/partner/owner observation representing the same property.

Source identity starts with:

```text
source_name + source_id
```

Cross-source property matching is separate from source-listing identity.

---

# 4. Safety boundary

For discovery and coverage proofs:

- public/authorized routes only;
- robots checked before live requests;
- identifiable User-Agent;
- no authentication, CAPTCHA or access-control bypass;
- global stop on explicit 403 / 429;
- bounded request budgets;
- resumable checkpoints;
- no detail pages unless a later explicitly authorized phase requires them;
- no image downloads during discovery proofs;
- no production DB writes;
- no Vercel deployment;
- no merge;
- never touch `scripts/scrapers/output/akarfinder.db` during sandbox proofs.

CI noise unrelated to the active lot does not block safe work.

---

# 5. Execution doctrine

Every significant lot has:

- **Goal** — exact result sought;
- **Success** — observable closure criterion;
- **Proof** — test, artifact or measured evidence.

No lot is CLOSED without proof.

No massive crawl is launched merely because a crawler can run. The coverage model must first be demonstrated to have no material blind spots.

---

# 6. Roadmap

## Lots 1–8 — CLOSED ✅

The following foundations are already proven:

1. canonical/input contract;
2. Mubawab discovery;
3. Mubawab extractor;
4. pilot crawl;
5. deduplication + lifecycle;
6. enlarged resumable crawl;
7. AkarFinder sandbox ingestion;
8. controlled massive-ingestion mechanics.

Lot 8 proves batching, idempotence, checkpoints, kill-switch, rollback of current batch, metrics, selective source purge and survival of independent direct/partner data.

---

# 7. Lot 9 — Mubawab Full Coverage

**Status: 🟡 OPEN — current chantier**

## Goal

Obtain **100% of Mubawab listings that are publicly accessible, authorized and relevant**, deduplicated by `source_id`, and fully reconcile the result against Mubawab's public catalog presentation.

The current public home counter observed on 2026-09-04 is about **102.5K properties**. This is a reconciliation reference, not yet a proven count of unique listing IDs.

## Current certified baseline

Classic matrix:

- 12 cities;
- 11 enabled categories;
- 132 initial `city × category` scopes;
- deep pagination to technical extinction;
- **29,741 unique source IDs** certified;
- artifact `9947122701`;
- digest `sha256:1b27ba2946bd671644e6ec1bf03a396df6c86a51706f5a17265466d041a0cb6d`.

Persistent national office campaign, run `33906589600`:

- office sale reached extinction at page 24;
- 710 unique office-sale IDs added;
- office rent reached page 40 and remains open;
- 1,280 unique office-rent IDs added;
- **1,990 catalog IDs added globally**;
- **current exact persistent union: 31,731 unique IDs**;
- artifact `9949834432`;
- digest `sha256:964a8cc44255bfd793615c4adea1c3be4238bed87b09aad0514c326da681bacc`.

This proves the original 12-city matrix was not a complete model of Mubawab.

---

# 8. Lot 9 Phase 0 — Coverage Proof

**Status: 🔵 ACTIVE — must finish before Full Harvest**

## Phase 0 Goal

Prove that the new discovery model is capable of covering the **entire public Mubawab listing universe** before launching the full harvesting campaign.

Phase 0 is about proving the **net has no material holes**. It is not about maximizing the listing count yet.

## Phase 0 Success

Phase 0 closes only when all of the following are proven:

### P0-A — Route-family inventory

Inventory every public route family capable of exposing listing inventory, currently including at minimum:

- `st` — city/category surfaces;
- `sc` — national category surfaces;
- `cc` — broad national aggregate/control surfaces;
- `t` / city aggregate pages where relevant;
- vacation surfaces;
- `pl` / new-project surfaces;
- any other listing-bearing family discovered during inventory.

A route family may be classified as:

- **primary harvest surface**;
- **control/diagnostic surface**;
- **project/non-unit surface**;
- **irrelevant/non-listing surface**.

### P0-B — Dimension inventory

Enumerate the public dimensions needed to cover Mubawab:

- transaction;
- property type;
- city;
- zone/locality where it creates distinct inventory;
- classic rental vs vacation rental;
- existing inventory vs new development/project inventory;
- any additional public dimension discovered.

No fixed 12-city allowlist is treated as exhaustive without proof.

### P0-C — Reachability proof

For representative broad control surfaces, every sampled `source_id` must be reachable through at least one known harvest surface, or must create a documented new surface/dimension.

If a `cc`/aggregate control surface continues to reveal unexplained IDs, Phase 0 remains OPEN.

### P0-D — Pagination proof

For each harvest-surface class, pagination semantics and terminal conditions must be demonstrated:

```text
page 1 → page N → zero refs OR zero new unique IDs OR documented terminal page
```

The collector must preserve exact checkpoints and global `source_id` union.

### P0-E — Denominator reconciliation model

Define how the public ~102K counter will be reconciled into mutually understandable buckets:

```text
unique accessible listing IDs
+ project/non-unit objects
+ aliases/duplicates
+ inaccessible or non-indexable public-counter components, if any
= explained public catalog universe
```

No claim of 100% is allowed until the denominator is proven.

## Phase 0 Proof artifact

Canonical Phase 0 working document:

```text
data-ingestion/MUBAWAB_PHASE0_COVERAGE_PROOF.md
```

It must contain:

- route-family matrix;
- dimension matrix;
- control surfaces;
- sampled reachability results;
- discovered gaps;
- pagination semantics;
- denominator model;
- PASS/FAIL per Phase 0 gate;
- exact Next action.

## Phase 0 rule

**No new broad Full Harvest campaign is authorized until Phase 0 PASS.**

The already completed 31,731-ID discovery work remains valid evidence and seed state. It does not itself prove total coverage.

---

# 9. Lot 9 Phase 1 — Full Harvest

**Status: ⚪ BLOCKED BY PHASE 0**

## Goal

Once Phase 0 proves complete coverage, cast the full net and exhaust every approved harvest surface while maintaining one persistent global union of Mubawab `source_id` values.

## Method

```text
Coverage Plan from Phase 0
        ↓
persistent surface queue
        ↓
bounded page windows
        ↓
checkpoint after each page
        ↓
global source_id union
        ↓
surface extinction
        ↓
control-surface residual scan
        ↓
reconciliation
```

Each surface must record:

- stable ID;
- route family;
- semantic dimensions;
- `next_page`;
- `pending / running / completed / failed`;
- stop reason;
- pages requested;
- refs discovered;
- IDs unique to surface;
- global unique IDs added;
- errors/block events.

## Full Harvest Success

- every approved primary surface reaches a documented terminal state;
- global union is persistent and monotonic;
- broad control surfaces reveal **no unexplained new listing IDs**;
- public catalog delta is fully reconciled;
- unexplained material residual = **0**.

Only then is `Mubawab Full Coverage = 100%` allowed.

---

# 10. Lot 10 — Mubawab Massive Dataset Certification

**Status: ⚪ BLOCKED BY LOT 9**

Validate the Lot 9 dataset for:

- source-ID uniqueness;
- canonical dedup;
- field quality;
- geographic/type/transaction coverage;
- price/surface anomalies;
- provenance;
- lifecycle readiness;
- selective purge;
- final exploitable canonical volume.

**Success:** reproducible quantified certification report.

---

# 11. Lot 11 — Massive AkarFinder Ingestion

**Status: ⚪ BLOCKED BY LOT 10**

Controlled ingestion of the certified massive dataset into the target AkarFinder environment, validating batching, resume, rollback, Search, filters, ranking, performance, lifecycle and purge.

No production activation is implicit.

---

# 12. Lot 12 — Multi-source industrialization toward ≥100K

**Status: ⚪ BLOCKED BY LOT 11**

If Mubawab's final canonical exploitable stock is below 100K, add other compliant sources using the same source-agnostic pipeline until AkarFinder reaches **≥100,000 canonical exploitable listings**.

If Mubawab alone already exceeds 100K unique exploitable listings, the product threshold is reached, but multi-source readiness remains an architectural objective.

---

# 13. Canonical execution order

```text
Lots 1–8 CLOSED
      ↓
Lot 9 Phase 0 — PROVE COMPLETE MUBAWAB COVERAGE MODEL
      ↓
Lot 9 Phase 1 — FULL HARVEST TO EXTINCTION
      ↓
Lot 9 Reconciliation — PROVE 100% EXPLAINED COVERAGE
      ↓
Lot 10 — MASSIVE DATASET CERTIFICATION
      ↓
Lot 11 — CONTROLLED MASSIVE AKARFINDER INGESTION
      ↓
Lot 12 — ADD SOURCES IF NEEDED TO REACH ≥100K
```

---

# 14. Current exact next

1. build `MUBAWAB_PHASE0_COVERAGE_PROOF.md`;
2. inventory public route families and classify them as harvest/control/project/non-listing;
3. inventory all public property/transaction/geographic dimensions, without assuming the current 12 cities are complete;
4. create sampled reachability probes from broad control routes into candidate harvest surfaces;
5. prove pagination/terminal behavior per surface family;
6. define the ~102K denominator reconciliation buckets;
7. close Phase 0 only when no unexplained inventory-bearing route family or dimension remains;
8. only then resume broad Full Harvest.

---

# 15. Current facts to preserve in every handover

- repo: `hraaaaf/Akarfinder`;
- branch: `feat/data-ingestion-canonical`;
- PR: `#996`;
- PR must stay OPEN / DRAFT / unmerged unless explicitly authorized;
- no Vercel deployment;
- no production DB write;
- classic unique baseline: **29,741**;
- current exact persistent union after office campaign: **31,731**;
- Mubawab public home counter observed 2026-09-04: approximately **102.5K**, denominator not yet certified;
- Lot 9 Phase 0 is the active chantier;
- Phase 1 Full Harvest is blocked until Phase 0 PASS;
- goal is **100% explained Mubawab coverage**, not an arbitrary intermediate count.

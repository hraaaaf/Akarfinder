# AkarFinder — Data Ingestion Canonical

**Status:** ACTIVE — authoritative roadmap  
**Repo:** `hraaaaf/Akarfinder`  
**Branch:** `feat/data-ingestion-canonical`  
**PR:** `#996` — OPEN / DRAFT / unmerged until explicit authorization

---

# 1. Product goal

Build a source-agnostic ingestion layer able to discover, extract, normalize, deduplicate, lifecycle-manage and selectively purge real-estate observations without coupling AkarFinder to one portal.

```text
Discovery
→ extraction
→ Collection Listing Contract
→ validation
→ source adapter
→ CanonicalPropertyV1 / CanonicalOfferV1 / MediaAssetV1
→ deduplication / lifecycle / provenance
→ controlled AkarFinder ingestion
→ search / ranking / UI
```

Application canonical model: `lib/property-schema/`  
Collection/input contract only: `data-ingestion/schema/listing.schema.json`

Portal observations and direct agency/partner/owner observations remain independent. Purging `source=mubawab` must never delete an independent direct observation of the same property.

Long-term AkarFinder target: **≥100,000 canonical exploitable listings across all sources**.

Current strategic priority: prove and then obtain **100% explained coverage of the publicly accessible, authorized and relevant Mubawab listing universe** before adding another portal.

---

# 2. Non-negotiable execution rules

For every meaningful lot:

- **Goal** — exact result sought;
- **Success** — observable closure criterion;
- **Proof** — test, artifact or measured evidence.

Safety:

- public/authorized routes only;
- wildcard/query-aware robots check before live requests;
- never request an explicitly disallowed route form;
- identifiable User-Agent;
- no authentication, CAPTCHA or access-control bypass;
- explicit 403/429 → source stop;
- bounded request budgets;
- no production DB writes;
- no Vercel deployment;
- no merge without explicit authorization;
- no images during discovery/coverage proof;
- no broad detail-page crawl during Phase 0.

CI noise unrelated to the active lot does not block safe work.

## Human ambiguity gate

Human review is the last semantic resort.

```text
card clear → classify
card ambiguous → robots-check exact detail
allowed detail → inspect ONE description
clear detail → classify
trusted origin route may resolve transaction when non-conflicting
still ambiguous / policy-unavailable → human arbitration
```

No silent guessing and no bulk detail crawl for classification.

Canonical precedent #1, Mubawab `8322103`:

```text
property_type = apartment
transaction_type = rent
offer_scope = room
```

A room/colocation offer inside an apartment changes offer scope, not physical property type. Generic apartment offers remain `offer_scope = whole_property`.

Methodology precedent `8298787`: a vague card title but explicit allowed detail description is auto-classified from the detail and must not be escalated merely because the card is poor.

---

# 3. Roadmap

```text
Lots 1–8 CLOSED
      ↓
Lot 9 Phase 0 — PROVE COMPLETE AUTHORIZED MUBAWAB COVERAGE MODEL  ← ACTIVE
      ↓
Lot 9 Phase 1 — FULL HARVEST USING ONLY APPROVED METHODS
      ↓
Lot 9 Reconciliation — PROVE 100% EXPLAINED COVERAGE
      ↓
Lot 10 — MASSIVE DATASET CERTIFICATION
      ↓
Lot 11 — CONTROLLED AKARFINDER INGESTION
      ↓
Lot 12 — OTHER SOURCES IF NEEDED FOR ≥100K
```

**Phase 1 Full Harvest is BLOCKED until all Phase 0 gates PASS.**

Working proof: `data-ingestion/MUBAWAB_PHASE0_COVERAGE_PROOF.md`.

---

# 4. Historical Mubawab anchors and compliance correction

Historical classic run `33899083917`:

- **29,741 unique source IDs observed**;
- artifact `9947122701`;
- digest `sha256:1b27ba2946bd671644e6ec1bf03a396df6c86a51706f5a17265466d041a0cb6d`.

Historical office run `33906589600`:

- +1,990 IDs;
- **historical persistent union = 31,731 unique IDs**;
- artifact `9949834432`;
- digest `sha256:964a8cc44255bfd793615c4adea1c3be4238bed87b09aad0514c326da681bacc`.

These are historical seed observations, **not current compliance certification**.

Mubawab robots policy contains:

```text
Disallow: /*:
Disallow: /*?n=1
```

Historical `:p:N` pagination matches the disallowed colon route form. The robots parser has been corrected and regression-tested.

Consequences:

- no future `:p:N` request while this rule applies;
- historical technical exhaustion does not close P0-D;
- no bypass or disguised pagination workaround is permitted.

---

# 5. Lot 9 Phase 0 gates

| Gate | Goal | Status |
|---|---|---:|
| P0-A | identify every inventory-bearing public route family | 🟡 |
| P0-B | enumerate geography/type/transaction/product dimensions | 🟡 |
| P0-C | prove control/reachability semantics | 🟡 |
| P0-D | prove complete authorized traversal | 🔴 first-party FAIL / 🔵 external-index recovery ACTIVE |
| P0-E | reconcile the public catalog denominator | 🟡 guard GREEN / evidence incomplete |

Phase 0 PASS requires **all five** gates PASS.

---

# 6. Current route and dimension model

## Unit/control surfaces

- `st` — city × category, primary candidate;
- `sc` — national category, primary candidate;
- vacation `st` — vacation primary candidate;
- `cc` — broad national control;
- `ct` — city × transaction control;
- `t` — city aggregate control;
- `tw` — neighborhood aggregate control;
- `cd` — neighborhood × transaction control;
- `sd` — fine neighborhood/category/transaction-style leaf and partition candidate;
- `is` — thematic/search-like overlapping control.

## Geography/taxonomy hierarchy

- `mpr`
- `mprp`
- `mprpt`
- `mprptd`

These enumerate geography/taxonomy and are not silently counted as unit inventory.

## Separate buckets

- `pl` — project/non-unit catalogue;
- `a` / `pa` — listing identity/detail, not Phase 0 discovery surfaces.

The old `crp` hypothesis is removed because it was not reproducible.

The historical 12-city matrix is proven incomplete. Confirmed missing examples include Dakhla, Essaouira, Martil and Meknès. Confirmed unconfigured semantics include:

```text
appartements-vacational
bureaux-et-commerces-a-louer
bureaux-et-commerces-a-vendre
immobilier-a-louer
immobilier-a-vendre
```

Latest bounded dimension proof: run `33918393534` ✅, artifact `9954070944`, digest `sha256:3305e3fbd918ca9ccaf7b31dcdd0251dddc8671c000843c290762aea91af1a75`.

---

# 7. Reachability evidence

Run `33912205981` compared sampled `ct/is` residuals with the historical 31,731 union:

- 78 sampled residual IDs;
- 23 already known;
- **55 absent from the historical union**.

Breakdown:

- `ct` Casablanca sale: 0 absent;
- `ct` Casablanca rent: 5 absent;
- `is` Casablanca sale-cheap: 22 absent;
- `is` Casablanca rent-cheap: 28 absent.

These are reachability/classification evidence, not proof that the IDs exist uniquely on `ct/is`.

Latest bounded ambiguity/detail proof: run `33917777332` ✅, artifact `9953873543`. Four sampled ambiguous cases were resolved using allowed detail + route provenance without a new human arbitration.

---

# 8. P0-D authorized traversal decision

## First-party lane = FAIL

Evidence chain:

1. standard public sitemap candidates were robots-allowed but returned 404;
2. Oasis proof `33920078656`: 7 fine `sd` leaves, 4 overflow, minimum unexplained remainder **411**;
3. multi-city proof `33920686277`: **13 leaves, 10 overflow, 372 visible IDs, minimum unexplained remainder ≥2,223** across Casablanca, Rabat and Marrakech;
4. artifact `9955181479`, digest `sha256:31cb27d4952ad6bfdf5d68d3a17df7db783c87f005d0d544610647a2f5a7d77d`;
5. Partition Inventory run `33920795086` found routes/filters on an overflow leaf but **no proven exhaustive + disjoint + complete finer partition**;
6. Partition artifact `9955242717`, digest `sha256:326116c241715734a08a147b914def093d3cc4c3946763ea5bfa3094ee153061`.

The failure of the Authorized Traversal gate is intentional gate semantics: an incomplete traversal must fail certification.

## External public-index recovery lane = ACTIVE

Common Crawl run `33921381132` ✅ using index `CC-MAIN-2026-30`:

```text
749 CC rows observed
366 unique Mubawab source IDs
112 IDs absent from historical 31,731
0 Mubawab live requests
0 detail fetches
0 DB/prod/image writes
coverage_state = external_index_residual
```

Artifact `9955501704`, digest `sha256:cfd55d0e64d944274aebf57e88c7f23082363a27e9ac887acc08124d162245e6`.

The 112 are **newly indexable source IDs**, not yet certified current active listings. External indexes can contain stale/historical pages.

Canonical P0-D model:

```text
first_party_authorized_traversal = FAIL
external_public_index_recovery = ACTIVE / NOT YET COMPLETE
```

The recovery strategy is external public-index measurement + provenance/freshness classification, never robots bypass.

---

# 9. P0-E denominator reconciliation

Public Mubawab presentation around ~102K is a reconciliation anchor, not a certified unique-ID denominator.

```text
unique authorized-accessible unit IDs
+ project/non-unit objects
+ aliases/duplicates
+ documented restricted/non-indexable component
= explained public catalog universe
```

Rules:

- never add overlapping route counters blindly;
- `is` counters are not additive;
- project objects stay separate from unit inventory;
- first-party overflow is evidence for a restricted component, not invented accessible stock;
- Common Crawl IDs remain an external-index/provenance bucket until freshness and unit semantics are established;
- arithmetic equality with the public counter is not proof.

Deterministic P0-E gate run `33920795113` ✅. It prevents a fabricated PASS based only on bucket arithmetic.

**P0-E guard = GREEN. Real-world denominator evidence = 🟡.**

---

# 10. Current exact next

1. expand Common Crawl coverage with bounded safe index pages/queries and useful snapshots;
2. deduplicate external-index IDs against the frozen 31,731 seed union and across snapshots;
3. classify external IDs by provenance/freshness: current-looking, stale/historical, project/non-unit, malformed/non-listing;
4. preserve zero-request external discovery by default; no bulk Mubawab detail crawl;
5. quantify how much known first-party overflow is explained by the external-index union;
6. feed only qualified buckets into P0-E reconciliation;
7. continue P0-A/P0-B bounded discovery until repeated probes stop producing new families/dimensions;
8. keep Phase 1 Full Harvest BLOCKED until P0-A..P0-E all PASS.

---

# 11. Facts every handover must preserve

- repo `hraaaaf/Akarfinder`;
- branch `feat/data-ingestion-canonical`;
- PR #996 OPEN / DRAFT / unmerged;
- no Vercel deploy;
- no production DB write;
- historical union = 31,731, seed evidence only;
- future `:p:N` requests prohibited while current robots rule applies;
- P0-D first-party = FAIL;
- strongest first-party lower bound so far = **≥2,223** across the 13 tested leaves, not a Morocco-wide remainder;
- Partition Inventory found no proven finer exhaustive partition;
- Common Crawl bounded sample = 366 IDs, including 112 absent from the historical union, with 0 Mubawab requests;
- P0-E deterministic guard GREEN, real denominator unresolved;
- Human ambiguity gate comes only after card + authorized detail evidence;
- target remains **100% explained authorized Mubawab coverage**, not an arbitrary listing count.

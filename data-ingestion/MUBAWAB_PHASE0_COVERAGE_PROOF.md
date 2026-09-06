# Mubawab Phase 0 — Coverage Proof

**Status:** 🔵 ACTIVE  
**Date opened:** 2026-09-04  
**Canonical parent:** `data-ingestion/canonical.md`

**Goal:** prove that the planned method can explain 100% of the publicly accessible, authorized and relevant Mubawab listing universe before Full Harvest.

---

## 1. Core invariant

```text
technical exhaustion of a configured matrix
≠ proof that the matrix represents the whole portal
≠ proof that the traversal is authorized
```

Phase 0 must prove route families, dimensions, reachability, authorized traversal and denominator reconciliation.

---

## 2. Current gates

| Gate | Goal | Status | Current fact |
|---|---|---:|---|
| P0-A | Route families | 🟡 | registry includes flat, thematic and hierarchical families; repeated discovery still required before PASS |
| P0-B | Dimensions | 🟡 | historical 12-city matrix proven incomplete; public geography hierarchy mapped |
| P0-C | Reachability | 🟡 | `ct/is` residuals and sampled ambiguities proven/classified; wider reachability closure still required |
| P0-D | Authorized traversal | 🔴 FAIL first-party / 🔵 external-index recovery ACTIVE | multi-city `sd` leaves overflow while `:p:N` is robots-disallowed; Common Crawl exposes additional source IDs without Mubawab requests |
| P0-E | Denominator | 🟡 | deterministic reconciliation guard is GREEN; real-world denominator evidence remains incomplete |

**Phase 0 PASS requires P0-A..P0-E all PASS. Full Harvest remains BLOCKED.**

---

## 3. Historical discovery anchors, with compliance caveat

Classic run `33899083917` observed **29,741 unique IDs**. Historical office run `33906589600` extended the persistent union to **31,731 unique IDs**.

Office evidence:

- sale: 710 IDs;
- rent: 1,280 IDs;
- artifact `9949834432`;
- digest `sha256:964a8cc44255bfd793615c4adea1c3be4238bed87b09aad0514c326da681bacc`.

These numbers are retained as historical seed observations only.

### Compliance correction

Current Mubawab robots policy contains:

```text
User-agent: *
Disallow: /*:
Disallow: /*?n=1
```

Historical colon pagination such as `:p:2` therefore matches a disallowed path form.

The robots utility supports wildcard/query semantics and regression tests explicitly reject `:p:N`.

**No future `:p:N` request is permitted while this rule applies.** Historical deep-pagination counts are not compliance certification.

---

## 4. P0-A — Route-family registry

### Unit inventory / control surfaces

| Family | Role | Meaning |
|---|---|---|
| `st` | primary candidate | city × category |
| `sc` | primary candidate | national category |
| vacation `st` | primary candidate | vacation transaction family |
| `cc` | control | broad national aggregate |
| `ct` | control | city × transaction |
| `t` | control | city aggregate |
| `tw` | control | neighborhood aggregate |
| `cd` | control | neighborhood × transaction |
| `sd` | control / partition candidate | neighborhood × category/transaction-style leaf |
| `is` | control | thematic/search-like surface; overlapping rather than proven exhaustive partition |

### Geography/taxonomy hierarchy

| Family | Role |
|---|---|
| `mpr` | region hierarchy / taxonomy control |
| `mprp` | province/prefecture hierarchy |
| `mprpt` | city/arrondissement hierarchy |
| `mprptd` | district/neighborhood hierarchy leading toward `tw` |

`mpr*` routes enumerate geography/taxonomy. They are **not assumed to be unit-listing harvest surfaces**.

### Separate buckets

- `pl`: project/non-unit catalogue;
- `a` / `pa`: listing identity/detail, not Phase 0 discovery surfaces.

The earlier `crp` hypothesis is removed from the active registry because it was not reproducible in later bounded evidence.

No control family may be dismissed as redundant without reachability evidence.

---

## 5. P0-B — Dimension and geography proof

Initial bounded probe `33908825931` proved that the historical 12-city config was incomplete.

Confirmed missing geographies included:

```text
dakhla
essaouira
martil
meknes
```

Confirmed unconfigured semantics included:

```text
appartements-vacational
bureaux-et-commerces-a-louer
bureaux-et-commerces-a-vendre
immobilier-a-louer
immobilier-a-vendre
```

Latest bounded dimension proof:

- run `33918393534` ✅ SUCCESS;
- artifact `9954070944`;
- digest `sha256:3305e3fbd918ca9ccaf7b31dcdd0251dddc8671c000843c290762aea91af1a75`;
- 13 public/page-1 requests;
- robots checked;
- 0 detail pages;
- 0 disallowed pagination;
- 0 DB/prod/image writes.

This proof exposed the `mpr → mprp → mprpt → mprptd → tw` geography hierarchy and finer `cd/sd` inventory surfaces.

Project/taxonomy hierarchy counts are not silently treated as unit-listing counts.

---

## 6. P0-C — Reachability and ambiguity closure

Residual-vs-historical-union proof:

- run `33912205981` ✅ SUCCESS;
- artifact `9951845045`;
- digest `sha256:71e34e6f29ae2e7dde1954684af3ea061237d00d2c5a706f8417aee43c0796a9`;
- 78 sampled residual IDs;
- 23 already known in historical 31,731 union;
- **55 absent from that historical union**.

Breakdown:

| Surface | Absent from historical union |
|---|---:|
| `ct-casablanca-sale` | 0 |
| `ct-casablanca-rent` | 5 |
| `is-casablanca-sale-cheap` | 22 |
| `is-casablanca-rent-cheap` | 28 |

These IDs are classification/reachability evidence, not proof that they exist uniquely on `ct/is`.

### Detail-before-human rule

```text
card clear → classify
card ambiguous → robots-check exact detail URL
allowed detail → inspect ONE detail description
clear detail → classify
trusted origin route may resolve transaction if non-conflicting
still ambiguous / policy-unavailable → human arbitration
```

No bulk detail crawl.

Latest bounded ambiguity-detail proof:

- run `33917777332` ✅ SUCCESS;
- artifact `9953873543`;
- digest `sha256:2917033f96b46b7b990ee56f7d84ad869b29109a0a6b7adb5e808fd2bed93190`;
- 4 robots-allowed detail pages opened;
- 0 DB/prod/image writes.

Sampled resolutions:

- `8298787` → apartment / sale;
- `8160402` → apartment / sale via `is` sale provenance;
- `8285323` → apartment / rent via `is` rent provenance;
- `8274907` → apartment / rent via `is` rent provenance.

Human precedent #1, source ID `8322103`:

```text
property_type = apartment
transaction_type = rent
offer_scope = room
```

`room` is an offer scope, not a property type.

---

## 7. P0-D — Authorized traversal proof

**Status: 🔴 FAIL for known first-party traversal. External public-index recovery lane: 🔵 ACTIVE.**

### 7.1 Standard public sitemap probe

Run `33917777332` probed standard sitemap candidates.

- artifact `9953831525`;
- digest `sha256:3b370500a1e34b3223a49ca605eea0072b45f3ec5981e02b7707f402177a2c3e`.

All tested standard sitemap endpoints were robots-allowed but returned **404**. No complete standard sitemap traversal was found.

### 7.2 Oasis deepest-known leaf proof

Run `33920078656` established the first decisive lower bound on seven robots-allowed `sd` leaves:

```text
7 leaves tested
3 complete on page 1
4 overflow
180 unique IDs observed
minimum unexplained remainder = 411
```

The **411** is only a sampled Oasis lower bound, not a Morocco-wide restricted remainder.

### 7.3 Multi-city structural proof

Run `33920686277` extended the authorized page-1 test across Casablanca, Rabat and Marrakech, including Oasis, Maârif, Agdal and Guéliz.

Artifact:

- `9955181479`;
- digest `sha256:31cb27d4952ad6bfdf5d68d3a17df7db783c87f005d0d544610647a2f5a7d77d`.

Exact result:

```text
13 leaves tested
3 complete on page 1
10 overflow
372 IDs visible
minimum unexplained remainder >= 2,223
```

The workflow conclusion is intentionally FAIL because the gate rejects a traversal model that cannot certify complete coverage. This is not an implementation crash.

**Conclusion:** overflow is structural across multiple cities, not an Oasis anomaly.

### 7.4 Partition Inventory

Workflow `Data Ingestion Lot 9 P0-D Partition Inventory`, run `33920795086` ✅ SUCCESS.

Artifact:

- `9955242717`;
- digest `sha256:326116c241715734a08a147b914def093d3cc4c3946763ea5bfa3094ee153061`.

Safety:

- 1 robots-allowed page request;
- 0 detail pages;
- 0 disallowed pagination;
- 0 DB/prod/image writes.

Overflow leaf inspected:

```text
https://www.mubawab.ma/fr/sd/casablanca/oasis/appartements-a-louer
public total = 281
first-page unit IDs = 32
```

The page exposes routes such as `ct`, `is`, language aliases and business/project links, plus filter fields (`minPrice`, `maxPrice`, `minSurface`, `maxSurface`, `minRooms`, etc.).

**No exposed candidate was proven to be an exhaustive, disjoint, robots-allowed finer partition.** Filter inventory alone is not promoted into a traversal mechanism.

Interpretation rule remains:

```text
inventory ≠ proof of partition
partition acceptance requires subset + disjointness + completeness evidence
```

### 7.5 Common Crawl external-index recovery lane

Workflow `Data Ingestion Lot 9 P0-D Common Crawl Index`, run `33921381132` ✅ SUCCESS.

Artifact:

- `9955501704`;
- digest `sha256:cfd55d0e64d944274aebf57e88c7f23082363a27e9ac887acc08124d162245e6`.

Index: `CC-MAIN-2026-30`.

Queries:

```text
https://www.mubawab.ma/fr/a/*/*
https://www.mubawab.ma/fr/pa/*/*
```

Exact bounded result:

```text
Common Crawl pages attempted: 4
rows observed: 749
Mubawab detail rows: 366
unique Mubawab source IDs: 366
IDs absent from historical 31,731 union: 112
Mubawab live requests: 0
detail fetches: 0
DB writes: 0
production writes: 0
images: 0
coverage_state = external_index_residual
```

The 112 are **newly indexable source IDs in this bounded external-index sample**. They are not yet certified as 112 current active canonical listings; Common Crawl may contain stale/historical pages.

This proves that an external public index can expose Mubawab IDs beyond the frozen historical union without requesting prohibited Mubawab pagination.

### P0-D decision

P0-D is now modeled as two explicit lanes:

```text
first_party_authorized_traversal = FAIL
external_public_index_recovery = ACTIVE / NOT YET COMPLETE
```

First-party failure is proven by multi-city overflow + robots restriction + lack of a proven finer exhaustive partition.

The recovery strategy is to measure and validate the external public-index universe, with provenance/staleness controls, rather than attempting to bypass Mubawab robots policy.

P0-D remains globally FAIL until the combined authorized method has defensible complete reachability semantics.

---

## 8. P0-E — Denominator model

The public ~102K presentation is a reconciliation anchor only.

Target equation:

```text
public catalog presentation
=
unique authorized-accessible unit IDs
+ project/non-unit objects
+ aliases/duplicates
+ documented restricted/non-indexable component
```

Rules:

- never sum counters from overlapping route families;
- `is` counters are not additive;
- project hierarchy is separate from unit inventory;
- first-party overflow is evidence for a restricted component, not invented accessible stock;
- Common Crawl IDs remain an external-index/provenance bucket until freshness and unit semantics are established;
- numerical equality with the public counter is insufficient by itself;
- 100% means **100% explained authorized coverage**.

Deterministic P0-E gate run `33920795113` ✅ SUCCESS. The guard prevents a fabricated PASS based only on arithmetic reconciliation.

**P0-E code/guard = GREEN. Real-world denominator evidence = 🟡 IN PROGRESS.**

---

## 9. Current exact next

1. expand Common Crawl coverage beyond the bounded 366-ID sample using safe index queries/pages and, where useful, multiple index snapshots;
2. deduplicate all external-index IDs against the frozen 31,731 seed union and across CC snapshots;
3. classify external IDs by provenance/freshness: current-looking, historical/stale, project/non-unit, malformed/non-listing;
4. do not live-fetch Mubawab detail pages in bulk; preserve 0-request external-index discovery unless a separately authorized bounded validation is justified;
5. quantify how much of the multi-city first-party overflow is explained by the external-index union;
6. feed only qualified buckets into P0-E reconciliation;
7. continue P0-A/P0-B until repeated bounded discovery stops producing new route families/dimensions;
8. keep Full Harvest BLOCKED until P0-A..P0-E all PASS.

**Phase 0 Coverage Proof: ACTIVE 🔵**

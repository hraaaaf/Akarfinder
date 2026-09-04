# Mubawab Phase 0 — Coverage Proof

**Status:** 🔵 ACTIVE  
**Date opened:** 2026-09-04  
**Canonical parent:** `data-ingestion/canonical.md`

**Goal:** prove that the planned method can cover 100% of the publicly accessible, authorized and relevant Mubawab listing universe before Full Harvest.

---

## 1. Core invariant

```text
technical exhaustion of a configured matrix
≠ proof that the matrix represents the whole portal
≠ proof that the traversal is authorized
```

Phase 0 must prove coverage model, dimensions, reachability, authorized traversal and denominator reconciliation.

---

## 2. Current gates

| Gate | Goal | Status | Current fact |
|---|---|---:|---|
| P0-A | Route families | 🟡 | registry expanded to flat, thematic and hierarchical families; repeated discovery still required before PASS |
| P0-B | Dimensions | 🟡 | historical 12-city matrix proven incomplete; public geography hierarchy now mapped |
| P0-C | Reachability | 🟡 | `ct/is` residuals proven; sampled ambiguous cases now resolved by card/detail/provenance evidence |
| P0-D | Authorized traversal | 🔴 FAIL | deepest known `sd` leaves can still overflow page 1 while `:p:N` is robots-disallowed |
| P0-E | Denominator | ⚪ | ~102K public presentation remains a reconciliation anchor, not a unique-ID denominator |

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

The robots utility now supports wildcard/query semantics and the regression test explicitly rejects `:p:N`.

**No future `:p:N` request is permitted while this rule applies.** Historical deep-pagination counts are not compliance certification.

---

## 4. P0-A — Route-family registry V3

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
| `is` | control | thematic/search-like surface, overlapping rather than an exhaustive partition |

### Geography/taxonomy hierarchy

| Family | Role |
|---|---|
| `mpr` | region hierarchy / taxonomy control |
| `mprp` | province/prefecture hierarchy |
| `mprpt` | city/arrondissement hierarchy |
| `mprptd` | district/neighborhood hierarchy leading toward `tw` |

These `mpr*` routes are used to enumerate geography/taxonomy. They are **not assumed to be unit-listing harvest surfaces**.

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

This proof exposed the `mpr → mprp → mprpt → mprptd → tw` geography hierarchy and the finer `cd/sd` inventory surfaces.

Important semantic boundary: project/taxonomy hierarchy counts are not silently treated as unit-listing counts.

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

These IDs are not assumed unique to `ct/is`; they are classification/reachability evidence.

### Detail-before-human rule

Canonical sequence:

```text
card clear → classify
card ambiguous → robots-check exact detail URL
allowed detail → inspect ONE detail description
clear detail → classify
if transaction is explicit in the trusted origin route, use that provenance unless conflicting evidence exists
still ambiguous / policy-unavailable → show user → user decides
```

No bulk detail crawl.

Latest bounded ambiguity-detail proof:

- run `33917777332` ✅ SUCCESS;
- artifact `9953873543`;
- digest `sha256:2917033f96b46b7b990ee56f7d84ad869b29109a0a6b7adb5e808fd2bed93190`;
- 4 robots-allowed detail pages opened;
- 0 DB/prod/image writes.

The four sampled cases were resolved without a new human decision once detail + route provenance were used:

- `8298787` → apartment / sale;
- `8160402` → apartment / sale via `is` sale provenance;
- `8285323` → apartment / rent via `is` rent provenance;
- `8274907` → apartment / rent via `is` rent provenance.

### Human precedent #1 — room/colocation inside apartment

User decision **A** for source ID `8322103`:

```text
property_type = apartment
transaction_type = rent
offer_scope = room
```

`room` is an offer scope, not a property type.

A plain apartment that merely has “1 chambre” remains `offer_scope = whole_property`; room scope requires explicit room-rental/colocation evidence.

---

## 7. P0-D — Authorized traversal proof

**Status: 🔴 FAIL / BLOCKED.**

### 7.1 Standard public index probe

Run `33917777332` probed standard public sitemap candidates.

Artifact:

- `9953831525`;
- digest `sha256:3b370500a1e34b3223a49ca605eea0072b45f3ec5981e02b7707f402177a2c3e`.

All tested standard sitemap endpoints were robots-allowed but returned **404**. No complete standard sitemap traversal was found.

### 7.2 Deepest-known first-party leaf test

Dedicated gate:

`Data Ingestion Lot 9 P0-D Authorized Traversal`

Run `33920078656` ✅ SUCCESS.

Artifact:

- `9954738361`;
- digest `sha256:019f4e8a937667866427f7f6bb151da44cb9142878b6219304d15c2db2c0a1fc`.

Safety:

- 7 robots-allowed public requests;
- 0 `:p:N` requests;
- 0 detail pages;
- 0 DB writes;
- 0 production writes;
- 0 images;
- no source block.

Representative Oasis `sd` leaves:

| Leaf | Public total | IDs visible page 1 | Status | Minimum unexplained |
|---|---:|---:|---|---:|
| apartments sale | 117 | 32 | overflow | **85** |
| apartments rent | 281 | 32 | overflow | **249** |
| offices/commercial sale | 16 | 16 | complete | 0 |
| offices/commercial rent | 108 | 32 | overflow | **76** |
| locaux sale | 12 | 12 | complete | 0 |
| locaux rent | 24 | 24 | complete | 0 |
| luxury villas/houses sale | 33 | 32 | overflow | **1** |

Summary:

```text
7 leaves tested
3 complete on page 1
4 overflowing
180 unique IDs observed
minimum unexplained remainder = 411
current first-party leaf model certifiable = false
```

This **411 is a sampled lower bound for these seven Oasis leaves only**, not the Morocco-wide restricted remainder.

### P0-D conclusion

The currently known first-party model cannot be certified complete because:

1. colon pagination is explicitly disallowed by robots;
2. standard sitemap candidates did not provide an alternate traversal;
3. even fine `sd` geography/category leaves can exceed the page-1 capacity;
4. thematic `is` routes overlap and are not proven to form an exhaustive partition.

P0-D remains FAIL until one of the following is proven:

- a different robots-allowed exhaustive first-party mechanism;
- an explicitly authorized feed/index/permission path;
- or a complete, defensible quantification of the restricted component for P0-E.

No robots/access-control bypass is permitted.

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
- project hierarchy is a separate bucket from unit inventory;
- P0-D overflow becomes evidence for the restricted component, not invented accessible stock;
- 100% means **100% explained authorized coverage**, not forcing the unique-ID union to match one unstable marketing counter.

---

## 9. Current exact next

1. expand P0-D overflow quantification from Oasis to a bounded representative set of neighborhoods/cities and category/transaction leaves;
2. derive page-1 capacity and restricted lower bounds from actual IDs, never assumptions;
3. keep searching only for robots-allowed, publicly exposed exhaustive traversal mechanisms;
4. if no such mechanism emerges, build the P0-E restricted-component estimator/reconciliation model;
5. continue P0-A/P0-B discovery until repeated bounded seeds stop producing new route families/dimensions;
6. continue P0-C reachability checks using card → allowed detail → route provenance → human review only as last resort;
7. keep Full Harvest BLOCKED until P0-A..P0-E all PASS.

**Phase 0 Coverage Proof: ACTIVE 🔵**

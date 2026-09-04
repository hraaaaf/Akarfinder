# Mubawab Phase 0 — Coverage Proof

**Status:** 🔵 ACTIVE

**Date opened:** 2026-09-04

**Canonical parent:** `data-ingestion/canonical.md`

**Goal:** prove that the planned discovery model can cover 100% of the publicly accessible, authorized and relevant Mubawab listing universe before launching Full Harvest.

---

## 1. Why Phase 0 exists

The original Full Coverage matrix exhausted 12 cities × 11 categories and reached 29,741 unique IDs, but later national office surfaces immediately exposed thousands of additional IDs.

Therefore:

```text
technical exhaustion of a configured matrix
≠
proof that the matrix represents the whole portal
```

Phase 0 fixes that methodological error.

---

## 2. Current measured anchors

### Public catalog reference

Observed on Mubawab public home on 2026-09-04:

- approximately **102,532 properties** displayed by the home counter.

This number is a reconciliation anchor only. It is NOT yet certified as 102,532 unique listing IDs.

### Current exact persistent discovery union

- classic matrix baseline: **29,741 unique IDs**;
- persistent national office campaign added: **1,990 unique IDs**;
- current exact persistent union: **31,731 unique IDs**;
- run: `33906589600` ✅;
- artifact: `9949834432`;
- artifact digest: `sha256:964a8cc44255bfd793615c4adea1c3be4238bed87b09aad0514c326da681bacc`.

Office campaign state:

- `sc-office-sale`: terminal at page 24, 710 unique IDs, `zero_refs`;
- `sc-office-rent`: page 40 reached, 1,280 unique IDs, not terminal at that checkpoint.

These numbers are evidence, not the Phase 0 target.

---

## 3. Phase 0 gates

| Gate | Goal | Status | Closure proof |
|---|---|---:|---|
| P0-A Route families | identify every inventory-bearing public route family | 🟡 | route-family registry + evidence |
| P0-B Dimensions | enumerate transaction/type/geography/product dimensions | 🟡 | dimension registry + gap report |
| P0-C Reachability | prove control-surface IDs are explained by harvest surfaces | ⚪ | sampled ID reachability matrix |
| P0-D Pagination | prove paging and terminal semantics for each harvest class | 🟡 | tests + live bounded evidence |
| P0-E Denominator | reconcile ~102.5K into explainable buckets | ⚪ | denominator reconciliation report |

**Phase 0 PASS requires all five gates PASS.**

---

## 4. Route-family registry V0

| Family | Observed semantic role | Initial classification | Known example | P0 decision |
|---|---|---|---|---|
| `st` | city × category listing surface | primary candidate | `/fr/st/casablanca/appartements-a-vendre` | already used, inventory incomplete globally |
| `sc` | national category listing surface | primary candidate | `/fr/sc/appartements-a-vendre` | confirmed inventory-bearing |
| `cc` | broad national aggregate | control/diagnostic candidate | `/fr/cc/immobilier-a-louer` | must detect residual IDs |
| `t` | city aggregate | control/geography discovery candidate | `/fr/t/casablanca` | confirmed public inventory surface |
| `pl` | new-development/project catalogue | project/non-unit until proven otherwise | `/fr/pl/cité-ennasr/listing-promotion` | separate denominator bucket required |
| vacation `st` | city/type vacation inventory | primary candidate, distinct transaction | `/fr/st/rabat/appartements-vacational` | not covered by classic matrix |
| detail `a` / `pa` | listing detail identity | not a discovery surface | `/fr/a/<id>/...`, `/fr/pa/<id>/...` | identity only during Phase 0 |

### Current evidence

- `/fr/t/casablanca` publicly exposes an aggregate Casablanca catalogue with a visible result counter.
- `/fr/pl/cité-ennasr/listing-promotion` publicly exposes 225 projects over 11 pages.
- the Mubawab home explicitly separates `Vente`, `Location`, `Loc. vacances` and `Immobilier Neuf`.

### P0-A open questions

1. Are there additional inventory-bearing route families beyond `st`, `sc`, `cc`, `t`, vacation and `pl`?
2. Are language variants merely aliases or can they expose inventory absent from `/fr`?
3. Are there geography aggregate routes below city level that expose distinct inventory?
4. Does `pa` represent ordinary listing identity, project-unit identity, or a mixture requiring separate treatment?

---

## 5. Dimension registry V0

### Transactions

- sale
- long-term rent
- vacation rent
- new-development/project catalogue as separate product dimension until reconciled

### Property families already known

- apartment
- land
- villa/luxury house
- house
- commercial premises
- office/commercial aggregate
- riad

### Geography

Classic matrix covered only:

- Casablanca
- Rabat
- Marrakech
- Tanger
- Agadir
- Fès
- Kénitra
- Mohammedia
- Témara
- Dar Bouazza
- Bouskoura
- Salé

This list is explicitly **not exhaustive**.

Public project/search evidence already exposes additional localities such as:

- Meknès
- Essaouira
- Zenata
- Asilah
- Had Soualem
- Ouislane
- Harhoura
- and others to be inventoried systematically.

### P0-B open questions

1. complete public city/locality vocabulary;
2. which localities are aliases/children of larger cities vs independent inventory partitions;
3. complete property-type vocabulary across sale/rent/vacation/new;
4. whether office/commercial aggregate can be safely decomposed semantically;
5. project vs unit semantics.

---

## 6. Pagination proof status

Already demonstrated:

- `st` supports `:p:N` pagination and deep resumable windows;
- national office `sc` surfaces support `:p:N`;
- office sale reached clean terminal behavior at page 24 (`zero_refs`);
- persistent collector checkpoints after each page and preserves global source-ID union.

Still to prove:

- `cc` terminal semantics;
- `t` terminal semantics;
- vacation terminal semantics;
- `pl` terminal semantics and whether its objects are units vs projects;
- any newly discovered family.

---

## 7. Reachability proof design

For each broad control surface:

1. sample listing IDs from early, middle and late pagination;
2. test whether each ID is present in at least one candidate primary harvest surface;
3. classify misses by missing dimension/route family;
4. add newly discovered harvest surface if justified;
5. repeat until control surfaces stop revealing unexplained categories/geographies.

Core invariant:

```text
control ID
→ known harvest surface
OR
→ documented new surface/dimension
```

If neither is true, P0-C FAILS.

---

## 8. Denominator reconciliation model

Target equation:

```text
public catalog universe
=
unique accessible unit-listing IDs
+ project/non-unit objects
+ aliases/duplicates
+ documented inaccessible/non-indexable components
```

Current public counter anchor: ~102.5K.

Current exact unit-ID union: 31,731.

The raw gap MUST NOT be interpreted yet as 70K missing unique listings because the public counter denominator is not certified.

P0-E must quantify each bucket before Phase 0 closes.

---

## 9. Phase 0 implementation roadmap

### Step 0.1 — Route family registry

- formalize registry in code;
- attach semantic role and harvest/control/project classification;
- tests prevent accidental assumption that aggregate counters are additive.

### Step 0.2 — Dimension discovery

- enumerate public cities/localities and categories from public navigation/listing surfaces;
- compare with current config;
- produce `missing_geographies` and `missing_semantics`.

### Step 0.3 — Reachability sampler

- implement bounded control-surface ID sampler;
- compare sampled IDs against candidate harvest surface IDs;
- record explained/unexplained IDs.

### Step 0.4 — Pagination certification

- bounded paging proof per route family;
- verify terminal condition and checkpoint safety.

### Step 0.5 — Denominator reconciliation

- compare home/catalog counters with unique IDs and project/alias buckets;
- refuse 100% claim while unexplained material remainder exists.

---

## 10. No-harvest gate

Until Phase 0 PASS:

- no new broad mass-harvest campaign;
- existing 31,731-ID state is preserved as evidence/seed;
- small bounded probes are allowed only when required to prove coverage semantics;
- zero production writes / deploy / merge.

---

## 11. Next exact

1. implement route-family registry V1 in code;
2. test classification and denominator non-additivity;
3. build public geography/category inventory collector with bounded requests;
4. compare discovered dimensions against `config.json`;
5. produce first `missing_geographies` / `missing_categories` report;
6. then build the reachability sampler for `cc` and `t` control surfaces.

**Phase 0 Coverage Proof: ACTIVE 🔵**

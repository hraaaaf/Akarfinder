# HANDOVER — AkarFinder Data Ingestion / Mubawab

**Date:** 2026-09-04

## Read order

1. `data-ingestion/canonical.md`
2. `data-ingestion/MUBAWAB_PHASE0_COVERAGE_PROOF.md`
3. `data-ingestion/LOT9_STATUS.md`
4. this file

---

# Repo state

- repo: `hraaaaf/Akarfinder`
- branch: `feat/data-ingestion-canonical`
- PR: `#996`
- keep OPEN / DRAFT / unmerged;
- no Vercel deployment;
- no production DB writes;
- no merge without explicit user authorization.

---

# Goal

Before adding another portal, prove and then obtain **100% explained coverage of all publicly accessible, authorized and relevant Mubawab listings**.

Full Harvest remains blocked until Phase 0 is both complete and authorized.

---

# Roadmap

```text
Lots 1–8 CLOSED
      ↓
Lot 9 Phase 0 Coverage Proof  ← ACTIVE
      ↓
Lot 9 Phase 1 Full Harvest  ← BLOCKED
      ↓
Reconciliation 100%
      ↓
Lot 10 Certification
      ↓
Lot 11 Controlled ingestion
      ↓
Lot 12 Other sources if needed for ≥100K
```

---

# Historical anchors

- classic run `33899083917`: **29,741 unique source IDs**;
- office run `33906589600`: historical union **31,731**;
- artifact `9949834432`;
- digest `sha256:964a8cc44255bfd793615c4adea1c3be4238bed87b09aad0514c326da681bacc`.

These remain useful seed observations but are **not compliance certification**, because historical deep pagination used `:p:N` and the old robots parser did not correctly model wildcard rules.

---

# Critical robots finding

Mubawab robots policy includes:

```text
User-agent: *
Disallow: /*:
Disallow: /*?n=1
```

Therefore future `:p:N` requests are forbidden for the AkarFinder research bot.

The robots utility is wildcard/query aware and regression-tested.

---

# Phase 0 gates

- P0-A Route families: 🟡
- P0-B Dimensions: 🟡
- P0-C Reachability: 🟡
- P0-D Authorized traversal: 🔴 first-party FAIL / 🔵 external-index recovery ACTIVE
- P0-E Denominator: 🟡, deterministic guard GREEN but real denominator not closed

**Full Harvest stays BLOCKED until all five PASS.**

---

# Current route model

Unit/control families:

- `st`
- `sc`
- `cc`
- `ct`
- `t`
- `tw`
- `cd`
- `sd`
- `is`
- vacation `st`

Geography/taxonomy hierarchy:

- `mpr`
- `mprp`
- `mprpt`
- `mprptd`

Separate buckets:

- `pl` = project/non-unit;
- detail `a/pa` = identity/detail only.

The old `crp` hypothesis is removed because it was not reproduced.

`mpr*` enumerates geography/taxonomy and is not silently counted as unit inventory.

---

# Dimension evidence

Historical 12-city config is incomplete.

Confirmed missing examples:

- Dakhla
- Essaouira
- Martil
- Meknès

Confirmed unconfigured semantics include:

- `appartements-vacational`
- `bureaux-et-commerces-a-louer`
- `bureaux-et-commerces-a-vendre`
- `immobilier-a-louer`
- `immobilier-a-vendre`

Latest dimension proof:

- run `33918393534` ✅
- artifact `9954070944`
- digest `sha256:3305e3fbd918ca9ccaf7b31dcdd0251dddc8671c000843c290762aea91af1a75`
- exposed `mpr → mprp → mprpt → mprptd → tw` plus finer `cd/sd` inventory surfaces.

---

# Reachability / ambiguity evidence

Residual proof run `33912205981` ✅:

- 78 sampled residual IDs;
- 23 already in historical 31,731;
- 55 absent from that historical union.

Breakdown:

- `ct` Casablanca sale: 0 absent;
- `ct` Casablanca rent: 5 absent;
- `is` Casablanca sale-cheap: 22 absent;
- `is` Casablanca rent-cheap: 28 absent.

These are reachability/classification evidence, not proof that all 55 exist only on `ct/is`.

Canonical ambiguity order:

```text
card clear → classify
card ambiguous → robots-check exact detail
allowed detail → inspect ONE description
clear detail → classify
trusted origin route may resolve transaction if non-conflicting
still ambiguous / unavailable → human arbitration
```

No bulk detail crawl.

Human precedent #1, source ID `8322103`:

```text
property_type = apartment
transaction_type = rent
offer_scope = room
```

---

# P0-D decisive evidence

## 1. Standard sitemap route

Run `33917777332`: standard sitemap candidates were robots-allowed but returned 404.

No standard public sitemap traversal found.

## 2. Oasis lower bound

Run `33920078656`:

```text
7 leaves
3 complete page 1
4 overflow
180 visible IDs
minimum unexplained remainder = 411
```

411 is an Oasis-sample lower bound only.

## 3. Multi-city structural proof

Run `33920686277` tested 13 robots-allowed `sd` leaves across Casablanca, Rabat and Marrakech.

Artifact:

- `9955181479`
- digest `sha256:31cb27d4952ad6bfdf5d68d3a17df7db783c87f005d0d544610647a2f5a7d77d`

Exact:

```text
13 leaves tested
3 complete page 1
10 overflow
372 IDs visible
minimum unexplained remainder >= 2,223
```

Workflow failure is intentional gate semantics: current traversal is not certifiable. It is not an implementation crash.

**Conclusion: first-party overflow is structural, not local to Oasis.**

## 4. Partition Inventory

Run `33920795086` ✅ SUCCESS.

Artifact:

- `9955242717`
- digest `sha256:326116c241715734a08a147b914def093d3cc4c3946763ea5bfa3094ee153061`

Inspected overflow leaf:

```text
/sd/casablanca/oasis/appartements-a-louer
total = 281
page-1 IDs = 32
```

Exposed inventory includes `ct`, `is`, language aliases, business/project links and filter fields such as price/surface/rooms.

**No exposed candidate was proven exhaustive + disjoint + complete.**

Rule:

```text
inventory ≠ partition proof
```

## 5. Common Crawl recovery lane

Run `33921381132` ✅ SUCCESS.

Index: `CC-MAIN-2026-30`.

Artifact:

- `9955501704`
- digest `sha256:cfd55d0e64d944274aebf57e88c7f23082363a27e9ac887acc08124d162245e6`

Queries:

```text
https://www.mubawab.ma/fr/a/*/*
https://www.mubawab.ma/fr/pa/*/*
```

Exact bounded result:

```text
749 CC rows observed
366 Mubawab detail rows / unique source IDs
112 IDs absent from historical 31,731
0 Mubawab live requests
0 detail fetches
0 DB/prod/image writes
coverage_state = external_index_residual
```

Important: the 112 are **newly indexable IDs**, not yet 112 certified current active listings. Common Crawl can contain stale/historical pages.

---

# P0-D canonical decision

P0-D is now explicitly split:

```text
first_party_authorized_traversal = FAIL
external_public_index_recovery = ACTIVE / NOT YET COMPLETE
```

The known first-party model cannot certify complete traversal because:

1. `:p:N` is robots-disallowed;
2. fine `sd` leaves overflow in multiple cities;
3. no standard sitemap traversal was found;
4. Partition Inventory found no proven finer exhaustive partition.

Common Crawl is the active recovery lane because it can reveal additional public Mubawab IDs with **zero Mubawab requests**.

No robots/access-control bypass is permitted.

---

# P0-E denominator

Public ~102K presentation remains a reconciliation anchor, not a certified unique-ID count.

Equation:

```text
unique authorized-accessible unit IDs
+ project/non-unit objects
+ aliases/duplicates
+ documented restricted/non-indexable component
= explained public universe
```

Deterministic P0-E gate run `33920795113` ✅ SUCCESS.

The implementation refuses a fake PASS based only on arithmetic equality with the public counter.

**P0-E guard = GREEN. Real-world evidence = 🟡.**

---

# NEXT EXACT

1. expand Common Crawl coverage with bounded safe queries/pages and useful index snapshots;
2. deduplicate external-index IDs against frozen historical 31,731 and across snapshots;
3. classify external IDs by provenance/freshness: likely current, stale/historical, project/non-unit, malformed/non-listing;
4. preserve zero-request external discovery by default; no bulk Mubawab detail crawl;
5. measure how much of known first-party overflow is explained by the external-index union;
6. feed only qualified buckets into P0-E;
7. continue P0-A/P0-B until repeated bounded probes stop finding new families/dimensions;
8. keep Full Harvest BLOCKED until P0-A..P0-E all PASS.

**Current chantier: Mubawab Phase 0 Coverage Proof 🔵**

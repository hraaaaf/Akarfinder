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

These remain useful seed observations but are **not compliance certification**, because the former robots parser mishandled wildcard rules and historical deep pagination used `:p:N`.

---

# Critical robots finding

Mubawab robots policy for `User-agent: *` includes:

```text
Disallow: /*:
Disallow: /*?n=1
```

Therefore future `:p:N` requests are forbidden for the AkarFinder research bot.

The robots utility is wildcard/query aware and regression-tested.

**P0-D Authorized traversal = 🔴 FAIL / BLOCKED.**

---

# Phase 0 gates

- P0-A Route families: 🟡
- P0-B Dimensions: 🟡
- P0-C Reachability: 🟡
- P0-D Authorized traversal: 🔴 FAIL
- P0-E Denominator: ⚪

Full Harvest stays BLOCKED until all five PASS.

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

`mpr*` is used for geography/taxonomy enumeration, not silently counted as unit inventory.

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

# Reachability evidence

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

---

# Ambiguity rule

Canonical order:

```text
card clear → classify
card ambiguous → robots-check exact detail
allowed detail → inspect ONE description
clear detail → classify
trusted origin route may resolve transaction if non-conflicting
still ambiguous / unavailable → show user → user decides
```

No bulk detail crawl.

Latest bounded detail proof:

- run `33917777332` ✅
- artifact `9953873543`
- 4 allowed details inspected;
- all four sampled cases ultimately resolved without a new human arbitration.

Methodology counter-example `8298787`: nonsense card title but explicit public description = apartment sale, Sidi Othmane.

## Human precedent #1

Source ID `8322103`: explicit room/colocation inside an apartment.

```text
property_type = apartment
transaction_type = rent
offer_scope = room
```

A normal apartment mentioning “1 chambre” remains `whole_property`.

---

# P0-D decisive proof

## Standard sitemap/index route

Run `33917777332`: standard sitemap candidates were robots-allowed but all returned 404.

Artifact `9953831525`, digest `sha256:3b370500a1e34b3223a49ca605eea0072b45f3ec5981e02b7707f402177a2c3e`.

No standard public sitemap traversal found.

## Deepest-known authorized leaf test

Dedicated workflow:

`Data Ingestion Lot 9 P0-D Authorized Traversal`

Run `33920078656` ✅ SUCCESS.

Artifact:

- ID `9954738361`
- digest `sha256:019f4e8a937667866427f7f6bb151da44cb9142878b6219304d15c2db2c0a1fc`

Safety:

- 7 public `sd` page-1 requests;
- robots checked per URL;
- 0 `:p:N`;
- 0 details;
- 0 DB/prod/images;
- no source block.

Oasis sample:

| Leaf | Total | Page-1 IDs | Minimum inaccessible |
|---|---:|---:|---:|
| apartments sale | 117 | 32 | **85** |
| apartments rent | 281 | 32 | **249** |
| offices/commercial sale | 16 | 16 | 0 |
| offices/commercial rent | 108 | 32 | **76** |
| locaux sale | 12 | 12 | 0 |
| locaux rent | 24 | 24 | 0 |
| luxury villas/houses sale | 33 | 32 | **1** |

Exact summary:

```text
7 leaves
3 complete on page 1
4 overflow
180 unique page-1 IDs
sampled minimum unexplained remainder = 411
current known first-party leaf model certifiable = false
```

**Important:** 411 is only the lower bound across these seven Oasis leaves, not the Morocco-wide restricted remainder.

Current conclusion: the known first-party model cannot provide complete authorized traversal because some deepest-known exhaustive `sd` leaves still overflow while colon pagination is robots-disallowed.

---

# Public denominator

The ~102K public presentation remains a reconciliation anchor, not a certified unique-ID count.

P0-E equation:

```text
unique authorized-accessible unit IDs
+ project/non-unit objects
+ aliases/duplicates
+ documented restricted/non-indexable component
= explained public universe
```

Never add overlapping route counters blindly. `is` is thematic/overlapping. Project hierarchy stays separate from unit inventory.

---

# NEXT EXACT

1. expand the P0-D lower-bound measurement from Oasis to a bounded representative set of cities/neighborhoods/category×transaction leaves;
2. record complete vs overflow leaves using actual page-1 source IDs and visible totals;
3. continue searching only for public, robots-allowed exhaustive mechanisms;
4. if no such first-party mechanism is found, formalize P0-E restricted-component reconciliation;
5. keep P0-A/P0-B discovery running until repeated bounded probes stop revealing new route/dimension families;
6. keep P0-C ambiguity process card → allowed detail → provenance → human only if still unresolved;
7. Full Harvest remains BLOCKED until P0-A..P0-E all PASS.

**Current chantier: Mubawab Phase 0 Coverage Proof 🔵**

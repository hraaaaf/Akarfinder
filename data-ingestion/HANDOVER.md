# HANDOVER — AkarFinder Data Ingestion / Mubawab

**Date:** 2026-09-04

## Read order

1. `data-ingestion/canonical.md` — authoritative roadmap;
2. `data-ingestion/MUBAWAB_PHASE0_COVERAGE_PROOF.md` — active proof;
3. `data-ingestion/LOT9_STATUS.md` — historical evidence;
4. this file — operational snapshot.

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

Full Harvest is blocked until the Phase 0 coverage model is proven complete **and authorized**.

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

# Historical data evidence

Classic run `33899083917` observed **29,741 unique source IDs**.

Office run `33906589600` extended the historical union to **31,731 unique source IDs**:

- sale office: 710, technical terminal page 24;
- rent office: 1,280 through page 40;
- artifact `9949834432`;
- digest `sha256:964a8cc44255bfd793615c4adea1c3be4238bed87b09aad0514c326da681bacc`.

**Critical:** those numbers remain historical observations/seed evidence, but no longer count as compliance certification because the old robots parser mishandled wildcard rules.

---

# Critical robots finding

Mubawab public robots policy contains `Disallow: /*:` for `User-agent: *`.

Historical pagination uses `:p:N`, therefore future colon-pagination requests are disallowed for the AkarFinder research bot.

The robots utility has been corrected to support wildcard/query semantics and a regression test now explicitly blocks `:p:2`.

Current consequence:

- **P0-D Authorized traversal = 🔴 FAIL / BLOCKED**;
- do not use `:p:N`;
- Phase 0 must find another robots-allowed traversal mechanism or quantify the restricted remainder;
- no bypass is allowed.

---

# Phase 0 gates

- P0-A Route families: 🟡
- P0-B Dimensions: 🟡
- P0-C Reachability: 🟡
- P0-D Authorized traversal: 🔴 FAIL / BLOCKED
- P0-E Denominator: ⚪

All five must PASS before Full Harvest.

---

# Route families currently known

- `st`
- `sc`
- `cc`
- `ct`
- `t`
- `is`
- `crp` — newly discovered hierarchical region/prefecture aggregate, pending qualification
- vacation `st`
- `pl`
- detail identity `a/pa`

Do not declare a family redundant without reachability evidence.

---

# Dimension gaps already proven

Historical 12-city config is incomplete.

Bounded Phase 0 proof found at least:

- Dakhla
- Essaouira
- Martil
- Meknès

and unconfigured semantics:

- `appartements-vacational`
- `bureaux-et-commerces-a-louer`
- `bureaux-et-commerces-a-vendre`
- `immobilier-a-louer`
- `immobilier-a-vendre`

---

# Current reachability evidence

Run `33912205981` ✅ SUCCESS.

Residual classification artifact `9951845045`, digest `sha256:71e34e6f29ae2e7dde1954684af3ea061237d00d2c5a706f8417aee43c0796a9`.

Exact result against historical 31,731 union:

- 78 sampled residual IDs unique;
- 23 were already known;
- **55 are absent from the historical union**.

Breakdown:

- `ct` Casablanca sale: 0 absent;
- `ct` Casablanca rent: 5 absent;
- `is` Casablanca sale-cheap: 22 absent;
- `is` Casablanca rent-cheap: 28 absent.

The major open reachability question is therefore `is`, not `ct` sale.

---

# Human ambiguity gate

User rule:

```text
materially ambiguous listing
→ show user
→ explain competing classifications
→ user decides
→ record precedent for genuinely equivalent cases
```

Do not silently auto-classify ambiguous property type, transaction, geography, project/unit or residual semantics.

Use listing-card evidence first. Do not open dozens of detail pages just to classify the residual set.

---

# Public denominator

The ~102K public presentation is **not yet a certified denominator**. Public/indexed page/language snapshots fluctuate and are not synchronized.

P0-E must explain:

```text
unique authorized accessible unit IDs
+ project/non-unit objects
+ aliases/duplicates
+ documented restricted/non-indexable components
= explained public universe
```

---

# NEXT EXACT

1. enrich the **55 absent IDs** with listing-card title/text/location/URL from robots-allowed page-1 surfaces;
2. classify clear cases automatically;
3. escalate materially ambiguous cases to the user;
4. qualify `crp` against existing geography/control families;
5. keep discovering route/dimension gaps using allowed page-1 surfaces;
6. identify an authorized complete traversal mechanism without `:p:N`;
7. if no complete allowed traversal exists, quantify the restricted remainder for the denominator;
8. Full Harvest stays BLOCKED until P0-A..P0-E all PASS.

**Current chantier: Mubawab Phase 0 Coverage Proof 🔵**

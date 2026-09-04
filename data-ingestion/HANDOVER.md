# HANDOVER — AkarFinder Data Ingestion

**Date:** 2026-09-04

## Read order

1. `data-ingestion/canonical.md` — authoritative architecture + roadmap;
2. `data-ingestion/MUBAWAB_PHASE0_COVERAGE_PROOF.md` — active Phase 0 proof;
3. `data-ingestion/LOT9_STATUS.md` — detailed Lot 9 historical/status evidence;
4. `data-ingestion/HANDOVER.md` — this operational snapshot.

---

# Current product goal

AkarFinder ultimately targets **≥100,000 canonical exploitable listings** across all sources.

Before adding another portal, the current source pilot Mubawab must reach **100% explained coverage of all publicly accessible, authorized and relevant listings**.

This means:

- prove the coverage model first;
- then harvest all approved surfaces to extinction;
- reconcile the final unique-ID universe against Mubawab's public catalog presentation;
- no material unexplained residual.

---

# Repo / branch / PR

- repo: `hraaaaf/Akarfinder`
- branch: `feat/data-ingestion-canonical`
- PR: `#996`
- keep PR OPEN / DRAFT / unmerged;
- no merge without explicit user authorization;
- no Vercel deployment;
- no production DB writes;
- do not touch `scripts/scrapers/output/akarfinder.db` during sandbox/coverage proofs.

---

# Roadmap

```text
Lots 1–8 CLOSED
      ↓
Lot 9 Phase 0 — Coverage Proof  ← ACTIVE
      ↓
Lot 9 Phase 1 — Full Harvest to extinction
      ↓
Lot 9 Reconciliation — prove 100% explained Mubawab coverage
      ↓
Lot 10 — Massive Dataset Certification
      ↓
Lot 11 — Controlled Massive AkarFinder Ingestion
      ↓
Lot 12 — Add sources if needed to reach ≥100K
```

**Full Harvest is BLOCKED until Phase 0 PASS.**

---

# Current exact data state

## Classic matrix

Run `33899083917` ✅

- 12 cities × 11 enabled categories;
- technical extinction of that configured matrix;
- **29,741 unique Mubawab source IDs**;
- artifact `9947122701`;
- digest `sha256:1b27ba2946bd671644e6ec1bf03a396df6c86a51706f5a17265466d041a0cb6d`.

## National office campaign

Run `33906589600` ✅

- persistent global source-ID union;
- 64 pages requested;
- **+1,990 unique IDs** globally;
- office sale terminal at page 24 with 710 unique IDs;
- office rent reached page 40 with 1,280 unique IDs and was still open;
- **current exact persistent union = 31,731 unique IDs**;
- artifact `9949834432`;
- digest `sha256:964a8cc44255bfd793615c4adea1c3be4238bed87b09aad0514c326da681bacc`.

This proved the original 12-city matrix was incomplete as a model of the portal.

## Public catalog anchor

Mubawab home observed on 2026-09-04 around **102.5K properties**.

This is NOT yet a certified unique-listing denominator.

---

# Active chantier — Lot 9 Phase 0 Coverage Proof

Canonical working file:

`data-ingestion/MUBAWAB_PHASE0_COVERAGE_PROOF.md`

Phase 0 gates:

- **P0-A Route families** — identify every public inventory-bearing route family;
- **P0-B Dimensions** — enumerate transactions, property types, cities/localities and product dimensions;
- **P0-C Reachability** — prove IDs from broad control surfaces are explainable by harvest surfaces;
- **P0-D Pagination** — prove paging and terminal behavior for each harvest class;
- **P0-E Denominator** — reconcile the ~102.5K public universe into unique listings/projects/duplicates/other explained buckets.

All five must PASS before Full Harvest.

---

# Phase 0 implementation already added

## Route family registry

`data-ingestion/sources/mubawab/coverage-proof.ts`

Current explicit families:

- `st` → primary harvest candidate;
- `sc` → primary harvest candidate;
- `cc` → control/diagnostic;
- `t` → city aggregate control/geography discovery;
- vacation `st` → distinct primary harvest candidate;
- `pl` → project/non-unit until proven otherwise;
- detail `a/pa` → identity, not Phase 0 discovery surface.

## Tests

`scripts/scrapers/__tests__/data-ingestion-lot9-phase0-coverage-proof.test.ts`

Tests prove:

- harvest/control/project/identity semantics remain distinct;
- project pages cannot silently become unit-listing inventory;
- Full Harvest remains blocked until P0-A…P0-E all PASS.

## CI

`.github/workflows/data-ingestion-lot9-full-coverage.yml`

Renamed logically to Phase 0 coverage gate behavior.

Important change:

- the previous broad office live campaign was removed from the automatic PR gate;
- the gate now runs semantic/tests only;
- Phase 0 permits only small bounded live probes when needed to prove a coverage gate.

---

# Current route evidence

Public observations already establish at least:

- `t` city aggregate pages, e.g. Casablanca;
- `st` city/category pages;
- `sc` national category pages;
- `cc` national broad aggregate pages;
- vacation inventory as a distinct transaction family;
- `pl` new-development/project pages;
- detail identities using `a` / `pa`.

Public project catalogue evidence also exposes localities outside the original 12-city matrix, including examples such as Meknès, Essaouira, Zenata, Asilah, Had Soualem, Ouislane and Harhoura.

Therefore no fixed 12-city list may be treated as exhaustive.

---

# Safety

- robots check before live requests;
- identifiable User-Agent;
- no auth/CAPTCHA/access bypass;
- explicit 403/429 → stop;
- bounded request budgets;
- no detail pages during Phase 0 unless explicitly justified by a later proof design;
- no images;
- no DB/prod;
- no deploy;
- no merge.

---

# NEXT EXACT

1. certify the new Phase 0 registry/test gate on CI;
2. implement bounded public dimension inventory for cities/localities + categories/transactions;
3. compare discovered dimensions against `config.json`;
4. emit `missing_geographies` and `missing_semantics`;
5. build bounded reachability sampler for `cc` and `t` control surfaces;
6. prove pagination/terminal semantics for `cc`, `t`, vacation and `pl`;
7. build the denominator reconciliation model;
8. close Phase 0 only when all five gates PASS;
9. only then launch Full Harvest with one persistent global union of source IDs.

**Current chantier: Mubawab Phase 0 Coverage Proof — ACTIVE 🔵**

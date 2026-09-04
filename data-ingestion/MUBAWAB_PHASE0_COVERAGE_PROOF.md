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
| P0-A Route families | identify every inventory-bearing public route family | 🟡 | route-family registry + live qualification |
| P0-B Dimensions | enumerate transaction/type/geography/product dimensions | 🟡 | dimension registry + gap report |
| P0-C Reachability | prove control-surface IDs are explained by harvest surfaces | 🟡 | sampled ID reachability matrix; residuals still unexplained |
| P0-D Pagination | prove paging and terminal semantics for each harvest class | 🟡 | tests + live bounded evidence |
| P0-E Denominator | reconcile ~102.5K into explainable buckets | ⚪ | denominator reconciliation report |

**Phase 0 PASS requires all five gates PASS.**

---

## 4. Route-family registry V1

| Family | Role in Phase 0 | Inventory-bearing | Decision |
|---|---|---:|---|
| `st` | primary harvest | yes | city × category |
| `sc` | primary harvest | yes | national category |
| vacation `st` | primary harvest | yes | distinct vacation transaction family |
| `cc` | control | yes | national broad aggregate / residual detector |
| `t` | control | yes | city aggregate / geography detector |
| `ct` | control pending qualification | yes | city × transaction aggregate; cannot yet be treated as redundant |
| `is` | control pending qualification | yes | thematic/search-like inventory surface; cannot yet be treated as redundant |
| `pl` | project/non-unit bucket | yes | new-development catalogue, separate denominator bucket |
| detail `a` / `pa` | identity only | no discovery role | listing identity only during Phase 0 |

### Important correction

The first dimension probe discovered two public route families missing from the V0 registry:

- `ct`
- `is`

They are now explicitly represented and tested. Neither is promoted to primary harvest yet.

---

## 5. Dimension discovery proof

Run `33908825931` ✅ SUCCESS.

Artifact:

- id `9950573019`;
- digest `sha256:3cb3720c97e89018d98966a09582593500e12fc57988b19878e20b5acb688256`.

Bounded probe:

- 8 public requests;
- robots checked;
- 0 detail pages;
- 0 DB writes;
- 0 production writes;
- 0 image downloads.

Discovered route families:

```text
cc, ct, is, pl, sc, st, t
```

Confirmed missing geographies relative to the historical 12-city config:

```text
dakhla
essaouira
martil
meknes
```

These are only the geographies surfaced by the deliberately small probe, not the final exhaustive geography vocabulary.

Confirmed unconfigured route/category semantics:

```text
appartements-vacational
bureaux-et-commerces-a-louer
bureaux-et-commerces-a-vendre
immobilier-a-louer
immobilier-a-vendre
```

The public project catalogue additionally exposes many localities that must be classified as unit-inventory geography vs project-only geography.

---

## 6. P0-C Reachability proof #1 — `ct` / `is`

Run `33909710386` ✅ SUCCESS.

Artifact:

- id `9950937544`;
- digest `sha256:6c5324bd6cf894ba3f9738ad9a4f78cca1af2155615d70f41292c42df2e6274a`.

Safety:

- 8 public page requests maximum;
- delay 2,750 ms;
- robots checked;
- 0 detail pages;
- 0 DB writes;
- 0 production writes;
- 0 image downloads.

### Bounded comparison results

| Control surface | IDs | Explained by bounded primary sample | Unexplained | Overlap | Verdict |
|---|---:|---:|---:|---:|---|
| `ct-casablanca-sale` | 31 | 26 | 5 | 83.9% | `inventory_bearing_residual` |
| `ct-casablanca-rent` | 32 | 25 | 7 | 78.1% | `inventory_bearing_residual` |
| `is-casablanca-sale-cheap` | 33 | 1 | 32 | 3.0% | `inventory_bearing_residual` |
| `is-casablanca-rent-cheap` | 33 | 0 | 33 | 0% | `inventory_bearing_residual` |

### Interpretation rule

This probe was deliberately bounded. Therefore:

```text
unexplained in bounded sample
≠
proven globally unique to ct/is
```

But it DOES prove:

```text
ct/is cannot currently be dismissed as aliases/control-only surfaces
```

The `is` result is especially strong: the tested sale surface had 32/33 IDs unexplained by the bounded primary sample, and the tested rent surface had 33/33 unexplained.

P0-C therefore remains **OPEN** until those residual IDs are classified against a broader, semantically complete primary surface set.

---

## 7. Human ambiguity gate — LOCKED

Any listing whose semantic classification remains ambiguous must be escalated to the user before a final classification decision is recorded.

This applies in particular when an observed listing could plausibly belong to more than one of:

- property type;
- transaction family;
- geography/locality;
- project vs unit listing;
- office vs commercial premises;
- harvest/control-specific residual classification.

Required workflow:

```text
ambiguous listing
→ preserve source_id + source URL + observed evidence
→ surface the listing to the user
→ explain the competing classifications briefly
→ user arbitrates
→ record the decision and reuse it consistently
```

Absolute rules:

- no silent auto-classification of a materially ambiguous listing;
- no majority/heuristic guess presented as fact;
- ambiguity must not block clearly classified listings;
- human decisions become precedent for equivalent cases when the semantics are genuinely the same;
- if a case differs materially from an earlier precedent, escalate again.

This human gate is part of the Phase 0 coverage methodology and carries forward into Full Harvest and later canonical ingestion.

---

## 8. Pagination proof status

Already demonstrated:

- `st` supports `:p:N` pagination and deep resumable windows;
- national office `sc` supports `:p:N`;
- office sale reached clean terminal behavior at page 24 (`zero_refs`);
- persistent collector checkpoints after each page and preserves global source-ID union.

Still to prove or classify:

- `cc` terminal semantics;
- `t` terminal semantics;
- `ct` terminal semantics if it remains relevant;
- `is` terminal semantics if it remains relevant;
- vacation terminal semantics;
- `pl` terminal semantics and project/unit meaning;
- any newly discovered family.

---

## 9. Denominator reconciliation model

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

Current exact persistent unit-ID union: 31,731.

The raw delta MUST NOT yet be interpreted as ~70K missing unique listings because the public counter denominator is still uncertified.

---

## 10. No-harvest gate

Until Phase 0 PASS:

- no new broad mass-harvest campaign;
- existing 31,731-ID state is preserved as evidence/seed;
- small bounded probes are allowed only when required to prove coverage semantics;
- zero production writes / deploy / merge.

---

## 11. Next exact

1. expand the primary comparison set for the exact residual `ct/is` IDs using relevant `st/sc` categories, not only apartments/locals;
2. classify each residual as `explained_by_primary`, `missing_semantic`, `missing_geography`, or `control_unique_candidate`;
3. **escalate any materially ambiguous listing to the user under the Human ambiguity gate before final classification**;
4. probe `cc` and `t` reachability with the same strict invariant;
5. continue geography/category discovery until repeated public seeds stop producing new dimensions;
6. certify pagination semantics for remaining relevant families;
7. build P0-E denominator buckets;
8. keep Full Harvest BLOCKED until P0-A..P0-E all PASS.

**Phase 0 Coverage Proof: ACTIVE 🔵 — first reachability probe proves the current coverage model still has unexplained residual inventory.**

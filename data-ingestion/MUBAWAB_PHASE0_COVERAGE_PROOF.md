# Mubawab Phase 0 — Coverage Proof

**Status:** 🔵 ACTIVE  
**Date opened:** 2026-09-04  
**Canonical parent:** `data-ingestion/canonical.md`

**Goal:** prove that the planned method can cover 100% of the publicly accessible, authorized and relevant Mubawab listing universe before Full Harvest.

---

## 1. Core invariant

```text
technical exhaustion of a configured matrix
≠
proof that the matrix represents the whole portal
≠
proof that the traversal is authorized
```

Phase 0 must prove all three dimensions: coverage model, reachability, and authorized traversal.

---

## 2. Current gates

| Gate | Goal | Status | Blocking fact |
|---|---|---:|---|
| P0-A | Route families | 🟡 | `crp` newly discovered; family inventory still being qualified |
| P0-B | Dimensions | 🟡 | historical 12-city matrix proven incomplete |
| P0-C | Reachability | 🟡 | 55 sampled IDs absent from historical 31,731 union |
| P0-D | Authorized traversal | 🔴 FAIL | robots `Disallow: /*:` covers Mubawab `:p:N` pagination |
| P0-E | Denominator | ⚪ | public counters are not a certified unique-ID denominator |

**Phase 0 PASS requires P0-A..P0-E all PASS. Full Harvest remains BLOCKED.**

---

## 3. Historical discovery anchors, with compliance caveat

Classic run `33899083917` observed **29,741 unique IDs**.  
Historical office run `33906589600` extended the persistent union to **31,731 unique IDs**.

Office observations:

- sale: 710 IDs, technical terminal at page 24;
- rent: 1,280 IDs through page 40;
- artifact `9949834432`;
- digest `sha256:964a8cc44255bfd793615c4adea1c3be4238bed87b09aad0514c326da681bacc`.

These are retained as historical observations/seed evidence.

### Compliance correction

The old robots checker only performed literal prefix matching. It did not correctly interpret wildcard rules or query strings.

The current public Mubawab robots policy includes:

```text
User-agent: *
Disallow: /*:
Disallow: /*?n=1
```

Mubawab's historical colon pagination such as `:p:2` therefore matches a disallowed path form.

The robots utility has been fixed to support:

- wildcard `*`;
- terminal `$`;
- Allow/Disallow precedence;
- path + query matching;
- applicable user-agent groups.

Regression test: `scripts/scrapers/__tests__/robots-policy.test.ts`.

Absolute consequence: **no future `:p:N` request is permitted while the current rule applies**. Previous deep-pagination counts are not compliance certification.

---

## 4. P0-A — Route-family registry V2

| Family | Phase 0 role | Current decision |
|---|---|---|
| `st` | primary candidate | city × category |
| `sc` | primary candidate | national category |
| vacation `st` | primary candidate | distinct vacation transaction |
| `cc` | control | broad national residual detector |
| `ct` | control | city × transaction aggregate |
| `t` | control | city aggregate / geography detector |
| `is` | control | thematic/search-like inventory surface; large residual observed |
| `crp` | control pending qualification | hierarchical region/prefecture aggregate discovered during Phase 0 |
| `pl` | project/non-unit | new-development catalogue, separate denominator bucket |
| `a` / `pa` | identity only | not a Phase 0 discovery surface |

No control family may be dismissed as redundant until its sampled IDs are explained by approved harvest surfaces or a documented denominator bucket.

---

## 5. P0-B — Dimension proof

Bounded dimension probe run `33908825931` ✅ SUCCESS.

Artifact `9950573019`, digest `sha256:3cb3720c97e89018d98966a09582593500e12fc57988b19878e20b5acb688256`.

Safety:

- 8 page-1/public requests;
- robots checked;
- 0 detail pages;
- 0 DB writes;
- 0 production writes;
- 0 images.

Discovered route families at that stage:

```text
cc, ct, is, pl, sc, st, t
```

Confirmed geographies absent from historical config:

```text
dakhla
essaouira
martil
meknes
```

Confirmed unconfigured semantics:

```text
appartements-vacational
bureaux-et-commerces-a-louer
bureaux-et-commerces-a-vendre
immobilier-a-louer
immobilier-a-vendre
```

Project pages expose many additional localities. They must be separated into unit-inventory geography vs project-only geography.

---

## 6. P0-C — Reachability proof

### Probe #1

Run `33909710386` ✅ SUCCESS.  
Artifact `9950937544`.  
Digest `sha256:6c5324bd6cf894ba3f9738ad9a4f78cca1af2155615d70f41292c42df2e6274a`.

A deliberately small page-1 comparison showed residuals on `ct` and especially `is`, but this was not enough to distinguish real gaps from page-order effects.

### Probe #2 — residuals vs full historical union

Run `33912205981` ✅ SUCCESS.  
Residual classification artifact `9951845045`.  
Digest `sha256:71e34e6f29ae2e7dde1954684af3ea061237d00d2c5a706f8417aee43c0796a9`.

Exact union comparison:

- sampled residual IDs: **78 unique**;
- already known in historical 31,731 union: **23**;
- absent from that union: **55**.

| Surface | Sample residual | Already known | Absent |
|---|---:|---:|---:|
| `ct-casablanca-sale` | 5 | 5 | **0** |
| `ct-casablanca-rent` | 8 | 3 | **5** |
| `is-casablanca-sale-cheap` | 32 | 10 | **22** |
| `is-casablanca-rent-cheap` | 33 | 5 | **28** |

Interpretation:

- the initial `ct` sale residual was entirely a bounded-sample/page-order effect;
- `ct` rent retains five candidate gaps;
- `is` is the major unexplained surface with 50 candidate gaps across the two sampled routes;
- these 55 IDs are not automatically assumed unique to `ct/is`; they require semantic/route classification.

No live requests were needed for the residual-vs-union classification itself.

---

## 7. Human ambiguity gate — LOCKED

Any materially ambiguous listing must be escalated before final semantic classification.

```text
ambiguous listing
→ preserve source_id + source URL + page-level evidence
→ show it to user
→ explain competing classifications
→ user arbitrates
→ record decision as precedent only for genuinely equivalent cases
```

Rules:

- do not guess;
- do not bulk-open detail pages merely to avoid thinking;
- extract listing-card evidence first;
- ambiguity must not block clearly classified cases;
- if a later case materially differs, escalate again.

---

## 8. P0-D — Authorized traversal blocker

**Status: 🔴 FAIL / BLOCKED.**

Historical technical pagination:

```text
/fr/...:p:2
/fr/...:p:3
...
```

Current robots rule:

```text
Disallow: /*:
```

Therefore colon pagination cannot be used by the future compliant collection plan.

P0-D may PASS only if Phase 0 proves at least one of:

1. a different public and robots-allowed traversal mechanism reaches the full authorized inventory;
2. other approved route families expose the same inventory without disallowed pagination;
3. the restricted remainder can be quantified and removed from the authorized denominator.

No access-control, robots or CAPTCHA bypass is permitted.

---

## 9. P0-E — Denominator model

The public home/search count around ~102K is a reconciliation anchor only.

Indexed public variants observed on the same date are not synchronized across page/language snapshots, so no single marketing/search counter is treated as an exact unique-ID denominator.

Target reconciliation:

```text
public catalog presentation
=
unique authorized accessible unit-listing IDs
+ projects/non-unit objects
+ aliases/duplicates
+ documented restricted/non-indexable components
```

100% means **100% explained authorized coverage**, not numerically forcing the unique-ID union to equal one unstable headline counter.

---

## 10. Current exact next

1. enrich the 55 absent IDs with **listing-card signals** from the already approved page-1 control surfaces: source ID, detail URL, visible title/text/location when available;
2. auto-classify only clear cases;
3. surface materially ambiguous listings to the user for arbitration;
4. qualify `crp` against `ct/t/st/sc` using robots-allowed page-1 evidence;
5. continue P0-A/P0-B discovery until repeated allowed seeds stop revealing new families/dimensions;
6. find an **authorized complete traversal strategy that does not use `:p:N`**;
7. if none exists, quantify the robots-restricted remainder for P0-E;
8. keep Full Harvest BLOCKED until all five gates PASS.

**Phase 0 Coverage Proof: ACTIVE 🔵**

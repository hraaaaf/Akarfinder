# AkarFinder — Top 5 Portals Phase 0

**Status:** 🔵 ACTIVE  
**Opened:** 2026-09-04  
**Canonical parent:** `data-ingestion/canonical.md`

## Goal

Apply the Mubawab coverage-proof method to the five highest-priority Moroccan real-estate portals, in parallel, without starting an unauthorized or unexplained Full Harvest.

Current source set:

1. Mubawab
2. Avito Immobilier
3. LouerVendreAuMaroc
4. MarocAnnonces
5. MarocImmo

Cross-site duplicates are intentionally allowed at the source-observation layer. Deduplication belongs later, when observations are reconciled into canonical properties/offers.

---

## Core invariant

```text
portal appears large
≠
configured routes cover the portal
≠
routes are authorized for traversal
≠
full harvest is allowed
```

Each portal must independently prove the same five Phase 0 gates:

| Gate | Goal |
|---|---|
| P0-A | identify every inventory-bearing public route family |
| P0-B | enumerate transaction/type/geography/product dimensions |
| P0-C | prove approved primary surfaces explain sampled control-surface IDs |
| P0-D | prove complete authorized traversal / terminal semantics |
| P0-E | reconcile a defensible public catalog denominator |

A source can progress independently. Full Harvest for one source remains BLOCKED until its P0-A..P0-E all PASS.

---

## Initial verified source status — 2026-09-04

### Mubawab

**Status:** 🔵 ACTIVE / P0-D BLOCKED

Existing proof: `data-ingestion/MUBAWAB_PHASE0_COVERAGE_PROOF.md`.

Current blocker remains the public robots wildcard rule covering historical `:p:N` pagination. No bypass.

### Avito Immobilier

**Status:** 🟡 PHASE 0 OPEN

Verified public-policy facts:

- `https://www.avito.ma/robots.txt` is public;
- it explicitly disallows `/api/v1` for Googlebot and AdsBot-Google-Mobile-Apps;
- it advertises `https://www.avito.ma/sitemap.xml`;
- no private/API harvesting path is approved.

Initial candidate lane: public sitemap + public/indexable category/detail surfaces only, subject to the project's wildcard/query-aware robots checker and source-specific route qualification.

### LouerVendreAuMaroc

**Status:** 🔴 LIVE DISCOVERY BLOCKED — MAINTENANCE

The public homepage is reachable as indexed content and claims more than 57,000 updated listings, with apartments, houses, villas, riads, land, offices and commerce across major Moroccan cities. The same current page ends with `Site en maintenance, revenez dans quelques heures`.

Decision:

- preserve it as a Top-5 source candidate;
- do not infer live inventory from the marketing counter;
- do not start traversal while the listing application is unavailable/maintenance;
- re-qualify robots, sitemap, category routes, pagination and detail identity when the live inventory surface returns.

### MarocAnnonces

**Status:** 🟡 PHASE 0 OPEN / ROBOTS VERIFICATION PENDING

Verified public/indexed inventory surfaces include:

```text
/categorie/16/Vente-immobilier.html
/categorie/305/Location-immobilier.html
/categorie/315/Vente-immobilier/Appartements.html
/categorie/321/Location-immobilier/Appartements/...
/categorie/322/Location-immobilier/Villas-Maisons-Riads/...
```

Observed pagination on public result surfaces uses `?pge=N` in at least one route family. Category totals and child-category totals are exposed in the rendered pages.

Decision:

- treat broad sale/location pages as denominator/control candidates;
- treat child category pages as primary-dimension candidates;
- do not deep-traverse until the current robots policy is fetched and evaluated by the project checker;
- detail identity pattern remains to be proven before a discovery manifest can be certified.

### MarocImmo

**Status:** 🟡 PHASE 0 OPEN / ROBOTS + PAGE-N PATTERN PENDING

Verified public/indexed inventory surfaces include:

```text
/fr/vente
/fr/location
/fr/vente/appartement
/fr/location/bureau
/fr/vente/commercial
/fr/location/{city}
/fr/location/{type}/{city}
```

The public pages expose result totals and page counts. Examples observed on 2026-09-04 include 19,752 sale results and 19,827 rental results, with type/city breakdowns.

Decision:

- national `/fr/vente` and `/fr/location` are denominator/control candidates;
- type and geography routes are dimension/reachability candidates;
- do not guess the page-N URL pattern or detail identity;
- do not deep-traverse until robots and pagination semantics are proven.

---

## Safety rules for all five sources

- public/authorized routes only;
- robots evaluated before live traversal;
- no authentication, CAPTCHA or anti-bot bypass;
- no private APIs;
- explicit 403/429 => source stop;
- bounded request budgets;
- page/card evidence before broad detail-page access;
- no images during Phase 0;
- no production DB writes;
- no Vercel deployment;
- no merge without explicit user authorization.

---

## Execution order inside the parallel Phase 0

1. **MarocAnnonces** — qualify robots, route families, detail identity and pagination because the public category taxonomy is already explicit.
2. **MarocImmo** — qualify robots, page-N semantics, detail identity and overlap among national/type/city routes.
3. **Avito** — qualify sitemap structure and public category/detail surfaces without using `/api/v1` or any private endpoint.
4. **LouerVendreAuMaroc** — stay blocked until the live listing application exits maintenance, then run the same qualification.
5. **Mubawab** — continue its existing Phase 0 in parallel; its Full Harvest remains blocked independently.

This order is operational only. It does not change the market-priority ranking.

---

## Success

Top-5 Phase 0 is complete only when each source is either:

- `PASS`: P0-A..P0-E all proven and an authorized Full Harvest plan exists; or
- `EXPLAINED BLOCKED`: the inaccessible/restricted/maintenance remainder is quantified and explicitly documented.

No aggregate market-coverage percentage may be certified from marketing counters alone.

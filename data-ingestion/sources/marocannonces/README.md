# MarocAnnonces — Phase 0 Coverage Proof

**Status:** 🟡 OPEN — robots verification pending

## Goal

Prove the complete, authorized and relevant MarocAnnonces real-estate coverage model before any Full Harvest.

## Verified public surfaces — 2026-09-04

Broad control/denominator candidates:

```text
/categorie/16/Vente-immobilier.html
/categorie/305/Location-immobilier.html
```

Verified child-category examples:

```text
/categorie/315/Vente-immobilier/Appartements.html
/categorie/321/Location-immobilier/Appartements/...
/categorie/322/Location-immobilier/Villas-Maisons-Riads/...
```

Public pages expose category totals and listing cards. Public result pages also expose `?pge=N` pagination on at least one route family.

## Gates

| Gate | Status | Current fact |
|---|---:|---|
| P0-A route families | 🟡 | broad + child category families observed; completeness unproven |
| P0-B dimensions | 🟡 | sale/rent and several child categories observed; full type matrix pending |
| P0-C reachability | ⚪ | no primary-vs-control ID comparison yet |
| P0-D authorized traversal | ⚪ | current robots policy must be fetched/evaluated before deep traversal |
| P0-E denominator | 🟡 | rendered broad-category counters are useful anchors, not yet certified unique IDs |

## Important semantic risk

Some source categories are mixed, e.g. `Villas - Maisons - Riads`. The adapter must not silently force the entire category into one canonical property type. Listing-level evidence and the Human ambiguity gate apply.

## Next exact

1. fetch/evaluate current robots policy with the project wildcard/query-aware checker;
2. inventory every real-estate child category under sale and location;
3. prove the page-N URL semantics and terminal condition only if authorized;
4. prove the detail URL/source-ID identity pattern from bounded public page/card evidence;
5. run a bounded page-1 primary-vs-control overlap probe;
6. keep Full Harvest BLOCKED until P0-A..P0-E PASS.

No DB write. No image download. No Vercel deployment.

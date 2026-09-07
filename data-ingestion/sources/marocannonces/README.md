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
/categorie/321/immobilier-location/appartements.html
/categorie/322/Location-immobilier/Villas-Maisons-Riads/...
```

Public pages expose category totals and listing cards. Public result pages also expose `?pge=N` pagination on at least one route family.

## Detail identity — VERIFIED

A current public detail page proves the pattern:

```text
/categorie/{categoryId}/{categoryLabel}/annonce/{numericId}/{slug}.html
```

Verified example:

```text
/categorie/315/Appartements/annonce/10445677/Appartement-a-vendre.html
```

The rendered detail page also exposes `Annonce N°: 10445677`, confirming that the numeric path segment is the appropriate `source_id` candidate.

Phase-0 discovery implementation:

- `data-ingestion/sources/marocannonces/discovery.ts`;
- page-one only;
- no detail-page opening by the discovery runner;
- same-origin detail-link extraction;
- deduplication by numeric `source_id` across control/primary routes;
- synthetic contract test: `scripts/scrapers/__tests__/marocannonces-discovery.test.ts`.

## Gates

| Gate | Status | Current fact |
|---|---:|---|
| P0-A route families | 🟡 | broad + child category families observed; completeness unproven |
| P0-B dimensions | 🟡 | sale/rent and several child categories observed; full type matrix pending |
| P0-C reachability | 🟡 | page-one manifest implementation exists; live overlap proof still pending |
| P0-D authorized traversal | ⚪ | current robots policy must be fetched/evaluated before deep traversal |
| P0-E denominator | 🟡 | rendered broad-category counters are useful anchors, not yet certified unique IDs |

## Important semantic risk

Some source categories are mixed, e.g. `Villas - Maisons - Riads`. The adapter must not silently force the entire category into one canonical property type. Listing-level evidence and the Human ambiguity gate apply.

## Next exact

1. fetch/evaluate current robots policy with the project wildcard/query-aware checker;
2. inventory every real-estate child category under sale and location;
3. prove the page-N URL semantics and terminal condition only if authorized;
4. run a bounded page-1 primary-vs-control overlap probe with the new discovery module;
5. expand primary routes only after the route taxonomy is verified;
6. keep Full Harvest BLOCKED until P0-A..P0-E PASS.

No DB write. No image download. No Vercel deployment.

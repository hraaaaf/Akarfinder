# AKARFINDER — UX/UI CERTIFIED SYNTHESIS

**Date:** 2026-07-26
**Status:** SIX MISSIONS CERTIFIED — READY FOR IMPLEMENTATION PLANNING
**Scope:** design/audit only; no product code changed

## 1. Certification board

| Mission | Initial | Final | Verdict |
|---|---:|---:|---|
| A1 Search Experience | 8.89 | 9.54 | CERTIFIED |
| A2 Geo Intelligence | 8.84 | 9.51 | CERTIFIED |
| A3 Price Atlas | 8.76 | 9.61 | CERTIFIED |
| A4 Design System / RTL / Accessibility | 8.92 | 9.59 | CERTIFIED |
| A5 Motion & Interaction | 8.87 | 9.63 | CERTIFIED |
| A6 Decision & Trust | 8.81 | 9.68 | CERTIFIED |

Average final score: **9.59/10**

All missions passed after an initial FAIL and a correction cycle. Open critical findings: **0**. Open major findings: **0**.

## 2. Unified product architecture

AkarFinder remains search-first and intelligence-first.

```text
SEARCH SESSION
  ├─ ranked list
  ├─ synchronized geo view
  ├─ Price Atlas context
  ├─ canonical property comparison
  └─ favorites / alerts / Mon Projet
```

`/search` is the authority for query, filters, eligibility and ranking. Map and Atlas are coordinated analytical views, never competing result systems.

## 3. Shared truth model

All surfaces must preserve the distinction between:

- potential/canonical property;
- source representation;
- partner or first-party listing;
- indexed public result;
- internal market signal.

Trust is multidimensional:

- provenance;
- freshness;
- completeness;
- consistency/conflicts;
- canonical confidence;
- geographic precision;
- statistical confidence where applicable.

No opaque overall trust score is authorized.

## 4. Shared data rules

- Missing values remain missing.
- Asking prices are never described as transaction prices.
- Statistics are deduplicated before publication.
- Raw representation count and deduplicated property count are distinct.
- Median and dispersion are preferred over averages alone.
- No neighborhood polygon without certified geometry.
- H3/grid cells are labelled analytical cells, never administrative boundaries.
- No historical trend without continuity gate.
- No prediction or opportunity score without explicit, testable methodology.

## 5. Unified visual system

A4 governs all implementation:

- semantic tokens;
- separated commercial/source/confidence/freshness statuses;
- FR/AR/RTL contracts;
- WCAG 2.2 AA target;
- mobile density modes;
- map/chart palette governance;
- motion tokens from A5;
- component documentation and visual regression.

## 6. Unified interaction rules

- One query state across List / Split / Map.
- URL and browser history preserve session context.
- Results remain the default mobile surface.
- Map uses a bottom sheet on mobile.
- Camera movement is interruptible.
- Reduced-motion provides complete state feedback.
- No fake progress or decorative delay.
- Optimistic UI is limited to reversible actions.
- External contact success requires confirmed server response.

## 7. Implementation sequence

### Gate 0 — Foundations

1. Canonical query-state contract.
2. Trust/source/freshness taxonomy.
3. Semantic design tokens and RTL foundations.
4. Statistical aggregate and methodology contracts.
5. Geo precision and geometry certification policy.
6. Analytics/event taxonomy.

### Wave 1 — Search clarity

- search shell and filters;
- result-card hierarchy;
- partial/empty/error states;
- URL/history restoration;
- mobile filter/sort architecture.

### Wave 2 — Coordinated Geo

- migrate scalable data from DOM markers to MapLibre layers;
- viewport API and aggregates;
- list/map selection synchronization;
- mobile map sheet;
- dynamic accessible legend.

### Wave 3 — Price Atlas V1

- national city comparison;
- asking-price distributions;
- confidence/sample/freshness;
- Search handoff;
- accessible table alternatives.

### Wave 4 — Decision surfaces

- canonical property/cluster detail;
- source representations and conflicts;
- compare;
- favorites, alerts and Mon Projet.

### Wave 5 — Certified city intelligence

- certified neighborhood/cell Atlas;
- Market DNA;
- area comparison;
- budget inverse.

### Wave 6 — Longitudinal/advanced

- history where continuity passes;
- anomaly and opportunity explanations;
- demand/liquidity signals with explicit methodology.

## 8. Cross-mission P0 backlog

| ID | Deliverable |
|---|---|
| CORE-01 | Canonical search/query-state schema |
| CORE-02 | Source/trust/freshness/completeness contracts |
| CORE-03 | Semantic design tokens and status taxonomy |
| CORE-04 | FR/AR/RTL typography and bidi specification |
| CORE-05 | Geo identity/precision/geometry publication policy |
| CORE-06 | Deduplicated aggregate and methodology schema |
| CORE-07 | Result-card and property/representation hierarchy |
| CORE-08 | Responsive Search shell and mobile controls |
| CORE-09 | MapLibre layer migration and viewport API |
| CORE-10 | Accessible legends/charts/table equivalents |
| CORE-11 | Motion/reduced-motion/loading primitives |
| CORE-12 | Analytics and guardrail metrics |
| CORE-13 | Playwright matrix 390/768/1280 FR/AR |
| CORE-14 | Performance instrumentation and budgets |
| CORE-15 | Feature flags and rollback per major surface |

## 9. Implementation gate

No broad visual rewrite should begin as one large PR.

Each implementation wave requires:

1. explicit scope and affected files;
2. acceptance criteria linked to the certified report;
3. screenshots at 390/768/1280 in FR and AR where supported;
4. keyboard and reduced-motion validation;
5. performance evidence;
6. DATA truth tests;
7. feature flag or safe rollback where risk is material;
8. reviewer approval against the certification findings.

## 10. Rejected shortcuts

- Google Maps clone;
- nationwide neighborhood choropleth before data certification;
- one opaque reliability score;
- paid badges presented as trust;
- independent rankings for list and map;
- DOM markers at large scale;
- universal 60 FPS promise;
- trends from unstable cohorts;
- “best deal” without methodology;
- fake urgency, viewer counts or contact confirmation;
- mobile as compressed desktop.

## 11. Final program verdict

```text
AKARFINDER UX/UI MASTER PROGRAM

Missions completed: 6/6
Missions certified > 9.0: 6/6
Average final score: 9.59/10
Critical findings open: 0
Major findings open: 0
Product code changes: 0

Verdict: CERTIFIED_FOR_IMPLEMENTATION_PLANNING
```

The next authorized activity is detailed implementation planning and Figma/prototype production under the certified architecture. Production code remains blocked until the implementation gate and explicit authorization.

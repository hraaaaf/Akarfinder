# AkarFinder — UX refinement status

**Program baseline:** `main` after P0 clarity release (`2021827`)  
**Current phase:** P1 — decision and product continuity

## Progress

| Phase / LOT | Status | Scope | Score |
|---|---|---|---:|
| P0 — Search clarity | DONE + DEPLOYED | Navigation, SERP filters, result cards, mobile and accessibility | 9.6/10 |
| P1 LOT 1 — Result → decision continuity | DONE — 18/18 GATES PASS | Property detail decision summary, favorite, compare and Mon Projet continuity | 9.6/10 |
| P1 LOT 2 — Design-system convergence | DONE — 20/20 GATES PASS | Shared semantic primitives migrated across Search filters and the property decision surface | certified |
| P1 LOT 3 — Mobile decision ergonomics | IN REVIEW | Sticky property actions, mobile filter bottom sheet and thumb-reachable list/map controls | pending certification |
| P1 LOT 4 — Motion and perceived quality | TODO | Purposeful transitions, feedback and reduced-motion parity | — |
| P1 final audit | TODO | Cross-surface responsive/accessibility audit and score certification | — |

## Completed before this refinement program

The historical Phase 1 P1 audit ledger is already closed. Its search truth, buyer journey, intent hubs, Geo/SEO, B2B and accessibility findings remain protected by existing CI gates.

## P1 LOT 1 certification evidence

- one decision layer precedes the long property dossier;
- compatibility, evidence level and attention state remain explicit;
- favorite, comparison and Mon Projet are the canonical continuation paths;
- no alternative buyer profile or onboarding path is reintroduced;
- no DATA, ranking, publication or source-boundary contract changes;
- dedicated contracts, TypeScript and production build passed;
- responsive/accessibility smoke passed;
- full PR gate set: **18/18 successful**.

## P1 LOT 2 certification evidence

- shared semantic primitives cover page, surface, muted surface, field, actions and statuses;
- Search filters and the property decision layer consume the same primitives;
- migrated surfaces contain no local six-digit brand hex values;
- light/dark behavior derives from existing theme tokens;
- no product logic, DATA, ranking or source-boundary change;
- full PR gate set: **20/20 successful**.

## P1 LOT 3 definition of done

- property detail exposes a safe-area-aware mobile action dock;
- favorite, compare and Mon Projet remain available without scrolling back to the header;
- advanced Search filters open in an accessible mobile bottom sheet;
- opening the sheet locks background scroll and closing it preserves current filters;
- list/map/split controls remain thumb-reachable and keep semantic selected states;
- touch targets are at least 44px on the migrated controls;
- desktop behavior remains unchanged;
- dedicated contracts, TypeScript, build and responsive/accessibility gates pass.

## Global estimate

- P0 current refinement: **100%**
- P1 current refinement: **50% certified; LOT 3 in review**
- Overall current UX refinement program: **about 72% certified**

This estimate advances only after a LOT is merged and its verification evidence is recorded.

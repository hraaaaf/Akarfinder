# Phase 1 — P1 Intent Hubs Closure

## Closed by this workstream

- AF-AUDIT-P1-034 — false advanced-filter affordance: CLOSED. `/acheter` routes all advanced filtering to `/search`.
- AF-AUDIT-P1-037 — false favorite affordance: CLOSED on public Acheter/Louer hubs. The new public hub has no decorative heart control.
- AF-AUDIT-P1-038 — static intelligence promise: CLOSED on public Acheter/Louer hubs. Public copy now explains information levels instead of generic reliability promises.
- AF-AUDIT-P1-039 — static market reference without enough provenance: CLOSED on public Acheter/Louer hubs by removing duplicated hardcoded market-price/rent blocks from those public routes.
- AF-AUDIT-P1-040 — rent budget visual-only: CLOSED_ALREADY before this workstream; legacy budget URLs are now forwarded to canonical `min_price` / `max_price` Search parameters.
- AF-AUDIT-P1-041 — rent hub does not hand off cleanly to Search: CLOSED. `/louer` is an intent hub; legacy filters redirect to `/search`.
- AF-AUDIT-P1-042 — non-filter presented like filter: CLOSED. Meublé/Vide pseudo-filters are not rendered by the public Louer hub.
- AF-AUDIT-P1-043 — two parallel alert systems: CLOSED on the public product surface. Louer no longer exposes `RentAlertForm -> /api/alerts`; canonical continuity remains `user_saved_searches` / Mon Projet. Legacy API code is retained only for compatibility and is not linked from the public Louer route.
- AF-AUDIT-P1-044 — Neuf inventory expectation gap: CLOSED. The public Neuf page explicitly states there is no active partner inventory presented there.
- AF-AUDIT-P1-045 — realistic demo data cognitive risk: CLOSED. The public Neuf route no longer renders a realistic fictional project card.
- AF-AUDIT-P1-046 — Neuf audience collision: CLOSED. Buyer Search, fictional demo and promoter conversion are separate explicit paths.

## Not closed here

- AF-AUDIT-P1-049 — seller lead != property dataset: remains OPEN and must be closed in the next dedicated Seller Structured Draft workstream. Do not claim it closed from the generic `/api/leads` flow.

## Release rule

No Vercel deployment from this workstream. Public certification remains part of the single end-of-Phase-1 release gate.

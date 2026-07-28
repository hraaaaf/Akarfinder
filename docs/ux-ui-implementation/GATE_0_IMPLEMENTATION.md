# AKARFINDER — GATE 0 IMPLEMENTATION

**Status:** ACTIVE
**Branch:** `agent/ux-ui-gate0-waves`
**Scope:** executable foundations before Wave 1

## Implemented contracts

- one `SearchQueryState` shared by List, Split and Map;
- explicit result origins: partner, first-party, public index, internal market signal;
- explicit canonical entities: property, representation, cluster and geo area;
- multidimensional trust descriptor without opaque total score;
- freshness, confidence and geographic-precision vocabularies;
- public-statistic contract with raw and canonical sample sizes;
- asking-price-only declaration;
- minimum canonical sample gate;
- CI gate covering contract tests, TypeScript and production build.

## Non-negotiable implementation rules

1. `/search` remains the authority for query, filters, eligibility, ranking and pagination.
2. Map and Price Atlas consume the same normalized query state.
3. Missing values remain missing; no UI adapter may coerce them to zero or a synthetic label.
4. Asking prices are not transaction prices.
5. Trust is explained by dimensions; no opaque aggregate score is public.
6. Raw source representations and deduplicated canonical properties are counted separately.
7. No neighborhood geometry is public unless its precision and certification are explicit.
8. A statistical value is hidden when its publication contract fails.
9. Commercial status, source origin and data confidence use separate semantic components.
10. FR, AR, RTL, keyboard, reduced motion and mobile are acceptance criteria, not later polish.

## Gate 0 exit criteria

- canonical contracts merged and consumed by the first Wave 1 adapter;
- CI green;
- no duplicate query-state model introduced;
- no opaque trust score exposed;
- reviewer score strictly above 9/10;
- zero critical or major open findings.

## Next implementation slice

Wave 1 starts by adapting the Search shell to the canonical query-state contract and by centralizing URL serialization/restoration. Product behavior must remain backward compatible while the adapter is introduced.

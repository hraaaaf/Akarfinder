# WAVE 1 — SEARCH SESSION FOUNDATION

**Status:** IMPLEMENTED_PENDING_CI
**Scope:** S1 only — canonical session state and URL restoration foundation.

## Implemented

- one canonical `SearchQueryState` remains the source of truth;
- URL parsing and serialization for query, transaction, property type, city, district, price, surface, bedrooms, sort, view and page;
- safe defaults for invalid or unsupported URL values;
- bidirectional adapter between `ListingFiltersState` and canonical session state;
- explicit mapping for List / Split / Map;
- explicit mapping for recommended and price sorting;
- round-trip and restoration tests;
- CI coverage through the UX contract workflow.

## Invariants

1. A view change never changes the ranked result contract.
2. Default values are omitted from URLs to keep links stable and readable.
3. Invalid URL state cannot inject unsupported transaction, sort or view values.
4. Price and surface bounds retain Gate 0 normalization.
5. The browser URL is shareable state; transient loading and selection state remain local.

## Next implementation slice

Wire the adapter into `LightZillowSearchShell` with browser history restoration and add the Split view without duplicating ranking logic.

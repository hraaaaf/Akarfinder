# WAVE 1 — SEARCH SESSION FOUNDATION

**Status:** CERTIFIED_COMPLETE  
**Scope:** S1 — canonical session state, URL restoration and shared List / Split / Map presentation.

## Implemented

- one canonical `SearchQueryState` remains the source of truth;
- URL parsing and serialization for query, transaction, property type, city, district, price, surface, bedrooms, sort, view and page;
- safe defaults for invalid or unsupported URL values;
- bidirectional adapter between `ListingFiltersState` and canonical session state;
- explicit mapping for List / Split / Map;
- explicit mapping for recommended and price sorting;
- browser history restoration through `useCanonicalSearchSession`;
- reusable `SearchViewSwitcher` consumed by `LightZillowSearchShell`;
- List mode renders results only;
- Split mode renders the same ranked results beside the map;
- Map mode renders the map only;
- one unchanged `sortListings(clientFiltered, sortBy)` call shared by all three views;
- round-trip, restoration, layout and shell-integration tests;
- CI coverage through the UX contract workflow, TypeScript and production build.

## Invariants

1. A view change never changes the ranked result contract.
2. List, Split and Map consume the same filtered and sorted result set.
3. Default values are omitted from URLs to keep links stable and readable.
4. Invalid URL state cannot inject unsupported transaction, sort or view values.
5. Price and surface bounds retain Gate 0 normalization.
6. The browser URL is shareable state; transient loading and selection state remain local.
7. No second search pipeline or view-specific ranking is allowed.

## Exit evidence

- shell integration commit: `670b61d08029af8ecdae5281ea348a020c575bdc`;
- integration-contract test commit: `5922ce3ffe90c97da542ff709d13ab2f7be3db80`;
- documentation certification commit: this file update;
- certification workflow: `UX Gate 0 Contracts` run #20 — contracts, TypeScript and production build all successful.

## Exit decision

Wave 1 is closed. Later UX waves may consume the canonical search session and view contracts, but must not introduce a second search state, a second ranking path or view-specific result ordering.

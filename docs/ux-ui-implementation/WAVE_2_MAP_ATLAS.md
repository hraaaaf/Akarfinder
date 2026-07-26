# WAVE 2 — MAP ATLAS FOUNDATION

**Status:** CERTIFIED_COMPLETE  
**Scope:** M1–M2 — data-honest Atlas controls and publication-gated availability.

## Implemented

- canonical Atlas layer contract: `listings`, `density`, `price`;
- reusable `MapAtlasLayerSwitcher`;
- Atlas controls integrated into `SearchMapPanel`;
- listings layer available from the current structured city counts;
- density layer disabled until a sufficient canonical sample and certified geometry are published;
- price layer disabled until asking-price references, methodology, sample and geometry are certified;
- unavailable layers expose an explicit reason for assistive technologies;
- invalid or unavailable layer requests fall back to the honest listings layer;
- publication metadata adapter centralizes layer eligibility;
- no heatmap, district polygon or price surface is synthesized;
- layer selection remains presentation-only and cannot change Search ranking or eligibility.

## Invariants

1. The map consumes the same Search result set as List and Split.
2. Atlas layer selection never changes query, filtering, ranking, pagination or display eligibility.
3. Asking prices are never presented as transaction prices.
4. Density requires canonical, deduplicated entities, certified geometry and a sufficient published sample.
5. Price requires an explicit asking-price disclosure, methodology version and canonical sample.
6. District rendering requires certified geometry and explicit geographic precision.
7. Missing Atlas data remains unavailable; the UI must not invent gradients, polygons or values.
8. The existing city distribution remains explicitly described as indicative, not total market volume.

## Exit evidence

- Atlas contracts, fallback and publication-gate tests: green;
- TypeScript: green;
- production build: green;
- `SearchMapPanel` consumes the reusable switcher;
- one unchanged Search ranking path;
- no synthetic density, price or district geometry;
- workflow `UX Gate 0 Contracts` run #29: success.

## Certified commits

- Atlas contracts: `1a2c21ca11bbf96801729dcbb4c91b13a6d1481b`;
- layer switcher: `01dd135dc02b60f29d94ad48754453ce2480de27`;
- Search map integration: `d2746bec65e50f6cb04bc2df0b42986a7d12e4d6`;
- base Atlas tests: `ed35abaa16cb2c31fe8131451af552041296ae9b`;
- publication eligibility adapter: `8484612aee127440e36513448e35aa9b5727dcf3`;
- final publication-gate tests: `861a91948b297b9a6ce29b152979510fd0e15077`.

## Next implementation slice

The next map wave may consume real publication metadata from the DATA geography and price branches. Density or price can only be enabled through the certified availability adapter; no consumer may bypass these gates.

# WAVE 2 — MAP ATLAS FOUNDATION

**Status:** IMPLEMENTED_PENDING_CI  
**Scope:** M1 — data-honest Atlas controls inside the Search map panel.

## Implemented

- canonical Atlas layer contract: `listings`, `density`, `price`;
- reusable `MapAtlasLayerSwitcher`;
- Atlas controls integrated into `SearchMapPanel`;
- listings layer available from the current structured city counts;
- density layer disabled until a sufficient canonical sample is published;
- price layer disabled until asking-price references are certified and published;
- unavailable layers expose an explicit reason for assistive technologies;
- invalid or unavailable layer requests fall back to the honest listings layer;
- no heatmap, district polygon or price surface is synthesized;
- layer selection remains presentation-only and cannot change Search ranking or eligibility.

## Invariants

1. The map consumes the same Search result set as List and Split.
2. Atlas layer selection never changes query, filtering, ranking, pagination or display eligibility.
3. Asking prices are never presented as transaction prices.
4. Density requires canonical, deduplicated entities and a sufficient published sample.
5. District rendering requires certified geometry and explicit geographic precision.
6. Missing Atlas data remains unavailable; the UI must not invent gradients, polygons or values.
7. The existing city distribution remains explicitly described as indicative, not total market volume.

## Exit evidence target

- Atlas contracts and fallback tests green;
- TypeScript green;
- production build green;
- `SearchMapPanel` consumes the reusable switcher;
- no second ranking path;
- no synthetic density, price or district geometry.

## Next implementation slice

Consume certified publication metadata when the DATA geography and price branches are integrated. That later slice may enable density or price only through the same availability contract; it must not bypass publication gates.

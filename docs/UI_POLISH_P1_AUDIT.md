# AkarFinder UI Polish — P1 Mobile Audit

**Status:** VISUAL AUDIT COMPLETE — implementation pending  
**Reference:** `docs/UX_SEARCH_V1_REFERENCE.md`  
**Evidence head:** `8b0bcae2844ec4a00ac6890ccc6d967779b5cff9`  
**Viewports:** 390×844 / 430×932

## Scope

Primary routes:

- `/search`
- `/favorites`
- `/map`
- `/alerts`
- `/compare`
- `/mon-projet`

## Chromium evidence

Run `31758332497` completed successfully with both Product Design Reviewer and Independent Release Certifier.

Artifacts:

- Product Design: `9203817261` — `sha256:273850bff8b02f05a5fc4f9ba235109b5f6cfdab0d71bdb1ce97f5ce316e2c1a`
- Release Certifier: `9203859194` — `sha256:19e89e3382f78c2937d3d57743aade286bcad13e6ab0e97b8d41c7763310add2`

Measured result:

- 12/12 full-page screenshots produced
- HTTP 200 on all six routes at both viewports
- 0 horizontal overflow
- mobile bottom nav present on all routes
- 0 console errors except the expected unauthenticated `401` continuity request on `/mon-projet`

## Visual matrix — inspected screenshots

| Route | Current verified structure | Main visual finding | Visual score |
|---|---|---|---|
| `/search` | Certified Search v1 baseline | Reference only | REFERENCE |
| `/favorites` | Functional shortlist, responsive cards, empty state, compare/visit/remove actions | Product is solid but hero/cards/footer belong to the older dark/bronze family; weaker hierarchy than Search | **7.5/10** |
| `/map` | Territorial map, price markers, selected-neighborhood panel, canonical URL state | Strong functional base; needs explicit legend, tighter top controls and cleaner mobile composition | **8.0/10** |
| `/alerts` | Truthful inactive-state card with profile/Search CTAs | Visually sparse and generic; large empty rhythm and footer dominate the screen; materially below mockup target | **6.5/10** |
| `/compare` | Functional 2–4 listing comparator with summary/table and empty/one-item states | Older dark hero family, sparse empty state and no active bottom-nav destination on `/compare` | **7.0/10** |
| `/mon-projet` | Complete 8-step wizard with progress, objectives, budget and preferences | Strongest non-Search page; needs shared header/surface density and mobile spacing harmonization | **8.0/10** |

## Confirmed findings

### Global

- Bottom navigation itself is visually coherent and correctly present at mobile widths.
- Footer treatment remains much heavier/darker than the Search reference on several routes and creates unnecessary vertical weight.
- Shared Search tokens/primitives should be reused rather than creating a second design system.

### Favorites

Preserve all shortlist behavior. Replace the old deep-blue/bronze hero/card language with Search-aligned surfaces, typography, radii, shadows and spacing.

### Map

Do not rebuild the map engine. Colored territories, price pins, selection and mobile bottom-sheet already exist. P3 should focus on explicit legend, selected-state clarity and composition.

### Alerts

This is the largest product/visual gap. Current route is a truthful inactive state, not a real alert dashboard. Do not fabricate history or alert cards until backed by real capability.

### Compare

Functional engine is already present. Add a coherent navigation treatment for `/compare`, improve mobile property identity/stickiness and align surfaces with Search.

### Mon projet

Preserve the distinct guided wizard. Harmonize shared chrome and spacing only; do not flatten it into a generic listing page.

## Technical anomalies

1. `/compare` has no active mobile bottom-nav item at 390 or 430 px. This is a real navigation-state gap because Compare is not one of the five canonical destinations.
2. `/mon-projet` logs a `401 Unauthorized` from the unauthenticated continuity probe. The page remains HTTP 200 and functional; treat as non-blocking console noise unless the continuity contract requires silent unauthenticated probing.

## Next lot

P2 — extract/reuse Search visual primitives and semantic tokens, then implement P3 in priority order:

1. Favorites
2. Map
3. Alerts
4. Compare
5. Mon projet

Each P3 route remains subject to implementation → contracts → TypeScript → screenshots → 390/430/768/1280 audit → correction → certification → merge.

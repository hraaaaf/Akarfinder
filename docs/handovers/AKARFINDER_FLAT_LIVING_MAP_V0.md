# AkarFinder — Flat Living Map V0

## Goal
Replace the current heavy/perspective neighborhood treatment with a calm, flat, highly legible "living map" that keeps AkarFinder identity and prioritizes the question: **Would I want to live here?**

## Success
- Flat map at city / district / street scales.
- Parks and meaningful green spaces are immediately recognizable.
- Roads have strong hierarchy without dominating the map.
- Buildings are present but visually quiet.
- District boundaries are legible without heavy filled polygons.
- POIs appear progressively with zoom and use AkarFinder-owned pictogram language.
- Property/listing information remains visually dominant over generic POIs.
- Same visual grammar works nationally, not only for Maârif.
- Satellite remains optional, never the primary default.

## Visual doctrine
- Inspiration: Waze information hierarchy, not Waze visual imitation.
- Finish: calmer and more premium; closer to Apple Maps restraint.
- AkarFinder identity: navy typography/selection language, warm off-white land, restrained blue-green accents, proprietary POI glyphs.
- No 3D pitch in default city/district/rue flow.
- No decorative gradients or excessive territorial fills.
- No semantic meaning inferred from decorative colors.

## Base palette V0
- Land: warm off-white / very light neutral.
- Water: pale desaturated blue.
- Parks / green space: soft natural green.
- Buildings: low-contrast warm gray.
- Minor roads: near-white / light neutral.
- Major roads: slightly warmer or stronger neutral.
- Primary AkarFinder accent: existing navy.
- Selected territory / listing: stronger AkarFinder accent only where needed.

## Zoom grammar
### City
- Major roads only.
- Major parks / coast / water.
- District names and boundaries.
- Only flagship landmarks.
- No local POI clutter.

### District
- Full street hierarchy.
- Low-contrast buildings.
- District boundary.
- Major + useful local landmarks.
- Progressive POI labels.
- Listings remain visually stronger than POIs.

### Street
- Detailed roads and building footprints.
- Useful proximity POIs.
- POI glyph + readable name.
- Precise listing markers.
- No unnecessary neighborhood fill.

## POI families
- Education
- Health
- Mobility / transit
- Green / sport
- Food / shopping
- Culture / worship
- Services / banking
- Parking
- Orientation / landmark

Each family must have an AkarFinder-owned pictogram treatment. Glyphs should be simple, legible at small size, and coherent as one family.

## Map behavior
- Default camera: flat, bearing 0, pitch 0.
- POIs fade in by zoom tier, not all at once.
- Labels use collision rules and priority tiers.
- Selected district boundary becomes clearer, but the base map does not dim aggressively.
- Hover / selected states remain subtle and premium.
- Map must remain understandable with all property data temporarily absent.

## Non-goals for V0
- No new data ingestion.
- No DB migration.
- No Vercel deployment.
- No full icon library yet.
- No attempt to certify every Moroccan city before Maârif prototype is visually validated.

## First prototype
Maârif is the pilot. Implement only enough to validate:
1. flat camera;
2. warm neutral base;
3. parks visible;
4. restrained road hierarchy;
5. quiet buildings;
6. clean district boundary;
7. 6–8 representative POI glyph+name markers;
8. listing markers visually dominant.

## Validation contract
BEFORE and AFTER must use identical viewports:
- mobile 390x844
- mobile 430x932
- tablet 768x1024
- desktop 1280x800

Score:
- readability
- visual hierarchy
- AkarFinder identity
- POI clarity
- district legibility
- national scalability
- clutter control

Target for V0 acceptance: >= 8.5/10 overall, with no dimension < 8/10.

## Branch
`feat/vivre-ici-flat-living-map-v0`

Base exact HEAD:
`3d3d0060b184d8953b9b0c13cc7d6c37b9d058e3`

Source PR:
#1090 — canonical Vivre Ici product PR.

## V0.2 implementation checkpoint — 2026-10-08

### Goal
Deliver the first credible Maârif Flat Living Map rendering: real 2D, navigation-style roads, understated buildings, parks, sourced icon+name POIs and a truthful administrative outline.

### Implementation (not yet visually certified)
- Flat north-up camera, drag rotation and touch pitch disabled on Maârif pilot.
- Overture 3D installation gated off in default flat camera; no visible volume claimed.
- Better road hierarchy (major streets vs secondary/local), minor road names only at closer zoom.
- 2D vector footprints lower contrast; parks greener, excluding cemeteries from park treatment.
- POIs sourced from existing neighborhood anchors only. Zoom tiers: overview up to 4, quartier up to 8, street up to 18. Category filter still supported.
- AkarFinder flat glyph-plus-name labels, restrained white background and navy/green family colors. Lucide base glyphs are a branded first pass, not a custom proprietary icon library certification.
- The Maârif administrative OSM line is a stronger dashed outline, explicitly marked as arrondissement (never a certified quartier border).
- Context envelope remains an indicative hull, not an official boundary.
- Obsolete decorative 3D choice removed from Maârif UI.

### Regression harness changes
- Casablanca AFTER requires real OpenFreeMap tiles, 2D footprint observation, no 3D volume, official administrative disclosure and mobile/desktop search handoff.
- POI AFTER checks branded flat POI contract, glyph coverage and density by zoom tier.
- Rue AFTER checks flat street-level zoom and actual rendered 2D building footprints.
- Changes to old Overture-volume assertions are intentional contract migration, not suppression of visual proof.

### Pending proof
- CI / TypeScript / browser audit exact HEAD.
- AFTER captures at 390x844, 430x932, 768x900, 1280x900.
- BEFORE vs AFTER identical viewport comparison, screenshot inspection and scored UX review.
- Explicit human visual acceptance before merge. No Vercel deploy authorized.

### Next exact
Read exact-head CI results, correct failures, retrieve exact-head captures, visually compare and score; then refine based on visible defects.

## V0.2 visual certification checkpoint — 2026-10-08
- Product HEAD: `ccd94e7b26d93e803e1a268d85379597d2320d1b`.
- Casablanca AFTER `37799099028`: **success**, same four target viewports, actual camera pitch/bearing 0/0, real OpenFreeMap tile responses, 59/66/71/61 rendered 2D building footprints (mobile390/mobile430/tablet/desktop).
- LOT H POI AFTER `37799098816`: **success**, zero clipped POI or landmark labels in four browser viewports. 2 visible POIs at mobile initial cadrage, 3 at desktop. Shows limits of first-on-screen discovery.
- Rue Proximité AFTER `37799098591`: **success**, 4 viewport street zoom with real gestures, 12 vector footprints, 0 3D volumes.
- Multi-city Browser `37799098861`: **success**.
- C7 Final Certification failed on the separate C3 pricing API HTTP 503; not evidence of a Flat Living Map cartographic failure.
- Visual score by inspection **7.8 / 10**, below target >=8.5. Exact screenshot reviewed.
- Outstanding visual issue: mobile discoverability of sourced local anchors without obstructing the map.

## V0.3 discovery — implementation / pending proof
**Goal:** using only the existing Repères filter, let a mobile user reveal the rest of sourced points via one tap, without changing the initial close-neighborhood framing or fabricating a territorial boundary.

**Target UX reference:** initial 390x844 Maârif screenshot retains the discreet top chip; chip shows sourced count (e.g., Repères + 4); tap fits the bounds of actual anchors, with padding avoiding mobile navigation/sheet. Keep full POI icons/names where collision rules allow.

**Implementation:**
- Reuse existing Repères chip for explicit source-driven `map.fitBounds`.
- Use coordinates from `context.anchors` only; administrative neighborhood boundary unrelated and unchanged.
- Set a scoped presentation flag allowing secondary POI names on explicitly requested overview.
- Add browser test and evidence screenshots `poi-after-all-<width>x<height>.png`.
- Test requires >=3 visible real POIs on mobile when >=3 source anchors, no source count inflation, and no clipped labels.

**Proof pending:** exact-head CI and AFTER screenshot; do not assign upgraded visual score before inspection.
**Safety:** no Vercel deploy, merge, migration or DB write.

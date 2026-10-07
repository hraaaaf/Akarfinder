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

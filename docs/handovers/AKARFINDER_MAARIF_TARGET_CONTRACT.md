# AKARFINDER — MAÂRIF REBUILD — TARGET CONTRACT

Status: canonical implementation contract  
Execution branch: `feat/maarif-page-rebuild-mockup-v1`  
Parent handover: `docs/handovers/AKARFINDER_MAARIF_REBUILD_START_PROMPT.md`  
Parent PR: #1090 (DRAFT)  
Rebuild PR: #1096 (DRAFT)

## 1. Product outcome

The real Maârif page must read, at first glance, like the approved premium desktop/mobile mockups:
- premium AkarFinder shell
- map-dominant composition
- strong Maârif focus
- refined right rail on desktop
- map-first stacked experience on mobile
- high cartographic richness without falsifying geographic facts

The goal is not “cleaner than before”. The goal is **obvious visual convergence**.

## 2. Desktop contract — 1280×900 reference

### Global
- top product header spans full width
- main content begins immediately below header
- map occupies the dominant left region
- neighborhood rail occupies a stable right column
- no floating rail inside the map for the target Maârif experience

### Header
- AkarFinder identity left
- nav: Acheter / Louer / Neuf / Vivre ici / Vendre / Pro
- `Vivre ici` visually active
- Favorites + profile affordances right
- restrained white/navy visual system

### Map top controls
- large rounded search field near top-left
- city: `Casablanca`
- placeholder/context: `Quartiers et adresses`
- `Repères` control
- `← Maroc` control
- compact 2D/3D segmented control near top-right

### Map composition
- coast/Atlantic visible without dominating the whole frame
- dense urban fabric visible around Maârif
- Maârif visually central/dominant
- surrounding district labels are secondary
- POI callouts are sparse, premium and collision-safe
- administrative contour uses navy stroke + translucent focus fill
- visible disclosure: `Contour administratif`

### Desktop rail
Order:
1. hero image
2. `Casablanca`
3. title `Maârif`
4. `Vivre, comprendre, puis choisir`
5. concise neighborhood description
6. tabs: Marché / Vie locale / Mobilité
7. market card
8. primary CTA
9. secondary CTA
10. Lieux d’intérêt cards

Rail must feel like a real product column, not a floating debug panel.

## 3. Mobile contract — 390×844 and 430×932

Order:
1. compact AkarFinder header
2. rounded search field
3. map
4. neighborhood hero/content card
5. tabs
6. market overview
7. primary CTA
8. secondary CTA
9. places section

Rules:
- map first
- no horizontal overflow
- no control overlaps
- no duplicate Maârif labels
- POI chips adapt or reduce rather than collide
- map controls remain thumb-safe
- market card can reflow but must remain immediately readable
- no desktop rail squeezed into mobile

## 4. Visual tokens

### Color
- primary navy: deep, near `#062B55`
- action blue: vivid but premium
- water: rich Atlantic blue, not flat gray-blue
- land/buildings: warm ivory / stone / sand neutrals
- Maârif focus: cool translucent blue with navy contour
- panels: white / very light neutral

### Shape
- search + CTA: generous rounded rectangles
- rail cards: medium radius
- map POI chips: compact white pills
- no oversized bubble controls

### Typography
- clean modern sans-serif
- Maârif heading has strong editorial scale
- surrounding map labels remain subordinate
- avoid all-caps except compact metadata/card headings

## 5. Cartographic contract

Truthful source geometry is mandatory.

The visual renderer may:
- recolor truthful features
- add non-metric soft shadows
- add decorative pseudo-depth
- emphasize real roads/building footprints
- reduce label clutter
- style coastline/water

It may not:
- invent building geometry
- invent POIs
- invent streets
- invent boundary geometry
- claim decorative extrusion as physical height
- use unverified derived height as verified truth

## 6. Maârif focus contract

Required visible elements where source truth supports them:
- Maârif label
- administrative contour disclosure
- Parc de la Ligue Arabe
- Lycée Lyautey
- Twin Center
- Stade Mohammed V in the broader context when composition permits

The target mockup placement is directional; live placement follows real coordinates and collision safety.

## 7. Interaction contract

Must preserve:
- search handoff
- district routing
- existing truth/context APIs
- tabs
- map pan/zoom/reset behavior
- 2D/3D affordance semantics if displayed

If 3D is decorative/non-metric, the UI/copy must not imply measured physical heights.

## 8. Explicit anti-targets

Reject a candidate if any is true:
- looks like the old flat OpenFreeMap render with new colors
- right rail still looks like a debug/information rail rather than premium product UI
- sea occupies visually excessive space
- Maârif focus is too small to dominate
- labels/controls overlap
- duplicated Maârif cartouche
- stretched `Contour administratif` badge
- invented values are shown as production facts
- decorative 3D is presented as verified building height

## 9. Acceptance viewports

Mandatory visual evidence:
- 1280×900
- 768×900
- 430×932
- 390×844

For each exact HEAD:
- overview state
- local/Vie locale state when applicable
- artifact ID + digest
- side-by-side target comparison
- explicit defects list

## 10. Quality gate

A candidate is **not** final at ≥9.5/10 unless:
- first-glance desktop resemblance is strong
- mobile feels intentionally designed from the same system
- map and shell both look premium
- no obvious UI collision/overflow defect
- no truth-safety compromise
- second independent visual review agrees
- human gate approves

CI green is necessary but not sufficient.

## 11. First implementation sequence

LOT B1:
- restructure shell only
- preserve map/data behavior
- desktop rail + header + controls + mobile stacking

LOT B2:
- visual tokens/spacing/typography
- responsive cleanup

Only after shell evidence is accepted:
- start LOT C map renderer rewrite

Do not start with another camera-only tweak.

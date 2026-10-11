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

## V0.3 certification — 2026-10-08

### Exact product proof
- Source HEAD `e0d53ccdb730f88b6484d003dd35a228ed8fa122`.
- Browser run `37800421050` **success** / artifact `11560780703` (real screenshot and JSON).
- Source count: 4 authenticated POI anchors on Maârif; initially rendered 2 on both mobile sizes.
- After explicit `Repères` tap: **4/4 POI present and named** at both 390×844 and 430×932, no clipping failure.
- At 768×900: 4/4; at 1280×900: 3/4 due to viewport/collision rules, acceptable only for this mobile discovery lot.
- Casablanca visual AFTER `37800420902` **success** across 4 viewports, camera pitch=0, bearing=0, actual tile loads/footprints.
- Multicity browser `37800420910` **success**.
- Visual inspection of `poi-after-all-390x844.png`: **8.1/10 preliminary subjective**; bottom sheet obscures a large fraction of the territory, small labels and clustering remain. Do not claim >=8.5.

### Remaining issues
- Street After `37800421036` **failed**: under zoom, DOM Twin Center label disappeared (test referenced label even when collision/offscreen removed it).
- C7 `37800420866` failed on C3 price API HTTP 503 (separate backend problem); Zillow certification also failed and needs independent diagnosis.
- Test-harness correction `d58d9a9d0dae5c53ea5be57c21bd64342a58f228` confirms Twin Center geographic anchor before real zoom, avoids requiring DOM label after zoom, keeps actual street zoom tier and 2D footprint assertions. Not yet proven by CI.
- Exact-head renewed screenshots / street test are pending.

### Next exact
Obtain new exact-head Rue CI result. If green, retrieve its screenshot and confirm scope; if red, diagnose actual failure rather than reducing assertions. Then improve the mobile sheet and POI hierarchy to reach >=8.5/10; compare before/after identical viewports and seek human visual approval. No Vercel deploy, DB write or merge authorized.

## V0.4 certification — 2026-10-09

**Goal:** premium flat north-up living map with genuinely readable mobile context and an accessible search CTA. **Target score:** ≥ 8.5/10 through human screenshot review.

**Exact product proof (HEAD `8a57e0fe19fdcd810125b8b8d879229b8648cc74`):**
- `37953911287` Casablanca AFTER **success**, artifact `11627795985`. Four viewports observed: 390×844, 430×932, 768×900, 1280×900. Pitch/bearing 0/0, real basemap tiles and 2D footprints.
- **Mobile sheet:** 390 = 156.125px; 430 = 160px, each within target `min(18.5svh,160px)`. Real property-search CTA 44px high, visible and not clipped.
- `37953911293` POI AFTER **success**, artifact `11627118347`. After one real « Repères » interaction 4/4 sourced anchors are displayed on mobile 390 and 430. No DOM label clipping; previously failing « Clinique Badr مصحة بدر » now fits.
- `37953911452` Rue Proximité AFTER **success**, artifact `11627581295`.
- `37953911405` Multi-city Browser **success**.
- **Independent failures on this HEAD:** C7 (C3 price API HTTP 503), National Market BEFORE and National Zillow certification remain red; don't certify those domains from the card UI results.
- **Human visual review:** V0.4 **8.3/10 subjective**, upgraded from V0.3 8.1. Evidence images: artifacts above. Below ≥8.5 gate. Main observation: Maârif neighborhood label clashes with sourced Parc du Vélodrome name; canvas still slightly pale.

**V0.4.1 in progress:** scoped CSS moves only the Maârif *text* by 19px vertically on ≤560px, keeping its geographic dot at the original map projection. Browser POI audit now asserts measured intersection area = 0 after clicking Repères at 390 and 430. Latest product/test commit: `a0206ad0acefce43ab1cd4e6f8186d471da56ddb`.

**Proof pending:** exact-head POI and Casablanca AFTER screenshots on V0.4.1. If red diagnose/revise; if green compare same 390/430/desktop screenshots and request human visual approval when target reached.

**Restrictions:** PR #1108 stays DRAFT on `feat/vivre-ici-flat-living-map-v0`; no merge, no Vercel deploy, no DB writes.

## V0.4.2 / V0.5 closeout — verified 2026-10-09

**Exact V0.4.2 reference:** product HEAD `2e2603a6eaab3ee242ea4fcab7d704fc26286f16`.
- POI AFTER `37959640248` ✅, Casablanca AFTER `37959640651` ✅, Rue AFTER `37959640718` ✅, Multicity `37959640485` ✅.
- Matchable BEFORE screenshots at `carte-lot8-casablanca-after-37959640651`, artifact `11630828353`.
- Context park/name after Repères: 0px² overlap, all 4 viewports (observed DOM report).

**Exact V0.5 AFTER:** product HEAD `d1b5bae371112711b8f082666adaec02a70ac269`.
- Casablanca AFTER `37964062444` **success**, artifact `11632748430` — 4 viewports / real tiles / zero 3D.
- POI AFTER `37964062453` **success**, artifact `11632932855` — 4 viewport reports ok, 4 sourced anchors shown after tap on 390/430; clippedLabels=[] / reframedClipping=[]; neighborhood/park overlapArea=0 on 390/430/768/1280.
- Rue AFTER `37964062362` **success**, artifact `11632483666` — 4 street-tier zoom cases.
- Multicity `37964062360` **success**.
- 390x844 sheet 156.125px; 430x932 sheet 160px; CTA visible and 44px high.
- Exact BEFORE/AFTER screenshots inspected for 390×844 and 1280×900 at the same framing. Only microcontrast improves (green spaces and roads); building footprints remain discrete. **Visual score: 8.4/10 subjective** (previous 8.3). Target ≥8.5 NOT demonstrated. Do not claim closed or merge-ready.
- Independent failing gates (Market BEFORE, Zillow, C7 price HTTP 503) are not V0.5 cartography approvals; track separately.

## V0.6 contrast-final polish — target and visual reference

**Goal:** retain the lightweight 2D neighborhood style while making green spaces and minor road names immediately distinguishable at both mobile and desktop. **Success:** screenshot comparison (390/430/768/1280) demonstrates improved legibility without greater POI overlap/clipping, route loss, new fake boundary, heavy buildings or material CTA change. **Proof:** exact-head four browser gates + same-viewport BEFORE/AFTER + human visual grade ≥8.5.

**BEFORE:** certified V0.5 screenshots `11632748430`, `11632932855`.
**Visual reference/target:** same framing and controls as V0.5, more distinct OSM landuse greenery and delicate street type; avoid raising the geographic neighborhood outline or increasing 2D footprint weight.

**Implementation constraints:** only pilot Maârif map vector styling, no coordinate/source changes; no Vercel deployment, merge or database write. Use one small final commit batch before full CI proof.

## V0.7 — AkarFinder canonical structural colors — 2026-10-09

**Request:** apply the two documented AkarFinder structural colors to Vivre Ici Maârif (not new shopping/property-category colors). **Source:** Notion « AkarFinder — Identité visuelle & Visual Landmark Dictionary » (page `3df77c663362815db8cfe403f68849d4`): `#071B33` actual structural navy; `#0B63CE` actual interactive accent. The Notion source expressly distinguishes these from historical values and warns against collapsing different tokens globally.

**Goal:** brand-consistent chrome (selected filter, quartier heading, action CTA, active rail tabs, primary controls), preserving premium low-noise land-use imagery. **Success:** computed styles use exactly `rgb(7,27,51)` and `rgb(11,99,206)` on mobile and desktop, with no clipping, loss of POIs, or map geometry changes. **Proof:** 390×844 / 430×932 / 768×900 / 1280×900 screenshot BEFORE/AFTER and exact-head browser tests for Casablanca, sourced POIs, street zoom, multicity.

**BEFORE:** certified V0.6 artifact POI `11634326391` / Casablanca `11634172626`, plus previously displayed captures.
**Implementation:** pilot-only CSS `app/map/quartier-target-couche3.css` overrides for chrome/rail. No map source, coordinates, building thickness, park or street palette changes. Browser audit `scripts/audits/carte-lot8-casablanca-visual-after.mjs` checks four true computed colors, not merely text tokens. Explicit navy for quartier title/CTA; blue for selected Repères/active tab.
**HEAD product** `5099fbc892f49f2d9eb8f66bd4cb56c2743868f5`; **HEAD with audit** `acb74ac796c9ebe36c360c9245f9f34e9e6c5c8a`.
**Not yet certified:** exact-head CI and screenshots. Don't assign a new visual score or claim ≥8.5 before comparison.
**Safety:** PR #1108 draft, no merge or Vercel deploy/DB writes.

## V0.8 — identity colors in the cartography itself — 2026-10-09

**Owner correction:** V0.7 applied navy/blue mostly to chrome; required C1/C2 **inside the map geography itself**. Goal is not a blue overlay or fictitious boundary; cartographic hierarchy should express AkarFinder brand through real vector polygons and lines.

**Verified design tokens:** C1 navy `#071B33`, C2 blue `#0B63CE`, from Notion "AkarFinder — Identité visuelle & Visual Landmark Dictionary". Use derived *tints* for roads/buildings/landuse; use C1 exactly for major street names and C2 exactly for primary road casings at controlled class-specific opacity. Keep real parks green and labels legible.

**BEFORE/reference:** exact-head V0.7 Casablanca artifact `11636960045` (390×844 / 1280×900 screenshots); prior V0.6 source imagery `11634172626`. Target: a visibly more blue-slate AkarFinder flat map without overwhelming 2D footprints, inventing polygons or changing coordinates.

**Implementation V0.8:** inside existing Maârif-only vector overlay `components/map/MapLibreNeighborhood3D.tsx`, change source-layer `landuse` urban wash + grain to soft blue, OSM/OpenFreeMap building fill/outline to restrained steel blue, road casings by OSM road class to blue slate, primary road specifically C2 at moderated opacity, white/pale-blue road infill, major road text C1 and minor road text blue slate. Water and genuine green parks untouched. Maintain actual MapLibre source, tile data, zoom, camera, building count/geometry and POI anchors.

**Test:** `scripts/audits/carte-lot8-casablanca-visual-after.mjs` requires renderer `data-maplibre-cartographic-palette="akarfinder-c1-c2-map-v1"` on all 4 viewports, preserving C1/C2 chrome computed styles, sheet/CTA bounds, 2D footprints and loaded tiles. Strong visual proof still requires actual rendered AFTER image comparison and screenshot inspection, not an attribute alone.

**Code commit** `9e90ca9c2f6a1f0acb5a30621103a30860b00c52`; **test commit** `de37b31e49485770d6e0ebc87f5d15b00afaf8cd`. Exact-head CI started: Casablanca AFTER `37972416040`, POI `37972415994`, Rue `37972415930`, multicity `37972415895`, all queued when first checked.

**Status:** implementation done; **no AFTER or score improvement certified yet**. Next: check real CI logs and retrieve artifacts; if failing, fix; compare identical mobile 390/430 and desktop 768/1280 BEFORE→AFTER; score visual change (gate >=8.5) and seek owner review. Draft PR #1108; no merge, Vercel, DB mutation.


## Nouveau TARGET canonique V1 — 2026-10-10

**Décision Product Owner:** mockup direction trois états « Vue quartier / Limites administratives / Zoom rue + repères » approuvé. Cible **≥9,5/10** par revue visuelle humaine. Ne pas assimiler le mockup illustratif à une géométrie cartographique certifiée.

**Notion SPEC CANONIQUE:** [Vivre Ici — Quartier pilote Maârif | SPEC CANONIQUE V1](https://app.notion.com/p/3f577c66336281d79f5dc46467df5f65?pvs=204), sous AkarFinder Command Center. Cette page dirige les lots écrans et garde les contrats visuels/fonctionnels.

**Principes verrouillés:**
1. **Vue quartier** par défaut, point central sourcé + halo de vie contextuel bleu C2 `#0B63CE` à bord doux, **jamais une frontière affirmée**, C1 navy `#071B33` dans labels/structure ; tuiles/empreintes 2D réalistes et légères, parcs verts.
2. **Limites administratives** uniquement sur demande avec la géométrie `MAARIF_TARGET_PILOT_BOUNDARY` (OSM relation 2801474, `shadow-reference`, `reviewed:false`), `fitBounds` + label arrondissement et retour. **Ne pas appeler cela limite du quartier central**.
3. **Zoom rue + repères** : vrais POI, labels sans collision, reveal progressif, pas d’extrusion.
4. Cible quatre viewports 390×844 / 430×932 / 768×900 / 1280×900, BEFORE→AFTER→tests réels→score. Pas de merge, DB write, Vercel avant autorisation.

**LOT 1 / premier pas implémenté :**
- `components/map/MapLibreNeighborhood3D.tsx` : les 4 couches du polygone administratif sont réellement `visibility:none` à l’ouverture, puis `visible` seulement après clic « Voir limites » ; retour les masque. Effet sur vraie carte, pas seulement les boutons.
- Glow autour du centre sourcé, couleur C2, `circle-blur:0.86`, opacity .22 et rayon 153px mobile / 195px desktop ; enveloppe de repères sourcés très discrète `fill-opacity:.018`, sans ligne ni fausse frontière.
- `scripts/audits/carte-lot8-casablanca-visual-after.mjs` : marqueur sémantique `branded-soft-focus-no-border` en vue défaut, bascule et retour déjà certifiés par interaction Playwright.
- Commits produit `9fe5e2e28d58b04017c6f630d26ee548b2186637` et audit `334b2134bd7a360e2f636774af965e5feb0398cb`. CI exact-head lancée `38042617725` Casablanca, `38042617723` POI, `38042617799` Rue, `38042617761` multicity ; non conclu au premier contrôle.
- **NEXT EXACT** : vérifier 4 runs, récupérer BEFORE/AFTER mêmes viewports, juger si halo clairement perceptible sans fausse limite ; si pas suffisant modifier/récertifier ; mettre à jour page Notion & preuves. Lot 1 non clos.


## TARGET V1 / LOT 2 certifié / LOT 3 actif — 2026-10-10

**Notion canonique fonctionnel:** [Vivre Ici — Quartier pilote Maârif | SPEC CANONIQUE V1](https://app.notion.com/p/3f577c66336281d79f5dc46467df5f65?pvs=204), directions 3 écrans validées : Vue quartier (halo contextuel sans frontière fictive), Limites administratives (polygone OSM réellement fourni, non limite du quartier central), Zoom rue + repères (sourcés). Target visuel humain **≥9.5/10**, non encore obtenu. PR #1108 reste DRAFT.

**Dernier baseline certifié LOT 2** HEAD `f73303d18f56845c2349b3ab3469f8e7a6f898a2` :
- Casablanca AFTER `38069780411` success, artifact `11676083358`, rapport ok true 4 viewports ; légende « Arrondissement Maârif / Limite administrative OSM / Ne délimite pas le quartier central » visible à 390×844, 430×932, 768×900, 1280×900. Clic de géométrie opt-in puis retour. Zéro labels parasites en admin. Cartes capturées réellement inspectées.
- POI AFTER `38069780504` success, artifact `11676028092` ; 4 repères réels après interaction Repères mobile, aucun label tronqué. Rue AFTER `38069780536` success artifact `11676382925`; Multi-city `38069780578` success.
- Fiche repliée 156.125px mobile390, 160px mobile430, 144px tablet768 ; CTA visible 44px. Géométrie `MAARIF_TARGET_PILOT_BOUNDARY`, relation OSM 2801474, `reviewed:false`, `shadow-reference` ; pas de certification de publication des limites quartier. Les gates métier C7/Market BEFORE/Zillow restent rouges indépendamment.

**Défaut réel LOT 3** : screenshot rue `twin-center-after-390x844.png` montre Twin Center absent du cadre mobile, malgré tier street correct. Rapport `twinCenterLabelVisibleAtStreet:false` mobile 390 et 430 ; vrai POI source présent à 1280. Cause probable : harness centrait et zoomait sur le **centre de la cartouche CSS** (décalée horizontalement), pas le point géographique réel. On ne prétend pas que le produit est corrigé sans AFTER.

**Implémentation LOT 3** :
- `scripts/audits/carte-rue-proximite-after.mjs` commit `d672b53150cd5dd51e0eb00be1b8468ff46e4fb7` : pan + wheel sur `style.left/top` de l'élément projeté par MapLibre, relativement à la zone carte ; exige `Twin Center` visible après zoom rue sur les 4 viewports.
- `app/map/quartier-target-couche3.css` commit `fc0d21c4998fdb715daa1f2be5a1ce70eb122429` : taille/contraste de la cartouche flagship au tier `street`, C1 navy et bord fin C2 bleu, sans déplacer l'ancre ni données géographiques.
- **Validation en cours, pas encore de nouvel AFTER**. Next exact : récupérer CI exact-head `fc0d21c4`, inspecter Rue AFTER et cas Casablanca/POI/multicity. Si Twin Center disparaît encore sur mobile, diagnostiquer coordonnées projetées/placement produit et corriger. Puis comparer au mockup et continuer les lots jusqu'au gate réel. **Aucun merge, Vercel ou write DB**.


## LOT 3 — street landmark visibility, selection and accessibility — 2026-10-10

**Verified street improvement** on product/test/docs HEAD `219ec05c0a71ab705401e713aea113efd1af7519`:
- Rue Proximité AFTER [38092991936](https://github.com/hraaaaf/Akarfinder/actions/runs/38092991936) **success**, artifact `11684553982`. Real screenshots `twin-center-after-390x844.png`, `430x932.png`, `768x900.png`, `1280x900.png` inspected (390/1280), four cases report `ok:true`. `twinCenterLabelVisibleAtStreet=true` on **all 4** vs `false` on 390/430 previously; zoom tier street, zero 3D, 11/12/12/12 real footprint counts. Mouse pan/zoom now centered on sourced geographic projection, not bounding box of offset cartouche. No fabricated coordinates or business metadata.
- POI AFTER `38092991941` **success**, Multicity `38092991875` **success** on same HEAD; Casablanca AFTER `38092991996` last checked in_progress (not yet claimed).
- **Qualitative screenshot observation**: Twin Center navy label clearly visible; street basemap and 2D footprints readable. Still target global **≥9.5/10 not demonstrated**.

**LOT3 incremental interaction** in progress on HEAD `92e7a350a4c7e9f152fa57d26a1226b6b030af3e`:
- MapLibre source `components/map/MapLibreNeighborhood3D.tsx` changes landmark cartouches from presentational DOM to accessible real buttons; `aria-label="Explorer le repère [name]"`, pressed state, safe selection, contextual popup with **only sourced name + Maârif/Casablanca** (no invented hours/rating/prices), dismissable. Parent aria-hidden cleared in Maârif pilot so buttons are keyboard reachable.
- CSS `app/map/quartier-target-couche3.css`: restrained accessible navy/blue focus, touch target, detail panel. Never moves geographic markers. Script `scripts/audits/carte-rue-proximite-after.mjs`: real click+keyboard Enter+close on Twin Center, visible/detail text and no clipping at 390/430/768/1280, capture `twin-center-selected-after-*.png`.
- Commits source `6dae9a52`, CSS `bc7e0c3b`, audit `92e7a350`. **Not yet certified**. If CI shows click interception or accessibility regression, correct and repeat; do not declare interaction success until report and screenshots.
- Next exact: check exact HEAD CI, download selected screenshots, inspect mobile/desktop and compare with 3-screen Notion target; then pursue human visual gate. PR #1108 DRAFT; no merge, Vercel or DB writes. C7/Market BEFORE/Zillow remain separate red gates.


## LOT 3 — certifié sur 4 pipelines / revue mockup / durcissement — 2026-10-10

**Baseline certifiée (code `fb548f96e0b8a482423ce5d80947d5d8b6f1e989`, PR #1108 DRAFT) :**
- Casablanca Visual AFTER `38094409660` **success**, artifact `11685871160`, `report.ok=true` sur 390×844, 430×932, 768×900, 1280×900 ; retour « Limites administratives » → « Repères » attesté (`boundaryOverview.returnedViaReperes=true`). La légende reste sémantiquement exacte : **arrondissement Maârif / limite administrative OSM / pas le quartier central**. Format fiche repliée 156.125 / 160 / 144 px ; CTA 44 px.
- POI AFTER `38094409596` **success**, artifact `11685891012` : 4 POI sourcés visibles après clic sur 390/430/768, 3 sur 1280 par culling naturel. Aucune troncature ni clipping ; la sélection du parc « Parc du Vélodrome » fonctionne avec clic, Enter, fermeture, détails **« Autour de Maârif · Casablanca »** (pas d'appartenance territoriale inventée), bouton fermer 44×44 px ; captures `poi-after-selected-390x844.png`, `1280x900.png` inspectées.
- Rue AFTER `38094409595` **success**, artifact `11684907996` : Twin Center visible et sélectionnable au vrai zoom rue sur les 4 tailles, clic/clavier/fermeture réels et close 44 px ; empreintes 2D, aucune extrusion.
- Multi-city `38094409652` **success**. Les échecs métiers C7, Market BEFORE, Zillow restent **séparés** et non clos.
- **Contact sheet réel** : `/mnt/data/AKARFINDER_MAARIF_LOT3_4_CAPTURES_CERTIFIEES.png` (non archivé durablement dans Notion/Drive à ce stade). États : vue quartier, limites administratives, POI sourcé sélectionné, Twin Center zoom rue, tous 390×844. L'image cible mockup validée est disponible sur Google Drive : `https://drive.google.com/file/d/1enoMXzkoHVGTsfC7NTET79M6tz6vDsYZ/view`.
- **Revue qualitative** : bonne cohérence navy C1/bleu C2, fonds clairs, vraies coordonnées/empreintes ; les cartouches et fiches contextuelles restent plus sobres que le mockup conceptuel très illustré. La cible **≥9.5/10 n'est PAS prouvée** ; ne pas déclarer design final ni PR prête à merger. L'appréciation humaine finale reste un gate.

**Durcissement post-baseline exécuté :**
- CSS `app/map/quartier-target-couche3.css` commit `137c7d0c` : pendant qu'un POI sourcé est sélectionné, autres étiquettes contextuelles sont visuellement atténuées au lieu de concurrencer la fiche ; retour à l'état normal après fermeture. Aucune coordonnée ni source changée.
- Test `scripts/audits/carte-poi-language-after.mjs` commit `27ae6d9ff43782048cba5a3b1fc7b11127f07354` : étend le clic réel à **tous** les POI affichés sur chaque viewport (4 mobile/tablette et 3 desktop), vérifie nom source, proximité honnête, fermeture sans force/ciblage interne, conservant Enter sur le parc.
- Les preuves de ces nouveaux correctifs doivent venir des 4 CI **sur un même HEAD incluant code + test**. Toujours aucune autorisation de merge ni Vercel / DB write.

**Next exact :** inspecter CI exact HEAD, corriger sans bypass si un label reste intercepté ; télécharger les 4 screenshots AFTER par viewport et les examiner, comparer strictement au mockup et faire revue visuelle ; si target non atteint, proposer/exécuter le prochain correctif mesurable. Ne publier aucun polygone de quartier central sans source revue.


## LOT 3 functional gate / premium visual hierarchy pass — 2026-10-10

**Last certified functional code** `25b541cd8b3fa537aa47ffe573767c1ddee412fb`, PR #1108 DRAFT, base `feat/akar-map-quartier-target-couche3`:
- Casablanca Visual AFTER `38096538830` **success** artifact `11686690306`.
- POI AFTER `38096538847` **success** artifact `11686310308`: 390/430/768 all 4 sourced context POIs selected and switched without closing; desktop 3 actually rendered; click, Enter, closing and 44px dismiss hitbox; no label clipping; Maârif/park overlap area 0.
- Rue AFTER `38096538854` **success** artifact `11685784807`: Twin Center visible on four viewports at true street-tier, click/keyboard/close certified, real vector 2D buildings.
- Multicity Browser `38096538752` **success**, no national map regression observed by that audit.
- Non-map CI C7 `38096538772`, Market BEFORE `38096538871`, Zillow UI `38096538758` **failure**, independent gates NOT resolved.
- **Actual BEFORE screenshots inspected**, including `casablanca-maarif-390x844.png`, `1280x900.png`, `poi-after-selected-390x844.png`, and the earlier mockup target archived on Drive `1enoMXzkoHVGTsfC7NTET79M6tz6vDsYZ`. Human target **≥9.5/10 remains UNPROVEN**; city blocks/secondary roads looked too pale. No claim of visual completion or permission to merge/deploy.

**NEXT VISUAL SUBLOT goal**: improve actual, real MapLibre vector building/road/name hierarchy in the *Maârif pilot only*, keeping natural parks, exact POI coordinates, existing life-zone halo, verified admin boundary and all 4 interaction states unchanged.
- Product commit `d4f61a8eedd30560d190b7d2eb8debde680ea719`: 2D building fills opacities at zoom 12.2/14.5/17.5 from `.07/.15/.20` to `.09/.23/.29`, softer outline `#B6CADA`; secondary/tertiary road casings `#92B2D1`/`#B1C9DF`; primary blue C2 casing .49, major/minor text opacities .91/.83. No tile/geo coordinates/fake polygons/park palette changed.
- Audit commit `f06311db2eef99ad9179851edf6d6b0526289b4b`: `data-maplibre-hierarchy-pass=readable-footprints-roads-v2` expected at four fixed viewports, in addition to existing real browser map gates. **This data attr is diagnostic, NOT visual proof**.
- CI on `f06311db`: Casablanca AFTER `38096858763`, POI AFTER `38096858701`, Rue AFTER `38096858714`, multicity `38096858709`; all **in_progress** when checked. Do not claim success, score or screenshots for this new pass until actual artifacts and comparison.
- **Next exact:** collect 4 CI results, diagnose any red; extract AFTER same 390x844/430x932/768x900/1280x900; render side-by-side baseline vs AFTER, inspect legibility/overweight and rate visually; if needed correct then rerun. After visual gate: Notion ↔ md coherence, human review and closeout. No merge/Vercel/DB writes without explicit permission.


## NATIONAL ROLLOUT PRIORITY — 2026-10-11 — OWNER DIRECTIVE

**Decision:** pause additional Maârif finishing; keep the current proven Maârif premium 2D rendering as the **reference** and generalize the same visual language to **registered city+quartier routes throughout Morocco before any other work**. This is NOT authorization for merge, Vercel deployment, database writes or publishing unsupported administrative boundary polygons.

**Baseline protected:** Maârif map commit `6757919273057d1016db223007049a657832b2fa`: Casablanca AFTER `38098460192`, POI `38098460279`, Rue `38098460171`, Multicity `38098460309` all **success**. Subjective ≥9.5 target **not achieved or independently certified**. The owner explicitly accepts the current result as rollout reference; do not substitute unapproved new art direction.

**Architecture inspected:** `NationalMapRouter.tsx` originally used `targetComposition="context"` for only Casablanca/Maârif and `"boundary"` for all others; `MapLibreNeighborhood3D.tsx` installed AkarFinder bright flat vector layers only for Maârif and 3D extrusions elsewhere. City-only and country panorama routes use other components (`NationalTerritoryExperience`, city market provider); they are **not yet in this route scope**. No invented universal neighborhood polygons are available. The canonical registry `getNeighborhoodBySlug` explicitly gates actual selected city+quartier routes.

**Goal this national lot:** shared MapLibre AkarFinder navy `#071B33` / blue `#0B63CE`, organic center/verified POI focus (never a factual boundary), flat 2D building footprints and road labels at all **registered quartier routes**; mobile/tablet/desktop composition and source truth preserved; no fabricated administrative outlines. Maârif-specific OSM relation `2801474` remains limited to opt-in Maârif administrative mode.

**Implementation on PR #1108 draft:**
- `NationalMapRouter.tsx` commit `b047e4081951b20cc3521807421a90919e361273`: send `targetComposition="context"` to every registry-resolved city+quartier; preserve Maârif-only OSM polygon and pilot landmarks, and preserve existing country/city overview router paths.
- `MapLibreNeighborhood3D.tsx` commit `e33b71e1f7ed855ed35bb9ce4820e7602faa631a`: introduce `isNationalFlatLiving` and share bright OpenFreeMap base, AkarFinder vector layers, north-up pitch=0 bearing=0, true 2D footprints and no extruded volumes, source-derived context. Maârif keeps its special admin-mode interactions.
- `MapLibreNeighborhood3D.tsx` commit `46e6e8dd57eba6b33695585d346ff39f9f35c758`: countrywide sourced POI map/labels, accessible clicks, dynamic city+quartier proximity wording; no « Maârif » outside Maârif, no false polygon claim.
- `app/map/quartier-target-couche3.css` commit `32078ce4c9980fbbec5688b4bbac64fbde612db7`: scoped national AkarFinder controls/labels and detail UI via `data-maplibre-national-flat="akarfinder-national-v1"`; leave Maârif pilot CSS intact and separate.
- `scripts/audits/carte-lot8-multicity-browser.mjs` commit `33db5b93f116f9e46c848f348f5c2263e557433d`: 5 cities (Fès Ville Nouvelle, Casablanca Maârif, Marrakech Guéliz, Tanger Malabata, Agadir Founty) × **4 viewports** (390×844, 430×932, 768×900, 1280×900), screenshot each and demand true nationally branded 2D MapLibre attributes, pitch=bearing=0, no volume extrusion, genuinely loaded urban footprints when tiles are live, no non-Maârif administrative boundary, preserved correct search CTA/overflow.

**Important scope separation:** No claim that **every Moroccan locality** is already in the neighborhood registry; only recognized registered neighborhoods can render. National territory/city-level panorama remains separate engine and requires a separate consistency review if product owner wants total cross-scale alignment. 20-case browser audit proves a representative national sample, NOT a census of all neighborhoods. Actual artifact inspection and CI required.

**Evidence current:** PR #1108 HEAD product+audit `33db5b93f116f9e46c848f348f5c2263e557433d`. GitHub Actions multicity run `38099204323` **in_progress** at initial check. Other exact-head Casablanca `38099204239`, POI `38099204284`, Rue `38099204351`, N2 `38099204277`, N3 `38099204297` also started. **No new national AFTER or validation claimed.** Three separate business/CI gates C7, Market BEFORE and Zillow historically red, not automatically attributable to this national visual lot.

**Next exact:** get exact-head national multicity report and 20 screenshots, check other CI; diagnose and correct any map/layout regressions; display BEFORE→AFTER on Fès/Marrakech/Tanger/Agadir at same viewport, confirm Maârif unchanged; only then assign a national rollout outcome. If 5-city scope is green but city/country zoom mismatch remains, execute consistency lot before calling `tout le Maroc` complete. Update Notion canonical with verified evidence, do not merge/deploy without explicit gate.
